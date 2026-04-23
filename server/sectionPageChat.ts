/**
 * Section-page AI chat — Claude tool-use port of the Lovable
 * `section-page-chat` edge function.
 *
 * Scope is a whole festival *section* (e.g. "cooling_storage") rather
 * than a single SmartCard. Claude is given:
 *   - the section's scalar questions with current answers
 *   - the section's existing action items
 *   - the SmartCard state (sections + lines + files with warnings) IF
 *     a SmartCard exists for this section
 * …and can:
 *   - update_answer  → upsert a scalar planAnswer
 *   - create_action_item → insert a planActionItem tagged with sectionKey
 *   - add_card_line / update_card_line → mutate the SmartCard (if any)
 *   - dismiss_file_warning → mark a smart_files warning as intentional
 */

import Anthropic from "@anthropic-ai/sdk";
import { ENV } from "./_core/env";
import * as pdb from "./planDb";
import * as sdb from "./smartCardDb";
import { dismissFileWarning } from "./smartCardExtract";

const MODEL = "claude-sonnet-4-5-20250514";
const MAX_ITERATIONS = 5;
const SOFT_TIMEOUT_MS = 60_000;

// ===== Tools =====

const TOOLS: Anthropic.Tool[] = [
  {
    name: "update_answer",
    description:
      "Set or update the answer to one of this section's scalar questions. Use the question_key shown in CONTEXT.questions[*].key.",
    input_schema: {
      type: "object",
      properties: {
        question_key: { type: "string" },
        value: {
          description:
            "Plain value: string for text, number for numeric, ISO date YYYY-MM-DD for dates, true/false for booleans, array of strings for multi-selects.",
        },
      },
      required: ["question_key", "value"],
    },
  },
  {
    name: "create_action_item",
    description:
      "Create an action item / todo attached to this festival section with optional deadline and owner.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        deadline: { type: "string", description: "YYYY-MM-DD" },
        owner: { type: "string" },
        priority: { type: "string", enum: ["low", "normal", "high", "hard_deadline"] },
        notes: { type: "string" },
      },
      required: ["title"],
    },
  },
  {
    name: "add_card_line",
    description:
      "Add a NEW line to the SmartCard of this section. Only call when the user explicitly asks to add something new and a SmartCard exists in CONTEXT.smart_card.",
    input_schema: {
      type: "object",
      properties: {
        section_title: { type: "string", description: "The SmartCard subsection the line goes in (match or create)." },
        label: { type: "string" },
        value: { type: "string" },
        quantity: { type: "string" },
        notes: { type: "string" },
        due_date: { type: "string", description: "YYYY-MM-DD" },
      },
      required: ["section_title"],
    },
  },
  {
    name: "update_card_line",
    description:
      "Update an EXISTING SmartCard line by its id (see CONTEXT.smart_card.lines[*].id). Only set the fields the user asked to change.",
    input_schema: {
      type: "object",
      properties: {
        line_id: { type: "number" },
        label: { type: "string" },
        value: { type: "string" },
        quantity: { type: "string" },
        notes: { type: "string" },
        due_date: { type: "string" },
      },
      required: ["line_id"],
    },
  },
  {
    name: "dismiss_file_warning",
    description:
      "Mark a validation warning on an uploaded source file as resolved/intentional, with the user's reason. Use when the user EXPLAINS why a 'missing' flag is actually correct.",
    input_schema: {
      type: "object",
      properties: {
        file_id: { type: "number" },
        field: { type: "string", description: "Warning field key (see CONTEXT.smart_card.files[*].warnings[*].field)." },
        reason: { type: "string", description: "User's explanation in their own words." },
      },
      required: ["file_id", "field", "reason"],
    },
  },
];

// ===== Tool executor =====

type ToolResult = { ok: true; [k: string]: unknown } | { ok: false; error: string };

async function executeTool(
  name: string,
  input: Record<string, unknown>,
  ctx: SectionContext,
): Promise<ToolResult> {
  try {
    switch (name) {
      case "update_answer": {
        const qKey = String(input.question_key ?? "");
        const q = ctx.questions.find((x) => x.key === qKey);
        if (!q) return { ok: false, error: `Unknown question_key: ${qKey}` };
        await pdb.upsertAnswer({
          festivalId: ctx.festivalId,
          questionId: q.id,
          value: input.value as any,
          valueType: q.kind as "text" | "number" | "date" | "datetime" | "single_select" | "multi_select",
        });
        return { ok: true, question_key: q.key };
      }
      case "create_action_item": {
        const rawPriority = (input.priority as string | undefined) ?? "normal";
        const priority: "low" | "normal" | "high" | "hard_deadline" =
          rawPriority === "low" || rawPriority === "high" || rawPriority === "hard_deadline"
            ? rawPriority
            : "normal";
        const id = await pdb.insertActionItem({
          festivalId: ctx.festivalId,
          sectionKey: ctx.sectionKey,
          title: String(input.title ?? ""),
          deadline: typeof input.deadline === "string" ? new Date(input.deadline) : null,
          owner: (input.owner as string | undefined) ?? null,
          priority,
          notes: (input.notes as string | undefined) ?? null,
          status: "open",
        });
        return { ok: true, action_item_id: id };
      }
      case "add_card_line": {
        if (!ctx.card) return { ok: false, error: "No SmartCard exists for this section." };
        const sectionTitle = String(input.section_title ?? "");
        // Find or create the subsection inside the SmartCard
        const full = await sdb.getCardFull(ctx.card.id);
        const match = full?.sections.find((s) => s.title.toLowerCase() === sectionTitle.toLowerCase());
        let cardSectionId = match?.id;
        if (!cardSectionId) {
          const orderIndex = await sdb.nextSectionOrderIndex(ctx.card.id);
          const created = await sdb.addSection({
            cardId: ctx.card.id,
            title: sectionTitle || "New section",
            orderIndex,
            source: "ai",
          });
          cardSectionId = created.id;
        }
        const lineOrder = await sdb.nextLineOrderIndex(cardSectionId);
        const row = await sdb.addLine({
          sectionId: cardSectionId,
          label: (input.label as string | undefined) ?? null,
          value: (input.value as string | undefined) ?? null,
          quantity: (input.quantity as string | undefined) ?? null,
          notes: (input.notes as string | undefined) ?? null,
          dueDate: typeof input.due_date === "string" ? new Date(input.due_date) : null,
          orderIndex: lineOrder,
          source: "ai",
        });
        return { ok: true, line_id: row.id, section_id: cardSectionId };
      }
      case "update_card_line": {
        if (!ctx.card) return { ok: false, error: "No SmartCard exists for this section." };
        const patch: any = {};
        for (const k of ["label", "value", "quantity", "notes"]) {
          if (typeof input[k] === "string") patch[k] = input[k];
        }
        if (typeof input.due_date === "string") patch.dueDate = new Date(input.due_date);
        if (Object.keys(patch).length === 0) {
          return { ok: false, error: "Nothing to update" };
        }
        await sdb.updateLine(Number(input.line_id), patch);
        return { ok: true };
      }
      case "dismiss_file_warning": {
        if (!ctx.card) return { ok: false, error: "No SmartCard / files in this section." };
        await dismissFileWarning(
          Number(input.file_id),
          String(input.field ?? ""),
          String(input.reason ?? ""),
        );
        return { ok: true };
      }
      default:
        return { ok: false, error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ===== Context =====

type SectionContext = {
  festivalId: number;
  festivalName: string;
  sectionKey: string;
  sectionTitle: string;
  questions: Array<{ id: number; key: string; prompt: string; kind: string; currentValue: unknown }>;
  actionItems: Array<{
    id: number;
    title: string;
    deadline: Date | null;
    status: string;
    priority: string;
    owner: string | null;
  }>;
  card: {
    id: number;
    title: string | null;
    sections: Array<{ id: number; title: string }>;
    lines: Array<{
      id: number;
      sectionId: number;
      sectionTitle: string | undefined;
      label: string | null;
      value: string | null;
      quantity: string | null;
      notes: string | null;
      dueDate: Date | null;
    }>;
    files: Array<{
      id: number;
      filename: string | null;
      warnings: Array<{ field: string; message: string; severity: string; dismissed: boolean; dismissReason: string | null }>;
    }>;
  } | null;
};

async function buildContext(params: {
  festivalId: number;
  sectionKey: string;
}): Promise<SectionContext> {
  const [festival, section] = await Promise.all([
    pdb.getFestivalById(params.festivalId),
    pdb.getSectionByKey(params.sectionKey),
  ]);
  if (!festival) throw new Error("Festival not found");
  if (!section) throw new Error(`Unknown section: ${params.sectionKey}`);

  const [allQuestions, answers, actionItems, card] = await Promise.all([
    pdb.listQuestions(section.id),
    pdb.listAnswersByFestival(params.festivalId),
    pdb.listActionItems(params.festivalId, params.sectionKey),
    sdb.findCard({ festivalId: params.festivalId, cardKey: params.sectionKey }),
  ]);

  const questions = allQuestions.map((q) => ({
    id: q.id,
    key: q.key,
    prompt: q.prompt,
    kind: q.kind,
    currentValue: answers.find((a) => a.questionId === q.id)?.value ?? null,
  }));

  let cardCtx: SectionContext["card"] = null;
  if (card) {
    const full = await sdb.getCardFull(card.id);
    if (full) {
      const sectionsById = new Map(full.sections.map((s) => [s.id, s]));
      cardCtx = {
        id: full.card.id,
        title: full.card.title,
        sections: full.sections.map((s) => ({ id: s.id, title: s.title })),
        lines: full.lines.map((l) => ({
          id: l.id,
          sectionId: l.sectionId,
          sectionTitle: sectionsById.get(l.sectionId)?.title,
          label: l.label,
          value: l.value,
          quantity: l.quantity,
          notes: l.notes,
          dueDate: l.dueDate,
        })),
        files: full.files.map((f) => {
          const dismissedMap =
            ((f.meta as any)?.dismissed_warnings as Record<string, string> | undefined) ?? {};
          const rawWarnings = Array.isArray(f.warnings) ? (f.warnings as any[]) : [];
          return {
            id: f.id,
            filename: f.filename,
            warnings: rawWarnings.map((w: any) => ({
              field: w.field,
              message: w.message,
              severity: w.severity,
              dismissed: !!dismissedMap[w.field],
              dismissReason: dismissedMap[w.field] ?? null,
            })),
          };
        }),
      };
    }
  }

  return {
    festivalId: params.festivalId,
    festivalName: festival.name,
    sectionKey: section.key,
    sectionTitle: section.title,
    questions,
    actionItems: actionItems.map((a) => ({
      id: a.id,
      title: a.title,
      deadline: a.deadline,
      status: a.status,
      priority: a.priority,
      owner: a.owner,
    })),
    card: cardCtx,
  };
}

function buildSystemPrompt(ctx: SectionContext): string {
  return `You are a focused festival-planning assistant attached to ONE specific section page.
Festival: ${ctx.festivalName}
Section: "${ctx.sectionTitle}" (key: ${ctx.sectionKey})
Today: ${new Date().toISOString().slice(0, 10)}

STRICT RULES:
1. Do EXACTLY what the user asks. Nothing more, nothing less. Never "tidy up", "improve", rename, reformat or fill in adjacent fields the user did not mention.
2. If the request is ambiguous or you are not 100% sure which question / line / file it refers to, ASK A SHORT CLARIFYING QUESTION instead of calling a tool.
3. Never invent data. If the user does not give you a value, do not make one up.
4. Prefer updating existing items over creating new ones. To change a SmartCard line, use update_card_line with its line_id from CONTEXT.smart_card.lines — do NOT call add_card_line for edits.
5. When the user EXPLAINS that a "missing" validation flag is actually intentional, call dismiss_file_warning with the matching file_id + warning.field + the user's reason. Do NOT change the line's data in that case.
6. Only act on THIS section. If the user asks about another section, say so and stop.
7. After your tool calls, reply in ONE short sentence stating exactly what you changed (or what you need clarified). Never claim to have done something you did not call a tool for.

AVAILABLE TOOLS:
- update_answer(question_key, value) — for the section's scalar questions.
- create_action_item(title, deadline?, owner?, priority?, notes?) — for todos/action items.
${ctx.card
  ? "- add_card_line(section_title, ...) — only for NEW lines on the SmartCard.\n- update_card_line(line_id, ...) — to edit an existing SmartCard line; only set fields the user mentioned.\n- dismiss_file_warning(file_id, field, reason) — to mark a 'missing' flag as intentional with the user's explanation."
  : "- (No SmartCard on this section — only update_answer and create_action_item are usable.)"}

CONTEXT (JSON):
${JSON.stringify(
  {
    festival: { id: ctx.festivalId, name: ctx.festivalName },
    section: { key: ctx.sectionKey, title: ctx.sectionTitle },
    questions: ctx.questions,
    action_items: ctx.actionItems,
    smart_card: ctx.card,
  },
  null,
  2,
)}`;
}

// ===== Main =====

export type ChatHistoryMessage = { role: "user" | "assistant"; content: string };
export type ExecutedAction = {
  tool: string;
  input: Record<string, unknown>;
  result: ToolResult;
};

export async function sendSectionChatMessage(params: {
  festivalId: number;
  sectionKey: string;
  message: string;
  history: ChatHistoryMessage[];
}): Promise<{ reply: string; actions: ExecutedAction[] }> {
  if (!ENV.anthropicApiKey) throw new Error("ANTHROPIC_API_KEY is not configured");
  const client = new Anthropic({ apiKey: ENV.anthropicApiKey });
  const ctx = await buildContext({ festivalId: params.festivalId, sectionKey: params.sectionKey });
  const systemPrompt = buildSystemPrompt(ctx);

  const anthropicMessages: Anthropic.MessageParam[] = [
    ...params.history.slice(-12).map((m) => ({
      role: m.role,
      content: m.content,
    })),
    { role: "user", content: params.message },
  ];

  const actions: ExecutedAction[] = [];
  const startTime = Date.now();
  let lastText = "";

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    if (Date.now() - startTime > SOFT_TIMEOUT_MS) {
      console.log("[SectionPageChat] Soft timeout");
      break;
    }

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      tools: TOOLS,
      messages: anthropicMessages,
    });

    let turnText = "";
    for (const block of response.content) {
      if (block.type === "text") turnText += block.text;
    }
    if (turnText) lastText = turnText;

    if (response.stop_reason === "end_turn" || response.stop_reason === "stop_sequence") {
      return { reply: lastText || "Done.", actions };
    }

    if (response.stop_reason === "tool_use") {
      anthropicMessages.push({ role: "assistant", content: response.content });
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type === "tool_use") {
          const result = await executeTool(
            block.name,
            block.input as Record<string, unknown>,
            ctx,
          );
          actions.push({
            tool: block.name,
            input: block.input as Record<string, unknown>,
            result,
          });
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        }
      }
      anthropicMessages.push({ role: "user", content: toolResults });
      continue;
    }

    break;
  }

  return { reply: lastText || "Done.", actions };
}
