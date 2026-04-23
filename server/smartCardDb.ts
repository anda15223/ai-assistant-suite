import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { getDb } from "./db";
import {
  smartCards,
  smartSections,
  smartLines,
  smartFiles,
  smartTodos,
  smartChatMessages,
  brainEntries,
  festivalContacts,
  festivalExtraDetails,
} from "../drizzle/schema";
import type {
  InsertSmartCard,
  InsertSmartSection,
  InsertSmartLine,
  InsertSmartTodo,
  InsertSmartFile,
  InsertFestivalContact,
  InsertFestivalExtraDetail,
} from "../drizzle/schema";
import { storageGet } from "./storage";

/**
 * SmartCard database layer. Mirrors planDb.ts style:
 *   - reads fall back to empty when DB is unavailable
 *   - writes throw loudly
 */

// ===== CARDS =====

export async function getOrCreateCard(params: {
  festivalId: number;
  cardKey: string;
  conceptId?: number | null;
  title?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conceptCondition =
    params.conceptId == null
      ? sql`${smartCards.conceptId} IS NULL`
      : eq(smartCards.conceptId, params.conceptId);
  const existing = await db
    .select()
    .from(smartCards)
    .where(
      and(
        eq(smartCards.festivalId, params.festivalId),
        eq(smartCards.cardKey, params.cardKey),
        conceptCondition,
      ),
    )
    .limit(1);
  if (existing.length > 0) return existing[0];
  const [created] = await db
    .insert(smartCards)
    .values({
      festivalId: params.festivalId,
      conceptId: params.conceptId ?? null,
      cardKey: params.cardKey,
      title: params.title ?? null,
    })
    .returning();
  return created;
}

export async function getCardById(cardId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(smartCards).where(eq(smartCards.id, cardId)).limit(1);
  return rows[0] ?? null;
}

/**
 * Find an existing SmartCard for a (festival, cardKey [, concept]) tuple
 * WITHOUT creating it. Returns null if none exists.
 */
export async function findCard(params: {
  festivalId: number;
  cardKey: string;
  conceptId?: number | null;
}) {
  const db = await getDb();
  if (!db) return null;
  const conceptCondition =
    params.conceptId == null
      ? sql`${smartCards.conceptId} IS NULL`
      : eq(smartCards.conceptId, params.conceptId);
  const rows = await db
    .select()
    .from(smartCards)
    .where(
      and(
        eq(smartCards.festivalId, params.festivalId),
        eq(smartCards.cardKey, params.cardKey),
        conceptCondition,
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function getCardFull(cardId: number) {
  const db = await getDb();
  if (!db) return null;
  const card = await getCardById(cardId);
  if (!card) return null;
  const [sections, rawFiles, todos] = await Promise.all([
    db.select().from(smartSections).where(eq(smartSections.cardId, cardId)).orderBy(asc(smartSections.orderIndex)),
    db.select().from(smartFiles).where(eq(smartFiles.cardId, cardId)).orderBy(desc(smartFiles.uploadedAt)),
    db.select().from(smartTodos).where(eq(smartTodos.cardId, cardId)).orderBy(asc(smartTodos.orderIndex)),
  ]);
  const sectionIds = sections.map(s => s.id);
  const lines = sectionIds.length
    ? await db.select().from(smartLines).where(inArray(smartLines.sectionId, sectionIds)).orderBy(asc(smartLines.orderIndex))
    : [];
  // Enrich each file with a fresh 1-hour presigned GET URL. The url column
  // in DB is a cached convenience — but presigned URLs expire, so we always
  // re-sign on read.
  const files = await Promise.all(
    rawFiles.map(async (f) => {
      try {
        const { url } = await storageGet(f.s3Key);
        return { ...f, url };
      } catch {
        return f; // fall back to stored url
      }
    }),
  );
  return { card, sections, lines, files, todos };
}

// ===== FILES =====

export async function addFile(values: InsertSmartFile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db.insert(smartFiles).values(values).returning();
  return row;
}

export async function getFileById(fileId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(smartFiles).where(eq(smartFiles.id, fileId)).limit(1);
  return rows[0] ?? null;
}

export async function deleteFile(fileId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(smartFiles).where(eq(smartFiles.id, fileId));
}

export async function updateFileMeta(
  fileId: number,
  patch: Partial<Pick<InsertSmartFile, "meta" | "warnings" | "parseStatus" | "parseError" | "aiSummary" | "extractedText">>,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(smartFiles).set(patch).where(eq(smartFiles.id, fileId));
}

// ===== CHAT MESSAGES =====

export async function listChatMessages(cardId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(smartChatMessages)
    .where(eq(smartChatMessages.cardId, cardId))
    .orderBy(desc(smartChatMessages.createdAt))
    .limit(limit);
  // Return chronological (oldest → newest)
  return rows.reverse();
}

export async function insertChatMessage(values: {
  cardId: number;
  role: "user" | "assistant" | "tool";
  content: string;
  toolCalls?: unknown[] | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db
    .insert(smartChatMessages)
    .values({
      cardId: values.cardId,
      role: values.role,
      content: values.content,
      toolCalls: values.toolCalls ?? null,
    })
    .returning();
  return row;
}

// ===== FESTIVAL-WIDE LIST (for PDF report) =====

/**
 * Every SmartCard for a festival plus its sections and lines, in one call.
 * Shape is denormalised for easy consumption in the PDF report.
 */
export async function listCardsByFestival(festivalId: number) {
  const db = await getDb();
  if (!db) return [];
  const cards = await db.select().from(smartCards).where(eq(smartCards.festivalId, festivalId));
  if (cards.length === 0) return [];
  const cardIds = cards.map((c) => c.id);
  const sections = await db
    .select()
    .from(smartSections)
    .where(inArray(smartSections.cardId, cardIds))
    .orderBy(asc(smartSections.orderIndex));
  const sectionIds = sections.map((s) => s.id);
  const lines = sectionIds.length
    ? await db
        .select()
        .from(smartLines)
        .where(inArray(smartLines.sectionId, sectionIds))
        .orderBy(asc(smartLines.orderIndex))
    : [];
  return cards.map((c) => ({
    ...c,
    sections: sections
      .filter((s) => s.cardId === c.id)
      .map((s) => ({
        ...s,
        lines: lines.filter((l) => l.sectionId === s.id),
      })),
  }));
}

// ===== BRAIN-GRAB (reusable knowledge from past festivals) =====

/**
 * Group brain_entries by (section title) for a given cardKey, preferring
 * entries from other festivals (so a fresh festival gets warm suggestions).
 * Within each section, lines are sorted by frequency desc then recency.
 */
export async function grabBrainSuggestions(params: {
  cardKey: string;
  excludeFestivalId?: number;
  conceptId?: number | null;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(brainEntries.category, params.cardKey)];
  if (params.excludeFestivalId != null) {
    conditions.push(ne(brainEntries.festivalId, params.excludeFestivalId));
  }
  if (params.conceptId != null) {
    conditions.push(eq(brainEntries.subjectId, String(params.conceptId)));
  }
  const rows = await db
    .select()
    .from(brainEntries)
    .where(and(...conditions))
    .orderBy(desc(brainEntries.frequency), desc(brainEntries.lastSeenAt))
    .limit(params.limit ?? 200);

  // Group by section title (from structuredData.section)
  const groups = new Map<
    string,
    Array<{
      label: string;
      value: string | null;
      quantity: string | null;
      notes: string | null;
      frequency: number;
    }>
  >();
  for (const r of rows) {
    const sd = (r.structuredData as any) ?? {};
    const sectionTitle = String(sd.section ?? r.displayName ?? "General");
    const label = String(sd.label ?? r.displayName ?? "");
    if (!label) continue;
    const bucket = groups.get(sectionTitle) ?? [];
    // Dedupe by label — keep the first occurrence (highest frequency per order)
    if (!bucket.some((b) => b.label.toLowerCase() === label.toLowerCase())) {
      bucket.push({
        label,
        value: sd.value ?? null,
        quantity: sd.quantity ?? null,
        notes: sd.notes ?? null,
        frequency: r.frequency,
      });
    }
    groups.set(sectionTitle, bucket);
  }

  return Array.from(groups.entries()).map(([title, lines]) => ({ title, lines }));
}

/**
 * Apply a set of grabbed sections+lines into a specific card, tagging them
 * source='brain'. Idempotent-ish: if a section with the same title already
 * exists on the card we append lines to it instead of creating a duplicate.
 */
export async function applyBrainSuggestions(params: {
  cardId: number;
  suggestions: Array<{
    title: string;
    lines: Array<{
      label: string;
      value?: string | null;
      quantity?: string | null;
      notes?: string | null;
    }>;
  }>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(smartSections)
    .where(eq(smartSections.cardId, params.cardId));
  const byTitle = new Map(existing.map((s) => [s.title.toLowerCase(), s]));

  let sectionsCreated = 0;
  let linesCreated = 0;
  let nextOrder = existing.length
    ? Math.max(...existing.map((s) => s.orderIndex)) + 1
    : 0;

  for (const suggestion of params.suggestions) {
    let sectionId: number;
    const matching = byTitle.get(suggestion.title.toLowerCase());
    if (matching) {
      sectionId = matching.id;
    } else {
      const [created] = await db
        .insert(smartSections)
        .values({
          cardId: params.cardId,
          title: suggestion.title,
          orderIndex: nextOrder++,
          source: "brain",
        })
        .returning();
      sectionId = created.id;
      sectionsCreated++;
    }
    if (suggestion.lines.length === 0) continue;
    // Start new lines after existing
    const [orderRow] = await db
      .select({ max: sql<number>`COALESCE(MAX(${smartLines.orderIndex}), -1)::int` })
      .from(smartLines)
      .where(eq(smartLines.sectionId, sectionId));
    let lineOrder = (orderRow?.max ?? -1) + 1;
    const values = suggestion.lines.map((l) => ({
      sectionId,
      label: l.label,
      value: l.value ?? null,
      quantity: l.quantity ?? null,
      notes: l.notes ?? null,
      orderIndex: lineOrder++,
      source: "brain" as const,
    }));
    await db.insert(smartLines).values(values);
    linesCreated += values.length;
  }

  return { sectionsCreated, linesCreated };
}

// ===== SECTIONS =====

export async function addSection(values: InsertSmartSection) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db.insert(smartSections).values(values).returning();
  return row;
}

export async function updateSection(
  sectionId: number,
  patch: Partial<Pick<InsertSmartSection, "title" | "description" | "orderIndex">>,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(smartSections).set(patch).where(eq(smartSections.id, sectionId));
}

export async function deleteSection(sectionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Cascade lines manually (no FK constraint in migration — keep it simple)
  await db.delete(smartLines).where(eq(smartLines.sectionId, sectionId));
  await db.delete(smartSections).where(eq(smartSections.id, sectionId));
}

export async function nextSectionOrderIndex(cardId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const [row] = await db
    .select({ max: sql<number>`COALESCE(MAX(${smartSections.orderIndex}), -1)::int` })
    .from(smartSections)
    .where(eq(smartSections.cardId, cardId));
  return (row?.max ?? -1) + 1;
}

// ===== LINES =====

export async function addLine(values: InsertSmartLine) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db.insert(smartLines).values(values).returning();
  return row;
}

export async function updateLine(
  lineId: number,
  patch: Partial<Pick<InsertSmartLine, "label" | "value" | "quantity" | "notes" | "status" | "owner" | "dueDate" | "orderIndex">>,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(smartLines).set(patch).where(eq(smartLines.id, lineId));
}

export async function deleteLine(lineId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(smartLines).where(eq(smartLines.id, lineId));
}

export async function nextLineOrderIndex(sectionId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const [row] = await db
    .select({ max: sql<number>`COALESCE(MAX(${smartLines.orderIndex}), -1)::int` })
    .from(smartLines)
    .where(eq(smartLines.sectionId, sectionId));
  return (row?.max ?? -1) + 1;
}

// ===== TODOS =====

export async function addTodo(values: InsertSmartTodo) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db.insert(smartTodos).values(values).returning();
  return row;
}

export async function updateTodo(
  todoId: number,
  patch: Partial<Pick<InsertSmartTodo, "title" | "description" | "dueDate" | "owner" | "status" | "orderIndex">>,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(smartTodos).set(patch).where(eq(smartTodos.id, todoId));
}

export async function deleteTodo(todoId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(smartTodos).where(eq(smartTodos.id, todoId));
}

export async function nextTodoOrderIndex(cardId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const [row] = await db
    .select({ max: sql<number>`COALESCE(MAX(${smartTodos.orderIndex}), -1)::int` })
    .from(smartTodos)
    .where(eq(smartTodos.cardId, cardId));
  return (row?.max ?? -1) + 1;
}

// ===== CONTACTS =====

export async function listContacts(festivalId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(festivalContacts)
    .where(eq(festivalContacts.festivalId, festivalId))
    .orderBy(asc(festivalContacts.orderIndex));
}

export async function addContact(values: InsertFestivalContact) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db.insert(festivalContacts).values(values).returning();
  return row;
}

export async function updateContact(
  contactId: number,
  patch: Partial<Pick<InsertFestivalContact, "name" | "role" | "phone" | "email" | "notes" | "orderIndex">>,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(festivalContacts).set(patch).where(eq(festivalContacts.id, contactId));
}

export async function deleteContact(contactId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(festivalContacts).where(eq(festivalContacts.id, contactId));
}

// ===== EXTRA DETAILS =====

export async function listExtraDetails(festivalId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(festivalExtraDetails)
    .where(eq(festivalExtraDetails.festivalId, festivalId))
    .orderBy(asc(festivalExtraDetails.orderIndex));
}

export async function addExtraDetail(values: InsertFestivalExtraDetail) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db.insert(festivalExtraDetails).values(values).returning();
  return row;
}

export async function updateExtraDetail(
  id: number,
  patch: Partial<Pick<InsertFestivalExtraDetail, "label" | "value" | "notes" | "orderIndex">>,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(festivalExtraDetails).set(patch).where(eq(festivalExtraDetails.id, id));
}

export async function deleteExtraDetail(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(festivalExtraDetails).where(eq(festivalExtraDetails.id, id));
}
