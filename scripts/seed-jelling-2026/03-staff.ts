import { insertStaff } from "../../server/planDb";
import { CHICKS, CREPERIE, FISH, GYROS } from "./02-concepts";
import type { ConceptMap } from "./_shared";

/**
 * Staff seed per §4.3 of the handover.
 *
 * - Named managers (Fif, Marius) — conceptId = null, is_manager, is_setup_crew
 * - Named setup crew (Costel, Marko, Anca) — conceptId = null, is_setup_crew
 * - Unnamed Søborg shift workers per concept (19 total) — per-concept role split
 * - Unnamed local hires (20 total) — per-concept role split, name = null
 *
 * Concept-assigned headcount: 19 Søborg + 20 local = 39 (matches §4.8).
 * Plus 5 named manager/setup rows → 44 staff rows total.
 */
export async function seedStaff(festivalId: number, concepts: ConceptMap): Promise<number> {
  const fishId = concepts.get(FISH)!;
  const gyrosId = concepts.get(GYROS)!;
  const creperieId = concepts.get(CREPERIE)!;
  const chicksId = concepts.get(CHICKS)!;
  let count = 0;

  // ---- Named managers (also counted as setup crew) ----
  await insertStaff({
    festivalId,
    conceptId: null,
    name: "Alexandra Artimon (Fif)",
    source: "soborg",
    role: "Manager",
    isManager: true,
    isSetupCrew: true,
    wristbandType: "black_partout",
  });
  count++;
  await insertStaff({
    festivalId,
    conceptId: null,
    name: "Marius Artimon",
    source: "soborg",
    role: "Manager",
    isManager: true,
    isSetupCrew: true,
    wristbandType: "black_partout",
  });
  count++;

  // ---- Named setup crew (not managers) ----
  for (const { name, role } of [
    { name: "Costel", role: "Setup / Logistics / Levnedsmiddel lead" },
    { name: "Marko", role: "Setup crew" },
    { name: "Anca", role: "Setup crew" },
  ]) {
    await insertStaff({
      festivalId,
      conceptId: null,
      name,
      source: "soborg",
      role,
      isManager: false,
      isSetupCrew: true,
      wristbandType: "black_partout",
    });
    count++;
  }

  // ---- Per-concept Søborg shift workers (unnamed placeholders) ----
  const soborgSplit: Array<{ conceptId: number; roles: string[] }> = [
    { conceptId: fishId, roles: ["Fish cook", "Fries cook", "Burger", "Assembly lead"] },
    { conceptId: gyrosId, roles: ["Pita", "Griddle", "Wrap", "Wrap assembly", "Assembly lead"] },
    { conceptId: creperieId, roles: [
      "Pancake cook (shift 1)",
      "Pancake cook (shift 2)",
      "Pancake cook (shift 3)",
      "Assembly lead (shift A)",
      "Assembly lead (shift B)",
    ] },
    { conceptId: chicksId, roles: [
      "Chicken cook (shift 1)",
      "Chicken cook (shift 2)",
      "Chicken cook (shift 3)",
      "Assembly lead (shift A)",
      "Assembly lead (shift B)",
    ] },
  ];
  let soborgIdx = 1;
  for (const group of soborgSplit) {
    for (const role of group.roles) {
      await insertStaff({
        festivalId,
        conceptId: group.conceptId,
        name: `Søborg shift worker #${soborgIdx}`,
        source: "soborg",
        role,
        isManager: false,
        isSetupCrew: false,
        wristbandType: null,
      });
      soborgIdx++;
      count++;
    }
  }

  // ---- Per-concept local hires (unnamed, name = null) ----
  const localSplit: Array<{ conceptId: number; roles: string[] }> = [
    { conceptId: fishId, roles: ["Assembly", "Cashier", "Cashier", "Runner"] },
    { conceptId: gyrosId, roles: ["Oven/Runner", "Assembly", "Cashier", "Cashier"] },
    { conceptId: creperieId, roles: ["Cashier", "Cashier", "Assembly", "Runner/Prep", "Runner/Prep"] },
    { conceptId: chicksId, roles: ["Assembly", "Cashier", "Cashier", "Cashier", "Runner", "Runner", "Runner"] },
  ];
  let localIdx = 1;
  for (const group of localSplit) {
    for (const role of group.roles) {
      await insertStaff({
        festivalId,
        conceptId: group.conceptId,
        name: null,
        source: "local",
        role: `Local hire #${localIdx} — ${role}`,
        isManager: false,
        isSetupCrew: false,
        wristbandType: null,
      });
      localIdx++;
      count++;
    }
  }

  return count;
}
