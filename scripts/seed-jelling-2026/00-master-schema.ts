/**
 * Seed master schema: the 14 sections and every scalar question.
 *
 * This step is global (not Jelling-scoped) and idempotent via "skip if the
 * sections table is non-empty" — so Fif's admin edits in /admin/sections
 * are not overwritten by rerunning the Jelling seed. When she wants a fresh
 * schema, she truncates plan_sections + plan_questions manually.
 */

import { getDb } from "../../server/db";
import {
  insertSection,
  listSections,
  listQuestions,
  insertQuestion,
} from "../../server/planDb";

type QuestionSpec = {
  key: string;
  prompt: string;
  kind: "single_select" | "multi_select" | "text" | "number" | "date" | "datetime";
  options?: { label: string; value: string }[];
  helpText?: string;
  required?: boolean;
};

type SectionSpec = {
  key: string;
  title: string;
  description?: string;
  category: string;
  subEditorRoute?: string;
  questions: QuestionSpec[];
};

const SECTIONS: SectionSpec[] = [
  {
    key: "intro",
    title: "Introduction",
    category: "planning",
    questions: [
      { key: "festival_organiser_contact_name", prompt: "Festival organiser contact (name)", kind: "text" },
      { key: "festival_organiser_contact_phone", prompt: "Festival organiser contact (phone)", kind: "text" },
      { key: "festival_organiser_contact_email", prompt: "Festival organiser contact (email)", kind: "text" },
    ],
  },
  {
    key: "concepts",
    title: "Concepts",
    category: "planning",
    subEditorRoute: "/festivals/:slug/concepts",
    questions: [],
  },
  {
    key: "equipment_list",
    title: "Equipment List (tables, countertops, DAKA)",
    category: "logistics",
    questions: [
      { key: "stilladsbar_inside", prompt: "Stilladsbar count (INSIDE)", kind: "number" },
      { key: "stilladsbar_camping", prompt: "Stilladsbar count (CAMPING)", kind: "number" },
      { key: "folding_tables_inside", prompt: "Folding tables (INSIDE)", kind: "number" },
      { key: "folding_tables_camping", prompt: "Folding tables (CAMPING)", kind: "number" },
      { key: "countertops_per_concept", prompt: "Countertops per concept", kind: "number", helpText: "Default: 2" },
      { key: "daka_containers_per_concept", prompt: "DAKA containers per concept", kind: "number", helpText: "Default: 2" },
    ],
  },
  {
    key: "facade",
    title: "Façade",
    category: "logistics",
    questions: [
      { key: "facade_designer", prompt: "Façade designer", kind: "text" },
      { key: "facade_status_fish", prompt: "Fish & Chips façade status", kind: "single_select", options: [
        { label: "Print ready", value: "print_ready" },
        { label: "In progress", value: "in_progress" },
        { label: "Not started", value: "not_started" },
      ] },
      { key: "facade_status_gyros", prompt: "Gyros by Gaia façade status", kind: "single_select", options: [
        { label: "Print ready", value: "print_ready" },
        { label: "In progress", value: "in_progress" },
        { label: "Not started", value: "not_started" },
      ] },
      { key: "facade_status_creperie", prompt: "La Creperie façade status", kind: "single_select", options: [
        { label: "Print ready", value: "print_ready" },
        { label: "In progress", value: "in_progress" },
        { label: "Not started", value: "not_started" },
      ] },
      { key: "facade_status_chicks", prompt: "Chicks 'n' Buns façade status", kind: "single_select", options: [
        { label: "Print ready", value: "print_ready" },
        { label: "In progress", value: "in_progress" },
        { label: "Not started", value: "not_started" },
      ] },
      { key: "facade_print_deadline", prompt: "Façade print deadline", kind: "date" },
      { key: "br18_2026_compliance", prompt: "BR18 2026 compliance", kind: "single_select", options: [
        { label: "Fidibus handling", value: "fidibus_handling" },
        { label: "TFP handling", value: "tfp_handling" },
        { label: "Not yet", value: "not_yet" },
      ] },
    ],
  },
  {
    key: "cooling_storage",
    title: "Cooling & Storage",
    category: "logistics",
    questions: [
      { key: "container_supplier", prompt: "Container supplier", kind: "single_select", options: [
        { label: "Godik", value: "godik" },
        { label: "Other", value: "other" },
      ] },
      { key: "container_booking_number", prompt: "Container booking number", kind: "text" },
      { key: "container_count", prompt: "Container count", kind: "number" },
      { key: "container_size", prompt: "Container size", kind: "single_select", options: [
        { label: "20ft", value: "20ft" },
        { label: "10ft", value: "10ft" },
        { label: "Custom", value: "custom" },
      ] },
      { key: "container_item_code", prompt: "Container item code", kind: "text" },
      { key: "container_modes", prompt: "Container modes", kind: "multi_select", options: [
        { label: "INSIDE = fridge only", value: "inside_fridge" },
        { label: "INSIDE = freezer", value: "inside_freezer" },
        { label: "CAMPING = fridge", value: "camping_fridge" },
        { label: "CAMPING = freezer", value: "camping_freezer" },
        { label: "CAMPING = TBD", value: "camping_tbd" },
      ] },
      { key: "delivery_date", prompt: "Delivery date", kind: "date" },
      { key: "pickup_date", prompt: "Pickup date", kind: "date" },
      { key: "payment_due", prompt: "Payment due", kind: "date" },
      { key: "total_cost_incl_vat_dkk", prompt: "Total cost incl. VAT (DKK)", kind: "number" },
      { key: "godik_contact_name", prompt: "Godik contact name", kind: "text" },
      { key: "godik_contact_phone", prompt: "Godik contact phone", kind: "text" },
      { key: "godik_24h_service", prompt: "Godik 24h service number", kind: "text" },
    ],
  },
  {
    key: "power",
    title: "Power Requirements",
    category: "logistics",
    questions: [
      { key: "baseline_amp_per_concept", prompt: "Baseline amperage per concept", kind: "text", helpText: "Default: 1×16A" },
      { key: "contracted_baseline_total", prompt: "Contracted baseline total", kind: "text" },
      { key: "gas_needed", prompt: "Gas needed", kind: "single_select", options: [
        { label: "Yes", value: "yes" },
        { label: "No", value: "no" },
      ] },
      { key: "gas_supplier", prompt: "Gas supplier", kind: "text" },
    ],
  },
  {
    key: "staffing",
    title: "Staffing & Vagtplaner",
    category: "operations",
    subEditorRoute: "/festivals/:slug/staffing",
    questions: [
      { key: "total_headcount", prompt: "Total headcount", kind: "number" },
      { key: "soborg_count", prompt: "Søborg count", kind: "number" },
      { key: "local_count", prompt: "Local hire count", kind: "number" },
      { key: "manager_count", prompt: "Manager count", kind: "number" },
      { key: "setup_crew_count", prompt: "Setup crew count", kind: "number" },
      { key: "saturday_peak_extension", prompt: "Saturday peak extension", kind: "single_select", options: [
        { label: "Yes, extend to 23:00", value: "yes_extend_to_23" },
        { label: "No, same as Fri/Sun", value: "no_same_as_fri_sun" },
      ] },
      { key: "camping_arrival_time", prompt: "Camping staff arrival time", kind: "single_select", options: [
        { label: "06:00", value: "06:00" },
        { label: "06:30", value: "06:30" },
        { label: "07:00 (on open)", value: "07:00_on_open" },
      ] },
      { key: "thursday_arrival_time_inside_fish", prompt: "Thursday arrival (Fish)", kind: "single_select", options: [
        { label: "09:00", value: "09:00" },
        { label: "10:00", value: "10:00" },
        { label: "Later", value: "later" },
      ] },
      { key: "thursday_arrival_time_inside_gyros", prompt: "Thursday arrival (Gyros)", kind: "single_select", options: [
        { label: "09:00", value: "09:00" },
        { label: "10:00", value: "10:00" },
        { label: "Later", value: "later" },
      ] },
      { key: "total_wristbands_requested", prompt: "Total wristbands requested", kind: "number" },
      { key: "total_person_hours", prompt: "Total person hours (computed)", kind: "number" },
    ],
  },
  {
    key: "cooking_equipment",
    title: "Cooking Equipment per Concept",
    category: "operations",
    questions: [
      { key: "fish_fryer_strategy", prompt: "Fish fryer strategy", kind: "single_select", options: [
        { label: "All-electric (2×32A + 5×16A Amitek)", value: "all_electric_2x32a_5x16a_amitek" },
        { label: "Hybrid", value: "hybrid" },
        { label: "All-gas", value: "all_gas" },
        { label: "Pending", value: "pending" },
      ] },
      { key: "gyros_gas", prompt: "Gyros gas", kind: "single_select", options: [
        { label: "Yes — Ronny VVS Fagor", value: "yes_ronny_vvs_fagor" },
        { label: "No", value: "no" },
      ] },
      { key: "pancake_plate_count", prompt: "Pancake plate count (La Creperie)", kind: "number" },
      { key: "chicks_equipment", prompt: "Chicks 'n' Buns equipment", kind: "multi_select", options: [
        { label: "4 Amitek fryers 16/3A", value: "4_amitek_fryers_16_3a" },
        { label: "1 toaster 16A", value: "1_toaster_16a" },
        { label: "1 griddle 16A", value: "1_griddle_16a" },
      ] },
      { key: "chicks_spare_16_3a_circuits", prompt: "Chicks spare 16/3A circuits", kind: "number" },
      { key: "chicks_release_spare_candidate", prompt: "Chicks release spare candidate", kind: "text" },
    ],
  },
  {
    key: "safety_compliance",
    title: "Safety & Compliance",
    category: "safety",
    questions: [
      { key: "fire_extinguishers_count", prompt: "Fire extinguishers count", kind: "number", helpText: "Default: 4" },
      { key: "fire_extinguisher_type", prompt: "Fire extinguisher type", kind: "single_select", options: [
        { label: "F-class / F-mark", value: "f_class_f_mark" },
        { label: "AB", value: "ab" },
        { label: "ABC", value: "abc" },
      ] },
      { key: "fire_blankets_count", prompt: "Fire blankets count", kind: "number", helpText: "Default: 4" },
      { key: "first_aid_kits_count", prompt: "First aid kits count", kind: "number", helpText: "Default: 4" },
      { key: "hot_oil_protocol", prompt: "Hot oil protocol", kind: "single_select", options: [
        { label: "Briefing on setup day", value: "briefing_on_setup_day" },
        { label: "Documented SOP", value: "documented_sop" },
        { label: "To be written", value: "to_be_written" },
      ] },
      { key: "food_authority_owner", prompt: "Food authority owner (levnedsmiddel)", kind: "text" },
      { key: "gas_brand_inspection_datetime", prompt: "Gas & brand inspection datetime", kind: "datetime" },
      { key: "cvr_primary", prompt: "CVR (primary)", kind: "text" },
      { key: "cvr_secondary", prompt: "CVR (secondary)", kind: "text" },
    ],
  },
  {
    key: "setup_timeline",
    title: "Setup Timeline & Day Operational Plan",
    category: "operations",
    subEditorRoute: "/festivals/:slug/timeline",
    questions: [
      { key: "setup_crew_arrival_date", prompt: "Setup crew arrival date", kind: "date" },
      { key: "goods_delivery_date", prompt: "Goods delivery date", kind: "date" },
      { key: "main_crew_arrival_date", prompt: "Main crew arrival date", kind: "date" },
      { key: "breakdown_date", prompt: "Breakdown date", kind: "date" },
      { key: "breakdown_handler", prompt: "Breakdown handler", kind: "single_select", options: [
        { label: "Fidibus only", value: "fidibus_only" },
        { label: "Fidibus + TFP", value: "fidibus_plus_tfp" },
        { label: "TFP only", value: "tfp_only" },
      ] },
      { key: "clear_area_deadline", prompt: "Clear area deadline", kind: "datetime" },
    ],
  },
  {
    key: "transportation",
    title: "Transportation & Accommodation",
    category: "logistics",
    subEditorRoute: "/festivals/:slug/transport",
    questions: [
      { key: "total_vehicles", prompt: "Total vehicles (computed)", kind: "number" },
      { key: "total_bed_nights", prompt: "Total bed-nights (computed)", kind: "number" },
      { key: "vehicle_fleet_summary", prompt: "Vehicle fleet summary", kind: "text" },
      { key: "cabin_vejle_booking_range", prompt: "Cabin Vejle booking range", kind: "text" },
    ],
  },
  {
    key: "bc_trolleys",
    title: "BC Trolley Checklists",
    category: "logistics",
    subEditorRoute: "/festivals/:slug/trolleys",
    questions: [
      { key: "trolleys_per_concept", prompt: "Trolleys per concept", kind: "number", helpText: "Default: 2" },
      { key: "total_trolleys", prompt: "Total trolleys (computed)", kind: "number" },
      { key: "content_list_uploaded", prompt: "Content list uploaded", kind: "single_select", options: [
        { label: "Yes", value: "yes" },
        { label: "No — TBD", value: "no_tbd" },
        { label: "Partial", value: "partial" },
      ] },
      { key: "categories", prompt: "Trolley categories", kind: "multi_select", options: [
        { label: "Cooking/small gear", value: "cooking_gear" },
        { label: "Serving/packaging", value: "serving_packaging" },
        { label: "Cleaning/chemicals", value: "cleaning" },
        { label: "Stationery/signage", value: "stationery" },
      ] },
    ],
  },
  {
    key: "groceries",
    title: "Groceries & Ordering (v2 stub)",
    category: "operations",
    questions: [
      { key: "portion_volume_method", prompt: "Portion volume method", kind: "single_select", options: [
        { label: "POS sales prev year + 15%", value: "pos_sales_prev_year_plus_15pct" },
        { label: "Manual estimate", value: "manual_estimate" },
        { label: "Other", value: "other" },
      ] },
      { key: "supplier_list", prompt: "Supplier list (freeform)", kind: "text" },
    ],
  },
  {
    key: "recipes",
    title: "Recipes per Concept (v2 stub)",
    category: "operations",
    questions: [
      { key: "recipe_source", prompt: "Recipe source", kind: "single_select", options: [
        { label: "Uploaded Excel", value: "uploaded_excel" },
        { label: "Freeform list", value: "freeform_list" },
        { label: "Not yet", value: "not_yet" },
      ] },
    ],
  },
];

export async function seedMasterSchema(): Promise<{ sections: number; questions: number; skipped: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await listSections();
  if (existing.length > 0) {
    const existingQuestions = await listQuestions();
    return { sections: existing.length, questions: existingQuestions.length, skipped: true };
  }

  let sectionCount = 0;
  let questionCount = 0;
  for (const [idx, spec] of SECTIONS.entries()) {
    const sectionId = await insertSection({
      key: spec.key,
      title: spec.title,
      description: spec.description ?? null,
      category: spec.category,
      subEditorRoute: spec.subEditorRoute ?? null,
      orderIndex: idx,
    });
    sectionCount++;
    for (const [qIdx, q] of spec.questions.entries()) {
      await insertQuestion({
        sectionId,
        key: q.key,
        prompt: q.prompt,
        kind: q.kind,
        options: q.options ?? null,
        helpText: q.helpText ?? null,
        required: q.required ?? false,
        orderIndex: qIdx,
      });
      questionCount++;
    }
  }
  return { sections: sectionCount, questions: questionCount, skipped: false };
}
