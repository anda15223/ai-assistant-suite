/**
 * SmartCard AI extraction — Claude Vision port of the Lovable
 * `smart-card-extract` edge function.
 *
 * Given a `smart_files` row, this:
 *   1. fetches the file bytes from S3 (PDF / image / plain text)
 *   2. calls Claude with a card-key-specific prompt + the file content
 *      as an Anthropic document or image block
 *   3. parses the structured response (summary + sections → lines)
 *   4. inserts a leading "Document summary" section (raw AI read) plus
 *      every extracted section, all tagged source='ai' and linked to the file
 *   5. runs per-card validation → writes warnings back on the smart_files row
 *   6. best-effort feeds brain_entries so the next festival starts warmer
 */

import { eq, inArray } from "drizzle-orm";
import { getDb } from "./db";
import {
  brainEntries,
  smartCards,
  smartFiles,
  smartLines,
  smartSections,
} from "../drizzle/schema";
import { invokeLLM } from "./_core/llm";
import * as sdb from "./smartCardDb";
import { storageGet } from "./storage";

// ===== Prompts per card type =====

const CARD_PROMPTS: Record<string, string> = {
  equipment_list:
    "This is an equipment list. Extract every equipment item and group them into logical categories (e.g. cooking, prep, serving, small wares).",
  cooling_storage: `This is a cooling / cold storage / freezer / container offer or booking document.
Extract EVERY relevant piece of data, organised into these sections (omit a section only if truly nothing applies):

1. "Supplier" — lines: supplier name, contact person, phone, email, address.
2. "Units ordered" — ONE LINE PER UNIT (fridge, freezer, cold container, ice machine…). For each line set:
     label = unit type (e.g. "Cold container", "Upright freezer", "Display fridge"),
     value = size / capacity / dimensions (e.g. "20 ft", "600 L", "1200x600x2000mm"),
     quantity = how many,
     notes = temperature range and any model info.
3. "Pricing" — one line per cost item: label = item, value = price (with currency), notes = unit price / VAT info.
4. "Deadlines" — TWO lines minimum:
     • label "Invoice deadline", value = payment due date.
     • label "Delivery deadline", value = on-site delivery date.
     Add extra deadline lines if more dates appear (pickup, return, setup-by).
5. "Delivery plan" — lines describing: delivery address, drop-off time window, on-site contact, vehicle/access notes, return/pickup plan.

Be exhaustive. Prices, quantities and dates are MANDATORY when present — never skip them.`,
  cooking_equipment:
    "Extract cooking equipment per concept. Group into categories: cooking appliances, prep tools, serving equipment, small wares, spare parts.",
  safety_compliance:
    "This is a safety / compliance document. Extract sections like Fire safety, Gas safety, Food hygiene, Allergens, Certificates & permits, Risk assessment, Emergency contacts, Inspection checklist, Expiry dates.",
  setup_timeline:
    "This is a setup timeline / schedule. Extract steps and group by phase (Pre-festival, Build days D-3/D-2/D-1, Festival days, Teardown). Include owners and times when present.",
  transportation:
    "This relates to transportation. Extract: Vehicles, Drivers, Loads, Trips, Schedule, Documents.",
  power_requirements:
    "This is an electricity / power order. Extract per zone or per concept: plug types (16A/32A/63A), phase (1P/3P), counts, cable length, total kW.",
};

const SUMMARY_INSTRUCTION = `

IMPORTANT:
- Always populate the "summary" field with a thorough plain-text summary (5-15 lines) of EVERYTHING you can read in the document — supplier, items, prices, dates, addresses, contacts, notes. This is the user's safety net if structured extraction misses something.
- Then, in addition, organise the same information into the requested sections + lines.
- If the document is a scan / image / unclear, do your best OCR and still write the summary with whatever you can read.`;

// ===== Output schema for Claude =====

const STRUCTURE_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description: "1-to-2 paragraph plain-text summary of every relevant detail found in the document.",
    },
    sections: {
      type: "array",
      description: "Logical sections found in the document.",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          lines: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string", description: "Item name / left-side label." },
                value: { type: "string", description: "Right-side value (spec, amount, date, etc.)." },
                quantity: { type: "string", description: "How many." },
                notes: { type: "string" },
                status: { type: "string", description: "todo/done/ordered/blocked — if discoverable." },
              },
              required: ["label"],
            },
          },
        },
        required: ["title", "lines"],
      },
    },
  },
  required: ["sections"],
};

type ExtractedLine = {
  label?: string;
  value?: string;
  quantity?: string;
  notes?: string;
  status?: string;
};
type ExtractedSection = {
  title: string;
  description?: string;
  lines?: ExtractedLine[];
};
type ExtractedShape = { summary?: string; sections?: ExtractedSection[] };

// ===== Validation warnings =====

export type ValidationWarning = {
  field: string;
  message: string;
  severity: "error" | "warn";
};

function hasNonEmpty(v: unknown): boolean {
  return v != null && String(v).trim() !== "";
}

/**
 * Per-card validation of the AI-extracted sections. Ports the rules from
 * the Lovable function. Anything missing becomes a warning the user can
 * then dismiss with a reason.
 */
function validateExtraction(cardKey: string, sections: ExtractedSection[]): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const allLines = sections.flatMap((s) =>
    (s.lines ?? []).map((l) => ({ ...l, _section: (s.title ?? "").toLowerCase() })),
  );
  const findLine = (re: RegExp) =>
    allLines.find((l) => re.test(`${l.label ?? ""} ${l._section ?? ""}`.toLowerCase()));

  if (cardKey === "cooling_storage") {
    const unitLines = allLines.filter((l) =>
      /(fridge|freezer|container|cold|køl|frys|kühl|gefrier)/i.test(
        `${l.label ?? ""} ${l._section ?? ""}`,
      ),
    );
    if (unitLines.length === 0) {
      warnings.push({
        field: "unit_type",
        message: "No fridge / freezer / container units detected. Add the unit type(s).",
        severity: "error",
      });
    } else {
      const missingSize = unitLines.filter((l) => !hasNonEmpty(l.value));
      const missingQty = unitLines.filter((l) => !hasNonEmpty(l.quantity));
      if (missingSize.length) {
        warnings.push({
          field: "unit_size",
          message: `${missingSize.length} cooling unit(s) missing size/capacity.`,
          severity: "error",
        });
      }
      if (missingQty.length) {
        warnings.push({
          field: "unit_quantity",
          message: `${missingQty.length} cooling unit(s) missing quantity.`,
          severity: "error",
        });
      }
    }

    const invoiceDeadline = findLine(/invoice|payment|betaling|faktura|pay.*by|due/);
    if (!invoiceDeadline || !hasNonEmpty(invoiceDeadline.value)) {
      warnings.push({
        field: "invoice_deadline",
        message: "No invoice/payment deadline found.",
        severity: "warn",
      });
    }
    const deliveryDeadline = findLine(/deliver|drop.?off|on.?site|levering|leverings/);
    if (!deliveryDeadline || !hasNonEmpty(deliveryDeadline.value)) {
      warnings.push({
        field: "delivery_deadline",
        message: "No on-site delivery deadline found.",
        severity: "error",
      });
    }

    const supplier = allLines.find((l) =>
      /supplier|vendor|firma|company|leverandør/i.test(`${l.label ?? ""} ${l._section ?? ""}`),
    );
    if (!supplier || !hasNonEmpty(supplier.value)) {
      warnings.push({ field: "supplier", message: "Supplier name missing.", severity: "warn" });
    }

    const pricing = allLines.find((l) =>
      /(price|cost|kr|dkk|eur|usd|amount|total|pris)/i.test(
        `${l.label ?? ""} ${l.value ?? ""} ${l._section ?? ""}`,
      ),
    );
    if (!pricing) {
      warnings.push({ field: "pricing", message: "No pricing detected.", severity: "warn" });
    }

    const deliveryPlan = sections.find((s) =>
      /delivery.*plan|delivery|drop|leverings/i.test(s.title ?? ""),
    );
    if (!deliveryPlan || (deliveryPlan.lines ?? []).length === 0) {
      warnings.push({
        field: "delivery_plan",
        message: "Delivery plan (address, time window, on-site contact) is missing.",
        severity: "warn",
      });
    }
  }

  return warnings;
}

// ===== File fetcher =====

async function fetchFileBytes(s3Key: string): Promise<Buffer> {
  const { url } = await storageGet(s3Key);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`S3 download failed: HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  return buf;
}

function isPdf(mime: string | null | undefined, filename: string | null | undefined): boolean {
  if (mime === "application/pdf") return true;
  if (filename && /\.pdf$/i.test(filename)) return true;
  return false;
}

function isImage(mime: string | null | undefined, filename: string | null | undefined): boolean {
  if (mime && mime.startsWith("image/")) return true;
  if (filename && /\.(png|jpe?g|gif|webp)$/i.test(filename)) return true;
  return false;
}

function isPlainText(mime: string | null | undefined, filename: string | null | undefined): boolean {
  if (mime && (/^text\//.test(mime) || /\b(csv|json|xml|html|markdown)\b/.test(mime))) return true;
  if (filename && /\.(txt|csv|json|xml|html|md)$/i.test(filename)) return true;
  return false;
}

// ===== Main =====

export async function extractSmartCardFile(fileId: number): Promise<{
  ok: true;
  sectionsCreated: number;
  summary: string;
  warnings: ValidationWarning[];
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Load file + card
  const file = await sdb.getFileById(fileId);
  if (!file) throw new Error("File not found");
  const card = await sdb.getCardById(file.cardId);
  if (!card) throw new Error("Card not found");

  await db.update(smartFiles).set({ parseStatus: "processing", parseError: null }).where(eq(smartFiles.id, fileId));

  try {
    const cardPrompt = CARD_PROMPTS[card.cardKey] ?? "Extract logical sections and lines from this document.";
    const prompt = cardPrompt + SUMMARY_INSTRUCTION;

    // Build the user-content array (text + file content)
    const userContent: any[] = [];

    if (isPlainText(file.mimeType, file.filename)) {
      const bytes = await fetchFileBytes(file.s3Key);
      const text = bytes.toString("utf8").slice(0, 60_000);
      userContent.push({
        type: "text",
        text: `${prompt}\n\nDocument filename: ${file.filename ?? "(unknown)"}\n\nDocument content:\n${text}`,
      });
    } else if (isPdf(file.mimeType, file.filename)) {
      const bytes = await fetchFileBytes(file.s3Key);
      const b64 = bytes.toString("base64");
      userContent.push({
        type: "file_url",
        file_url: {
          url: `data:application/pdf;base64,${b64}`,
          mime_type: "application/pdf" as const,
        },
      });
      userContent.push({
        type: "text",
        text: `${prompt}\n\nDocument filename: ${file.filename ?? "(unknown)"}\n\nPlease read the attached PDF and structure it.`,
      });
    } else if (isImage(file.mimeType, file.filename)) {
      const bytes = await fetchFileBytes(file.s3Key);
      const b64 = bytes.toString("base64");
      const mime = file.mimeType && file.mimeType.startsWith("image/") ? file.mimeType : "image/jpeg";
      userContent.push({
        type: "image_url",
        image_url: {
          url: `data:${mime};base64,${b64}`,
          detail: "high" as const,
        },
      });
      userContent.push({
        type: "text",
        text: `${prompt}\n\nDocument filename: ${file.filename ?? "(unknown)"}\n\nPlease read the attached image (OCR if needed) and structure it.`,
      });
    } else {
      // Unsupported binary type — fall back to filename-only
      userContent.push({
        type: "text",
        text: `${prompt}\n\nDocument filename: ${file.filename ?? "(unknown)"}\nMIME: ${file.mimeType ?? "unknown"}\n(Binary file the AI cannot read directly — produce sensible default sections from the filename so the user can edit.)`,
      });
    }

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You read messy real-world documents (including scanned PDFs and photos) and structure them into clean editable sections + lines for a festival operations app. Always perform OCR on images/PDFs. Always fill the summary field, even when structure is unclear. Respond ONLY with valid JSON matching the provided schema — no markdown fences, no commentary.",
        },
        { role: "user", content: userContent },
      ],
      responseFormat: {
        type: "json_schema",
        json_schema: { name: "structure_card", schema: STRUCTURE_SCHEMA },
      },
      maxTokens: 4096,
    });

    const rawText = (response.choices[0]?.message?.content as string) ?? "";
    let extracted: ExtractedShape;
    try {
      // Strip potential markdown fences defensively
      const cleaned = rawText
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/i, "")
        .trim();
      extracted = JSON.parse(cleaned);
    } catch (e) {
      throw new Error(`AI returned non-JSON output: ${(e as Error).message}`);
    }

    const extractedSections: ExtractedSection[] = Array.isArray(extracted.sections)
      ? extracted.sections
      : [];
    const summaryText = (extracted.summary ?? "").trim();

    // Prepend a "Document summary" section so the user has the raw AI read
    const allSections: ExtractedSection[] = [];
    if (summaryText) {
      allSections.push({
        title: `📄 Document summary — ${file.filename ?? "uploaded file"}`,
        description: "Raw AI read of the document. Move/split any line into the right section manually.",
        lines: [
          {
            label: "Summary",
            value: summaryText,
            notes: "Source: AI OCR/read of the uploaded document.",
          },
        ],
      });
    }
    for (const s of extractedSections) allSections.push(s);

    // Find starting order_index for this card
    let order = await sdb.nextSectionOrderIndex(card.id);
    let sectionsCreated = 0;
    for (const s of allSections) {
      const [section] = await db
        .insert(smartSections)
        .values({
          cardId: card.id,
          title: s.title ?? "Section",
          description: s.description ?? null,
          orderIndex: order++,
          source: "ai",
          sourceFileId: fileId,
        })
        .returning();
      sectionsCreated++;
      const lineValues = (s.lines ?? []).map((l, i) => ({
        sectionId: section.id,
        label: l.label ?? null,
        value: l.value ?? null,
        quantity: l.quantity ?? null,
        notes: l.notes ?? null,
        status: l.status ?? null,
        orderIndex: i,
        source: "ai" as const,
        sourceFileId: fileId,
      }));
      if (lineValues.length > 0) {
        await db.insert(smartLines).values(lineValues);
      }
    }

    const warnings = validateExtraction(card.cardKey, extractedSections);

    await db
      .update(smartFiles)
      .set({
        parseStatus: "done",
        aiSummary: summaryText || null,
        warnings,
        parseError: null,
      })
      .where(eq(smartFiles.id, fileId));

    // Best-effort: feed brain_entries so the next festival gets suggestions
    try {
      const rows = [];
      for (const s of extractedSections) {
        for (const l of s.lines ?? []) {
          if (!l.label) continue;
          rows.push({
            keyName: `${card.cardKey}:${(s.title ?? "").toLowerCase()}:${l.label.toLowerCase()}`.slice(0, 250),
            displayName: `${s.title} — ${l.label}`.slice(0, 250),
            category: card.cardKey,
            source: "ai_extraction" as const,
            scope: card.conceptId ? ("concept" as const) : ("festival" as const),
            festivalId: card.festivalId,
            lastSeenFestivalId: card.festivalId,
            subjectType: card.cardKey,
            subjectId: String(card.conceptId ?? card.festivalId),
            content: [l.value, l.quantity, l.notes].filter(Boolean).join(" — "),
            structuredData: {
              section: s.title,
              label: l.label,
              value: l.value ?? null,
              quantity: l.quantity ?? null,
              notes: l.notes ?? null,
            },
            tags: [card.cardKey, s.title ?? ""].filter(Boolean),
            frequency: 1,
            confidence: "0.6",
          });
        }
      }
      if (rows.length > 0) {
        await db.insert(brainEntries).values(rows);
      }
    } catch (e) {
      console.error("[SmartCardExtract] brain feed failed:", (e as Error).message);
    }

    return { ok: true, sectionsCreated, summary: summaryText, warnings };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[SmartCardExtract] Extraction failed for file ${fileId}:`, msg);
    await db
      .update(smartFiles)
      .set({ parseStatus: "error", parseError: msg })
      .where(eq(smartFiles.id, fileId));
    throw err;
  }
}

/**
 * Dismiss a single validation warning on a file (user explains why it's
 * actually not missing). Mirrors the Lovable UX.
 */
export async function dismissFileWarning(fileId: number, field: string, reason: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const file = await sdb.getFileById(fileId);
  if (!file) throw new Error("File not found");
  const meta = (file.meta ?? {}) as Record<string, unknown>;
  const dismissed = { ...((meta.dismissed_warnings as Record<string, string>) ?? {}), [field]: reason };
  await db
    .update(smartFiles)
    .set({ meta: { ...meta, dismissed_warnings: dismissed } })
    .where(eq(smartFiles.id, fileId));
}

export async function restoreFileWarning(fileId: number, field: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const file = await sdb.getFileById(fileId);
  if (!file) throw new Error("File not found");
  const meta = (file.meta ?? {}) as Record<string, unknown>;
  const dismissed = { ...((meta.dismissed_warnings as Record<string, string>) ?? {}) };
  delete dismissed[field];
  await db
    .update(smartFiles)
    .set({ meta: { ...meta, dismissed_warnings: dismissed } })
    .where(eq(smartFiles.id, fileId));
}
