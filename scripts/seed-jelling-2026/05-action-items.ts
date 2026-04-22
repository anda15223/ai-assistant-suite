import { insertActionItem } from "../../server/planDb";
import { festivalDate } from "./_shared";

type ItemSpec = {
  title: string;
  sectionKey: string;
  deadline: string | null;
  status?: "open" | "in_progress" | "done" | "blocked";
  priority?: "low" | "normal" | "high" | "hard_deadline";
  owner?: string | null;
  notes?: string | null;
};

// Transcribed from §4.5 of the handover (35 items).
const ITEMS: ItemSpec[] = [
  { title: "Send placement map + driving route to Godik", sectionKey: "cooling_storage", deadline: "2026-05-05", priority: "high" },
  { title: "Decide camping container mode (fridge / freezer / split)", sectionKey: "cooling_storage", deadline: "2026-05-05", priority: "high", owner: "Costel + team" },
  { title: "Pay Godik invoice 247741 (15,732.50 DKK incl. VAT)", sectionKey: "cooling_storage", deadline: "2026-05-12", priority: "hard_deadline" },
  { title: "Confirm DAKA pickup arrangement for Jelling", sectionKey: "cooling_storage", deadline: "2026-05-18", priority: "normal" },
  { title: "Mark container placement spots on-site", sectionKey: "cooling_storage", deadline: "2026-05-18", priority: "normal" },
  { title: "Finalise Chicks 'n' Buns façade artwork + send to printer", sectionKey: "facade", deadline: "2026-04-27", priority: "high" },
  { title: "Double-check 13 March email with Jonas Kring: contracted baseline 4×16A is registered on site (not only additional)", sectionKey: "power", deadline: "2026-05-05", priority: "high" },
  { title: "Confirm Chicks 'n' Buns 2×16/3A can be released (save 2,000 DKK)", sectionKey: "cooking_equipment", deadline: "2026-05-05", priority: "high" },
  { title: "Finalise Ronny VVS gas install (Gaia double Fagor fryers)", sectionKey: "cooking_equipment", deadline: "2026-05-18", priority: "normal", status: "in_progress", owner: "Ronny VVS" },
  { title: "Decide Fish & Chips all-electric vs hybrid gas (linked to Ronny VVS install)", sectionKey: "cooking_equipment", deadline: null, priority: "normal" },
  { title: "Obtain written Jelling confirmation that baseline + additional power provisioned", sectionKey: "power", deadline: "2026-05-18", priority: "normal" },
  { title: "Confirm hygiejnekursus certificates, allergy signs, E-smiley printing", sectionKey: "safety_compliance", deadline: "2026-05-05", priority: "high", owner: "Costel" },
  { title: "Check inventory of F-mark extinguishers + fire blankets (need 4+4, valid service date)", sectionKey: "safety_compliance", deadline: "2026-05-11", priority: "normal" },
  { title: "Check inventory of first aid kits (need 4, incl. burn gel for hot-oil)", sectionKey: "safety_compliance", deadline: "2026-05-11", priority: "normal" },
  { title: "Confirm Fidibus + Jonas BR18 facade compliance on track", sectionKey: "safety_compliance", deadline: "2026-05-15", priority: "normal", owner: "Fidibus" },
  { title: "Add detailed BC trolley content lists for all 8 trolleys", sectionKey: "bc_trolleys", deadline: "2026-05-05", priority: "high" },
  { title: "Recruit 20 local staff in Jelling", sectionKey: "staffing", deadline: null, priority: "high" },
  { title: "Finalise 19 Søborg staff list and assignments", sectionKey: "staffing", deadline: "2026-05-11", priority: "normal" },
  { title: "Request 39 wristbands via festival portal", sectionKey: "staffing", deadline: "2026-05-11", priority: "normal" },
  { title: "Publish vagtplaner and confirm team availability", sectionKey: "staffing", deadline: "2026-05-11", priority: "normal" },
  { title: "Book 3rd Europcar lift vehicle", sectionKey: "transportation", deadline: "2026-05-11", priority: "high" },
  { title: "Rent 8+1 van for 21 May main crew transport", sectionKey: "transportation", deadline: "2026-05-11", priority: "high" },
  { title: "Book accommodation 18–20 May — 5 setup crew (~3 doubles, Vejle hostel/Airbnb)", sectionKey: "transportation", deadline: "2026-05-11", priority: "high" },
  { title: "Close 1-bed gap at Cabin Vejle 21–24 May (21 ppl in 20 beds)", sectionKey: "transportation", deadline: "2026-05-11", priority: "normal" },
  { title: "Consider 2 extra bed-nights 25 May (managers stay for breakdown)", sectionKey: "transportation", deadline: "2026-05-11", priority: "normal" },
  { title: "Confirm 5 setup crew driver licences (C-class for lifts, B for Iveco/BMW)", sectionKey: "transportation", deadline: "2026-05-15", priority: "normal" },
  { title: "Inventory sweep of current trolley contents in Søborg", sectionKey: "bc_trolleys", deadline: "2026-05-11", priority: "normal" },
  { title: "Replenish missing trolley items before loading", sectionKey: "bc_trolleys", deadline: "2026-05-17", priority: "normal" },
  { title: "Pack cable drums (30m+) + CEE → LK overgang for each concept", sectionKey: "cooking_equipment", deadline: "2026-05-17", priority: "normal" },
  { title: "Brandmateriel ready (F-mark extinguishers + blankets)", sectionKey: "safety_compliance", deadline: "2026-05-17", priority: "normal" },
  { title: "Hot-oil operational briefing to fry staff", sectionKey: "safety_compliance", deadline: "2026-05-18", priority: "normal" },
  { title: "Godik delivery — 2 containers arrive between 07:00 and 18:00", sectionKey: "cooling_storage", deadline: "2026-05-19", priority: "normal" },
  { title: "GAS & BRAND INSPECTION — all bods ready at 09:00", sectionKey: "safety_compliance", deadline: "2026-05-20", priority: "hard_deadline", notes: "If not ready, godkendelse at TFP's own expense" },
  { title: "All goods delivered before 10:00 (varekørsel rule)", sectionKey: "setup_timeline", deadline: "2026-05-20", priority: "hard_deadline" },
  { title: "Pre-festival briefing to all 19 TFP staff (vagtplan + discipline + safety)", sectionKey: "setup_timeline", deadline: "2026-05-20", priority: "normal" },
];

export async function seedActionItems(festivalId: number): Promise<number> {
  for (const item of ITEMS) {
    await insertActionItem({
      festivalId,
      sectionKey: item.sectionKey,
      title: item.title,
      deadline: item.deadline ? festivalDate(item.deadline) : null,
      status: item.status ?? "open",
      priority: item.priority ?? "normal",
      owner: item.owner ?? null,
      notes: item.notes ?? null,
    });
  }
  return ITEMS.length;
}
