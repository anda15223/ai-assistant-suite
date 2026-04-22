import { listQuestions, upsertAnswer } from "../../server/planDb";
import type { QuestionMap } from "./_shared";

type Scalar =
  | { key: string; kind: "text" | "number" | "date" | "datetime" | "single_select"; value: string | number }
  | { key: string; kind: "multi_select"; value: string[] };

// Scalar answers per §4.8 of the handover.
const ANSWERS: Scalar[] = [
  // intro
  { key: "festival_organiser_contact_name", kind: "text", value: "Jonas Kring (Jelling Musikfestival)" },
  { key: "festival_organiser_contact_phone", kind: "text", value: "+45 22 96 91 61" },

  // equipment_list
  { key: "stilladsbar_inside", kind: "number", value: 7 },
  { key: "stilladsbar_camping", kind: "number", value: 3 },
  { key: "folding_tables_inside", kind: "number", value: 12 },
  { key: "folding_tables_camping", kind: "number", value: 13 },
  { key: "countertops_per_concept", kind: "number", value: 2 },
  { key: "daka_containers_per_concept", kind: "number", value: 2 },

  // facade
  { key: "facade_designer", kind: "text", value: "Fidibus (with Jonas Kring coordination on truss)" },
  { key: "facade_status_fish", kind: "single_select", value: "print_ready" },
  { key: "facade_status_gyros", kind: "single_select", value: "print_ready" },
  { key: "facade_status_creperie", kind: "single_select", value: "print_ready" },
  { key: "facade_status_chicks", kind: "single_select", value: "in_progress" },
  { key: "facade_print_deadline", kind: "date", value: "2026-04-27" },
  { key: "br18_2026_compliance", kind: "single_select", value: "fidibus_handling" },

  // cooling_storage
  { key: "container_supplier", kind: "single_select", value: "godik" },
  { key: "container_booking_number", kind: "text", value: "247741" },
  { key: "container_count", kind: "number", value: 2 },
  { key: "container_size", kind: "single_select", value: "20ft" },
  { key: "container_item_code", kind: "text", value: "06090" },
  { key: "container_modes", kind: "multi_select", value: ["inside_fridge", "camping_tbd"] },
  { key: "delivery_date", kind: "date", value: "2026-05-19" },
  { key: "pickup_date", kind: "date", value: "2026-05-25" },
  { key: "payment_due", kind: "date", value: "2026-05-12" },
  { key: "total_cost_incl_vat_dkk", kind: "number", value: 15732.5 },
  { key: "godik_contact_name", kind: "text", value: "Jakob Muldbjerg" },
  { key: "godik_contact_phone", kind: "text", value: "+45 9644 3313" },
  { key: "godik_24h_service", kind: "text", value: "+45 70 20 18 16" },

  // power
  { key: "baseline_amp_per_concept", kind: "text", value: "1×16A" },
  { key: "contracted_baseline_total", kind: "text", value: "4×16A" },
  { key: "gas_needed", kind: "single_select", value: "yes" },
  { key: "gas_supplier", kind: "text", value: "Ronny VVS" },

  // staffing
  { key: "total_headcount", kind: "number", value: 39 },
  { key: "soborg_count", kind: "number", value: 19 },
  { key: "local_count", kind: "number", value: 20 },
  { key: "manager_count", kind: "number", value: 2 },
  { key: "setup_crew_count", kind: "number", value: 5 },
  { key: "saturday_peak_extension", kind: "single_select", value: "yes_extend_to_23" },
  { key: "camping_arrival_time", kind: "single_select", value: "06:00" },
  { key: "thursday_arrival_time_inside_fish", kind: "single_select", value: "10:00" },
  { key: "thursday_arrival_time_inside_gyros", kind: "single_select", value: "09:00" },
  { key: "total_wristbands_requested", kind: "number", value: 39 },
  { key: "total_person_hours", kind: "number", value: 1673.5 },

  // cooking_equipment
  { key: "fish_fryer_strategy", kind: "single_select", value: "all_electric_2x32a_5x16a_amitek" },
  { key: "gyros_gas", kind: "single_select", value: "yes_ronny_vvs_fagor" },
  { key: "pancake_plate_count", kind: "number", value: 12 },
  { key: "chicks_equipment", kind: "multi_select", value: ["4_amitek_fryers_16_3a", "1_toaster_16a", "1_griddle_16a"] },
  { key: "chicks_spare_16_3a_circuits", kind: "number", value: 2 },
  { key: "chicks_release_spare_candidate", kind: "text", value: "yes — save 2,000 DKK (2 × 1,000 DKK ekstra strøm fee)" },

  // safety_compliance
  { key: "fire_extinguishers_count", kind: "number", value: 4 },
  { key: "fire_extinguisher_type", kind: "single_select", value: "f_class_f_mark" },
  { key: "fire_blankets_count", kind: "number", value: 4 },
  { key: "first_aid_kits_count", kind: "number", value: 4 },
  { key: "hot_oil_protocol", kind: "single_select", value: "briefing_on_setup_day" },
  { key: "food_authority_owner", kind: "text", value: "Costel" },
  { key: "gas_brand_inspection_datetime", kind: "datetime", value: "2026-05-20T09:00" },
  { key: "cvr_primary", kind: "text", value: "39236931" },
  { key: "cvr_secondary", kind: "text", value: "40747745" },

  // setup_timeline
  { key: "setup_crew_arrival_date", kind: "date", value: "2026-05-18" },
  { key: "goods_delivery_date", kind: "date", value: "2026-05-20" },
  { key: "main_crew_arrival_date", kind: "date", value: "2026-05-21" },
  { key: "breakdown_date", kind: "date", value: "2026-05-25" },
  { key: "breakdown_handler", kind: "single_select", value: "fidibus_only" },
  { key: "clear_area_deadline", kind: "datetime", value: "2026-05-25T07:00" },

  // transportation
  { key: "total_vehicles", kind: "number", value: 7 },
  { key: "total_bed_nights", kind: "number", value: 91 },
  { key: "vehicle_fleet_summary", kind: "text", value: "4 confirmed, 2 to book/rent, + BMW = 7" },
  { key: "cabin_vejle_booking_range", kind: "text", value: "21–25 May 2026" },

  // bc_trolleys
  { key: "trolleys_per_concept", kind: "number", value: 2 },
  { key: "total_trolleys", kind: "number", value: 8 },
  { key: "content_list_uploaded", kind: "single_select", value: "no_tbd" },
  { key: "categories", kind: "multi_select", value: ["cooking_gear", "serving_packaging", "cleaning", "stationery"] },
];

export async function seedAnswers(festivalId: number): Promise<{ inserted: number; missing: string[] }> {
  const questions = await listQuestions();
  const map: QuestionMap = new Map();
  for (const q of questions) map.set(q.key, q.id);

  let inserted = 0;
  const missing: string[] = [];
  for (const a of ANSWERS) {
    const questionId = map.get(a.key);
    if (questionId === undefined) {
      missing.push(a.key);
      continue;
    }
    await upsertAnswer({
      festivalId,
      questionId,
      value: a.value,
      valueType: a.kind,
    });
    inserted++;
  }
  return { inserted, missing };
}
