import { insertVagtplanShift } from "../../server/planDb";
import { CHICKS, CREPERIE, FISH, GYROS } from "./02-concepts";
import { festivalDate, type ConceptMap } from "./_shared";

type ShiftRow = {
  day: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  peopleCount: number;
  notes: string;
};

const FISH_SHIFTS: ShiftRow[] = [
  { day: "2026-05-21", shiftName: "Early", startTime: "10:00", endTime: "22:00", peopleCount: 4, notes: "Thu setup + service" },
  { day: "2026-05-21", shiftName: "Late", startTime: "10:00", endTime: "02:00", peopleCount: 4, notes: "Thu setup + service + night close" },
  { day: "2026-05-22", shiftName: "Prep", startTime: "08:30", endTime: "11:30", peopleCount: 4, notes: "Early group prep" },
  { day: "2026-05-22", shiftName: "Half", startTime: "11:30", endTime: "15:00", peopleCount: 4, notes: "Early group morning" },
  { day: "2026-05-22", shiftName: "Peak", startTime: "15:00", endTime: "22:00", peopleCount: 8, notes: "Both groups full crew" },
  { day: "2026-05-22", shiftName: "Late", startTime: "14:30", endTime: "02:00", peopleCount: 4, notes: "Late group peak + close" },
  { day: "2026-05-23", shiftName: "Prep", startTime: "08:30", endTime: "11:30", peopleCount: 4, notes: "Early (yesterday's Late)" },
  { day: "2026-05-23", shiftName: "Half", startTime: "11:30", endTime: "15:00", peopleCount: 4, notes: "Early morning" },
  { day: "2026-05-23", shiftName: "Peak", startTime: "15:00", endTime: "23:00", peopleCount: 8, notes: "Sat extended +1h — 2025 data: 393 portions 21:00–22:00" },
  { day: "2026-05-23", shiftName: "Late", startTime: "14:30", endTime: "02:00", peopleCount: 4, notes: "Late peak + close" },
  { day: "2026-05-24", shiftName: "Prep", startTime: "08:30", endTime: "11:30", peopleCount: 4, notes: "Sun prep" },
  { day: "2026-05-24", shiftName: "Half", startTime: "11:30", endTime: "15:00", peopleCount: 4, notes: "Sun morning" },
  { day: "2026-05-24", shiftName: "Peak", startTime: "15:00", endTime: "22:00", peopleCount: 8, notes: "Sun peak" },
  { day: "2026-05-24", shiftName: "Late", startTime: "14:30", endTime: "01:00", peopleCount: 4, notes: "Sun close (earlier)" },
];

const GYROS_SHIFTS: ShiftRow[] = [
  { day: "2026-05-21", shiftName: "Early", startTime: "09:00", endTime: "22:00", peopleCount: 4, notes: "Thu setup + service — earlier start for griddle" },
  { day: "2026-05-21", shiftName: "Late", startTime: "09:00", endTime: "02:00", peopleCount: 5, notes: "Thu setup + service + night close" },
  { day: "2026-05-22", shiftName: "Prep", startTime: "08:30", endTime: "11:30", peopleCount: 4, notes: "Early prep" },
  { day: "2026-05-22", shiftName: "Half", startTime: "11:30", endTime: "15:00", peopleCount: 4, notes: "Early morning" },
  { day: "2026-05-22", shiftName: "Peak", startTime: "15:00", endTime: "22:00", peopleCount: 9, notes: "Both groups full crew" },
  { day: "2026-05-22", shiftName: "Late", startTime: "14:30", endTime: "02:00", peopleCount: 5, notes: "Late peak + close" },
  { day: "2026-05-23", shiftName: "Prep", startTime: "08:30", endTime: "11:30", peopleCount: 5, notes: "Sat Early = Fri Late (5 ppl)" },
  { day: "2026-05-23", shiftName: "Half", startTime: "11:30", endTime: "15:00", peopleCount: 5, notes: "Sat morning" },
  { day: "2026-05-23", shiftName: "Peak", startTime: "15:00", endTime: "23:00", peopleCount: 9, notes: "Sat extended +1h" },
  { day: "2026-05-23", shiftName: "Late", startTime: "14:30", endTime: "02:00", peopleCount: 4, notes: "Sat Late = Fri Early (4 ppl)" },
  { day: "2026-05-24", shiftName: "Prep", startTime: "08:30", endTime: "11:30", peopleCount: 4, notes: "Sun prep" },
  { day: "2026-05-24", shiftName: "Half", startTime: "11:30", endTime: "15:00", peopleCount: 4, notes: "Sun morning" },
  { day: "2026-05-24", shiftName: "Peak", startTime: "15:00", endTime: "22:00", peopleCount: 9, notes: "Sun peak" },
  { day: "2026-05-24", shiftName: "Late", startTime: "14:30", endTime: "01:00", peopleCount: 5, notes: "Sun close (earlier)" },
];

const CREPERIE_SHIFTS: ShiftRow[] = [
  { day: "2026-05-21", shiftName: "Setup", startTime: "09:00", endTime: "12:00", peopleCount: 8, notes: "Thu setup before opening" },
  { day: "2026-05-21", shiftName: "Service", startTime: "12:00", endTime: "22:00", peopleCount: 8, notes: "Thu service (camping opens 12:00 Thu)" },
  { day: "2026-05-21", shiftName: "Night", startTime: "22:00", endTime: "03:00", peopleCount: 4, notes: "Thu night close" },
  { day: "2026-05-22", shiftName: "Breakfast", startTime: "06:00", endTime: "14:00", peopleCount: 2, notes: "Fri breakfast (arrival 06:00 for 07:00 open)" },
  { day: "2026-05-22", shiftName: "Mid", startTime: "12:00", endTime: "20:00", peopleCount: 4, notes: "Fri mid" },
  { day: "2026-05-22", shiftName: "Night", startTime: "18:00", endTime: "03:00", peopleCount: 4, notes: "Fri night" },
  { day: "2026-05-23", shiftName: "Breakfast", startTime: "06:00", endTime: "14:00", peopleCount: 2, notes: "Sat breakfast" },
  { day: "2026-05-23", shiftName: "Mid", startTime: "12:00", endTime: "20:00", peopleCount: 4, notes: "Sat mid" },
  { day: "2026-05-23", shiftName: "Night", startTime: "18:00", endTime: "03:00", peopleCount: 4, notes: "Sat night" },
  { day: "2026-05-24", shiftName: "Breakfast", startTime: "06:00", endTime: "14:00", peopleCount: 2, notes: "Sun breakfast" },
  { day: "2026-05-24", shiftName: "Mid", startTime: "12:00", endTime: "20:00", peopleCount: 4, notes: "Sun mid" },
  { day: "2026-05-24", shiftName: "Night", startTime: "18:00", endTime: "03:00", peopleCount: 4, notes: "Sun night" },
];

const CHICKS_SHIFTS: ShiftRow[] = [
  { day: "2026-05-21", shiftName: "Setup", startTime: "09:00", endTime: "12:00", peopleCount: 8, notes: "Thu setup" },
  { day: "2026-05-21", shiftName: "Service", startTime: "12:00", endTime: "22:00", peopleCount: 8, notes: "Thu service" },
  { day: "2026-05-21", shiftName: "Night", startTime: "22:00", endTime: "03:00", peopleCount: 4, notes: "Thu night close" },
  { day: "2026-05-22", shiftName: "Breakfast", startTime: "06:00", endTime: "14:00", peopleCount: 3, notes: "Fri breakfast" },
  { day: "2026-05-22", shiftName: "Mid", startTime: "11:00", endTime: "20:00", peopleCount: 4, notes: "Fri mid (earlier start than Creperie)" },
  { day: "2026-05-22", shiftName: "Night", startTime: "18:00", endTime: "03:00", peopleCount: 4, notes: "Fri night" },
  { day: "2026-05-23", shiftName: "Breakfast", startTime: "06:00", endTime: "14:00", peopleCount: 3, notes: "Sat breakfast" },
  { day: "2026-05-23", shiftName: "Mid", startTime: "11:00", endTime: "20:00", peopleCount: 4, notes: "Sat mid" },
  { day: "2026-05-23", shiftName: "Night", startTime: "18:00", endTime: "03:00", peopleCount: 4, notes: "Sat night" },
  { day: "2026-05-24", shiftName: "Breakfast", startTime: "06:00", endTime: "14:00", peopleCount: 3, notes: "Sun breakfast" },
  { day: "2026-05-24", shiftName: "Mid", startTime: "11:00", endTime: "20:00", peopleCount: 4, notes: "Sun mid" },
  { day: "2026-05-24", shiftName: "Night", startTime: "18:00", endTime: "03:00", peopleCount: 4, notes: "Sun night" },
];

export async function seedVagtplan(concepts: ConceptMap): Promise<number> {
  const groups: Array<{ conceptKey: string; rows: ShiftRow[] }> = [
    { conceptKey: FISH, rows: FISH_SHIFTS },
    { conceptKey: GYROS, rows: GYROS_SHIFTS },
    { conceptKey: CREPERIE, rows: CREPERIE_SHIFTS },
    { conceptKey: CHICKS, rows: CHICKS_SHIFTS },
  ];
  let count = 0;
  for (const group of groups) {
    const conceptId = concepts.get(group.conceptKey);
    if (conceptId === undefined) throw new Error(`Missing concept id for ${group.conceptKey}`);
    for (const [idx, row] of group.rows.entries()) {
      await insertVagtplanShift({
        conceptId,
        day: festivalDate(row.day),
        shiftName: row.shiftName,
        startTime: row.startTime,
        endTime: row.endTime,
        peopleCount: row.peopleCount,
        notes: row.notes,
        orderIndex: idx,
      });
      count++;
    }
  }
  return count;
}
