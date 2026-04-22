/**
 * Jelling 2026 seed orchestrator.
 *
 * Idempotent on festival slug: the teardown step wipes every Jelling-scoped
 * row (concepts, staff, shifts, action items, vehicles, accommodation,
 * trolleys, trolley items, answers, and the festival row itself) before
 * anything inserts. Master schema (sections + questions) is preserved
 * between runs so admin edits in /admin/sections aren't clobbered.
 *
 * Run with:
 *   pnpm tsx scripts/seed-jelling-2026/index.ts
 * or (if the npm script is registered):
 *   pnpm seed:jelling
 *
 * Requires DATABASE_URL. On hard-check failure, exits non-zero.
 */

import "dotenv/config";
import { seedMasterSchema } from "./00-master-schema";
import { seedFestival } from "./01-festival";
import { seedConcepts } from "./02-concepts";
import { seedStaff } from "./03-staff";
import { seedVagtplan } from "./04-vagtplan";
import { seedActionItems } from "./05-action-items";
import { seedVehicles } from "./06-vehicles";
import { seedAccommodation } from "./07-accommodation";
import { seedTrolleys } from "./08-trolleys";
import { seedAnswers } from "./09-answers";
import { verifyAndWriteReport } from "./10-verify";
import { JELLING_SLUG, teardownJelling } from "./_shared";

async function main() {
  console.log(`\n=== Seeding ${JELLING_SLUG} ===\n`);

  console.log("→ Teardown existing Jelling rows");
  await teardownJelling();

  console.log("→ 00 master schema (sections + questions)");
  const masterSchema = await seedMasterSchema();
  console.log(
    masterSchema.skipped
      ? `  skipped: ${masterSchema.sections} sections / ${masterSchema.questions} questions already present`
      : `  inserted: ${masterSchema.sections} sections, ${masterSchema.questions} questions`,
  );

  console.log("→ 01 festival");
  const festivalId = await seedFestival();
  console.log(`  festivalId = ${festivalId}`);

  console.log("→ 02 concepts");
  const concepts = await seedConcepts(festivalId);
  console.log(`  ${concepts.size} concepts`);

  console.log("→ 03 staff");
  const staffRows = await seedStaff(festivalId, concepts);
  console.log(`  ${staffRows} staff rows`);

  console.log("→ 04 vagtplan shifts");
  const shiftRows = await seedVagtplan(concepts);
  console.log(`  ${shiftRows} shift rows`);

  console.log("→ 05 action items");
  const actionItemRows = await seedActionItems(festivalId);
  console.log(`  ${actionItemRows} action items`);

  console.log("→ 06 vehicles");
  const vehicleRows = await seedVehicles(festivalId);
  console.log(`  ${vehicleRows} vehicles`);

  console.log("→ 07 accommodation");
  const accomRows = await seedAccommodation(festivalId);
  console.log(`  ${accomRows} accommodation bookings`);

  console.log("→ 08 BC trolleys");
  const trolleyRows = await seedTrolleys(concepts);
  console.log(`  ${trolleyRows} trolleys`);

  console.log("→ 09 scalar answers");
  const answers = await seedAnswers(festivalId);
  console.log(
    `  ${answers.inserted} answers inserted${
      answers.missing.length > 0 ? ` (${answers.missing.length} missing keys)` : ""
    }`,
  );

  console.log("\n→ 10 verify + write SEED_VERIFICATION.md");
  const result = await verifyAndWriteReport({
    festivalId,
    masterSchema,
    staffRows,
    shiftRows,
    answersInserted: answers.inserted,
    answersMissingKeys: answers.missing,
  });

  console.log(result.ok ? "\n✔ Seed complete — hard checks passed.\n" : "\n✘ Seed complete — hard checks FAILED.\n");
  process.exit(result.ok ? 0 : 1);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
