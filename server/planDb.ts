import { and, asc, eq, sql } from "drizzle-orm";
import { getDb } from "./db";
import {
  planOrgs,
  planFestivals,
  planSections,
  planQuestions,
  planAnswers,
  planConcepts,
  planStaff,
  planVagtplanShifts,
  planActionItems,
  planVehicles,
  planAccommodation,
  planBcTrolleys,
  planBcTrolleyItems,
} from "../drizzle/schema";
import type {
  InsertPlanOrg,
  InsertPlanFestival,
  InsertPlanSection,
  InsertPlanQuestion,
  InsertPlanAnswer,
  InsertPlanConcept,
  InsertPlanStaff,
  InsertPlanVagtplanShift,
  InsertPlanActionItem,
  InsertPlanVehicle,
  InsertPlanAccommodation,
  InsertPlanBcTrolley,
  InsertPlanBcTrolleyItem,
  PlanFestival,
} from "../drizzle/schema";

/**
 * Festival Planner database layer.
 *
 * Mirrors the `getDb() ?? fallback` style of server/db.ts so that a missing
 * DATABASE_URL or failed connection results in empty reads instead of throws.
 * Writes still throw when the DB is unavailable because losing a write
 * silently is strictly worse than failing loudly.
 */

// ===== ORG =====

export async function ensureDefaultOrg(): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(planOrgs).limit(1);
  if (existing.length > 0) return existing[0].id;
  const [row] = await db
    .insert(planOrgs)
    .values({ name: "Fidibus Team" })
    .returning({ id: planOrgs.id });
  return row.id;
}

export async function listOrgs() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(planOrgs).orderBy(asc(planOrgs.id));
}

export async function insertOrg(data: InsertPlanOrg): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db.insert(planOrgs).values(data).returning({ id: planOrgs.id });
  return row.id;
}

// ===== FESTIVALS =====

export async function listFestivals(): Promise<PlanFestival[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(planFestivals).orderBy(asc(planFestivals.startDate));
}

export async function getFestivalBySlug(slug: string): Promise<PlanFestival | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(planFestivals).where(eq(planFestivals.slug, slug)).limit(1);
  return result[0];
}

export async function getFestivalById(id: number): Promise<PlanFestival | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(planFestivals).where(eq(planFestivals.id, id)).limit(1);
  return result[0];
}

export async function insertFestival(data: InsertPlanFestival): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db.insert(planFestivals).values(data).returning({ id: planFestivals.id });
  return row.id;
}

export async function updateFestival(id: number, data: Partial<InsertPlanFestival>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(planFestivals).set(data).where(eq(planFestivals.id, id));
}

// ===== SECTIONS =====

export async function listSections() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(planSections).orderBy(asc(planSections.orderIndex));
}

export async function getSectionByKey(key: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(planSections).where(eq(planSections.key, key)).limit(1);
  return result[0];
}

export async function insertSection(data: InsertPlanSection): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db.insert(planSections).values(data).returning({ id: planSections.id });
  return row.id;
}

export async function updateSection(id: number, data: Partial<InsertPlanSection>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(planSections).set(data).where(eq(planSections.id, id));
}

export async function deleteSection(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(planSections).where(eq(planSections.id, id));
}

// ===== QUESTIONS =====

export async function listQuestions(sectionId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (sectionId !== undefined) {
    return db
      .select()
      .from(planQuestions)
      .where(eq(planQuestions.sectionId, sectionId))
      .orderBy(asc(planQuestions.orderIndex));
  }
  return db.select().from(planQuestions).orderBy(asc(planQuestions.orderIndex));
}

export async function insertQuestion(data: InsertPlanQuestion): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db.insert(planQuestions).values(data).returning({ id: planQuestions.id });
  return row.id;
}

export async function updateQuestion(id: number, data: Partial<InsertPlanQuestion>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(planQuestions).set(data).where(eq(planQuestions.id, id));
}

export async function deleteQuestion(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(planQuestions).where(eq(planQuestions.id, id));
}

// ===== ANSWERS =====

export async function listAnswersByFestival(festivalId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(planAnswers).where(eq(planAnswers.festivalId, festivalId));
}

export async function upsertAnswer(data: InsertPlanAnswer): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Unique index on (festivalId, questionId) makes this a proper upsert.
  const existing = await db
    .select()
    .from(planAnswers)
    .where(
      and(eq(planAnswers.festivalId, data.festivalId), eq(planAnswers.questionId, data.questionId)),
    )
    .limit(1);
  if (existing.length > 0) {
    await db
      .update(planAnswers)
      .set({ value: data.value, valueType: data.valueType, updatedAt: new Date() })
      .where(eq(planAnswers.id, existing[0].id));
    return existing[0].id;
  }
  const [row] = await db.insert(planAnswers).values(data).returning({ id: planAnswers.id });
  return row.id;
}

// ===== CONCEPTS =====

export async function listConcepts(festivalId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(planConcepts)
    .where(eq(planConcepts.festivalId, festivalId))
    .orderBy(asc(planConcepts.orderIndex));
}

export async function insertConcept(data: InsertPlanConcept): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db.insert(planConcepts).values(data).returning({ id: planConcepts.id });
  return row.id;
}

// ===== STAFF =====

export async function listStaff(festivalId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(planStaff).where(eq(planStaff.festivalId, festivalId));
}

export async function insertStaff(data: InsertPlanStaff): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db.insert(planStaff).values(data).returning({ id: planStaff.id });
  return row.id;
}

// ===== VAGTPLAN =====

export async function listVagtplanShifts(festivalId: number) {
  const db = await getDb();
  if (!db) return [];
  // Join through concepts so the caller can filter by festival directly.
  return db
    .select({
      shift: planVagtplanShifts,
      conceptName: planConcepts.name,
    })
    .from(planVagtplanShifts)
    .innerJoin(planConcepts, eq(planVagtplanShifts.conceptId, planConcepts.id))
    .where(eq(planConcepts.festivalId, festivalId))
    .orderBy(asc(planVagtplanShifts.day), asc(planVagtplanShifts.orderIndex));
}

export async function insertVagtplanShift(data: InsertPlanVagtplanShift): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db
    .insert(planVagtplanShifts)
    .values(data)
    .returning({ id: planVagtplanShifts.id });
  return row.id;
}

export async function totalVagtplanHours(festivalId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  // Compute hours in SQL: sum(peopleCount * (endTime - startTime as minutes) / 60).
  // We store times as "HH:MM" strings; parse to epoch-ish minutes and handle
  // the overnight case (e.g. 23:00 -> 02:00 should be 3 hours, not -21).
  const shifts = await db
    .select({ s: planVagtplanShifts })
    .from(planVagtplanShifts)
    .innerJoin(planConcepts, eq(planVagtplanShifts.conceptId, planConcepts.id))
    .where(eq(planConcepts.festivalId, festivalId));
  let total = 0;
  for (const { s } of shifts) {
    const [sh, sm] = s.startTime.split(":").map(Number);
    const [eh, em] = s.endTime.split(":").map(Number);
    let minutes = eh * 60 + em - (sh * 60 + sm);
    if (minutes < 0) minutes += 24 * 60;
    total += (minutes / 60) * s.peopleCount;
  }
  return total;
}

// ===== ACTION ITEMS =====

export async function listActionItems(festivalId: number, sectionKey?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(planActionItems.festivalId, festivalId)];
  if (sectionKey) conditions.push(eq(planActionItems.sectionKey, sectionKey));
  return db
    .select()
    .from(planActionItems)
    .where(and(...conditions))
    .orderBy(asc(planActionItems.deadline));
}

export async function insertActionItem(data: InsertPlanActionItem): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db
    .insert(planActionItems)
    .values(data)
    .returning({ id: planActionItems.id });
  return row.id;
}

// ===== VEHICLES =====

export async function listVehicles(festivalId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(planVehicles).where(eq(planVehicles.festivalId, festivalId));
}

export async function insertVehicle(data: InsertPlanVehicle): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db.insert(planVehicles).values(data).returning({ id: planVehicles.id });
  return row.id;
}

// ===== ACCOMMODATION =====

export async function listAccommodation(festivalId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(planAccommodation).where(eq(planAccommodation.festivalId, festivalId));
}

export async function insertAccommodation(data: InsertPlanAccommodation): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db
    .insert(planAccommodation)
    .values(data)
    .returning({ id: planAccommodation.id });
  return row.id;
}

// ===== BC TROLLEYS =====

export async function listBcTrolleys(festivalId: number) {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select({ trolley: planBcTrolleys, concept: planConcepts })
    .from(planBcTrolleys)
    .innerJoin(planConcepts, eq(planBcTrolleys.conceptId, planConcepts.id))
    .where(eq(planConcepts.festivalId, festivalId));
  return result.map((r) => ({ ...r.trolley, conceptName: r.concept.name }));
}

export async function insertBcTrolley(data: InsertPlanBcTrolley): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db.insert(planBcTrolleys).values(data).returning({ id: planBcTrolleys.id });
  return row.id;
}

export async function listBcTrolleyItems(trolleyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(planBcTrolleyItems)
    .where(eq(planBcTrolleyItems.trolleyId, trolleyId))
    .orderBy(asc(planBcTrolleyItems.orderIndex));
}

export async function insertBcTrolleyItem(data: InsertPlanBcTrolleyItem): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db
    .insert(planBcTrolleyItems)
    .values(data)
    .returning({ id: planBcTrolleyItems.id });
  return row.id;
}

// ===== COMPLETION % =====

/**
 * Completion indicator per section for a festival.
 *
 * - For sections with a subEditorRoute: use a rule of thumb per sectionKey
 *   (e.g. staffing is "complete" when every concept has at least one shift
 *   on every festival day). Returns a 0–1 ratio.
 * - For scalar sections: answered questions / total questions.
 *
 * Kept simple on purpose — the UI only needs a progress dot, not a proof.
 */
export async function sectionCompletion(
  festivalId: number,
): Promise<Record<string, { answered: number; total: number; ratio: number }>> {
  const db = await getDb();
  if (!db) return {};

  const [sections, questions, answers, concepts, shifts, vehicles, accom, trolleys] =
    await Promise.all([
      db.select().from(planSections).orderBy(asc(planSections.orderIndex)),
      db.select().from(planQuestions),
      db.select().from(planAnswers).where(eq(planAnswers.festivalId, festivalId)),
      listConcepts(festivalId),
      listVagtplanShifts(festivalId),
      listVehicles(festivalId),
      listAccommodation(festivalId),
      listBcTrolleys(festivalId),
    ]);

  const answeredByQ = new Set(answers.map((a) => a.questionId));
  const result: Record<string, { answered: number; total: number; ratio: number }> = {};

  for (const section of sections) {
    const sectionQuestions = questions.filter((q) => q.sectionId === section.id);

    // Sub-editor-backed sections: completion comes from record counts,
    // not from the scalar-question table (which is usually empty or tiny).
    if (section.subEditorRoute) {
      let answered = 0;
      let total = 1;
      switch (section.key) {
        case "concepts":
          answered = concepts.length;
          total = 4; // target count for Jelling; cheap heuristic
          break;
        case "staffing": {
          // "Complete" = each concept has shifts across all 4 festival days
          const byConceptDay = new Set<string>();
          for (const row of shifts) {
            const dayKey = row.shift.day.toISOString().slice(0, 10);
            byConceptDay.add(`${row.shift.conceptId}|${dayKey}`);
          }
          answered = byConceptDay.size;
          total = concepts.length * 4;
          break;
        }
        case "setup_timeline":
          answered = 0; // timeline sub-editor not built yet in Sprint 1+2
          total = 1;
          break;
        case "transportation":
          answered = vehicles.length + accom.length;
          total = 7 + 3; // Jelling target; becomes a real computation later
          break;
        case "bc_trolleys":
          answered = trolleys.length;
          total = concepts.length * 2;
          break;
        default:
          answered = 0;
          total = 1;
      }
      const ratio = total > 0 ? Math.min(1, answered / total) : 0;
      result[section.key] = { answered, total, ratio };
      continue;
    }

    // Scalar sections: answered-questions / total-questions
    const total = sectionQuestions.length;
    const answered = sectionQuestions.filter((q) => answeredByQ.has(q.id)).length;
    const ratio = total === 0 ? 0 : answered / total;
    result[section.key] = { answered, total, ratio };
  }

  return result;
}

// ===== DIAGNOSTIC =====

export async function countPlannerRows(festivalId: number) {
  const db = await getDb();
  if (!db) {
    return {
      concepts: 0,
      staff: 0,
      shifts: 0,
      actionItems: 0,
      vehicles: 0,
      accommodation: 0,
      trolleys: 0,
      answers: 0,
    };
  }
  const [c] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(planConcepts)
    .where(eq(planConcepts.festivalId, festivalId));
  const [s] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(planStaff)
    .where(eq(planStaff.festivalId, festivalId));
  const [a] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(planActionItems)
    .where(eq(planActionItems.festivalId, festivalId));
  const [v] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(planVehicles)
    .where(eq(planVehicles.festivalId, festivalId));
  const [ac] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(planAccommodation)
    .where(eq(planAccommodation.festivalId, festivalId));
  const [ans] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(planAnswers)
    .where(eq(planAnswers.festivalId, festivalId));
  // shifts + trolleys both go through concepts
  const [sh] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(planVagtplanShifts)
    .innerJoin(planConcepts, eq(planVagtplanShifts.conceptId, planConcepts.id))
    .where(eq(planConcepts.festivalId, festivalId));
  const [t] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(planBcTrolleys)
    .innerJoin(planConcepts, eq(planBcTrolleys.conceptId, planConcepts.id))
    .where(eq(planConcepts.festivalId, festivalId));
  return {
    concepts: c?.n ?? 0,
    staff: s?.n ?? 0,
    shifts: sh?.n ?? 0,
    actionItems: a?.n ?? 0,
    vehicles: v?.n ?? 0,
    accommodation: ac?.n ?? 0,
    trolleys: t?.n ?? 0,
    answers: ans?.n ?? 0,
  };
}
