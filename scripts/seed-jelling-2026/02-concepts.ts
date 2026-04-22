import { insertConcept } from "../../server/planDb";
import type { ConceptMap } from "./_shared";

export const FISH = "Fish & Chips (The Fish Project)";
export const GYROS = "Gyros by Gaia";
export const CREPERIE = "La Creperie";
export const CHICKS = "Chicks 'n' Buns";

export async function seedConcepts(festivalId: number): Promise<ConceptMap> {
  const map: ConceptMap = new Map();

  map.set(
    FISH,
    await insertConcept({
      festivalId,
      name: FISH,
      zone: "INSIDE",
      tentSize: "6x9m + shared 3x3m back dish area",
      productsSold:
        "Beer-battered fresh fish, fries, fish burger with coleslaw, tartar, remoulade, ketchup, mayo",
      salesHoursThu: "16:00–02:00",
      salesHoursFri: "11:30–02:00",
      salesHoursSat: "11:30–02:00",
      salesHoursSun: "11:30–01:00",
      powerBaseline: "1x16A",
      powerExtras: [
        { amperage: "32A", count: 2, phase: null, notes: "Red Fox fish fryers" },
        { amperage: "16A", count: 4, phase: "3-phase", notes: "Amitek fries/burger" },
      ],
      gasRequired: false,
      gasSupplier: null,
      wristbandMax: 10,
      wristbandBlackPartout: 6,
      wristbandNormalPartout: 4,
      orderIndex: 1,
    }),
  );

  map.set(
    GYROS,
    await insertConcept({
      festivalId,
      name: GYROS,
      zone: "INSIDE",
      tentSize: "6x9m",
      productsSold:
        "Chicken gyros in pita and wrap, fries, tzatziki, mustard mayo, hummus, onion, tomato, veggies, spinach, sides",
      salesHoursThu: "16:00–02:00",
      salesHoursFri: "11:30–02:00",
      salesHoursSat: "11:30–02:00",
      salesHoursSun: "11:30–01:00",
      powerBaseline: "1x16A",
      powerExtras: [
        { amperage: "32A", count: 1, phase: null, notes: "Griddle (chicken gyros primary cook surface)" },
        { amperage: "16A", count: 4, phase: "3-phase", notes: "Amitek fryers + oven + bain-marie" },
      ],
      gasRequired: true,
      gasSupplier: "Ronny VVS (Fagor double gas fryers — replaces 3x16A electric)",
      wristbandMax: 10,
      wristbandBlackPartout: 6,
      wristbandNormalPartout: 4,
      orderIndex: 2,
    }),
  );

  map.set(
    CREPERIE,
    await insertConcept({
      festivalId,
      name: CREPERIE,
      zone: "CAMPING",
      tentSize: "6x6m + shared 3x3m back dish area",
      productsSold:
        "Sweet and savoury pancakes — Nutella, banana, strawberry, coconut, cinnamon, lemon; savoury with serrano, mozzarella/cheddar, spinach, tomato, mushrooms, sriracha, pesto",
      salesHoursThu: "12:00–03:00",
      salesHoursFri: "07:00–03:00",
      salesHoursSat: "07:00–03:00",
      salesHoursSun: "07:00–03:00",
      powerBaseline: "1x16A",
      powerExtras: [
        { amperage: "230V", count: 12, phase: null, notes: "Pancake plates — 6 prep + 3 service + 3 extra for peak" },
      ],
      gasRequired: false,
      gasSupplier: null,
      wristbandMax: 12,
      wristbandBlackPartout: 4,
      wristbandNormalPartout: 8,
      orderIndex: 3,
    }),
  );

  map.set(
    CHICKS,
    await insertConcept({
      festivalId,
      name: CHICKS,
      zone: "CAMPING",
      tentSize: "6x6m",
      productsSold: "Fried chicken, fries, chicken burger/buns",
      salesHoursThu: "12:00–03:00",
      salesHoursFri: "07:00–03:00",
      salesHoursSat: "07:00–03:00",
      salesHoursSun: "07:00–03:00",
      powerBaseline: "1x16A",
      powerExtras: [
        {
          amperage: "16A",
          count: 6,
          phase: "3-phase",
          notes:
            "4 Amitek fryers + toaster + griddle (2x16/3A spare — candidate to release for 2000 DKK saving)",
        },
      ],
      gasRequired: false,
      gasSupplier: null,
      wristbandMax: 12,
      wristbandBlackPartout: 4,
      wristbandNormalPartout: 8,
      orderIndex: 4,
    }),
  );

  return map;
}
