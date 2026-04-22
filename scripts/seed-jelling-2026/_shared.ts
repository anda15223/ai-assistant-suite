/**
 * Shared constants and helpers for the Jelling 2026 seed.
 *
 * Idempotent by festival slug. The orchestrator wipes all Jelling-scoped
 * rows (concepts, staff, shifts, action items, vehicles, accommodation,
 * trolleys, trolley items, answers) before any step inserts, so re-running
 * the seed produces the same end state every time.
 */

import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../../server/db";
import {
  planAccommodation,
  planActionItems,
  planAnswers,
  planBcTrolleyItems,
  planBcTrolleys,
  planConcepts,
  planFestivals,
  planStaff,
  planVagtplanShifts,
  planVehicles,
} from "../../drizzle/schema";

export const JELLING_SLUG = "jelling-2026";

// Expected counts from §4 of the handover. The verify step hard-fails when
// any of these mismatch what actually got inserted — except person-hours,
// which is a computed-from-shifts total that doesn't reconcile cleanly
// (see 10-verify.ts for the detailed note).
export const EXPECTED = {
  concepts: 4,
  actionItems: 35,
  vehicles: 7,
  accommodation: 3,
  trolleys: 8,
  personHoursHandoverClaim: 1673.5,
} as const;

export type ConceptMap = Map<string, number>;
export type QuestionMap = Map<string, number>;

/**
 * Wipe every Jelling-scoped row before reseeding. Ordered so foreign-key
 * dependencies resolve (children before parents). No-ops when the festival
 * doesn't exist yet (fresh DB). Sections and questions are NOT touched —
 * they're master schema shared across festivals.
 */
export async function teardownJelling(): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const festivals = await db
    .select({ id: planFestivals.id })
    .from(planFestivals)
    .where(eq(planFestivals.slug, JELLING_SLUG));
  if (festivals.length === 0) return;
  const festivalId = festivals[0].id;

  const conceptRows = await db
    .select({ id: planConcepts.id })
    .from(planConcepts)
    .where(eq(planConcepts.festivalId, festivalId));
  const conceptIds = conceptRows.map((r) => r.id);

  if (conceptIds.length > 0) {
    const trolleyRows = await db
      .select({ id: planBcTrolleys.id })
      .from(planBcTrolleys)
      .where(inArray(planBcTrolleys.conceptId, conceptIds));
    const trolleyIds = trolleyRows.map((r) => r.id);
    if (trolleyIds.length > 0) {
      await db
        .delete(planBcTrolleyItems)
        .where(inArray(planBcTrolleyItems.trolleyId, trolleyIds));
      await db.delete(planBcTrolleys).where(inArray(planBcTrolleys.id, trolleyIds));
    }
    await db.delete(planVagtplanShifts).where(inArray(planVagtplanShifts.conceptId, conceptIds));
  }

  await db.delete(planAnswers).where(eq(planAnswers.festivalId, festivalId));
  await db.delete(planActionItems).where(eq(planActionItems.festivalId, festivalId));
  await db.delete(planVehicles).where(eq(planVehicles.festivalId, festivalId));
  await db.delete(planAccommodation).where(eq(planAccommodation.festivalId, festivalId));
  await db.delete(planStaff).where(eq(planStaff.festivalId, festivalId));
  await db.delete(planConcepts).where(eq(planConcepts.festivalId, festivalId));
  await db.delete(planFestivals).where(eq(planFestivals.id, festivalId));
}

export function festivalDate(iso: string): Date {
  // Midnight UTC — enough precision for the `day` column used in vagtplan
  // shifts and for festival start/end dates.
  return new Date(`${iso}T00:00:00Z`);
}

export function assertEq(
  label: string,
  actual: number,
  expected: number,
  tolerance = 0,
): { ok: boolean; line: string } {
  const diff = Math.abs(actual - expected);
  const ok = diff <= tolerance;
  const line = `${ok ? "✔" : "✘"} ${label}: got ${actual}, expected ${expected}${
    tolerance > 0 ? ` (±${tolerance})` : ""
  }`;
  return { ok, line };
}
