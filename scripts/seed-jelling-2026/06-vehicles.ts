import { insertVehicle } from "../../server/planDb";
import { festivalDate } from "./_shared";

type VehicleSpec = {
  label: string;
  vehicleType: "lift" | "iveco" | "van" | "own" | "duster";
  status: "booked" | "to_book" | "owned";
  driver: string | null;
  purpose: string;
  travelDate: string;
  seats: number;
};

const VEHICLES: VehicleSpec[] = [
  {
    label: "Europcar lift vehicle #1",
    vehicleType: "lift",
    status: "booked",
    driver: "Marius",
    purpose: "Fish & Chips + Gyros by Gaia — façade, equipment, BC trolleys, tables, dry goods",
    travelDate: "2026-05-18",
    seats: 3,
  },
  {
    label: "Europcar lift vehicle #2",
    vehicleType: "lift",
    status: "booked",
    driver: "Costel",
    purpose: "La Creperie + Chicks 'n' Buns — façade, equipment, BC trolleys, tables, dry goods",
    travelDate: "2026-05-18",
    seats: 3,
  },
  {
    label: "Europcar lift vehicle #3 (extra)",
    vehicleType: "lift",
    status: "to_book",
    driver: "Marko",
    purpose: "Extra capacity",
    travelDate: "2026-05-18",
    seats: 3,
  },
  {
    label: "Iveco with lift",
    vehicleType: "iveco",
    status: "booked",
    driver: "Anca",
    purpose: "Food goods delivery vehicle",
    travelDate: "2026-05-18",
    seats: 3,
  },
  {
    label: "BMW (Fif's)",
    vehicleType: "own",
    status: "owned",
    driver: "Alexandra Artimon (Fif)",
    purpose: "Manager vehicle",
    travelDate: "2026-05-18",
    seats: 5,
  },
  {
    label: "8+1 van (main crew)",
    vehicleType: "van",
    status: "to_book",
    driver: null,
    purpose: "Main crew transport 21 May",
    travelDate: "2026-05-21",
    seats: 9,
  },
  {
    label: "Duster",
    vehicleType: "duster",
    status: "owned",
    driver: null,
    purpose: "Main crew transport 21 May",
    travelDate: "2026-05-21",
    seats: 5,
  },
];

export async function seedVehicles(festivalId: number): Promise<number> {
  for (const v of VEHICLES) {
    await insertVehicle({
      festivalId,
      label: v.label,
      vehicleType: v.vehicleType,
      status: v.status,
      driver: v.driver,
      purpose: v.purpose,
      travelDate: festivalDate(v.travelDate),
      seats: v.seats,
    });
  }
  return VEHICLES.length;
}
