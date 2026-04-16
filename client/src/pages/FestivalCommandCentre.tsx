import { useMemo, useState, useCallback } from "react";
import {
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Clock,
  Calendar,
  Search,
  FileText,
  AlertTriangle,
  ArrowLeft,
  Calculator,
  Link,
  Phone,
  Mail,
  Building2,
  Circle,
  CheckCircle2,
  Ban,
  Loader2,
} from "lucide-react";
import { useLocation } from "wouter";

// ── Types ────────────────────────────────────────────────────────────────

type ChecklistStatus = "pending" | "confirmed" | "complete" | "warning" | "critical";
type FestivalStatus = "CRITICAL" | "URGENT" | "ON TRACK" | "PLANNING" | "CANCELLED";
type PhaseStatus = "complete" | "in-progress" | "not-started" | "blocked";

interface SetupChecklistItem {
  status: ChecklistStatus;
  details: string;
}

interface DriveDoc {
  title: string;
  type: "doc" | "sheet" | "pdf" | "folder" | "pptx" | "docx" | "image";
  driveId: string;
  summary?: string;
  missingItems?: string[];
}

interface FestivalEmail {
  date: string;
  from: string;
  subject: string;
  summary: string;
  direction: "inbox" | "sent";
  hasAttachments?: boolean;
}

interface FestivalContact {
  name: string;
  role: string;
  phone?: string;
  email?: string;
}

interface ConceptContract {
  conceptName: string;
  entity: string;
  cvr: string;
  tentSize: string;
  location: string;
  commissionTiers: { threshold: string; rate: string }[];
  fixedFee: string;
  maxStaff: number;
  leaderPasses: number;
  regularPasses: number;
  minWorkHours: number;
  sortiment: string;
  waterAccess: boolean;
  campingVogn: boolean;
  depositum?: string;
  openingHours?: string;
  power?: string;
}

interface ContractDetails {
  signedDate?: string;
  festivalOrganizer: string;
  organizerCvr: string;
  festivalAddress: string;
  contactsFestival: FestivalContact[];
  contactsInternal: FestivalContact[];
  concepts: ConceptContract[];
  deadlines: { date: string; description: string; status: "passed" | "upcoming" | "done" }[];
  specialRules: string[];
  paymentTerms: string;
  cashless: boolean;
  posProvider: string;
}

interface PhaseStep {
  title: string;
  status: PhaseStatus;
  details?: string;
  actionNeeded?: string;
  link?: string;
  linkLabel?: string;
}

interface FestivalPhase {
  status: PhaseStatus;
  steps: PhaseStep[];
}

interface MenuItem {
  name: string;
  price: number;
}

interface TodoItem {
  id: string;
  text: string;
  priority: "CRITICAL" | "URGENT";
  deadline: string;
  festival: string;
}

interface FestivalData {
  id: number;
  name: string;
  dates: string;
  daysAway: number | null;
  status: FestivalStatus;
  notes: string;
  commission: number;
  exclusivity: string;
  powerIncluded: boolean;
  powerCost: number;
  gasRequired: boolean;
  organicRequired: boolean;
  standLocation: string;
  accommodation: string;
  documents?: DriveDoc[];
  emails?: FestivalEmail[];
  contracts: { signed: boolean; critical: boolean };
  setupChecklist: Record<string, SetupChecklistItem>;
  contractDetails?: ContractDetails;
}

// ── Data ─────────────────────────────────────────────────────────────────

const festivalsData: FestivalData[] = [
  {
    id: 1, name: "Jelling", dates: "18-25 May 2026", daysAway: 32, status: "CRITICAL",
    notes: "10 missing items - POS/tent facade deadlines (Apr 15 - PASSED)",
    commission: 12, exclusivity: "Fish only", powerIncluded: false, powerCost: 0,
    gasRequired: true, organicRequired: false, standLocation: "Main arena",
    accommodation: "TBD",
    contracts: { signed: true, critical: true },
    documents: [
      {
        title: "Production Plan Jelling",
        type: "doc",
        driveId: "1ldDFa8qVi-L-BmzsF6KUzkPUyBZgXtikk6N-2Ks_DuM",
        summary: "Week schedule Mon 18 May – Mon 25 May. Only cooling containers filled in (arrive Tue 19 07:00-18:00, pickup Mon 25 07:00-18:00). Address: ???. Daily blocks EMPTY.",
        missingItems: [
          "Festival address",
          "Team arrival time",
          "Fidibus build team arrival time",
          "Grocery delivery time",
          "BC-Catering leftover pickup",
          "Volunteer shift times",
          "Accommodation check-in/check-out",
          "Electricity on/off times",
          "Setup start/deadline",
          "Festival departure deadline",
          "Opening hours",
          "Gas check time",
          "Full setup deadline",
        ],
      },
      {
        title: "Menu + Prices",
        type: "doc",
        driveId: "1Ei99klmCBMKiusn8wqli9riF85rwA9yWu_3PiJV9pUM",
        summary: "Fish: 119kr burger, 149kr combo, 125kr Fish N Chips, 50kr fries. Gyros: 109kr chicken gyros, 149kr combo. Crepes: 95kr salty, 55kr nutella/banana, 50kr sugar/cinnamon. Chicken concept (KFC-style buckets + burger + salad) discussed with Jonas 17 Feb.",
      },
    ],
    emails: [
      {
        date: "2026-04-14",
        from: "akkreditering@jellingmusikfestival.dk",
        subject: "Akkreditering til Jelling Musikfestival 2026",
        summary: "4 accreditation logins received for aa@thefishproject.dk. Each login gives access to register staff/crew for festival entry. System at jellingmusikfestival.dk accreditation portal.",
        direction: "inbox",
      },
      {
        date: "2026-03-13",
        from: "Jonas Kring (festival)",
        subject: "Power layout Jelling",
        summary: "Jonas sent power layout. Need to confirm: 32A for fridge container, 230V for La Creperie, Chicks & Buns power needs. REPLY NEEDED.",
        direction: "inbox",
      },
      {
        date: "2026-03-10",
        from: "Lea Haldrup (økonomi)",
        subject: "Jelling Musikfestival - information om sortimenter",
        summary: "POS sortiment template due 15 April. Need: full product list + prices, contact person, bank account for payout, POS-user emails, confirm 2x POS units per concept. DEADLINE PASSED.",
        direction: "inbox",
      },
      {
        date: "2026-02-17",
        from: "Jonas Kring (festival)",
        subject: "Jelling, fish project setup",
        summary: "Tent setup: can we use 2x 6×6m side-by-side (middle sides removed) instead of 12×6m? Filip replied proposing 12×9m tent (6m fish + 6m gyros) at festival + 2x 6×6m at camping. Awaiting Jonas confirmation.",
        direction: "inbox",
      },
      {
        date: "2026-02-17",
        from: "Filip Færgeman (sent)",
        subject: "Re: Jelling, fish project setup",
        summary: "Sent tent proposal: FESTIVAL 12×9m tent (6m fish + 6m gyros), CAMPING 6×6m Crepes + 6×6m Chicken concept.",
        direction: "sent",
      },
      {
        date: "2026-01-29",
        from: "Filip Færgeman (sent)",
        subject: "Re: Heatmap data",
        summary: "Thanked Jonas for heatmap / hourly transaction data from previous years.",
        direction: "sent",
      },
    ],
    setupChecklist: {
      electricity: { status: "pending", details: "Jonas sent power layout Mar 13 — need to confirm 32A fridge container + 230V per concept. REPLY NEEDED." },
      tent: { status: "warning", details: "2x 6×6m vs 12×6m discussion with Jonas (Feb 17). Awaiting confirmation. Flame-retardant cert needed." },
      cooling: { status: "confirmed", details: "Godik #247741: 2x 20' cooling/freezer containers, 21-24 May, DKK 15,732 incl. moms. Payment due 12 May. Arrive Tue 19 May 07:00-18:00, pickup Mon 25 May." },
      gasSafety: { status: "pending", details: "Gas check required — no date set yet" },
      pos: { status: "critical", details: "POS sortiment template deadline 15 April — PASSED! Lea Haldrup needs filled xlsx with prices, bank account, POS-user emails." },
      foodDelivery: { status: "pending", details: "BC-Catering coordination needed. Leftover equipment pickup TBD." },
      staffAccred: { status: "confirmed", details: "4 accreditation logins received Apr 14 from jellingmusikfestival.dk. Register staff at accreditation portal." },
      accommodation: { status: "pending", details: "20-person rooms at Cabinn Vejle mentioned — not confirmed" },
    },
    contractDetails: {
      signedDate: "13.03.2026",
      festivalOrganizer: "Festivalfonden af 2006",
      organizerCvr: "29413770",
      festivalAddress: "Møllvangvej 66B, 7300 Jelling",
      contactsFestival: [
        { name: "Bettina Køsch", role: "Contract", phone: "7587 2888", email: "bettina@jellingmusikfestival.dk" },
        { name: "Jonas Kring", role: "Praktik", phone: "2296 9161", email: "jonas@skevents.dk" },
      ],
      contactsInternal: [
        { name: "Alexandra Artimon", role: "Primary contact", phone: "42787738", email: "aa@thefishproject.dk" },
      ],
      cashless: true,
      posProvider: "EventPos",
      paymentTerms: "Revenue minus commission transferred within 2 weeks after festival. 1,500kr+moms per extra POS terminal.",
      specialRules: [
        "BR18 facade legislation — new requirement 2026",
        "Tent cost deducted from settlement by FF",
        "Plastic floor included in tent",
        "1 camping wagon allowed (leader camp)",
        "1 vehicle pass (deliveries before 10:00)",
        "3m depth behind stall as back area",
        "May sell Egekilde water only (no other drinks)",
        "Water request deadline: 15 March",
      ],
      concepts: [
        {
          conceptName: "The Fish Project",
          entity: "The Fish Project ApS",
          cvr: "39236931",
          tentSize: "12m facade x 9m depth, shared w/ Gyros By Gaia",
          location: "Festival",
          commissionTiers: [
            { threshold: "<160,000 kr", rate: "15%" },
            { threshold: "160,000-200,000 kr", rate: "17%" },
            { threshold: ">200,000 kr", rate: "20%" },
            { threshold: "Drinks", rate: "30%" },
          ],
          fixedFee: "3,000 kr + moms",
          maxStaff: 10,
          leaderPasses: 6,
          regularPasses: 4,
          minWorkHours: 25,
          sortiment: "Fresh Fish & Chips + fish burger. Min 1 vegetarian option, gluten/lactose options.",
          waterAccess: false,
          campingVogn: true,
          power: "7 x 16 Amp",
        },
        {
          conceptName: "Gyros By Gaia",
          entity: "The Fish Project ApS / Gyros By Gaia",
          cvr: "39236931",
          tentSize: "12m x 9m shared w/ Fish Project",
          location: "Festival",
          commissionTiers: [
            { threshold: "<160,000 kr", rate: "15%" },
            { threshold: "160,000-200,000 kr", rate: "17%" },
            { threshold: ">200,000 kr", rate: "20%" },
            { threshold: "Drinks", rate: "30%" },
          ],
          fixedFee: "3,000 kr + moms",
          maxStaff: 10,
          leaderPasses: 6,
          regularPasses: 4,
          minWorkHours: 25,
          sortiment: "Chicken Gyros with fries. Min 1 vegetarian option.",
          waterAccess: false,
          campingVogn: false,
          power: "2 x 32 Amp + 5 x 16 Amp",
        },
        {
          conceptName: "La Creperie",
          entity: "The Fish Project ApS / La Creperie",
          cvr: "39236931",
          tentSize: "12m facade x 6m depth, shared w/ Chicks & Buns",
          location: "Markedspladsen/Campen",
          commissionTiers: [
            { threshold: "<160,000 kr", rate: "15%" },
            { threshold: "160,000-200,000 kr", rate: "17%" },
            { threshold: ">200,000 kr", rate: "20%" },
            { threshold: "Drinks", rate: "30%" },
          ],
          fixedFee: "3,000 kr + moms",
          maxStaff: 12,
          leaderPasses: 4,
          regularPasses: 8,
          minWorkHours: 25,
          sortiment: "Pancakes: salty, sweet & breakfast crepes with egg & bacon",
          waterAccess: false,
          campingVogn: false,
          openingHours: "Day 1 (Thu) 12:00-03:00, Days 2-4 (Fri/Sat/Sun) 07:00-03:00",
          power: "7 x 230V",
        },
        {
          conceptName: "Chicks & Buns",
          entity: "The Fish Project ApS / Chicks & Buns",
          cvr: "39236931",
          tentSize: "12m x 6m shared w/ La Creperie",
          location: "Markedspladsen/Campen",
          commissionTiers: [
            { threshold: "<160,000 kr", rate: "15%" },
            { threshold: "160,000-200,000 kr", rate: "17%" },
            { threshold: ">200,000 kr", rate: "20%" },
            { threshold: "Drinks", rate: "30%" },
          ],
          fixedFee: "3,000 kr + moms",
          maxStaff: 12,
          leaderPasses: 4,
          regularPasses: 8,
          minWorkHours: 25,
          sortiment: "Quality fried chicken: Chicken-box, chicken burger & chicken bowls + gourmet jumbo fries",
          waterAccess: false,
          campingVogn: false,
          openingHours: "Day 1 (Thu) 12:00-03:00, Days 2-4 07:00-03:00",
          power: "8 x 16/3A",
        },
      ],
      deadlines: [
        { date: "15 Mar", description: "Extra power purchase", status: "passed" },
        { date: "15 Mar", description: "Gas consumption report", status: "passed" },
        { date: "15 Mar", description: "Back area drawing", status: "passed" },
        { date: "15 Apr", description: "Extra POS terminals order", status: "passed" },
        { date: "15 Apr", description: "POS sortiment + prices setup", status: "passed" },
        { date: "15 Apr", description: "Camping wagon booking", status: "passed" },
        { date: "20 May 09:00", description: "Gas & fire inspection", status: "upcoming" },
      ],
    },
  },
  {
    id: 2, name: "Nordside", dates: "CANCELLED", daysAway: null, status: "CANCELLED",
    notes: "Festival cancelled",
    commission: 0, exclusivity: "N/A", powerIncluded: false, powerCost: 0,
    gasRequired: false, organicRequired: false, standLocation: "N/A",
    accommodation: "N/A",
    contracts: { signed: false, critical: false },
    documents: [
      {
        title: "FLÆSKE SW — Ansøgningsskema NorthSide 2026",
        type: "doc",
        driveId: "1Ff8iIFAUTEI7tZsPelx6iS-_WtS1oGEIyWvM7bVvewE",
        summary: "Application form for NorthSide (Flæskestegssandwich concept). Menu: Flæskestegssandwich (110-120kr), 100% organic. Firma: The Fish Project, CVR 39236931, Filip Færgeman.",
      },
      {
        title: "FISH — Ansøgningsskema NorthSide 2026",
        type: "doc",
        driveId: "1Fi9uuu69Yg0-WaK62cI9fmRSxhgab_zhmQzref5-AGQ",
        summary: "Application form for NorthSide (Fish concept). File too large to read via API.",
      },
    ],
    setupChecklist: {},
  },
  {
    id: 3, name: "Heartland", dates: "15-22 Jun 2026", daysAway: 60, status: "URGENT",
    notes: "Has production plan. Address: Egeskov Gade 20, Kværndrup. 6 missing items.",
    commission: 10, exclusivity: "Standard", powerIncluded: false, powerCost: 0,
    gasRequired: true, organicRequired: false, standLocation: "TBD",
    accommodation: "TBD",
    contracts: { signed: true, critical: false },
    documents: [
      {
        title: "Production Plan Heartland",
        type: "doc",
        driveId: "1Pq_n9XrS48z3ni0wSMwQ8lHYMYGHyEUP69O01em2wm0",
        summary: "Address: Egeskov Gade 20, 5772 Kværndrup. Setup Tue 16 Jun 08:00, cooling arrives same day 07:00-18:00. Approval deadline Wed 17 Jun 08:00. Full setup Thu 18 10:00, doors 12:00. Sales close 03:00 nightly.",
        missingItems: [
          "Team arrival time",
          "Fidibus build team arrival",
          "Grocery delivery time",
          "Volunteer shift times",
          "Accommodation check-in/check-out",
          "Electricity on/off times",
        ],
      },
    ],
    setupChecklist: {
      electricity: { status: "pending", details: "Electricity on/off times MISSING from production plan" },
      tent: { status: "pending", details: "Size/type TBD" },
      cooling: { status: "confirmed", details: "Godik #247805: 1x 20' cooling/freezer container, 18-20 Jun, DKK 9,089 incl. moms. Payment due 9 Jun. Delivery: Egeskov Gade 20, Kværndrup." },
      gasSafety: { status: "pending", details: "Gas check approval deadline Wed 17 Jun 08:00" },
      pos: { status: "warning", details: "Deadline passed - coordinate" },
      foodDelivery: { status: "pending", details: "Grocery delivery time MISSING from plan" },
      staffAccred: { status: "warning", details: "Photo deadlines passed" },
      accommodation: { status: "pending", details: "Check-in/check-out MISSING from plan" },
    },
    contractDetails: {
      signedDate: undefined,
      festivalOrganizer: "I/S Heartland Festival c/o Live Nation",
      organizerCvr: "37074446",
      festivalAddress: "Egeskov Gade 20, 5772 Kværndrup",
      contactsFestival: [
        { name: "Dagny Hoppe", role: "Festival contact", phone: "+45 26719680", email: "dagny.hoppe@livenation.dk" },
      ],
      contactsInternal: [
        { name: "Alexandra Artimon", role: "Primary contact", phone: "42787738", email: "aa@thefishproject.dk" },
      ],
      cashless: true,
      posProvider: "Live Nation POS",
      paymentTerms: "Settlement after festival. Depositum 20,000 kr.",
      specialRules: [
        "Local ingredients required: fish from Jeka, fries from Flensted, all vegetables from Fyn",
        "50% organic raw materials required",
        "Bio-degradable packaging mandatory",
        "Organic accounting docs + claims deadline 01 Jul",
      ],
      concepts: [
        {
          conceptName: "The Fish Project + Gyros",
          entity: "The Fish Project ApS",
          cvr: "40747745",
          tentSize: "TBD",
          location: "Festival",
          commissionTiers: [
            { threshold: "All revenue", rate: "18.5%" },
          ],
          fixedFee: "N/A",
          maxStaff: 20,
          leaderPasses: 0,
          regularPasses: 0,
          minWorkHours: 0,
          sortiment: "Fish & chips, mixed fried fish + shellfish + fries AND Gyros with chicken + falafel",
          waterAccess: true,
          campingVogn: false,
          depositum: "20,000 kr",
        },
      ],
      deadlines: [
        { date: "17 Feb", description: "Material order", status: "passed" },
        { date: "01 Mar", description: "Floor plan", status: "passed" },
        { date: "10 Apr", description: "Crew count + schedule + overnighters", status: "passed" },
        { date: "10 Apr", description: "Price/sortiment approval", status: "passed" },
        { date: "01 May", description: "Final placement", status: "upcoming" },
        { date: "15 Jun", description: "Staff registration", status: "upcoming" },
        { date: "16 Jun 08:00", description: "Setup access", status: "upcoming" },
        { date: "17 Jun 08:00", description: "Tech/authority inspection", status: "upcoming" },
        { date: "18 Jun 10:00", description: "Setup complete, 12:00 doors open", status: "upcoming" },
        { date: "21 Jun", description: "Site returned", status: "upcoming" },
        { date: "01 Jul", description: "Organic accounting docs + claims deadline", status: "upcoming" },
        { date: "03 Jul", description: "Final settlement", status: "upcoming" },
      ],
    },
  },
  {
    id: 4, name: "Copenhell", dates: "13-21 Jun 2026", daysAway: 58, status: "ON TRACK",
    notes: "Has production plan + menu. Address: Refshalevej 211, KBH. 10 missing items.",
    commission: 12, exclusivity: "Fish + Gyros", powerIncluded: true, powerCost: 0,
    gasRequired: true, organicRequired: false, standLocation: "Refshalevej 211, 1432 København",
    accommodation: "Copenhagen area",
    contracts: { signed: true, critical: false },
    documents: [
      {
        title: "Production Plan Copenhell",
        type: "doc",
        driveId: "1EeOHux8PeGOJkjl60Gj0qN3AKBF5fbbdB8mrwfm2AcU",
        summary: "Address: Refshalevej 211, 1432 København. Possible setup Sat 13 or Sun 14 Jun (coordinate with Food Manager). Mon 15 access by 16:00 latest. Front disks Mon 16:00 for festival POS install.",
        missingItems: [
          "Setup arrival date/time",
          "Team arrival time",
          "Grocery delivery time",
          "Volunteer shift times",
          "Accommodation check-in/check-out",
          "Electricity on/off times",
          "Cooling container arrival/pickup",
        ],
      },
      {
        title: "Menu + Prices (Copenhell)",
        type: "doc",
        driveId: "10BkjG8OdoZ5vqFa9GY73g-D50ZkrMojZthnxhHEAVlk",
        summary: "Sent to organizers 19 Jan 2026. Fish N chips: 139kr, Fiskeburger: 109kr, Burger menu (burger+fritter+dyppelse): 149kr, Fritter+dyppelse: 55kr, Ekstra dyppelse: 15kr, Ekstra fisk: 45kr, Ekstra ost burger: 15kr.",
      },
    ],
    setupChecklist: {
      electricity: { status: "pending", details: "Electricity on/off times MISSING from plan" },
      tent: { status: "pending", details: "Size/type TBD — coordinate with Food Manager" },
      cooling: { status: "pending", details: "Cooling arrival/pickup times MISSING from plan" },
      gasSafety: { status: "pending", details: "Gas check date TBD" },
      pos: { status: "pending", details: "Front disks due Mon 15 Jun 16:00 for festival POS install" },
      foodDelivery: { status: "pending", details: "Grocery delivery time MISSING" },
      staffAccred: { status: "pending", details: "Check in at festival on arrival" },
      accommodation: { status: "pending", details: "Check-in/check-out MISSING from plan" },
    },
    contractDetails: {
      signedDate: "Digitally signed via Addo Sign",
      festivalOrganizer: "Live Nation Denmark ApS c/o COPENHELL",
      organizerCvr: "15897309",
      festivalAddress: "Refshalevej, Copenhagen",
      contactsFestival: [
        { name: "Bitten Nielsen", role: "Festival contact", phone: "22306010", email: "bitten.nielsen@livenation.dk" },
      ],
      contactsInternal: [
        { name: "Alexandra Artimon", role: "Primary contact", phone: "42787738", email: "aa@thefishproject.dk" },
      ],
      cashless: true,
      posProvider: "COPENHELL POS",
      paymentTerms: "Settlement after festival. Depositum 18,000 kr.",
      specialRules: [
        "50% organic raw materials required (by weight or cost)",
        "Bio-degradable packaging mandatory",
        "Must provide crew meals to COPENHELL volunteers (46.80 kr ex.moms per meal)",
        "No own music during opening hours",
        "Gas: KosangasBioMix40 only (10kg/11kg), no own gas bottles",
        "Capacity 250 meals/hour required",
        "Festival dates: 24-27 June 2026",
      ],
      concepts: [
        {
          conceptName: "The Fish Project",
          entity: "Aegean ApS",
          cvr: "43619888",
          tentSize: "TBD",
          location: "Festival",
          commissionTiers: [
            { threshold: "All revenue", rate: "19%" },
          ],
          fixedFee: "N/A",
          maxStaff: 20,
          leaderPasses: 0,
          regularPasses: 20,
          minWorkHours: 0,
          sortiment: "The Fish Project - fish'n'chips. Capacity 250 meals/hour.",
          waterAccess: true,
          campingVogn: false,
          depositum: "18,000 kr",
        },
      ],
      deadlines: [
        { date: "01 Mar", description: "Material order", status: "passed" },
        { date: "15 Apr", description: "Floor plan", status: "passed" },
        { date: "15 Apr", description: "Price/sortiment approval", status: "passed" },
        { date: "01 May", description: "Final placement", status: "upcoming" },
        { date: "15 Jun", description: "Staff registration", status: "upcoming" },
        { date: "20 Jun 10:00", description: "Setup access starts", status: "upcoming" },
        { date: "22 Jun 09:00", description: "Power/water ready", status: "upcoming" },
        { date: "23 Jun 12:00", description: "Setup must be complete", status: "upcoming" },
        { date: "28 Jun 07:00", description: "Checkout possible", status: "upcoming" },
        { date: "28 Jun 14:00", description: "Site returned clean", status: "upcoming" },
      ],
    },
  },
  {
    id: 5, name: "Tinderbox", dates: "22-28 Jun 2026", daysAway: 67, status: "ON TRACK",
    notes: "Has plan + reminder doc. Special: no 'veggie/vegetarian' naming allowed! Fire-retardant tent cert needed.",
    commission: 10, exclusivity: "Fish + Gyros", powerIncluded: false, powerCost: 3500,
    gasRequired: true, organicRequired: false, standLocation: "Falen 177, 5250 Odense",
    accommodation: "Hotel nearby",
    contracts: { signed: true, critical: false },
    documents: [
      {
        title: "Production Plan Tinderbox",
        type: "doc",
        driveId: "1_sIZq9Qm1ACO4r3RfmWqb8Alxm-2uKKyCu-H6WxnkZI",
        summary: "Address: Falen 177, 5250 Odense. Mon 22 Jun: Cooling container (Boxit) arrives, check in 08:00, front disks by 16:00. Tue 23: Setup from 08:00, cooling trailers delivered. Wed 24: Approval deadline 08:00, groceries from 12:00. Thu 25: Full setup by 10:00.",
        missingItems: [
          "Team arrival time",
          "Fidibus build team arrival",
          "Grocery delivery time",
          "Volunteer shift times",
          "Accommodation check-in/check-out",
          "Electricity on time",
        ],
      },
      {
        title: "Reminder — Stuff for Tinderbox",
        type: "doc",
        driveId: "1Z877oBCxi9FZi81LvLPu5bVx2Psy5x8Ec3p0IF6wcUc",
        summary: "IMPORTANT: Veggie gyros renamed 'Fried Croquettes' — organizers ban 'veggie/vegetarian' names. Vegetarian dishes must be TOP of menu card. Pop-up tents need: fire-retardant cert (DS/EN 13501-1 A1/A2), storm-securing, plastic floor for cooking.",
      },
    ],
    setupChecklist: {
      electricity: { status: "pending", details: "Electricity on time MISSING from plan" },
      tent: { status: "warning", details: "Pop-up tents need fire-retardant cert (DS/EN 13501-1), storm-securing, plastic floor for cooking" },
      cooling: { status: "confirmed", details: "Cooling container (Boxit) arrives Mon 22 Jun, trailers Tue 23 Jun" },
      gasSafety: { status: "pending", details: "Gas approval deadline Wed 24 Jun 08:00" },
      pos: { status: "pending", details: "Front disks due Mon 22 Jun 16:00 for POS install" },
      foodDelivery: { status: "pending", details: "Earliest groceries Wed 24 Jun 12:00" },
      staffAccred: { status: "pending", details: "Check in at festival on arrival" },
      accommodation: { status: "pending", details: "Check-in/check-out MISSING from plan" },
    },
    contractDetails: {
      festivalOrganizer: "Tinderbox (DTD Group)",
      organizerCvr: "DTD Group",
      festivalAddress: "Falen 177, 5250 Odense",
      contactsFestival: [
        { name: "Lisbet Foged", role: "Food Manager", email: "lisbet@dtdcrew.dk" },
      ],
      contactsInternal: [
        { name: "Alexandra Artimon", role: "Primary contact", phone: "42787738", email: "aa@thefishproject.dk" },
      ],
      cashless: true,
      posProvider: "Festival POS",
      paymentTerms: "20% of revenue ex.moms (+ moms on the commission)",
      specialRules: [
        "Opening hours: Thu 13:00-02:00, Fri-Sat 12:30-02:00",
        "Staff registration in Ruby system by 18 May",
        "Volunteers: 14-16 hours for partout, must be 18+ by 15 Jun",
        "No alcohol/drugs for volunteers",
        "Facade: decorated wood panels, 1m height top sign, no banners/flags",
        "Fire-retardant tent certification required",
        "Volunteer Lounge access (no food there for external volunteers)",
        "No 'veggie/vegetarian' naming allowed — use alternative names",
        "No MobilePay — fully cashless with festival POS only",
        "Bagasse/sugarcane/FSC-cert packaging only, no bioplastic",
        "Must have enough stock — never run out during festival (penalty possible)",
        "Gas: max 1x 11kg per unit in tent. 22kg must be outside in non-combustible cabinet",
        "Flee routes: min 1 exit per <10m facade, min 2 if >10m, each 1x2m",
      ],
      concepts: [
        {
          conceptName: "The Fish Project / Gaia",
          entity: "Blue Fish ApS",
          cvr: "40747745",
          tentSize: "TBD (fire-retardant cert required)",
          location: "Festival",
          commissionTiers: [
            { threshold: "All revenue ex.moms", rate: "20% + moms" },
          ],
          fixedFee: "N/A",
          maxStaff: 0,
          leaderPasses: 0,
          regularPasses: 0,
          minWorkHours: 14,
          sortiment: "Fish & Chips, Gyros (Fried Croquettes for veggie option)",
          waterAccess: true,
          campingVogn: false,
        },
        {
          conceptName: "Gyropolis - Greek Gyros",
          entity: "Blue Fish ApS",
          cvr: "40747745",
          tentSize: "TBD",
          location: "Festival",
          commissionTiers: [
            { threshold: "All revenue ex.moms", rate: "20% + moms" },
          ],
          fixedFee: "N/A",
          maxStaff: 0,
          leaderPasses: 0,
          regularPasses: 0,
          minWorkHours: 14,
          sortiment: "Greek Gyros",
          waterAccess: true,
          campingVogn: false,
        },
      ],
      deadlines: [
        { date: "26 Jan", description: "Signed contract with product form", status: "passed" },
        { date: "30 Jan", description: "Own tent specs / cooling wagon approval", status: "passed" },
        { date: "06-20 Feb", description: "Material ordering window", status: "passed" },
        { date: "20 Feb", description: "Gas order via Kosangas", status: "passed" },
        { date: "09 Mar", description: "Facade design approval", status: "passed" },
        { date: "10 Apr", description: "Construction drawings for large structures", status: "passed" },
        { date: "05 May", description: "Gas usage anmeldelse to Lisbet + Per Beck (per@dtdgroup.dk). >100kg needs Odense Brandvæsen approval", status: "upcoming" },
        { date: "05 May", description: "Tents >50m² or >50 people: submit to Odense Brandvæsen with drawings", status: "upcoming" },
        { date: "18 May", description: "All staff registered in Ruby (volunteers + paid)", status: "upcoming" },
        { date: "01 Jun", description: "Waste handling guidelines received", status: "upcoming" },
        { date: "22 Jun 08:00", description: "Tent frames ready, sales desks by 16:00", status: "upcoming" },
        { date: "24 Jun 08:00", description: "Booth ready for power/water hookup", status: "upcoming" },
        { date: "24 Jun 12:00", description: "Deliveries can begin", status: "upcoming" },
        { date: "25 Jun 07:00", description: "Power/water expected ready", status: "upcoming" },
      ],
    },
  },
  {
    id: 6, name: "Cirkus Summarum", dates: "22-28 Jun 2026", daysAway: 67, status: "URGENT",
    notes: "Production plan mostly EMPTY — dual location (CPH + Aarhus). Overlaps with Tinderbox. Prices confirmed with Jacob Paaske Harms (Muskelsvindfonden).",
    commission: 11, exclusivity: "Fish + Gyros", powerIncluded: false, powerCost: 4200,
    gasRequired: true, organicRequired: false, standLocation: "CPH: Kræmmerpladsen, Skovlunde / Aarhus: Tangkrogen",
    accommodation: "Local",
    contracts: { signed: true, critical: false },
    documents: [
      {
        title: "Production Plan Cirkus Summarum",
        type: "doc",
        driveId: "1x6x33wh5A5ihO3gKNrZMA5i4CGIpRCrKOxCAc14Go8s",
        summary: "DUAL LOCATION. Copenhagen: Kræmmerpladsen, Marbækvej 5, 2740 Skovlunde. Aarhus: Tangkrogen, Marselisborg Havnevej 1, 8000 Aarhus C. Schedule Mon 22 – Sun 28 Jun is COMPLETELY EMPTY.",
        missingItems: [
          "Team arrival time",
          "Grocery delivery time",
          "Accommodation check-in/check-out",
          "Electricity on/off times",
          "Entire daily schedule",
        ],
      },
    ],
    emails: [
      {
        date: "2026-03-17",
        from: "Jacob Paaske Harms (jaha@muskelsvindfonden.dk)",
        subject: "priser til CS26",
        summary: "Price confirmation request — deadline before Easter (31 Mar). Pancakes: savory 100kr, sweet 45-60kr. Fish & Chips: 119kr / 75kr kids. Nuggets: 119kr / 75kr kids. Extra fries 45kr, dip 15kr.",
        direction: "inbox",
      },
    ],
    setupChecklist: {
      electricity: { status: "pending", details: "Electricity on/off MISSING — entire schedule empty" },
      tent: { status: "pending", details: "Dual-location tent setup TBD" },
      cooling: { status: "pending", details: "Not mentioned in plan" },
      gasSafety: { status: "pending", details: "Gas check TBD" },
      pos: { status: "pending", details: "Dual-location POS TBD" },
      foodDelivery: { status: "pending", details: "Grocery delivery MISSING" },
      staffAccred: { status: "pending", details: "Check in at event on arrival" },
      accommodation: { status: "pending", details: "Check-in/check-out MISSING" },
    },
  },
  {
    id: 7, name: "Vig Festival", dates: "6-12 Jul 2026", daysAway: 81, status: "URGENT",
    notes: "Production plan has 18 MISSING items! Address unknown. Schedule completely empty.",
    commission: 10, exclusivity: "Fish + Gyros + Crepes", powerIncluded: false, powerCost: 2800,
    gasRequired: true, organicRequired: false, standLocation: "Address: ???",
    accommodation: "TBD",
    contracts: { signed: true, critical: false },
    documents: [
      {
        title: "Production Plan Vig",
        type: "doc",
        driveId: "1mOlf5RBGM1rtLoMpVFMz4xUWuhXjfvfrkpD9AckQHJU",
        summary: "Address: UNKNOWN. Schedule Mon 6 – Sun 12 Jul is COMPLETELY EMPTY. 18 missing items — the most of any festival.",
        missingItems: [
          "Festival address",
          "Team arrival time",
          "Fidibus build team arrival",
          "Grocery delivery time",
          "BC-Catering leftover pickup",
          "Volunteer shift times",
          "Accommodation check-in/check-out",
          "Electricity on/off times",
          "Cooling unit arrival/pickup",
          "Setup start time",
          "Setup deadline",
          "Festival departure deadline",
          "Opening hours",
          "Gas check time",
          "Full setup deadline",
        ],
      },
    ],
    setupChecklist: {
      electricity: { status: "pending", details: "Electricity on/off MISSING" },
      tent: { status: "pending", details: "No info in plan" },
      cooling: { status: "pending", details: "Cooling arrival/pickup MISSING" },
      gasSafety: { status: "pending", details: "Gas check time MISSING" },
      pos: { status: "pending", details: "No POS info" },
      foodDelivery: { status: "pending", details: "Grocery delivery MISSING, BC-Catering pickup TBD" },
      staffAccred: { status: "pending", details: "No info" },
      accommodation: { status: "pending", details: "Check-in/check-out MISSING" },
    },
    contractDetails: {
      festivalOrganizer: "Foreningen Vig Festival",
      organizerCvr: "21074845",
      festivalAddress: "Holbækvej 16B, 4560 Vig",
      contactsFestival: [],
      contactsInternal: [
        { name: "Alexandra Artimon", role: "Primary contact", phone: "42787738", email: "aa@thefishproject.dk" },
      ],
      cashless: true,
      posProvider: "OnlinePOS",
      paymentTerms: "15% of revenue incl.moms. Cancellation after 01 Jul: 10,000 kr + moms fee.",
      specialRules: [
        "No alcohol sales allowed (festival-only)",
        "Min 18 hours work for wristband",
        "Cancellation after 01 Jul: 10,000 kr + moms fee",
      ],
      concepts: [
        {
          conceptName: "Fish N Chips",
          entity: "MCA Trading ApS",
          cvr: "39313707",
          tentSize: "6x6m / 6x9m",
          location: "Festival",
          commissionTiers: [
            { threshold: "All revenue incl.moms", rate: "15%" },
          ],
          fixedFee: "N/A",
          maxStaff: 21,
          leaderPasses: 4,
          regularPasses: 17,
          minWorkHours: 18,
          sortiment: "Fish N Chips 139kr, Fries 49kr, Fish Burger 109kr/135kr with fries",
          waterAccess: true,
          campingVogn: false,
          power: "16A per 6m included",
        },
        {
          conceptName: "La Creperie",
          entity: "MCA Trading ApS",
          cvr: "39313707",
          tentSize: "6x6m / 6x9m",
          location: "Festival",
          commissionTiers: [
            { threshold: "All revenue incl.moms", rate: "15%" },
          ],
          fixedFee: "N/A",
          maxStaff: 21,
          leaderPasses: 4,
          regularPasses: 17,
          minWorkHours: 18,
          sortiment: "Crepes",
          waterAccess: true,
          campingVogn: false,
          power: "16A per 6m included",
        },
      ],
      deadlines: [
        { date: "05 Jul", description: "Last day to order extra wristbands", status: "upcoming" },
        { date: "Sun week 28 12:00", description: "Site cleared", status: "upcoming" },
      ],
    },
  },
  {
    id: 8, name: "Grøn Koncert", dates: "13-22 Jul 2026", daysAway: 88, status: "ON TRACK",
    notes: "Multi-city touring: Tårnby (Thu 16), Kolding (Fri 17), Aarhus (Sat 18). 18 missing items.",
    commission: 12, exclusivity: "Fish + Gyros", powerIncluded: false, powerCost: 5600,
    gasRequired: true, organicRequired: false, standLocation: "Multiple cities — addresses MISSING",
    accommodation: "Multiple venues",
    contracts: { signed: true, critical: false },
    documents: [
      {
        title: "Production Plan Grøn Koncert",
        type: "doc",
        driveId: "1dFZuF2OkBV8sJ3HnLaGM5ZPbgv_TU14nc1N3zeSZgqU",
        summary: "Multi-city touring festival. Addresses: UNKNOWN. Thu 16 Jul: Grøn Tårnby. Fri 17: Grøn Kolding. Sat 18: Grøn Aarhus. 18 missing items — same as Vig.",
        missingItems: [
          "All venue addresses",
          "Team arrival time",
          "Fidibus build team arrival",
          "Grocery delivery time",
          "BC-Catering leftover pickup",
          "Volunteer shift times",
          "Accommodation check-in/check-out",
          "Electricity on/off times",
          "Cooling unit arrival/pickup",
          "Setup start/deadline",
          "Opening hours",
          "Gas check time",
        ],
      },
    ],
    setupChecklist: {
      electricity: { status: "pending", details: "Multi-site electricity — all MISSING" },
      tent: { status: "pending", details: "Multi-site tent setup TBD" },
      cooling: { status: "pending", details: "Cooling arrival/pickup MISSING" },
      gasSafety: { status: "pending", details: "Gas check MISSING" },
      pos: { status: "pending", details: "Multi-register per city TBD" },
      foodDelivery: { status: "pending", details: "Multi-city delivery logistics MISSING" },
      staffAccred: { status: "pending", details: "Multi-site accreditation TBD" },
      accommodation: { status: "pending", details: "Multi-city accommodation MISSING" },
    },
  },
  {
    id: 9, name: "Syd For Solen", dates: "10-16 Aug 2026", daysAway: 116, status: "PLANNING",
    notes: "Production plan sparse. Cooling arrives Tue 11 Aug. First day Thu 13 Aug. 16 missing items.",
    commission: 10, exclusivity: "Fish + Gyros + Crepes", powerIncluded: false, powerCost: 23200,
    gasRequired: false, organicRequired: false, standLocation: "Tudsemindevej 39, 2450 KBH SV",
    accommodation: "Beach area accommodation",
    contracts: { signed: false, critical: false },
    documents: [
      {
        title: "Production Plan Syd For Solen",
        type: "doc",
        driveId: "18aTYRGgXQXehd7VixxnNSCnRhnUTw3GUJ-kwMLWNEo8",
        summary: "Address: UNKNOWN. Cooling container arrives Tue 11 Aug 07:00-18:00, pickup Sun 16 Aug 07:00-18:00. First day Thu 13 Aug, last day Sat 15 Aug (3 days).",
        missingItems: [
          "Festival address",
          "Team arrival time",
          "Fidibus build team arrival",
          "Grocery delivery time",
          "BC-Catering leftover pickup",
          "Volunteer shift times",
          "Accommodation check-in/check-out",
          "Electricity on/off times",
          "Setup start/deadline",
          "Opening hours",
          "Gas check time",
        ],
      },
    ],
    setupChecklist: {
      electricity: { status: "pending", details: "Electricity on/off MISSING" },
      tent: { status: "pending", details: "No tent info" },
      cooling: { status: "confirmed", details: "Godik #247806: 1x 20' cooling/freezer container, 13-15 Aug, DKK 6,939 incl. moms. Payment due 4 Aug. Delivery: Tudsemindevej 39, 2450 KBH SV." },
      gasSafety: { status: "pending", details: "Gas check MISSING" },
      pos: { status: "pending", details: "No POS info" },
      foodDelivery: { status: "pending", details: "Grocery delivery MISSING" },
      staffAccred: { status: "pending", details: "No info" },
      accommodation: { status: "pending", details: "Check-in/check-out MISSING" },
    },
    contractDetails: {
      festivalOrganizer: "Smash!Bang!Pow! ApS (SBP)",
      organizerCvr: "33072635",
      festivalAddress: "Knabrostr 3A 4.sal, 1210 KBH K",
      contactsFestival: [],
      contactsInternal: [
        { name: "Alexandra Artimon", role: "Primary contact", phone: "42787738", email: "aa@thefishproject.dk" },
      ],
      cashless: false,
      posProvider: "TBD",
      paymentTerms: "Commission 20% (from Bilag 1 appendiks). No exclusivity clause. Cancellation: each party bears own costs.",
      specialRules: [
        "No exclusivity clause",
        "Cancellation: each party bears own costs",
        "Commission 20% from Bilag 1 appendiks",
      ],
      concepts: [
        {
          conceptName: "The Fish Project",
          entity: "The Fish Project ApS",
          cvr: "39236931",
          tentSize: "TBD",
          location: "Festival",
          commissionTiers: [
            { threshold: "All revenue", rate: "20%" },
          ],
          fixedFee: "N/A",
          maxStaff: 0,
          leaderPasses: 0,
          regularPasses: 0,
          minWorkHours: 0,
          sortiment: "Fish & Chips",
          waterAccess: false,
          campingVogn: false,
        },
      ],
      deadlines: [],
    },
  },
  {
    id: 10, name: "Suset", dates: "17-25 Aug 2026", daysAway: 130, status: "URGENT",
    notes: "Production plan nearly empty. 18 missing items! First day Fri 21 Aug, last day Sat 22 Aug. Gas plan due 30 May. Wind-resistant construction required (harbor).",
    commission: 8, exclusivity: "Fish-only + organic requirements", powerIncluded: false, powerCost: 4500,
    gasRequired: true, organicRequired: true, standLocation: "Østre Forhavnskaj, Esbjerg",
    accommodation: "Hotel - TBD",
    contracts: { signed: true, critical: true },
    documents: [
      {
        title: "Production Plan Suset",
        type: "doc",
        driveId: "1qgjpgviMm1-pe1ZDMQlH5VtshH1qRilVNDTu_fCk6Zw",
        summary: "Address: UNKNOWN. First day Fri 21 Aug, last day Sat 22 Aug (2 days only). 18 missing items — schedule almost entirely empty.",
        missingItems: [
          "Festival address",
          "Team arrival time",
          "Fidibus build team arrival",
          "Grocery delivery time",
          "BC-Catering leftover pickup",
          "Volunteer shift times",
          "Accommodation check-in/check-out",
          "Electricity on/off times",
          "Cooling unit arrival/pickup",
          "Setup start/deadline",
          "Opening hours",
          "Gas check time",
          "Full setup deadline",
        ],
      },
    ],
    setupChecklist: {
      electricity: { status: "pending", details: "Electricity on/off MISSING" },
      tent: { status: "pending", details: "No tent info" },
      cooling: { status: "pending", details: "Cooling arrival/pickup MISSING" },
      gasSafety: { status: "warning", details: "Gas floor plan due 30.05.2026. No own gas — order through festival. Inspection 22.08 09:00-16:00." },
      pos: { status: "pending", details: "Live Nation POS (cashless festival)" },
      foodDelivery: { status: "critical", details: "ORGANIC SOURCING — 50% requirement! Supplier coordination MISSING." },
      staffAccred: { status: "pending", details: "No info" },
      accommodation: { status: "pending", details: "Check-in/check-out MISSING" },
    },
    contractDetails: {
      signedDate: "18.03.2026",
      festivalOrganizer: "SUSET c/o Live Nation",
      organizerCvr: "37074446",
      festivalAddress: "Østre Forhavnskaj, Esbjerg",
      contactsFestival: [
        { name: "Tobias Kippenberger", role: "Festival contact", phone: "+45 31252466", email: "tobias@livenation.dk" },
      ],
      contactsInternal: [
        { name: "Alexandra Artimon", role: "Primary contact", phone: "42787738", email: "aa@thefishproject.dk" },
      ],
      cashless: true,
      posProvider: "Live Nation POS",
      paymentTerms: "Settlement after festival. Contract valid until 31.08.2026. Capacity: 16,000 daily / 32,000 total.",
      specialRules: [
        "Multiple commission tiers by product category",
        "Extensive legal framework (Bilag A through E)",
        "Festival dates: 21-22 August 2026 (2 days only, Fri-Sat)",
        "Capacity: 16,000 daily / 32,000 total",
        "BILAG C: No own gas bottles — order through festival only",
        "BILAG C: Gas inspection 22.08.2026 09:00-16:00. All costs for fixes borne by stall holder",
        "BILAG C: Floor plan with gas appliances + kW ratings due by 30.05.2026",
        "BILAG D: Stall design must match Suset industrial-harbor aesthetic. Wind-resistant construction required (Esbjerg harbor).",
        "BILAG D: Design approval required before festival. All constructions >1m need building permit.",
      ],
      concepts: [
        {
          conceptName: "Gyropolis",
          entity: "The Fish Project",
          cvr: "39236931",
          tentSize: "TBD",
          location: "Festival",
          commissionTiers: [
            { threshold: "Meals", rate: "18%" },
            { threshold: "Snacks & Sides", rate: "25%" },
            { threshold: "Dips & Extras", rate: "18%" },
          ],
          fixedFee: "N/A",
          maxStaff: 0,
          leaderPasses: 0,
          regularPasses: 0,
          minWorkHours: 0,
          sortiment: "Gyropolis - Greek Gyros",
          waterAccess: false,
          campingVogn: false,
        },
      ],
      deadlines: [
        { date: "30.05.2026", description: "Gas floor plan with appliance list + kW ratings due (Bilag C)", status: "upcoming" },
        { date: "22.08.2026", description: "Gas safety inspection day 09:00-16:00 (Bilag C)", status: "upcoming" },
      ],
    },
  },
  {
    id: 11, name: "Tønder", dates: "24-30 Aug 2026", daysAway: 131, status: "ON TRACK",
    notes: "Has plan. Day 1 Wed 26 Aug – Day 4 Sat 29 Aug. 18 missing items.",
    commission: 10, exclusivity: "Fish + Gyros", powerIncluded: false, powerCost: 3800,
    gasRequired: true, organicRequired: false, standLocation: "Address: ???",
    accommodation: "Local hotel",
    contracts: { signed: true, critical: false },
    documents: [
      {
        title: "Production Plan Tønder",
        type: "doc",
        driveId: "1jRu_Ih4EEEwxuyRHfkNUhlzZ4raZ2a79KXrmBJwOrKA",
        summary: "Address: UNKNOWN. Day 1 Wed 26 Aug, Day 2 Thu 27, Day 3 Fri 28, Day 4 Sat 29 (4 festival days). 18 missing items.",
        missingItems: [
          "Festival address",
          "Team arrival time",
          "Fidibus build team arrival",
          "Grocery delivery time",
          "BC-Catering leftover pickup",
          "Volunteer shift times",
          "Accommodation check-in/check-out",
          "Electricity on/off times",
          "Cooling unit arrival/pickup",
          "Setup start/deadline",
          "Opening hours",
          "Gas check time",
          "Full setup deadline",
        ],
      },
    ],
    setupChecklist: {
      electricity: { status: "pending", details: "Electricity on/off MISSING" },
      tent: { status: "pending", details: "No tent info" },
      cooling: { status: "pending", details: "Cooling arrival/pickup MISSING" },
      gasSafety: { status: "pending", details: "Gas check MISSING" },
      pos: { status: "pending", details: "No POS info" },
      foodDelivery: { status: "pending", details: "Grocery delivery MISSING" },
      staffAccred: { status: "pending", details: "No info" },
      accommodation: { status: "pending", details: "Check-in/check-out MISSING" },
    },
  },
  {
    id: 12, name: "Fyr Festen", dates: "TBD Summer 2026", daysAway: 100, status: "PLANNING",
    notes: "Empty folder - awaiting information",
    commission: 0, exclusivity: "TBD", powerIncluded: false, powerCost: 0,
    gasRequired: false, organicRequired: false, standLocation: "TBD",
    accommodation: "TBD",
    contracts: { signed: false, critical: false },
    setupChecklist: {},
  },
  {
    id: 13, name: "Aarhus Festuge", dates: "TBD Autumn 2026", daysAway: 150, status: "PLANNING",
    notes: "Empty folder - awaiting information",
    commission: 0, exclusivity: "TBD", powerIncluded: false, powerCost: 0,
    gasRequired: false, organicRequired: false, standLocation: "TBD",
    accommodation: "TBD",
    contracts: { signed: false, critical: false },
    setupChecklist: {},
  },
];

const menuData: Record<string, MenuItem[]> = {
  fish: [
    { name: "Fish Burger", price: 119 },
    { name: "Fish Combo", price: 149 },
    { name: "Fish N Chips", price: 125 },
    { name: "Fries", price: 50 },
  ],
  gyros: [
    { name: "Chicken Gyros", price: 109 },
    { name: "Gyros Combo", price: 149 },
  ],
  crepes: [
    { name: "Salty Crepe", price: 95 },
    { name: "Nutella/Banana", price: 55 },
    { name: "Sugar/Cinnamon/Lemon", price: 50 },
  ],
};

const todoItems: TodoItem[] = [
  { id: "t1", text: "Jelling — Finalize POS template", priority: "CRITICAL", deadline: "Deadline PASSED", festival: "Jelling" },
  { id: "t2", text: "Jelling — Confirm tent facade + flame-retardant cert", priority: "CRITICAL", deadline: "Deadline PASSED", festival: "Jelling" },
  { id: "t3", text: "Heartland — Create detailed festival plan", priority: "URGENT", deadline: "Deadline PASSED", festival: "Heartland" },
  { id: "t4", text: "Suset — Source 50% organic ingredients supplier", priority: "CRITICAL", deadline: "Before Aug 17", festival: "Suset" },
  { id: "t5", text: "Syd For Solen — Finalize 2-stand electric setup 23,200 DKK", priority: "URGENT", deadline: "Before Aug 10", festival: "Syd For Solen" },
  { id: "t6", text: "Suset — Monitor contract signed this week", priority: "CRITICAL", deadline: "Week of Apr 15", festival: "Suset" },
  { id: "t7", text: "Fyr Festen — Request festival information + dates", priority: "URGENT", deadline: "ASAP", festival: "Fyr Festen" },
  { id: "t8", text: "Aarhus Festuge — Request festival information + dates", priority: "URGENT", deadline: "ASAP", festival: "Aarhus Festuge" },
];

// ── Phase Configuration ─────────────────────────────────────────────────

const PHASE_CONFIG: { number: number; title: string; color: string }[] = [
  { number: 1, title: "Research & Initial Decision", color: "#185FA5" },
  { number: 2, title: "Application & Contract", color: "#0F6E56" },
  { number: 3, title: "Pre-production Planning", color: "#854F0B" },
  { number: 4, title: "Staff & Accreditation", color: "#534AB7" },
  { number: 5, title: "Logistics & Transport", color: "#993C1D" },
  { number: 6, title: "On-site Setup", color: "#185FA5" },
  { number: 7, title: "Live Operations", color: "#3B6D11" },
  { number: 8, title: "Teardown & Departure", color: "#555555" },
  { number: 9, title: "Financial Close", color: "#A32D2D" },
];

// ── Phase Builder ───────────────────────────────────────────────────────

function driveUrl(id: string, type: string): string {
  if (type === "folder") return `https://drive.google.com/drive/folders/${id}`;
  if (type === "sheet") return `https://docs.google.com/spreadsheets/d/${id}/edit`;
  return `https://docs.google.com/document/d/${id}/edit`;
}

function buildPhases(f: FestivalData): Record<number, FestivalPhase> {
  const cd = f.contractDetails;
  const prodPlan = f.documents?.find(d => d.title.toLowerCase().includes("production plan"));
  const menuDoc = f.documents?.find(d => d.title.toLowerCase().includes("menu"));
  const menuSentEmail = f.emails?.find(e => e.direction === "sent" && (e.subject.toLowerCase().includes("menu") || e.subject.toLowerCase().includes("sortiment")));
  const menuReceivedEmail = f.emails?.find(e => e.direction === "inbox" && (e.subject.toLowerCase().includes("sortiment") || e.subject.toLowerCase().includes("menu")));

  // Phase 1 - Research: Complete for all non-cancelled
  const phase1: FestivalPhase = {
    status: f.status === "CANCELLED" ? "not-started" : "complete",
    steps: [
      { title: "Research festival opportunity", status: f.status === "CANCELLED" ? "not-started" : "complete", details: f.status === "CANCELLED" ? "Festival cancelled" : "Festival researched and evaluated" },
      { title: "Go / No-go decision", status: f.status === "CANCELLED" ? "not-started" : "complete", details: f.status === "CANCELLED" ? "Cancelled" : "Decision: GO" },
      { title: "First contact with organizer", status: f.status === "CANCELLED" ? "not-started" : "complete", details: cd ? `Contact: ${cd.festivalOrganizer}` : "Initial contact made" },
    ],
  };

  // Phase 2 - Contract
  const contractSigned = f.contracts.signed;
  const hasContractDetails = !!cd;
  const phase2Status: PhaseStatus = contractSigned && hasContractDetails ? "complete" : contractSigned ? "complete" : f.status === "CANCELLED" ? "not-started" : "in-progress";

  const phase2Steps: PhaseStep[] = [
    {
      title: "Submit application",
      status: f.status === "CANCELLED" ? "not-started" : "complete",
      details: f.status === "CANCELLED" ? "Festival cancelled" : "Application submitted",
    },
    {
      title: "Contract signed",
      status: contractSigned ? "complete" : f.status === "PLANNING" ? "in-progress" : "not-started",
      details: contractSigned
        ? `Signed${cd?.signedDate ? ` on ${cd.signedDate}` : ""}${cd ? ` with ${cd.festivalOrganizer} (CVR: ${cd.organizerCvr})` : ""}`
        : f.status === "PLANNING" ? "Awaiting contract" : "Not yet signed",
      actionNeeded: !contractSigned && f.status !== "CANCELLED" ? "Contract needs to be signed" : undefined,
    },
  ];

  if (cd && cd.deadlines.length > 0) {
    const passedCount = cd.deadlines.filter(d => d.status === "passed").length;
    const upcomingCount = cd.deadlines.filter(d => d.status === "upcoming").length;
    phase2Steps.push({
      title: "Contract deadlines",
      status: upcomingCount > 0 ? "in-progress" : "complete",
      details: `${passedCount} passed, ${upcomingCount} upcoming`,
      actionNeeded: upcomingCount > 0 ? `${upcomingCount} upcoming deadline${upcomingCount > 1 ? "s" : ""} to track` : undefined,
    });
  }

  phase2Steps.push({
    title: "Insurance submitted",
    status: contractSigned ? "in-progress" : "not-started",
    details: contractSigned ? "Verify insurance submission" : "Pending contract",
    actionNeeded: contractSigned ? "Confirm insurance is submitted" : undefined,
  });

  const phase2: FestivalPhase = { status: phase2Status, steps: phase2Steps };

  // Phase 3 - Pre-production
  const hasProdPlan = !!prodPlan;
  const missingCount = prodPlan?.missingItems?.length ?? 0;
  const hasMenu = !!menuDoc;
  const menuSubmitted = !!menuSentEmail || !!menuReceivedEmail;
  const accomStatus = f.setupChecklist.accommodation;

  const phase3Steps: PhaseStep[] = [
    {
      title: "Production plan",
      status: hasProdPlan ? (missingCount > 0 ? "in-progress" : "complete") : "not-started",
      details: hasProdPlan
        ? `${prodPlan!.title}${missingCount > 0 ? ` — ${missingCount} missing items` : ""}`
        : "No production plan created yet",
      actionNeeded: hasProdPlan && missingCount > 0 ? `Fill in ${missingCount} missing items` : !hasProdPlan ? "Create production plan" : undefined,
      link: hasProdPlan ? driveUrl(prodPlan!.driveId, prodPlan!.type) : undefined,
      linkLabel: hasProdPlan ? "Open in Drive" : undefined,
    },
    {
      title: "Brief Fidibus (build team)",
      status: hasProdPlan ? "in-progress" : "not-started",
      details: hasProdPlan ? "Production plan exists — brief Fidibus on tent/setup requirements" : "Waiting for production plan",
      actionNeeded: hasProdPlan ? "Schedule Fidibus briefing" : undefined,
    },
    {
      title: "Menu finalized",
      status: hasMenu ? "complete" : "not-started",
      details: hasMenu ? menuDoc!.summary?.substring(0, 120) + "..." : "No menu document found",
      actionNeeded: !hasMenu ? "Create and finalize menu" : undefined,
      link: hasMenu ? driveUrl(menuDoc!.driveId, menuDoc!.type) : undefined,
      linkLabel: hasMenu ? "Open Menu Doc" : undefined,
    },
    {
      title: "Menu submitted to festival",
      status: menuSubmitted ? "complete" : hasMenu ? "in-progress" : "not-started",
      details: menuSubmitted ? "Menu/sortiment communicated to organizer" : hasMenu ? "Menu ready but not yet submitted" : "Menu not yet finalized",
      actionNeeded: hasMenu && !menuSubmitted ? "Submit menu to festival organizer" : undefined,
    },
    {
      title: "Sales forecast calculated",
      status: "not-started",
      details: "No forecast created yet",
      actionNeeded: "Build sales forecast based on historical data and capacity",
    },
    {
      title: "Food orders placed",
      status: "not-started",
      details: "Not yet — pending menu finalization and forecast",
      actionNeeded: "Place food orders with suppliers",
    },
    {
      title: "Accommodation booked",
      status: accomStatus ? (accomStatus.status === "confirmed" || accomStatus.status === "complete" ? "complete" : "in-progress") : "not-started",
      details: accomStatus ? accomStatus.details : f.accommodation || "No accommodation info",
      actionNeeded: accomStatus && accomStatus.status === "pending" ? "Confirm accommodation booking" : undefined,
    },
  ];

  const phase3HasProgress = hasProdPlan || hasMenu || menuSubmitted;
  const phase3AllDone = phase3Steps.every(s => s.status === "complete");
  const phase3: FestivalPhase = {
    status: f.status === "CANCELLED" ? "not-started" : phase3AllDone ? "complete" : phase3HasProgress ? "in-progress" : "not-started",
    steps: phase3Steps,
  };

  // Phase 4 - Staff & Accreditation
  const accredEmail = f.emails?.find(e => e.subject.toLowerCase().includes("akkreditering") || e.subject.toLowerCase().includes("accredit"));
  const hasAccred = !!accredEmail || (f.setupChecklist.staffAccred?.status === "confirmed" || f.setupChecklist.staffAccred?.status === "complete");
  const staffDeadline = cd?.deadlines.find(d => d.description.toLowerCase().includes("staff") || d.description.toLowerCase().includes("medarbejder") || d.description.toLowerCase().includes("crew") || d.description.toLowerCase().includes("ruby"));

  const phase4Steps: PhaseStep[] = [
    { title: "Finalize staff roster", status: "not-started", details: "Assign team members to festival", actionNeeded: "Create shift roster for this festival" },
    { title: "Send staff info letters", status: "not-started", details: "Brief all staff on logistics and roles", actionNeeded: "Use mass email template from OVERALL DOCUMENTS" },
    {
      title: "Submit headcount to organizer",
      status: staffDeadline?.status === "passed" ? "blocked" : "not-started",
      details: staffDeadline ? `Deadline: ${staffDeadline.date} — ${staffDeadline.description}` : "Report final staff numbers",
      actionNeeded: staffDeadline?.status === "passed" ? "DEADLINE PASSED — coordinate immediately" : staffDeadline ? `Due by ${staffDeadline.date}` : "Submit when roster is final",
    },
    {
      title: "Collect wristbands / accreditation",
      status: hasAccred ? "in-progress" : "not-started",
      details: hasAccred
        ? (accredEmail ? `Accreditation received: ${accredEmail.summary.substring(0, 100)}...` : f.setupChecklist.staffAccred?.details || "Accreditation in progress")
        : "Accreditation process TBD",
      actionNeeded: hasAccred ? "Register staff in accreditation portal" : undefined,
    },
  ];

  const phase4HasProgress = hasAccred || staffDeadline?.status === "passed";
  const phase4: FestivalPhase = {
    status: f.status === "CANCELLED" ? "not-started" : phase4HasProgress ? "in-progress" : "not-started",
    steps: phase4Steps,
  };

  // Phase 5 - Logistics
  const coolingBooked = f.setupChecklist.cooling?.status === "confirmed" || f.setupChecklist.cooling?.status === "complete";
  const coolingIsGodik = f.setupChecklist.cooling?.details?.toLowerCase().includes("godik") ?? false;
  const gasDeadline = cd?.deadlines.find(d => d.description.toLowerCase().includes("gas") || d.description.toLowerCase().includes("inventaropstilling"));

  const phase5Steps: PhaseStep[] = [
    { title: "Create load list", status: "not-started", details: "Itemize everything to transport", actionNeeded: "Build load manifest for this festival" },
    { title: "Arrange transport", status: "not-started", details: "Book vehicles and plan routes", actionNeeded: "Confirm vehicle availability and route" },
    {
      title: "Confirm cooling delivery",
      status: coolingBooked ? "complete" : "not-started",
      details: f.setupChecklist.cooling?.details || "Cooling logistics TBD",
      actionNeeded: coolingBooked
        ? (coolingIsGodik ? "Payment due — check date in Godik contract" : undefined)
        : "Book cooling container (Godik or other)",
    },
    {
      title: "Confirm gas supply",
      status: f.gasRequired ? (gasDeadline ? "in-progress" : "not-started") : "complete",
      details: f.gasRequired
        ? (gasDeadline ? `Gas deadline: ${gasDeadline.date} — ${gasDeadline.description}` : f.setupChecklist.gasSafety?.details || "Gas required — details TBD")
        : "No gas required",
      actionNeeded: f.gasRequired && gasDeadline?.status === "upcoming" ? `Submit gas plan by ${gasDeadline.date}` : undefined,
    },
  ];

  const phase5HasProgress = coolingBooked || (f.gasRequired && !!gasDeadline);
  const phase5: FestivalPhase = {
    status: f.status === "CANCELLED" ? "not-started" : phase5HasProgress ? "in-progress" : "not-started",
    steps: phase5Steps,
  };

  // Phase 6 - On-site Setup
  const phase6: FestivalPhase = {
    status: "not-started",
    steps: [
      { title: "Fidibus builds stand", status: "not-started", details: "Tent and structure assembly" },
      { title: "Electricity check", status: "not-started", details: f.setupChecklist.electricity?.details || "Electricity TBD" },
      { title: "Cooling temperature check", status: "not-started", details: "Verify cooling units reach safe temp" },
      { title: "Gas safety inspection", status: "not-started", details: f.setupChecklist.gasSafety?.details || "Gas safety TBD" },
      { title: "Goods delivery received", status: "not-started", details: f.setupChecklist.foodDelivery?.details || "Food delivery TBD" },
      { title: "Equipment test", status: "not-started", details: "Test all kitchen and POS equipment" },
    ],
  };

  // Phase 7 - Live Operations
  const phase7: FestivalPhase = {
    status: "not-started",
    steps: [
      { title: "Daily opening checks", status: "not-started", details: "Temp logs, hygiene check, stock count" },
      { title: "Sales tracking", status: "not-started", details: "Monitor POS data throughout the day" },
      { title: "Stock management", status: "not-started", details: "Track inventory and reorder if needed" },
      { title: "Cash reconciliation", status: "not-started", details: "End-of-day cash vs. POS reconciliation" },
      { title: "Daily close procedure", status: "not-started", details: "Cleaning, securing equipment, prep for next day" },
    ],
  };

  // Phase 8 - Teardown
  const phase8: FestivalPhase = {
    status: "not-started",
    steps: [
      { title: "Pack down kitchen", status: "not-started", details: "Clean and pack all kitchen equipment" },
      { title: "Fidibus dismantles stand", status: "not-started", details: "Tent and structure takedown" },
      { title: "Cooling pickup", status: "not-started", details: f.setupChecklist.cooling?.details || "Cooling pickup TBD" },
      { title: "Final checkout with organizer", status: "not-started", details: "Site inspection and handover" },
    ],
  };

  // Phase 9 - Financial Close
  const phase9: FestivalPhase = {
    status: "not-started",
    steps: [
      { title: "Receive sales report from organizer", status: "not-started", details: "Get final POS/sales data" },
      { title: "Receive payment / settlement", status: "not-started", details: cd?.paymentTerms || "Payment terms TBD" },
      { title: "Calculate P&L", status: "not-started", details: "Full profit & loss calculation" },
      { title: "Post-festival debrief", status: "not-started", details: "Team retrospective and learnings" },
    ],
  };

  return {
    1: phase1,
    2: phase2,
    3: phase3,
    4: phase4,
    5: phase5,
    6: phase6,
    7: phase7,
    8: phase8,
    9: phase9,
  };
}

function getCurrentPhase(phases: Record<number, FestivalPhase>): number {
  for (let i = 9; i >= 1; i--) {
    if (phases[i].status === "complete" || phases[i].status === "in-progress") {
      return phases[i].status === "complete" && i < 9 ? i + 1 : i;
    }
  }
  return 1;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function statusBadge(status: FestivalStatus) {
  const colors: Record<FestivalStatus, string> = {
    CRITICAL: "bg-red-600/80 text-red-100",
    URGENT: "bg-orange-600/80 text-orange-100",
    "ON TRACK": "bg-green-600/80 text-green-100",
    PLANNING: "bg-blue-600/80 text-blue-100",
    CANCELLED: "bg-slate-600/80 text-slate-300",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${colors[status]}`}>
      {status}
    </span>
  );
}

function phaseStatusIcon(status: PhaseStatus) {
  switch (status) {
    case "complete":
      return <CheckCircle2 className="h-4 w-4 text-green-400" />;
    case "in-progress":
      return <Loader2 className="h-4 w-4 text-amber-400 animate-spin" />;
    case "blocked":
      return <Ban className="h-4 w-4 text-red-400" />;
    default:
      return <Circle className="h-4 w-4 text-slate-600" />;
  }
}

function stepStatusIcon(status: PhaseStatus) {
  switch (status) {
    case "complete":
      return <span className="text-green-400 flex-shrink-0">&#10003;</span>;
    case "in-progress":
      return <span className="text-amber-400 flex-shrink-0">&#x1F504;</span>;
    case "blocked":
      return <span className="text-red-400 flex-shrink-0">&#x1F6AB;</span>;
    default:
      return <span className="text-slate-600 flex-shrink-0">&#x2B1C;</span>;
  }
}

// ── Phase Dots (for selector) ───────────────────────────────────────────

function PhaseDots({ phases }: { phases: Record<number, FestivalPhase> }) {
  return (
    <div className="flex items-center gap-0.5">
      {PHASE_CONFIG.map((p) => {
        const phase = phases[p.number];
        const isComplete = phase?.status === "complete";
        const isInProgress = phase?.status === "in-progress";
        return (
          <div
            key={p.number}
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: isComplete ? p.color : isInProgress ? p.color : "#334155",
              opacity: isInProgress ? 0.6 : 1,
            }}
            title={`Phase ${p.number}: ${p.title} — ${phase?.status || "not-started"}`}
          />
        );
      })}
    </div>
  );
}

// ── Contract Summary Card ───────────────────────────────────────────────

function ContractSummaryCard({ cd }: { cd: ContractDetails }) {
  const totalLeader = cd.concepts.reduce((s, c) => s + c.leaderPasses, 0);
  const totalRegular = cd.concepts.reduce((s, c) => s + c.regularPasses, 0);

  return (
    <div className="bg-slate-700/40 border border-slate-600/50 rounded-lg p-4 mt-3 space-y-4">
      <h5 className="text-white font-semibold text-sm flex items-center gap-2">
        <FileText className="h-4 w-4 text-green-400" />
        Contract Summary
      </h5>

      {/* Organizer */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-slate-400 text-xs uppercase tracking-wider">Organizer</span>
          <p className="text-white font-medium">{cd.festivalOrganizer}</p>
          <p className="text-slate-400 text-xs">CVR: {cd.organizerCvr}</p>
          <p className="text-slate-400 text-xs">{cd.festivalAddress}</p>
        </div>
        <div>
          <span className="text-slate-400 text-xs uppercase tracking-wider">Payment</span>
          <p className="text-slate-300 text-xs">{cd.paymentTerms}</p>
          <div className="flex gap-2 mt-1">
            <span className={`px-1.5 py-0.5 rounded text-xs ${cd.cashless ? "bg-green-900/30 text-green-400" : "bg-slate-700 text-slate-400"}`}>
              {cd.cashless ? "Cashless" : "Cash"}
            </span>
            <span className="px-1.5 py-0.5 rounded text-xs bg-slate-700 text-slate-400">
              POS: {cd.posProvider}
            </span>
          </div>
        </div>
      </div>

      {/* Concepts */}
      <div>
        <span className="text-slate-400 text-xs uppercase tracking-wider">Concepts</span>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {cd.concepts.map((c, i) => (
            <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-blue-900/40 text-blue-300 border border-blue-700/40">
              {c.conceptName}
            </span>
          ))}
        </div>
      </div>

      {/* Commission + Tent + Staff in compact grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div>
          <span className="text-slate-400 text-xs uppercase tracking-wider">Commission</span>
          {cd.concepts.map((c, i) => (
            <div key={i} className="mt-0.5">
              {c.commissionTiers.map((t, ti) => (
                <p key={ti} className="text-xs text-slate-300">
                  <span className="text-orange-400 font-medium">{t.rate}</span> {t.threshold}
                </p>
              ))}
            </div>
          ))}
        </div>
        <div>
          <span className="text-slate-400 text-xs uppercase tracking-wider">Tent</span>
          {cd.concepts.map((c, i) => (
            <p key={i} className="text-xs text-slate-300 mt-0.5">{c.conceptName}: {c.tentSize}</p>
          ))}
        </div>
        <div>
          <span className="text-slate-400 text-xs uppercase tracking-wider">Staff passes</span>
          <p className="text-xs text-slate-300 mt-0.5">
            {totalLeader > 0 || totalRegular > 0
              ? `${totalLeader} leader + ${totalRegular} regular = ${totalLeader + totalRegular} total`
              : "TBD"}
          </p>
        </div>
      </div>

      {/* Contacts */}
      {cd.contactsFestival.length > 0 && (
        <div>
          <span className="text-slate-400 text-xs uppercase tracking-wider">Key Contacts</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
            {cd.contactsFestival.map((c, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <Building2 className="h-3 w-3 text-slate-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-white font-medium">{c.name}</span>
                  <span className="text-slate-500"> ({c.role})</span>
                  {c.phone && <p className="text-slate-400 flex items-center gap-1"><Phone className="h-2.5 w-2.5" />{c.phone}</p>}
                  {c.email && <p className="text-blue-400 flex items-center gap-1"><Mail className="h-2.5 w-2.5" />{c.email}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Special Rules */}
      {cd.specialRules.length > 0 && (
        <div>
          <span className="text-slate-400 text-xs uppercase tracking-wider">Special Rules</span>
          <div className="mt-1 bg-amber-950/20 border border-amber-900/30 rounded p-2">
            {cd.specialRules.map((rule, i) => (
              <p key={i} className="text-xs text-amber-200/80 flex items-start gap-1.5">
                <AlertTriangle className="h-3 w-3 text-amber-400 mt-0.5 flex-shrink-0" />
                {rule}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Deadline List (for Phase 2) ─────────────────────────────────────────

function DeadlineList({ deadlines }: { deadlines: ContractDetails["deadlines"] }) {
  if (!deadlines.length) return null;
  return (
    <div className="mt-2 bg-slate-900/40 rounded p-3 space-y-1">
      {deadlines.map((dl, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
            dl.status === "passed" ? "bg-slate-500" : dl.status === "done" ? "bg-green-500" : "bg-amber-500 animate-pulse"
          }`} />
          <span className={`font-mono min-w-[90px] ${
            dl.status === "passed" ? "text-slate-500" : dl.status === "done" ? "text-green-400" : "text-amber-400"
          }`}>{dl.date}</span>
          <span className={dl.status === "passed" ? "text-slate-500 line-through" : "text-slate-300"}>
            {dl.description}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Breakeven Calculator ────────────────────────────────────────────────

function BreakevenCalculator({ festival }: { festival: FestivalData }) {
  const cd = festival.contractDetails;
  const firstCommission = cd?.concepts[0]?.commissionTiers[0];
  const defaultCommission = firstCommission ? parseFloat(firstCommission.rate) || festival.commission : festival.commission;

  // Try to extract festival days from dates string
  const datesMatch = festival.dates.match(/(\d+)-(\d+)/);
  const defaultDays = datesMatch ? Math.max(1, parseInt(datesMatch[1]) > parseInt(datesMatch[0]) ? 4 : 4) : 4;

  const [inputs, setInputs] = useState({
    dailyCovers: 300,
    festivalDays: defaultDays,
    avgSpend: 120,
    commissionPct: defaultCommission,
    setupCost: 5000,
    tentCost: 15000,
    coolingCost: 8000,
    accommodationCost: 10000,
    fixedFee: 3000,
    insuranceCost: 3000,
    foodCostPct: 30,
    staffCount: 8,
    staffHours: 12,
    staffRate: 160,
    packagingCost: 5000,
  });

  const update = (key: keyof typeof inputs, val: string) => {
    setInputs(prev => ({ ...prev, [key]: parseFloat(val) || 0 }));
  };

  const grossSales = inputs.dailyCovers * inputs.festivalDays * inputs.avgSpend;
  const commission = grossSales * (inputs.commissionPct / 100);
  const netSales = grossSales - commission;
  const foodCost = grossSales * (inputs.foodCostPct / 100);
  const staffCost = inputs.staffCount * inputs.staffHours * inputs.festivalDays * inputs.staffRate;
  const fixedCosts = inputs.setupCost + inputs.tentCost + inputs.coolingCost + inputs.accommodationCost + inputs.fixedFee + inputs.insuranceCost;
  const variableCosts = foodCost + staffCost + inputs.packagingCost;
  const totalCosts = fixedCosts + variableCosts;
  const netProfit = netSales - totalCosts;
  const margin = grossSales > 0 ? (netProfit / grossSales * 100) : 0;
  const breakevenCovers = inputs.avgSpend > 0 && inputs.festivalDays > 0
    ? Math.ceil(totalCosts / ((inputs.avgSpend * (1 - inputs.commissionPct / 100)) - (inputs.avgSpend * inputs.foodCostPct / 100) - ((inputs.staffCount * inputs.staffHours * inputs.staffRate + inputs.packagingCost / inputs.festivalDays) / inputs.dailyCovers || 1)) / inputs.festivalDays)
    : 0;
  // Simplified breakeven: covers needed per day to break even
  const revenuePerCover = inputs.avgSpend;
  const costPerCover = revenuePerCover * (inputs.commissionPct / 100) + revenuePerCover * (inputs.foodCostPct / 100);
  const contributionPerCover = revenuePerCover - costPerCover;
  const staffCostPerDay = inputs.staffCount * inputs.staffHours * inputs.staffRate;
  const fixedPerDay = (fixedCosts + inputs.packagingCost) / inputs.festivalDays + staffCostPerDay;
  const breakevenDaily = contributionPerCover > 0 ? Math.ceil(fixedPerDay / contributionPerCover) : 0;

  const inputClass = "w-full bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500";
  const labelClass = "text-xs text-slate-400 mb-0.5 block";

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
      <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
        <Calculator className="h-5 w-5 text-blue-400" />
        Breakeven Calculator — {festival.name}
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <div><label className={labelClass}>Daily covers</label><input type="number" className={inputClass} value={inputs.dailyCovers} onChange={e => update("dailyCovers", e.target.value)} /></div>
        <div><label className={labelClass}>Festival days</label><input type="number" className={inputClass} value={inputs.festivalDays} onChange={e => update("festivalDays", e.target.value)} /></div>
        <div><label className={labelClass}>Avg spend (kr)</label><input type="number" className={inputClass} value={inputs.avgSpend} onChange={e => update("avgSpend", e.target.value)} /></div>
        <div><label className={labelClass}>Commission %</label><input type="number" className={inputClass} value={inputs.commissionPct} onChange={e => update("commissionPct", e.target.value)} /></div>
        <div><label className={labelClass}>Food cost %</label><input type="number" className={inputClass} value={inputs.foodCostPct} onChange={e => update("foodCostPct", e.target.value)} /></div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <div><label className={labelClass}>Setup (kr)</label><input type="number" className={inputClass} value={inputs.setupCost} onChange={e => update("setupCost", e.target.value)} /></div>
        <div><label className={labelClass}>Tent (kr)</label><input type="number" className={inputClass} value={inputs.tentCost} onChange={e => update("tentCost", e.target.value)} /></div>
        <div><label className={labelClass}>Cooling (kr)</label><input type="number" className={inputClass} value={inputs.coolingCost} onChange={e => update("coolingCost", e.target.value)} /></div>
        <div><label className={labelClass}>Accomm. (kr)</label><input type="number" className={inputClass} value={inputs.accommodationCost} onChange={e => update("accommodationCost", e.target.value)} /></div>
        <div><label className={labelClass}>Fixed fee (kr)</label><input type="number" className={inputClass} value={inputs.fixedFee} onChange={e => update("fixedFee", e.target.value)} /></div>
        <div><label className={labelClass}>Insurance (kr)</label><input type="number" className={inputClass} value={inputs.insuranceCost} onChange={e => update("insuranceCost", e.target.value)} /></div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div><label className={labelClass}>Staff count</label><input type="number" className={inputClass} value={inputs.staffCount} onChange={e => update("staffCount", e.target.value)} /></div>
        <div><label className={labelClass}>Hours/day</label><input type="number" className={inputClass} value={inputs.staffHours} onChange={e => update("staffHours", e.target.value)} /></div>
        <div><label className={labelClass}>Rate (kr/hr)</label><input type="number" className={inputClass} value={inputs.staffRate} onChange={e => update("staffRate", e.target.value)} /></div>
        <div><label className={labelClass}>Packaging (kr)</label><input type="number" className={inputClass} value={inputs.packagingCost} onChange={e => update("packagingCost", e.target.value)} /></div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/60 rounded-lg p-3">
          <p className="text-xs text-slate-400">Gross Sales</p>
          <p className="text-lg font-bold text-white">{grossSales.toLocaleString()} kr</p>
        </div>
        <div className="bg-slate-900/60 rounded-lg p-3">
          <p className="text-xs text-slate-400">Commission</p>
          <p className="text-lg font-bold text-orange-400">-{commission.toLocaleString()} kr</p>
        </div>
        <div className="bg-slate-900/60 rounded-lg p-3">
          <p className="text-xs text-slate-400">Total Costs</p>
          <p className="text-lg font-bold text-red-400">-{totalCosts.toLocaleString()} kr</p>
        </div>
        <div className={`rounded-lg p-3 ${netProfit >= 0 ? "bg-green-900/30 border border-green-700/40" : "bg-red-900/30 border border-red-700/40"}`}>
          <p className="text-xs text-slate-400">Net Profit</p>
          <p className={`text-lg font-bold ${netProfit >= 0 ? "text-green-400" : "text-red-400"}`}>
            {netProfit >= 0 ? "+" : ""}{netProfit.toLocaleString()} kr
          </p>
          <p className="text-xs text-slate-500">{margin.toFixed(1)}% margin</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-sm">
        <Calculator className="h-4 w-4 text-amber-400" />
        <span className="text-amber-300">Breakeven: <strong>{breakevenDaily}</strong> covers/day</span>
        <span className="text-slate-500">({(breakevenDaily * inputs.festivalDays).toLocaleString()} total)</span>
      </div>
    </div>
  );
}

// ── Phase Accordion ─────────────────────────────────────────────────────

function PhaseAccordion({
  festival,
  phaseNumber,
  phase,
  isOpen,
  onToggle,
}: {
  festival: FestivalData;
  phaseNumber: number;
  phase: FestivalPhase;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const config = PHASE_CONFIG.find(p => p.number === phaseNumber)!;
  const cd = festival.contractDetails;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden" style={{ borderLeftColor: config.color, borderLeftWidth: "3px" }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 hover:bg-slate-750 transition-colors text-left"
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
          style={{ backgroundColor: config.color }}
        >
          {phaseNumber}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-white font-semibold text-sm">{config.title}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {phaseStatusIcon(phase.status)}
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${
            phase.status === "complete" ? "bg-green-900/30 text-green-400" :
            phase.status === "in-progress" ? "bg-amber-900/30 text-amber-400" :
            phase.status === "blocked" ? "bg-red-900/30 text-red-400" :
            "bg-slate-700/50 text-slate-500"
          }`}>
            {phase.status === "complete" ? "COMPLETE" : phase.status === "in-progress" ? "IN PROGRESS" : phase.status === "blocked" ? "BLOCKED" : "NOT STARTED"}
          </span>
          {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-slate-700 p-4 space-y-2">
          {phase.steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3 py-1.5 pl-2">
              <div className="mt-0.5">{stepStatusIcon(step.status)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-medium ${
                    step.status === "complete" ? "text-green-300" :
                    step.status === "in-progress" ? "text-white" :
                    "text-slate-500"
                  }`}>
                    {step.title}
                  </span>
                  {step.link && (
                    <a
                      href={step.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 bg-blue-900/20 px-2 py-0.5 rounded"
                      onClick={e => e.stopPropagation()}
                    >
                      <Link className="h-3 w-3" />
                      {step.linkLabel || "Open"}
                    </a>
                  )}
                </div>
                {step.details && (
                  <p className="text-xs text-slate-400 mt-0.5">{step.details}</p>
                )}
                {step.actionNeeded && (
                  <p className="text-xs text-amber-400 mt-0.5 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 flex-shrink-0" />
                    {step.actionNeeded}
                  </p>
                )}
              </div>
            </div>
          ))}

          {/* Contract summary card inside Phase 2 */}
          {phaseNumber === 2 && cd && (
            <>
              <ContractSummaryCard cd={cd} />
              {cd.deadlines.length > 0 && (
                <div className="mt-2">
                  <h5 className="text-white text-xs font-semibold mb-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-blue-400" /> Contract Deadlines
                  </h5>
                  <DeadlineList deadlines={cd.deadlines} />
                </div>
              )}
            </>
          )}

          {/* Missing items detail inside Phase 3 production plan step */}
          {phaseNumber === 3 && (() => {
            const prodPlan = festival.documents?.find(d => d.title.toLowerCase().includes("production plan"));
            if (!prodPlan?.missingItems?.length) return null;
            return (
              <div className="mt-2 bg-red-950/20 border border-red-800/30 rounded-lg p-3 ml-7">
                <p className="text-xs font-semibold text-red-400 mb-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> {prodPlan.missingItems.length} MISSING items in production plan:
                </p>
                <div className="grid grid-cols-2 gap-0.5">
                  {prodPlan.missingItems.map((item, j) => (
                    <span key={j} className="text-xs text-red-300/80">-- {item}</span>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ── Festival Selector (Left Panel) ──────────────────────────────────────

function FestivalSelector({
  festivals,
  selectedId,
  onSelect,
  searchTerm,
  onSearchChange,
}: {
  festivals: FestivalData[];
  selectedId: number;
  onSelect: (id: number) => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-slate-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search festivals..."
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {festivals.map(f => {
          const phases = buildPhases(f);
          const currentPhase = getCurrentPhase(phases);
          const isSelected = f.id === selectedId;
          const conceptCount = f.contractDetails?.concepts.length ?? 0;

          return (
            <button
              key={f.id}
              onClick={() => onSelect(f.id)}
              className={`w-full text-left p-3 border-b border-slate-700/50 transition-colors ${
                isSelected
                  ? "bg-blue-900/30 border-l-2 border-l-blue-500"
                  : "hover:bg-slate-750 border-l-2 border-l-transparent"
              }`}
            >
              <div className="mb-1">
                <PhaseDots phases={phases} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className={`font-semibold text-sm ${isSelected ? "text-white" : "text-slate-200"}`}>
                  {f.name}
                </span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {statusBadge(f.status)}
                  {f.daysAway !== null && (
                    <span className="text-xs font-mono text-slate-400">{f.daysAway}d</span>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {conceptCount > 0 && `${conceptCount} concept${conceptCount !== 1 ? "s" : ""} · `}
                {f.contracts.signed ? "Contract signed" : f.status === "CANCELLED" ? "Cancelled" : "Contract pending"}
                {f.status !== "CANCELLED" && ` · Phase ${currentPhase}`}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Festival Detail (Right Panel) ───────────────────────────────────────

function FestivalDetail({ festival }: { festival: FestivalData }) {
  const [openPhases, setOpenPhases] = useState<Record<number, boolean>>({});
  const phases = useMemo(() => buildPhases(festival), [festival]);
  const currentPhase = getCurrentPhase(phases);

  const togglePhase = useCallback((n: number) => {
    setOpenPhases(prev => ({ ...prev, [n]: !prev[n] }));
  }, []);

  // Auto-expand current phase
  const getIsOpen = (n: number) => {
    if (openPhases[n] !== undefined) return openPhases[n];
    return n === currentPhase;
  };

  const todosForFestival = todoItems.filter(t => t.festival === festival.name);

  return (
    <div className="space-y-3">
      {/* Festival header */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold text-white">{festival.name}</h2>
            <p className="text-slate-400 text-sm">{festival.dates}{festival.standLocation !== "TBD" && festival.standLocation !== "N/A" ? ` · ${festival.standLocation}` : ""}</p>
          </div>
          <div className="flex items-center gap-2">
            {statusBadge(festival.status)}
            {festival.daysAway !== null && (
              <span className="text-2xl font-bold text-white font-mono">{festival.daysAway}<span className="text-sm text-slate-400 ml-1">days</span></span>
            )}
          </div>
        </div>
        {festival.notes && (
          <div className="mt-3 border-l-2 border-yellow-500/60 pl-3">
            <p className="text-sm text-yellow-200/80">{festival.notes}</p>
          </div>
        )}
        <div className="flex flex-wrap gap-2 mt-3 text-xs">
          {festival.commission > 0 && (
            <span className="bg-slate-700/60 text-slate-300 px-2 py-0.5 rounded">{festival.commission}% commission</span>
          )}
          {festival.contractDetails?.concepts.length && (
            <span className="bg-slate-700/60 text-slate-300 px-2 py-0.5 rounded">
              {festival.contractDetails.concepts.length} concept{festival.contractDetails.concepts.length !== 1 ? "s" : ""}
            </span>
          )}
          {festival.organicRequired && (
            <span className="bg-green-800/40 text-green-300 px-2 py-0.5 rounded">Organic required</span>
          )}
          {festival.gasRequired && (
            <span className="bg-red-800/40 text-red-300 px-2 py-0.5 rounded">Gas required</span>
          )}
          {festival.powerCost > 0 && (
            <span className="bg-slate-700/60 text-slate-300 px-2 py-0.5 rounded">Power: {festival.powerCost.toLocaleString()} DKK</span>
          )}
        </div>

        {/* Phase progress bar */}
        <div className="mt-4 flex items-center gap-1">
          {PHASE_CONFIG.map(p => {
            const ph = phases[p.number];
            return (
              <div key={p.number} className="flex-1 h-2 rounded-full" style={{
                backgroundColor: ph.status === "complete" ? p.color : ph.status === "in-progress" ? p.color : "#1e293b",
                opacity: ph.status === "in-progress" ? 0.6 : 1,
              }} title={`Phase ${p.number}: ${p.title}`} />
            );
          })}
        </div>
        <p className="text-xs text-slate-500 mt-1">Currently at Phase {currentPhase}: {PHASE_CONFIG.find(p => p.number === currentPhase)?.title}</p>
      </div>

      {/* To-dos for this festival */}
      {todosForFestival.length > 0 && (
        <div className="bg-red-950/30 border border-red-800/40 rounded-xl p-4">
          <h4 className="text-red-300 font-semibold text-sm mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Action Items ({todosForFestival.length})
          </h4>
          {todosForFestival.map(t => (
            <div key={t.id} className="flex items-center gap-2 text-xs py-1">
              <span className={`px-1.5 py-0.5 rounded font-semibold ${t.priority === "CRITICAL" ? "bg-red-600/30 text-red-300" : "bg-orange-600/30 text-orange-300"}`}>{t.priority}</span>
              <span className="text-white">{t.text.replace(`${festival.name} — `, "")}</span>
              <span className="text-slate-500 ml-auto flex-shrink-0"><Clock className="h-3 w-3 inline mr-0.5" />{t.deadline}</span>
            </div>
          ))}
        </div>
      )}

      {/* Phase accordions */}
      {PHASE_CONFIG.map(p => (
        <PhaseAccordion
          key={p.number}
          festival={festival}
          phaseNumber={p.number}
          phase={phases[p.number]}
          isOpen={getIsOpen(p.number)}
          onToggle={() => togglePhase(p.number)}
        />
      ))}

      {/* Breakeven Calculator */}
      {festival.status !== "CANCELLED" && (
        <BreakevenCalculator festival={festival} />
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────

export default function FestivalCommandCentre() {
  const [, setLocation] = useLocation();
  const [selectedFestivalId, setSelectedFestivalId] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [mobileShowList, setMobileShowList] = useState(false);

  const filteredFestivals = useMemo(() => {
    if (!searchTerm) return festivalsData;
    return festivalsData.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [searchTerm]);

  const selectedFestival = festivalsData.find(f => f.id === selectedFestivalId) || festivalsData[0];

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const activeFestivals = festivalsData.filter(f => f.status !== "CANCELLED");

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 p-4 sm:p-6 shadow-lg flex-shrink-0">
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => setLocation("/dashboard")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-gray-300 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </button>
          {/* Mobile toggle */}
          <button
            onClick={() => setMobileShowList(!mobileShowList)}
            className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-gray-300 hover:text-white text-sm transition-colors"
          >
            {mobileShowList ? "Show Detail" : "Festival List"}
          </button>
        </div>
        <h1 className="text-2xl sm:text-4xl font-bold">Festival Command Centre</h1>
        <p className="text-gray-400 mt-1 text-sm sm:text-base">The Fish Project / Fidibus -- 13 Festivals 2026 -- 9 Phase Vendor Lifecycle</p>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Today: {today} | Active: {activeFestivals.length} festivals | Cancelled: 1
        </p>
      </div>

      {/* Two-panel layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - Festival Selector */}
        <div className={`w-full lg:w-80 bg-slate-800 border-r border-slate-700 flex-shrink-0 overflow-hidden flex flex-col ${
          mobileShowList ? "block" : "hidden lg:flex"
        }`}>
          <FestivalSelector
            festivals={filteredFestivals}
            selectedId={selectedFestivalId}
            onSelect={(id) => {
              setSelectedFestivalId(id);
              setMobileShowList(false);
            }}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        </div>

        {/* Right panel - Festival Detail */}
        <div className={`flex-1 overflow-y-auto p-4 sm:p-6 ${
          mobileShowList ? "hidden lg:block" : "block"
        }`}>
          <div className="max-w-4xl mx-auto">
            <FestivalDetail festival={selectedFestival} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-700 bg-slate-800 p-4 text-center text-gray-500 text-sm flex-shrink-0">
        Festival Command Centre | Updated {today}
      </div>
    </div>
  );
}
