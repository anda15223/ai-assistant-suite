import { insertBcTrolley } from "../../server/planDb";
import type { ConceptMap } from "./_shared";

/**
 * 2 trolleys per concept (Kitchen + Front). 4 concepts × 2 = 8 trolleys.
 * Items are intentionally empty — §4.9 flags an open action item
 * (deadline 2026-05-05) to fill trolley contents via the /trolleys sub-editor.
 */
export async function seedTrolleys(concepts: ConceptMap): Promise<number> {
  let count = 0;
  for (const conceptId of concepts.values()) {
    await insertBcTrolley({ conceptId, trolleyNumber: 1, label: "Kitchen" });
    await insertBcTrolley({ conceptId, trolleyNumber: 2, label: "Front" });
    count += 2;
  }
  return count;
}
