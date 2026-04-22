import { insertAccommodation } from "../../server/planDb";
import { festivalDate } from "./_shared";

type AccommodationSpec = {
  label: string;
  status: "booked" | "to_book";
  checkIn: string;
  checkOut: string;
  peopleCount: number;
  roomConfig: string;
  notes: string;
};

const ACCOMMODATION: AccommodationSpec[] = [
  {
    label: "Cabin Vejle",
    status: "booked",
    checkIn: "2026-05-21",
    checkOut: "2026-05-25",
    peopleCount: 20,
    roomConfig: "10 doubles",
    notes: "21 Søborg ppl in 20 beds — 1 bed short, action item open",
  },
  {
    label: "Setup crew accommodation (hostel/Airbnb Vejle)",
    status: "to_book",
    checkIn: "2026-05-18",
    checkOut: "2026-05-21",
    peopleCount: 5,
    roomConfig: "~3 doubles",
    notes: "Setup crew 18–20 May, 15 bed-nights",
  },
  {
    label: "Manager extra night",
    status: "to_book",
    checkIn: "2026-05-25",
    checkOut: "2026-05-26",
    peopleCount: 2,
    roomConfig: "1 double",
    notes: "Marius + Fif may stay Mon for breakdown completion",
  },
];

export async function seedAccommodation(festivalId: number): Promise<number> {
  for (const a of ACCOMMODATION) {
    await insertAccommodation({
      festivalId,
      label: a.label,
      status: a.status,
      checkIn: festivalDate(a.checkIn),
      checkOut: festivalDate(a.checkOut),
      peopleCount: a.peopleCount,
      roomConfig: a.roomConfig,
      notes: a.notes,
    });
  }
  return ACCOMMODATION.length;
}
