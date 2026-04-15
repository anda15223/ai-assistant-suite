// Festival data for The Fish Project / Gaia Fish Bistro — 2026 season.
// Drive folder IDs are real, sourced from the user's "FESTIVALS 2026" Drive folder.
// Email intel is sourced from one.com inbox/sent (01.11.2025 → present).
// Edit this file freely — the Festivals page renders straight from this data.

export type FestivalStatus = "active" | "canceled";
export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "high" | "medium" | "low";

export interface FestivalTask {
  id: string;
  title: string;
  detail?: string;
  priority: TaskPriority;
  status: TaskStatus;
  source?: "email" | "drive" | "template";
  deadline?: string; // ISO date
  contact?: string; // email address to reply to
  draftReply?: string; // pre-filled draft body
  draftSubject?: string;
}

export interface FestivalDoc {
  title: string;
  driveId: string;
  type: "doc" | "sheet" | "folder";
  note?: string;
}

export interface SetupChecklistItem {
  id: string;
  category: 'electricity' | 'tent' | 'cooling' | 'gas_safety' | 'pos' | 'food_delivery' | 'staff' | 'accommodation';
  label: string;
  detail?: string;
  status: 'pending' | 'done' | 'warning' | 'critical' | 'na';
}

export interface ContractInfo {
  signed: boolean;
  commissionPct?: number;
  exclusivity?: string;
  powerIncluded: boolean;
  powerCost?: number;
  gasCheckRequired: boolean;
  organicRequired: boolean;
  organicPct?: number;
  standLocation?: string;
  paymentTerms?: string;
  notes?: string;
}

export interface CostEstimate {
  category: string;
  estimated?: number;
  actual?: number;
  notes?: string;
}

export interface Festival {
  number: number;
  slug: string;
  name: string;
  emoji: string;
  status: FestivalStatus;
  startDate?: string; // ISO
  endDate?: string;
  setupDate?: string;
  teardownDate?: string;
  address?: string;
  driveFolderId: string;
  concepts: string[]; // e.g. Fish Project, Gyros by Gaia, Le Creperie, Chicks & Buns
  contacts: { name: string; role?: string; email?: string }[];
  docs: FestivalDoc[];
  tasks: FestivalTask[];
  setupChecklist?: SetupChecklistItem[];
  contract?: ContractInfo;
  costEstimates?: CostEstimate[];
}

// ──────────────────────────────────────────────────────────────────────────────
// SHARED TASK TEMPLATE — every festival inherits this baseline of work.
// Used to seed festivals that don't yet have specific email-driven tasks.
// ──────────────────────────────────────────────────────────────────────────────
export const SHARED_TASK_TEMPLATE: Omit<FestivalTask, "id">[] = [
  {
    title: "Submit POS / sortiment template",
    detail:
      "Fill out organizer's product + price + bank + POS-user template and return before deadline.",
    priority: "high",
    status: "todo",
    source: "template",
  },
  {
    title: "Confirm power needs",
    detail:
      "Confirm 32 A for fridge container, 230 V draws for La Creperie / Chicks & Buns / Gyros / Fish.",
    priority: "high",
    status: "todo",
    source: "template",
  },
  {
    title: "Confirm tent layout",
    detail: "Confirm tent sizes & positions for each concept with organizer.",
    priority: "medium",
    status: "todo",
    source: "template",
  },
  {
    title: "Get festival address & check-in procedure",
    detail: "Required for production plan + delivery notes.",
    priority: "medium",
    status: "todo",
    source: "template",
  },
  {
    title: "Lock arrival schedule",
    detail:
      "Confirm: Fidibus build team / main team / groceries arrival times and accommodation check-in/out.",
    priority: "medium",
    status: "todo",
    source: "template",
  },
  {
    title: "Confirm electricity on/off and setup window",
    detail:
      "When can we start setting up, full-setup deadline, gas check time, opening hours, teardown deadline.",
    priority: "medium",
    status: "todo",
    source: "template",
  },
  {
    title: "Cooling containers in/out",
    detail: "Confirm arrival + pickup times for cooling containers / trailers.",
    priority: "medium",
    status: "todo",
    source: "template",
  },
  {
    title: "Volunteer shifts",
    detail: "Lock volunteer shift times start/stop. Recruit using Facebook templates from OVERALL DOCUMENTS folder.",
    priority: "medium",
    status: "todo",
    source: "template",
  },
  {
    title: "Pickup of leftover BC-Catering equipment",
    detail: "Confirm whether trolleys, shelves, boxes get picked up.",
    priority: "low",
    status: "todo",
    source: "template",
  },
];

export const DEFAULT_SETUP_CHECKLIST: Omit<SetupChecklistItem, 'id'>[] = [
  { category: 'electricity', label: 'Confirm amperage & on/off times', status: 'pending' },
  { category: 'electricity', label: 'Get power cost estimate', status: 'pending' },
  { category: 'tent', label: 'Confirm tent sizes & positions', status: 'pending' },
  { category: 'tent', label: 'Flame-retardant certification', status: 'pending' },
  { category: 'cooling', label: 'Order cooling container', status: 'pending' },
  { category: 'cooling', label: 'Confirm delivery/pickup times', status: 'pending' },
  { category: 'gas_safety', label: 'Book gas check appointment', status: 'pending' },
  { category: 'gas_safety', label: 'Fire extinguisher & safety kit', status: 'pending' },
  { category: 'pos', label: 'Setup SumUp terminals', status: 'pending' },
  { category: 'pos', label: 'Submit POS/sortiment template', status: 'pending' },
  { category: 'food_delivery', label: 'Order groceries & ingredients', status: 'pending' },
  { category: 'food_delivery', label: 'Coordinate BC-Catering pickup', status: 'pending' },
  { category: 'staff', label: 'Finalize employee contracts', status: 'pending' },
  { category: 'staff', label: 'Submit accreditation (photo + ID)', status: 'pending' },
  { category: 'staff', label: 'Recruit volunteers', status: 'pending' },
  { category: 'accommodation', label: 'Book accommodation', status: 'pending' },
  { category: 'accommodation', label: 'Confirm check-in/out times', status: 'pending' },
];

export const DEFAULT_COST_CATEGORIES: Omit<CostEstimate, 'actual'>[] = [
  { category: 'Stand fee / commission', notes: '' },
  { category: 'Electricity', notes: '' },
  { category: 'Accommodation', notes: '' },
  { category: 'Tent rental (Fidibus)', notes: '' },
  { category: 'Cooling containers', notes: '' },
  { category: 'Staff wages + travel', notes: '' },
  { category: 'Food / ingredients', notes: '' },
  { category: 'Equipment rental', notes: '' },
  { category: 'Insurance', notes: '' },
];

function withIds(prefix: string, tasks: Omit<FestivalTask, "id">[]): FestivalTask[] {
  return tasks.map((t, i) => ({ ...t, id: `${prefix}-${i + 1}` }));
}

// ──────────────────────────────────────────────────────────────────────────────
// FESTIVAL DATA
// ──────────────────────────────────────────────────────────────────────────────
export const FESTIVALS: Festival[] = [
  {
    number: 1,
    slug: "jelling",
    name: "Jelling Musikfestival",
    emoji: "🎤",
    status: "active",
    startDate: "2026-05-27",
    endDate: "2026-05-30",
    setupDate: "2026-05-19",
    teardownDate: "2026-05-25",
    address: "Jelling, Denmark",
    driveFolderId: "1C6xyUvondxS67EDcBbUPEyuXuJwgW4ky",
    concepts: ["The Fish Project", "Gyros by Gaia", "Le Creperie", "Chicks & Buns"],
    contacts: [
      { name: "Lea Haldrup", role: "Økonomi", email: "okonomi@jellingmusikfestival.dk" },
      { name: "Jonas Kring", role: "Stadeansvarlig" },
      { name: "Filip Færgeman", role: "COO Fish Project" },
    ],
    docs: [
      {
        title: "Production Plan Jelling",
        driveId: "1ldDFa8qVi-L-BmzsF6KUzkPUyBZgXtikk6N-2Ks_DuM",
        type: "doc",
        note: "Mostly empty draft — only cooling container in/out filled in.",
      },
      {
        title: "Menu + Prices",
        driveId: "1Ei99klmCBMKiusn8wqli9riF85rwA9yWu_3PiJV9pUM",
        type: "doc",
        note: "Fish 119/149/125, Gyros 109/149, Crepes 95/55/50.",
      },
    ],
    setupChecklist: [
      ...DEFAULT_SETUP_CHECKLIST.map((item, i) => ({ ...item, id: `jelling-checklist-${i}` })),
    ].map((item) =>
      item.label === 'Confirm tent sizes & positions' ? { ...item, label: '2x 6x6m (NOT 12x6m!), Fish+Gyros festival area, Chicken+Pancake camping', status: 'warning' as const } :
      item.label === 'Order cooling container' ? { ...item, label: '2 containers, arrive Tue 19 May 07-18h', status: 'pending' as const } :
      item.label === 'Submit POS/sortiment template' ? { ...item, label: 'POS template deadline PASSED (Apr 15)', status: 'critical' as const } :
      item.label === 'Recruit volunteers' ? { ...item, label: '20 volunteers needed, 20 persons total', status: 'pending' as const } :
      item.label === 'Book accommodation' ? { ...item, label: '10 rooms x 2-person, Cabin Vejle (cabinn.com)', status: 'pending' as const } :
      item
    ),
    tasks: withIds("jelling", [
      {
        title: "🔴 DEADLINE 15 April — Submit POS sortiment template",
        detail:
          "Lea Haldrup (økonomi) needs the filled xlsx template back by 15 April. Required: full sortiment + prices, contact person, bank account for payout, POS-user emails, confirm 2x POS units per concept.",
        priority: "high",
        status: "todo",
        source: "email",
        deadline: "2026-04-15",
        contact: "okonomi@jellingmusikfestival.dk",
        draftSubject: "Re: Jelling Musikfestival - information om sortimenter",
        draftReply:
          "Kære Lea\n\nTak for mailen. Vedhæftet finder I udfyldt skabelon med vores sortiment, priser, kontaktoplysninger og bankkonto.\n\nKontaktperson sortiment/priser: Alexandra Artimon — as@thefishproject.dk\nBankkonto til afregning: [INDSÆT REG + KONTO]\nPOS-brugere: as@thefishproject.dk, [TILFØJ FLERE]\n\nAntal POS pr. salgssted bekræftes som registreret (2 stk. pr. bod).\n\nSig endelig til hvis I mangler yderligere.\n\nBedste hilsner\nAlexandra",
      },
      {
        title: "Confirm power needs back to Jonas",
        detail:
          "Jonas (13 Mar) sent power layout. Need to confirm 32 A for fridge container, La Creperie 87×230 V, and confirm Chicks & Buns power.",
        priority: "high",
        status: "todo",
        source: "email",
        contact: "jonas@jellingmusikfestival.dk",
        draftSubject: "Re: Power Jelling",
        draftReply:
          "Hi Jonas\n\nThanks for the power overview. Confirming on our side:\n- 32 A for the fridge container ✅\n- La Creperie: 87 × 230 V ✅\n- Chicks & Buns: [CONFIRM AMPS]\n- Gyros / Fish: [CONFIRM AMPS]\n\nLet me know if this matches what you have on the plan.\n\nBest\nAlexandra",
      },
      {
        title: "Confirm final tent setup with Jonas",
        detail:
          "Jonas asked (17 Feb): can we work with two 6×6m side-by-side (middle sides removed) instead of 12×6m? Filip's last reply was waiting for Jonas to confirm.",
        priority: "medium",
        status: "todo",
        source: "email",
        contact: "jonas@jellingmusikfestival.dk",
        draftSubject: "Re: Jelling, fish project setup",
        draftReply:
          "Hi Jonas\n\nFollowing up on tent setup — yes we can work with two 6×6m side by side with middle sides removed if 12×6m isn't possible. Please confirm which option you've ordered so we can finalise the build plan with Fidibus.\n\nThanks\nAlexandra",
      },
      {
        title: "✅ Sent: tent setup proposal to Jonas (17 Feb)",
        detail:
          "Filip sent: FESTIVAL 12×9m tent (6m fish + 6m gyros), CAMPING 6×6m Crepes, 6×6m Chicken concept.",
        priority: "low",
        status: "done",
        source: "email",
      },
      {
        title: "✅ Sent: thanks for heatmap data (29 Jan)",
        detail: "Filip thanked Jonas for heatmap / hourly transaction data.",
        priority: "low",
        status: "done",
        source: "email",
      },
      ...SHARED_TASK_TEMPLATE.slice(3), // skip the first 3 already covered above
    ]),
  },

  {
    number: 2,
    slug: "nordside",
    name: "Nordside",
    emoji: "❌",
    status: "canceled",
    driveFolderId: "1I7uqoqUP7N8_1b7U_DlfyGICU3xWoOTE",
    concepts: [],
    contacts: [],
    docs: [],
    tasks: [],
  },

  {
    number: 3,
    slug: "heartland",
    name: "Heartland",
    emoji: "🌿",
    status: "active",
    startDate: "2026-06-04",
    endDate: "2026-06-06",
    address: "Egeskov Slot, Fyn",
    driveFolderId: "1blTbjUHuFtEN6Kl0hsKXfP-9ZOC_3ObO",
    concepts: ["The Fish Project", "Gyros by Gaia", "Le Creperie", "Chicks & Buns"],
    contacts: [],
    docs: [
      { title: "CONTRACTS folder", driveId: "1xUXfs2XsZ8UYgPbCKPZLfoH87vtulaav", type: "folder" },
      { title: "OTHER folder", driveId: "1HHvlaHx-YoBaoDCAEk3Bugc_yqB3iibJ", type: "folder" },
    ],
    tasks: withIds("heartland", SHARED_TASK_TEMPLATE),
  },

  {
    number: 4,
    slug: "copenhell",
    name: "Copenhell",
    emoji: "🔥",
    status: "active",
    startDate: "2026-06-17",
    endDate: "2026-06-20",
    address: "Refshaleøen, København",
    driveFolderId: "1vHmZrH6LfaD6bGnzKj0zjVY2LBUDKREp",
    concepts: ["The Fish Project", "Gyros by Gaia", "Le Creperie", "Chicks & Buns"],
    contacts: [],
    docs: [
      { title: "Production Plan Copenhell", driveId: "1EeOHux8PeGOJkjl60Gj0qN3AKBF5fbbdB8mrwfm2AcU", type: "doc", note: "Setup from Sat 13 Jun. 10 missing items to resolve." },
      { title: "Menu + Prices", driveId: "10BkjG8OdoZ5vqFa9GY73g-D50ZkrMojZthnxhHEAVlk", type: "doc", note: "Fish N Chips 139kr, Fiskeburger 109kr, Burger menu 149kr, Fritter+dip 55kr." },
    ],
    tasks: withIds("copenhell", SHARED_TASK_TEMPLATE),
  },

  {
    number: 5,
    slug: "tinderbox",
    name: "Tinderbox",
    emoji: "🎸",
    status: "active",
    startDate: "2026-06-25",
    endDate: "2026-06-27",
    setupDate: "2026-06-22",
    address: "Falen 177, 5250 Odense",
    driveFolderId: "1lZt-oPt1pIKl_2y49rXRa3S2o-oDdJy5",
    concepts: ["The Fish Project", "Gyros by Gaia", "Le Creperie", "Chicks & Buns"],
    contacts: [],
    docs: [
      {
        title: "Production Plan Tinderbox",
        driveId: "1_sIZq9Qm1ACO4r3RfmWqb8Alxm-2uKKyCu-H6WxnkZI",
        type: "doc",
        note: "Mon 22 Cooling arrives + 8am check-in + 16:00 fronts done. Tue 23 8am setup starts. Wed 24 8am gas/back-area/fronts deadline + 12:00 groceries earliest. Thu 25 10am full setup deadline.",
      },
      {
        title: "Reminder, stuff for Tinderbox",
        driveId: "1Z877oBCxi9FZi81LvLPu5bVx2Psy5x8Ec3p0IF6wcUc",
        type: "doc",
        note: "Veggie gyros → 'Fried Croquettes' gyros. Vegetarian dishes on top of menu. Pop-up tents need fire-retardant doc (DS/EN 13501-1).",
      },
      { title: "PRODUCTION ORDERS folder", driveId: "1AjtEIDedOVaCVJUU30cxgcj25xcOwG7N", type: "folder" },
      { title: "CONTRACTS folder", driveId: "138HlMnsePmVL-OXOHqV0WQFj_J44N-Zb", type: "folder" },
    ],
    setupChecklist: [
      ...DEFAULT_SETUP_CHECKLIST.map((item, i) => ({ ...item, id: `tinderbox-checklist-${i}` })),
    ].map((item) =>
      item.label === 'Flame-retardant certification' ? { ...item, label: 'Fire-safety flame-retardant cert REQUIRED!', status: 'warning' as const } :
      item
    ),
    tasks: withIds("tinderbox", [
      {
        title: "Rename veggie gyros → 'Fried Croquettes' on POS",
        detail:
          "Tinderbox organizers don't allow names with 'veggie' / 'vegetarian'. Vegetarian dishes must be at TOP of menu card.",
        priority: "high",
        status: "todo",
        source: "drive",
      },
      {
        title: "Get fire-retardant documentation for pop-up tents",
        detail:
          "Need DS/EN 13501-1 (A1 or A2) sewn-in label or product spec doc. Tent must be securable against storms. If used for cooking → plastic floor required.",
        priority: "high",
        status: "todo",
        source: "drive",
      },
      ...SHARED_TASK_TEMPLATE,
    ]),
  },

  {
    number: 6,
    slug: "cirkus-summarum",
    name: "Cirkus Summarum",
    emoji: "🎪",
    status: "active",
    startDate: "2026-06-22",
    endDate: "2026-06-28",
    address:
      "Copenhagen: Kræmmerpladsen, Marbækvej 5, 2740 Skovlunde · Aarhus: Tangkrogen, Marselisborg Havnevej 1, 8000 Aarhus C",
    driveFolderId: "1MrYPZKTVU4c_HTMIphdQ00rQirjjeMuI",
    concepts: ["The Fish Project", "Gyros by Gaia", "Le Creperie", "Chicks & Buns"],
    contacts: [],
    docs: [
      {
        title: "Production Plan Cirkus Summarum",
        driveId: "1x6x33wh5A5ihO3gKNrZMA5i4CGIpRCrKOxCAc14Go8s",
        type: "doc",
        note: "Two-city tour. Daily blocks empty. Address confirmed.",
      },
    ],
    tasks: withIds("cirkus", SHARED_TASK_TEMPLATE),
  },

  {
    number: 7,
    slug: "vig-festival",
    name: "Vig Festival",
    emoji: "🎶",
    status: "active",
    startDate: "2026-07-09",
    endDate: "2026-07-11",
    setupDate: "2026-07-06",
    driveFolderId: "1R9hBltuIPebxd7D9ewhcR60ovP4ws9fw",
    concepts: ["The Fish Project", "Gyros by Gaia", "Le Creperie", "Chicks & Buns"],
    contacts: [],
    docs: [
      {
        title: "Production Plan Vig",
        driveId: "1mOlf5RBGM1rtLoMpVFMz4xUWuhXjfvfrkpD9AckQHJU",
        type: "doc",
        note: "Empty draft, lots of MISSING fields.",
      },
    ],
    tasks: withIds("vig", SHARED_TASK_TEMPLATE),
  },

  {
    number: 8,
    slug: "gron-koncert",
    name: "Grøn Koncert",
    emoji: "🌳",
    status: "active",
    startDate: "2026-07-16",
    endDate: "2026-07-18",
    address: "Tårnby (Thu) · Kolding (Fri) · Aarhus (Sat)",
    driveFolderId: "17UaN8kn0fN4Aw79J1NoPUKjU2fJxOy92",
    concepts: ["The Fish Project", "Gyros by Gaia", "Le Creperie", "Chicks & Buns"],
    contacts: [],
    docs: [
      {
        title: "Production Plan Grøn",
        driveId: "1dFZuF2OkBV8sJ3HnLaGM5ZPbgv_TU14nc1N3zeSZgqU",
        type: "doc",
        note: "Three-city tour, addresses still missing.",
      },
    ],
    tasks: withIds("gron", SHARED_TASK_TEMPLATE),
  },

  {
    number: 9,
    slug: "syd-for-solen",
    name: "Syd for Solen",
    emoji: "🌞",
    status: "active",
    startDate: "2026-08-13",
    endDate: "2026-08-15",
    setupDate: "2026-08-11",
    driveFolderId: "1RmDPsJoE6k4P_gmkoB7erZIw3mDHXV0w",
    concepts: ["The Fish Project", "Gyros by Gaia", "Le Creperie", "Chicks & Buns"],
    contacts: [],
    docs: [
      {
        title: "Production Plan Syd For Solen",
        driveId: "18aTYRGgXQXehd7VixxnNSCnRhnUTw3GUJ-kwMLWNEo8",
        type: "doc",
        note: "Cooling container Tue 11 Aug 07-18. Days 13/14/15.",
      },
    ],
    setupChecklist: [
      ...DEFAULT_SETUP_CHECKLIST.map((item, i) => ({ ...item, id: `syd-checklist-${i}` })),
    ].map((item) =>
      item.label === 'Confirm amperage & on/off times' ? { ...item, label: '125A power, cost 23,200 DKK!', status: 'warning' as const } :
      item.label === 'Book gas check appointment' ? { ...item, label: 'NOT NEEDED — fully electric!', status: 'na' as const } :
      item
    ),
    tasks: withIds("syd", SHARED_TASK_TEMPLATE),
  },

  {
    number: 10,
    slug: "suset",
    name: "Suset",
    emoji: "🌅",
    status: "active",
    startDate: "2026-08-21",
    endDate: "2026-08-22",
    driveFolderId: "1PU55Ja-P_R64XDwBratutpr5HL_k8UXv",
    concepts: ["The Fish Project", "Gyros by Gaia", "Le Creperie", "Chicks & Buns"],
    contacts: [],
    docs: [
      {
        title: "Production Plan Suset",
        driveId: "1qgjpgviMm1-pe1ZDMQlH5VtshH1qRilVNDTu_fCk6Zw",
        type: "doc",
        note: "Two days, addresses missing.",
      },
    ],
    contract: {
      signed: false,
      powerIncluded: true,
      gasCheckRequired: true,
      organicRequired: true,
      organicPct: 50,
      notes: '50% organic (økologisk) requirement!',
    },
    tasks: withIds("suset", SHARED_TASK_TEMPLATE),
  },

  {
    number: 11,
    slug: "tonder",
    name: "Tønder Festival",
    emoji: "🪕",
    status: "active",
    startDate: "2026-08-26",
    endDate: "2026-08-29",
    driveFolderId: "15DeEqqUFIeUNubDxn70dI-4CqeV7awTN",
    concepts: ["The Fish Project", "Gyros by Gaia", "Le Creperie", "Chicks & Buns"],
    contacts: [],
    docs: [
      {
        title: "Production Plan Tønder",
        driveId: "1jRu_Ih4EEEwxuyRHfkNUhlzZ4raZ2a79KXrmBJwOrKA",
        type: "doc",
        note: "4 days, address missing.",
      },
    ],
    tasks: withIds("tonder", SHARED_TASK_TEMPLATE),
  },

  {
    number: 12,
    slug: "fyr-festen",
    name: "Fyr Festen",
    emoji: "🔥",
    status: "active",
    driveFolderId: "1qqWxHzGo8CC1hFVD3_9LgK1PmWFuyIQU",
    concepts: ["The Fish Project", "Gyros by Gaia", "Le Creperie", "Chicks & Buns"],
    contacts: [],
    docs: [],
    tasks: withIds("fyr", [
      {
        title: "📁 Drive folder is EMPTY — create production plan + menu docs",
        detail: "Folder exists but no docs. Copy template from Jelling/Tinderbox.",
        priority: "high",
        status: "todo",
        source: "drive",
      },
      ...SHARED_TASK_TEMPLATE,
    ]),
  },

  {
    number: 13,
    slug: "aarhus-festuge",
    name: "Aarhus Festuge",
    emoji: "🏛️",
    status: "active",
    driveFolderId: "1TL9_nrznYdJqwjVP4mAgmVBRn-7yn0Ko",
    concepts: ["The Fish Project", "Gyros by Gaia", "Le Creperie", "Chicks & Buns"],
    contacts: [],
    docs: [],
    tasks: withIds("aarhus", [
      {
        title: "📁 Drive folder is EMPTY — create production plan + menu docs",
        detail: "Folder exists but no docs. Copy template from Jelling/Tinderbox.",
        priority: "high",
        status: "todo",
        source: "drive",
      },
      ...SHARED_TASK_TEMPLATE,
    ]),
  },
];

export const ACTIVE_FESTIVALS = FESTIVALS.filter((f) => f.status === "active");
