import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Check,
  X,
  AlertCircle,
  Clock,
  DollarSign,
  Users,
  Zap,
  Box,
  Droplets,
  Shield,
  MapPin,
  Calendar,
  Filter,
  Search,
  LayoutGrid,
  ListChecks,
  ClipboardList,
  FileText,
  UtensilsCrossed,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────

type ChecklistStatus = "pending" | "confirmed" | "complete" | "warning" | "critical";
type FestivalStatus = "CRITICAL" | "URGENT" | "ON TRACK" | "PLANNING" | "CANCELLED";

interface SetupChecklistItem {
  status: ChecklistStatus;
  details: string;
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
  contracts: { signed: boolean; critical: boolean };
  setupChecklist: Record<string, SetupChecklistItem>;
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

// ── Data ─────────────────────────────────────────────────────────────────

const festivalsData: FestivalData[] = [
  {
    id: 1, name: "Jelling", dates: "18-25 May 2026", daysAway: 32, status: "CRITICAL",
    notes: "10 missing items - POS/tent facade deadlines (Apr 15 - PASSED)",
    commission: 12, exclusivity: "Fish only", powerIncluded: false, powerCost: 0,
    gasRequired: true, organicRequired: false, standLocation: "Main arena",
    accommodation: "TBD",
    contracts: { signed: true, critical: true },
    setupChecklist: {
      electricity: { status: "pending", details: "Amperage TBD, cost TBD" },
      tent: { status: "warning", details: "Deadline passed - confirm flame-retardant cert" },
      cooling: { status: "pending", details: "Container delivery needed" },
      gasSafety: { status: "pending", details: "Gas check required" },
      pos: { status: "critical", details: "POS template critical deadline!" },
      foodDelivery: { status: "pending", details: "BC-Catering coordination" },
      staffAccred: { status: "pending", details: "Photo/ID deadlines" },
      accommodation: { status: "pending", details: "Lodging arrangements" },
    },
  },
  {
    id: 2, name: "Nordside", dates: "CANCELLED", daysAway: null, status: "CANCELLED",
    notes: "Festival cancelled",
    commission: 0, exclusivity: "N/A", powerIncluded: false, powerCost: 0,
    gasRequired: false, organicRequired: false, standLocation: "N/A",
    accommodation: "N/A",
    contracts: { signed: false, critical: false },
    setupChecklist: {},
  },
  {
    id: 3, name: "Heartland", dates: "15-22 Jun 2026", daysAway: 60, status: "URGENT",
    notes: "NO PLAN in Drive - POS/crew/photo deadlines (Apr 10 - PASSED)",
    commission: 10, exclusivity: "Standard", powerIncluded: false, powerCost: 0,
    gasRequired: true, organicRequired: false, standLocation: "TBD",
    accommodation: "TBD",
    contracts: { signed: true, critical: false },
    setupChecklist: {
      electricity: { status: "pending", details: "Amperage/cost TBD" },
      tent: { status: "pending", details: "Size/type TBD" },
      cooling: { status: "pending", details: "Not yet arranged" },
      gasSafety: { status: "pending", details: "Gas check appointment needed" },
      pos: { status: "warning", details: "Deadline passed - coordinate" },
      foodDelivery: { status: "pending", details: "Supplier coordination pending" },
      staffAccred: { status: "warning", details: "Photo deadlines passed" },
      accommodation: { status: "pending", details: "No arrangements yet" },
    },
  },
  {
    id: 4, name: "Copenhell", dates: "13-21 Jun 2026", daysAway: 58, status: "ON TRACK",
    notes: "Has plan + confirmed menu",
    commission: 12, exclusivity: "Fish + Gyros", powerIncluded: true, powerCost: 0,
    gasRequired: true, organicRequired: false, standLocation: "Food village area",
    accommodation: "Copenhagen area",
    contracts: { signed: true, critical: false },
    setupChecklist: {
      electricity: { status: "complete", details: "Power included in contract" },
      tent: { status: "confirmed", details: "3x3m standard tent" },
      cooling: { status: "confirmed", details: "Container booked, pickup scheduled" },
      gasSafety: { status: "pending", details: "Gas check - Jun 8" },
      pos: { status: "confirmed", details: "SumUp terminals ordered" },
      foodDelivery: { status: "pending", details: "BC-Catering - Jun 10" },
      staffAccred: { status: "confirmed", details: "Wristbands arranged" },
      accommodation: { status: "confirmed", details: "Airbnb booked" },
    },
  },
  {
    id: 5, name: "Tinderbox", dates: "22-28 Jun 2026", daysAway: 67, status: "ON TRACK",
    notes: "Has plan, special veggie requirements noted",
    commission: 10, exclusivity: "Fish + Gyros", powerIncluded: false, powerCost: 3500,
    gasRequired: true, organicRequired: false, standLocation: "Main food zone",
    accommodation: "Hotel nearby",
    contracts: { signed: true, critical: false },
    setupChecklist: {
      electricity: { status: "confirmed", details: "125A supply, 3,500 DKK cost" },
      tent: { status: "confirmed", details: "4x4m marquee" },
      cooling: { status: "confirmed", details: "Double container" },
      gasSafety: { status: "pending", details: "June 20" },
      pos: { status: "confirmed", details: "SumUp dual terminals" },
      foodDelivery: { status: "pending", details: "Veggie supplier coordination critical" },
      staffAccred: { status: "confirmed", details: "Band wristbands" },
      accommodation: { status: "pending", details: "Hotel reservation in progress" },
    },
  },
  {
    id: 6, name: "Cirkus Summarum", dates: "22-28 Jun 2026", daysAway: 67, status: "ON TRACK",
    notes: "Has plan - overlaps with Tinderbox dates",
    commission: 11, exclusivity: "Fish + Gyros", powerIncluded: false, powerCost: 4200,
    gasRequired: true, organicRequired: false, standLocation: "To confirm",
    accommodation: "Local",
    contracts: { signed: true, critical: false },
    setupChecklist: {
      electricity: { status: "pending", details: "125A, 4,200 DKK" },
      tent: { status: "confirmed", details: "4x4m structure" },
      cooling: { status: "confirmed", details: "Container with backup" },
      gasSafety: { status: "pending", details: "Gas check June 20" },
      pos: { status: "confirmed", details: "Dual SumUp" },
      foodDelivery: { status: "pending", details: "June 19 delivery window" },
      staffAccred: { status: "pending", details: "Wristbands TBD" },
      accommodation: { status: "pending", details: "Arrangements pending" },
    },
  },
  {
    id: 7, name: "Vig Festival", dates: "6-12 Jul 2026", daysAway: 81, status: "ON TRACK",
    notes: "Has plan - Vig location confirmed",
    commission: 10, exclusivity: "Fish + Gyros + Crepes", powerIncluded: false, powerCost: 2800,
    gasRequired: true, organicRequired: false, standLocation: "Food court",
    accommodation: "Local hotel",
    contracts: { signed: true, critical: false },
    setupChecklist: {
      electricity: { status: "pending", details: "125A, 2,800 DKK" },
      tent: { status: "confirmed", details: "3x3m tent" },
      cooling: { status: "confirmed", details: "Standard container" },
      gasSafety: { status: "pending", details: "July 3" },
      pos: { status: "confirmed", details: "SumUp terminals" },
      foodDelivery: { status: "pending", details: "July 4" },
      staffAccred: { status: "pending", details: "Wristbands - TBD" },
      accommodation: { status: "pending", details: "Hotel booking pending" },
    },
  },
  {
    id: 8, name: "Grøn Koncert", dates: "13-22 Jul 2026", daysAway: 88, status: "ON TRACK",
    notes: "Has plan, multi-venue structure (multiple stages)",
    commission: 12, exclusivity: "Fish + Gyros", powerIncluded: false, powerCost: 5600,
    gasRequired: true, organicRequired: false, standLocation: "Main food area - confirmed",
    accommodation: "Multiple venues",
    contracts: { signed: true, critical: false },
    setupChecklist: {
      electricity: { status: "pending", details: "250A total, 5,600 DKK" },
      tent: { status: "confirmed", details: "2x multiple 4x4m tents" },
      cooling: { status: "confirmed", details: "Triple containers" },
      gasSafety: { status: "pending", details: "July 10" },
      pos: { status: "confirmed", details: "Multi-register setup" },
      foodDelivery: { status: "pending", details: "July 11" },
      staffAccred: { status: "pending", details: "Multi-site wristbands" },
      accommodation: { status: "pending", details: "Staff housing confirmed" },
    },
  },
  {
    id: 9, name: "Syd For Solen", dates: "10-16 Aug 2026", daysAway: 116, status: "PLANNING",
    notes: "Active negotiation - 2 stands, fully electric setup, 125A power costs 23,200 DKK",
    commission: 10, exclusivity: "Fish + Gyros + Crepes", powerIncluded: false, powerCost: 23200,
    gasRequired: false, organicRequired: false, standLocation: "2 separate food stands",
    accommodation: "Beach area accommodation",
    contracts: { signed: false, critical: false },
    setupChecklist: {
      electricity: { status: "pending", details: "125A x2 stands, 23,200 DKK TOTAL" },
      tent: { status: "pending", details: "Large beach tents x2" },
      cooling: { status: "pending", details: "High-capacity cooling critical" },
      gasSafety: { status: "pending", details: "NO GAS - fully electric" },
      pos: { status: "pending", details: "Dual register system per stand" },
      foodDelivery: { status: "pending", details: "Aug 8" },
      staffAccred: { status: "pending", details: "Double crew requirement" },
      accommodation: { status: "pending", details: "Beach lodging" },
    },
  },
  {
    id: 10, name: "Suset", dates: "17-25 Aug 2026", daysAway: 130, status: "URGENT",
    notes: "Template only, 46 emails! Contract urgency - signed with 50% organic concern, Tobias wants week of Apr 15",
    commission: 8, exclusivity: "Fish-only + organic requirements", powerIncluded: false, powerCost: 4500,
    gasRequired: true, organicRequired: true, standLocation: "Premium food zone",
    accommodation: "Hotel - TBD",
    contracts: { signed: true, critical: true },
    setupChecklist: {
      electricity: { status: "pending", details: "125A, 4,500 DKK" },
      tent: { status: "pending", details: "Premium marquee" },
      cooling: { status: "pending", details: "Backup cooling for organic concerns" },
      gasSafety: { status: "pending", details: "Gas check required" },
      pos: { status: "pending", details: "SumUp + organic tracking" },
      foodDelivery: { status: "critical", details: "ORGANIC SOURCING - 50% requirement critical!" },
      staffAccred: { status: "pending", details: "Wristbands + accreditation" },
      accommodation: { status: "pending", details: "Hotel booking urgent" },
    },
  },
  {
    id: 11, name: "Tønder", dates: "24-30 Aug 2026", daysAway: 131, status: "ON TRACK",
    notes: "Has plan - one week after Suset",
    commission: 10, exclusivity: "Fish + Gyros", powerIncluded: false, powerCost: 3800,
    gasRequired: true, organicRequired: false, standLocation: "Main festival area",
    accommodation: "Local hotel",
    contracts: { signed: true, critical: false },
    setupChecklist: {
      electricity: { status: "pending", details: "125A, 3,800 DKK" },
      tent: { status: "pending", details: "4x4m tent" },
      cooling: { status: "pending", details: "Standard container" },
      gasSafety: { status: "pending", details: "Gas check August 22" },
      pos: { status: "pending", details: "SumUp terminals" },
      foodDelivery: { status: "pending", details: "August 23" },
      staffAccred: { status: "pending", details: "Wristbands" },
      accommodation: { status: "pending", details: "Hotel reservation" },
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

const costCategories = [
  { name: "Stand Fee / Commission", key: "commission" },
  { name: "Electricity", key: "electricity" },
  { name: "Accommodation", key: "accommodation" },
  { name: "Tent Rental (Fidibus)", key: "tent" },
  { name: "Cooling Containers", key: "cooling" },
  { name: "Staff Wages + Travel", key: "staff" },
  { name: "Food / Ingredients", key: "food" },
  { name: "Equipment Rental", key: "equipment" },
  { name: "Insurance", key: "insurance" },
];

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

const CHECKLIST_CATEGORIES: { key: string; label: string; icon: typeof Zap; color: string }[] = [
  { key: "electricity", label: "Electricity", icon: Zap, color: "text-yellow-400" },
  { key: "tent", label: "Tent", icon: Box, color: "text-blue-400" },
  { key: "cooling", label: "Cooling", icon: Droplets, color: "text-cyan-400" },
  { key: "gasSafety", label: "Gas & Safety", icon: Shield, color: "text-red-400" },
  { key: "pos", label: "POS / Cash", icon: DollarSign, color: "text-green-400" },
  { key: "foodDelivery", label: "Food Delivery", icon: Box, color: "text-orange-400" },
  { key: "staffAccred", label: "Staff / Accreditation", icon: Users, color: "text-purple-400" },
  { key: "accommodation", label: "Accommodation", icon: MapPin, color: "text-pink-400" },
];

type TabId = "overview" | "timeline" | "todo" | "setup" | "contracts" | "costs" | "menu";

const TABS: { id: TabId; label: string; icon: typeof LayoutGrid }[] = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "timeline", label: "Timeline", icon: Calendar },
  { id: "todo", label: "To-Do", icon: ListChecks },
  { id: "setup", label: "Setup", icon: ClipboardList },
  { id: "contracts", label: "Contracts", icon: FileText },
  { id: "costs", label: "Costs", icon: DollarSign },
  { id: "menu", label: "Menu", icon: UtensilsCrossed },
];

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
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[status]}`}>
      {status}
    </span>
  );
}

function checklistStatusBadge(status: ChecklistStatus) {
  const styles: Record<ChecklistStatus, string> = {
    complete: "bg-green-600/20 text-green-400 border border-green-600/30",
    confirmed: "bg-green-600/20 text-green-400 border border-green-600/30",
    critical: "bg-red-600/20 text-red-400 border border-red-600/30",
    warning: "bg-yellow-600/20 text-yellow-400 border border-yellow-600/30",
    pending: "bg-slate-600/20 text-slate-400 border border-slate-600/30",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[status]}`}>
      {status.toUpperCase()}
    </span>
  );
}

function cardBg(f: FestivalData): string {
  if (f.status === "CRITICAL") return "bg-red-950/40 border-red-800/50";
  if (f.status === "URGENT") return "bg-orange-950/40 border-orange-800/50";
  if (f.daysAway !== null && f.daysAway < 45) return "bg-red-950/30 border-red-900/40";
  if (f.daysAway !== null && f.daysAway < 90) return "bg-amber-950/20 border-amber-900/30";
  return "bg-slate-800 border-slate-700";
}

function progressColor(days: number): string {
  if (days < 45) return "bg-red-500";
  if (days < 90) return "bg-yellow-500";
  return "bg-green-500";
}

// ── Tab Components ───────────────────────────────────────────────────────

function OverviewTab({
  festivals,
  expandedFestival,
  setExpandedFestival,
}: {
  festivals: FestivalData[];
  expandedFestival: number | null;
  setExpandedFestival: (id: number | null) => void;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {festivals.map((f) => (
        <div
          key={f.id}
          className={`rounded-xl border p-5 cursor-pointer transition-all hover:ring-1 hover:ring-slate-500 ${cardBg(f)}`}
          onClick={() => setExpandedFestival(expandedFestival === f.id ? null : f.id)}
        >
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="text-lg font-bold text-white">{f.name}</h3>
              <p className="text-sm text-slate-400">{f.dates}</p>
            </div>
            <div className="flex items-center gap-2">
              {statusBadge(f.status)}
              {f.daysAway !== null && (
                <span className="text-sm font-mono text-slate-400">{f.daysAway}d</span>
              )}
              {expandedFestival === f.id ? (
                <ChevronUp className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="border-l-2 border-yellow-500/60 pl-3 py-1 mb-3">
            <p className="text-sm text-yellow-200/80">{f.notes}</p>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 text-xs">
            {f.commission > 0 && (
              <span className="bg-slate-700/60 text-slate-300 px-2 py-0.5 rounded">
                {f.commission}% commission
              </span>
            )}
            {f.powerCost > 0 && (
              <span className="bg-slate-700/60 text-slate-300 px-2 py-0.5 rounded">
                Power: {f.powerCost.toLocaleString()} DKK
              </span>
            )}
            {f.organicRequired && (
              <span className="bg-green-800/40 text-green-300 px-2 py-0.5 rounded">
                Organic required
              </span>
            )}
          </div>

          {/* Expanded */}
          {expandedFestival === f.id && f.status !== "CANCELLED" && (
            <div className="mt-4 pt-4 border-t border-slate-700/50 grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-slate-500">Commission:</span>{" "}
                <span className="text-white">{f.commission}%</span>
              </div>
              <div>
                <span className="text-slate-500">Exclusivity:</span>{" "}
                <span className="text-white">{f.exclusivity}</span>
              </div>
              <div>
                <span className="text-slate-500">Location:</span>{" "}
                <span className="text-white">{f.standLocation}</span>
              </div>
              <div>
                <span className="text-slate-500">Gas required:</span>{" "}
                <span className={f.gasRequired ? "text-red-400" : "text-green-400"}>
                  {f.gasRequired ? "Yes" : "No"}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Power:</span>{" "}
                <span className="text-white">
                  {f.powerIncluded ? "Included" : f.powerCost > 0 ? `${f.powerCost.toLocaleString()} DKK` : "TBD"}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Accommodation:</span>{" "}
                <span className="text-white">{f.accommodation}</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function TimelineTab() {
  const sorted = festivalsData
    .filter((f) => f.status !== "CANCELLED" && f.daysAway !== null)
    .sort((a, b) => (a.daysAway ?? 999) - (b.daysAway ?? 999));

  const maxDays = Math.max(...sorted.map((f) => f.daysAway ?? 0), 1);

  return (
    <div className="space-y-3">
      {sorted.map((f, i) => (
        <div key={f.id} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-white">
                {i + 1}
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">{f.name}</h3>
                <p className="text-sm text-slate-400">{f.dates}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-white font-mono">{f.daysAway}</span>
              <span className="text-sm text-slate-400">days</span>
              {statusBadge(f.status)}
            </div>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${progressColor(f.daysAway ?? 0)}`}
              style={{ width: `${Math.max(5, 100 - ((f.daysAway ?? 0) / maxDays) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function TodoTab({
  checkedTodos,
  setCheckedTodos,
}: {
  checkedTodos: Record<string, boolean>;
  setCheckedTodos: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
  return (
    <div className="space-y-2">
      {todoItems.map((item) => {
        const checked = checkedTodos[item.id] ?? false;
        return (
          <div
            key={item.id}
            className={`bg-slate-800 border border-slate-700 rounded-lg p-4 flex items-start gap-4 transition-opacity ${
              checked ? "opacity-60" : ""
            }`}
          >
            <button
              onClick={() => setCheckedTodos((prev) => ({ ...prev, [item.id]: !checked }))}
              className={`mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                checked
                  ? "bg-green-600 border-green-600"
                  : "border-slate-500 hover:border-slate-300"
              }`}
            >
              {checked && <Check className="h-3 w-3 text-white" />}
            </button>
            <div className="flex-1">
              <p className={`text-white font-medium ${checked ? "line-through" : ""}`}>
                {item.text}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    item.priority === "CRITICAL"
                      ? "bg-red-600/30 text-red-300"
                      : "bg-orange-600/30 text-orange-300"
                  }`}
                >
                  {item.priority}
                </span>
                <span className="text-xs text-slate-400">
                  <Clock className="h-3 w-3 inline mr-1" />
                  {item.deadline}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SetupTab({
  expandedSetup,
  setExpandedSetup,
  setupChecked,
  setSetupChecked,
}: {
  expandedSetup: number | null;
  setExpandedSetup: (id: number | null) => void;
  setupChecked: Record<string, boolean>;
  setSetupChecked: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
  const eligible = festivalsData.filter(
    (f) => f.status !== "CANCELLED" && f.status !== "PLANNING" && Object.keys(f.setupChecklist).length > 0
  );

  return (
    <div className="space-y-3">
      {eligible.map((f) => (
        <div key={f.id} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <button
            onClick={() => setExpandedSetup(expandedSetup === f.id ? null : f.id)}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-750 transition-colors"
          >
            <div className="flex items-center gap-3">
              <h3 className="text-white font-bold">{f.name}</h3>
              {statusBadge(f.status)}
              <span className="text-sm text-slate-400">{f.dates}</span>
            </div>
            {expandedSetup === f.id ? (
              <ChevronUp className="h-5 w-5 text-slate-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-slate-400" />
            )}
          </button>

          {expandedSetup === f.id && (
            <div className="border-t border-slate-700 p-4 space-y-3">
              {CHECKLIST_CATEGORIES.map((cat) => {
                const item = f.setupChecklist[cat.key];
                if (!item) return null;
                const checkKey = `${f.id}-${cat.key}`;
                const checked = setupChecked[checkKey] ?? false;
                const Icon = cat.icon;
                return (
                  <div key={cat.key} className="flex items-start gap-3">
                    <button
                      onClick={() =>
                        setSetupChecked((prev) => ({ ...prev, [checkKey]: !checked }))
                      }
                      className={`mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                        checked
                          ? "bg-green-600 border-green-600"
                          : "border-slate-500 hover:border-slate-300"
                      }`}
                    >
                      {checked && <Check className="h-3 w-3 text-white" />}
                    </button>
                    <Icon className={`h-4 w-4 mt-0.5 ${cat.color}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${checked ? "line-through text-slate-500" : "text-white"}`}>
                          {cat.label}
                        </span>
                        {checklistStatusBadge(item.status)}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{item.details}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ContractsTab() {
  const eligible = festivalsData.filter((f) => f.status !== "PLANNING");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {eligible.map((f) => (
        <div key={f.id} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold text-lg">{f.name}</h3>
            {f.contracts.signed ? (
              <div className="flex items-center gap-1 text-green-400">
                <Check className="h-5 w-5" />
                <span className="text-sm font-medium">Signed</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-red-400">
                <X className="h-5 w-5" />
                <span className="text-sm font-medium">Not signed</span>
              </div>
            )}
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Contract Status</span>
              <span className={f.contracts.signed ? "text-green-400" : "text-red-400"}>
                {f.contracts.signed ? "Signed" : "Pending"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Commission</span>
              <span className="text-white">{f.commission > 0 ? `${f.commission}%` : "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Exclusivity</span>
              <span className="text-white">{f.exclusivity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Organic Requirement</span>
              <span className={f.organicRequired ? "text-green-400 font-medium" : "text-slate-400"}>
                {f.organicRequired ? "Yes - 50%" : "No"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Gas Check Required</span>
              <span className={f.gasRequired ? "text-red-400" : "text-slate-400"}>
                {f.gasRequired ? "Yes" : "No"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Power Included</span>
              <span className="text-white">
                {f.powerIncluded ? "Yes" : f.powerCost > 0 ? `No — ${f.powerCost.toLocaleString()} DKK` : "No — TBD"}
              </span>
            </div>
          </div>

          {f.contracts.critical && (
            <div className="mt-4 bg-red-950/40 border border-red-800/50 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-300">Critical contract — requires immediate attention</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function CostsTab() {
  const eligible = festivalsData.filter((f) => f.status !== "CANCELLED");
  const totalElectricity = eligible.reduce((sum, f) => sum + f.powerCost, 0);

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {eligible.map((f) => (
          <div key={f.id} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-white font-bold mb-3">{f.name}</h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Commission</span>
                <span className="text-white">{f.commission > 0 ? `${f.commission}%` : "TBD"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Electricity</span>
                <span className="text-white">
                  {f.powerCost > 0 ? `${f.powerCost.toLocaleString()} DKK` : "TBD"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Accommodation</span>
                <span className="text-slate-500">TBD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tent</span>
                <span className="text-slate-500">TBD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cooling</span>
                <span className="text-slate-500">TBD</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-700 flex justify-between text-sm font-medium">
              <span className="text-yellow-400">Visible Costs</span>
              <span className="text-yellow-400">
                {f.powerCost > 0 ? `${f.powerCost.toLocaleString()} DKK` : "—"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Total breakdown */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h3 className="text-white font-bold text-lg mb-4">
          Total Visible Costs (Electricity Only)
        </h3>
        <div className="space-y-2">
          {eligible
            .filter((f) => f.powerCost > 0)
            .map((f) => (
              <div key={f.id} className="flex justify-between text-sm">
                <span className="text-slate-300">{f.name}</span>
                <span className="text-white font-mono">{f.powerCost.toLocaleString()} DKK</span>
              </div>
            ))}
          <div className="pt-3 mt-3 border-t border-slate-600 flex justify-between text-lg font-bold">
            <span className="text-yellow-400">Grand Total</span>
            <span className="text-yellow-400">{totalElectricity.toLocaleString()} DKK</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="mt-6 bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
        <h4 className="text-white font-semibold mb-2">Cost Notes</h4>
        <ul className="space-y-1 text-sm text-slate-400 list-disc list-inside">
          <li>Commission rates range 8-12% depending on festival</li>
          <li>Syd For Solen: 23,200 DKK for 125A x2 stands (fully electric, no gas)</li>
          <li>Suset: Organic requirement adds +10-15% to food costs</li>
          <li>All other cost categories (accommodation, tent, cooling, staff, food, equipment, insurance) pending quotes</li>
        </ul>
      </div>
    </div>
  );
}

function MenuTab() {
  const sections: { title: string; key: string; color: string }[] = [
    { title: "Fish & Sides", key: "fish", color: "text-blue-400" },
    { title: "Gyros", key: "gyros", color: "text-orange-400" },
    { title: "Crepes", key: "crepes", color: "text-pink-400" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {sections.map((s) => (
        <div key={s.key} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h3 className={`text-lg font-bold mb-4 ${s.color}`}>{s.title}</h3>
          <div className="space-y-3">
            {menuData[s.key].map((item) => (
              <div key={item.name} className="flex justify-between items-center">
                <span className="text-white">{item.name}</span>
                <span className="text-yellow-400 font-mono font-bold">{item.price} kr</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────

export default function FestivalCommandCentre() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [expandedFestival, setExpandedFestival] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [checkedTodos, setCheckedTodos] = useState<Record<string, boolean>>({});
  const [expandedSetup, setExpandedSetup] = useState<number | null>(null);
  const [setupChecked, setSetupChecked] = useState<Record<string, boolean>>({});

  const filteredFestivals = useMemo(() => {
    return festivalsData.filter((f) => {
      if (searchTerm && !f.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (statusFilter !== "all" && f.status !== statusFilter) return false;
      return true;
    });
  }, [searchTerm, statusFilter]);

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const activeFestivals = festivalsData.filter((f) => f.status !== "CANCELLED");

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 p-6 shadow-lg">
        <h1 className="text-4xl font-bold">Festival Command Centre</h1>
        <p className="text-gray-400 mt-1">The Fish Project / Fidibus — 13 Festivals 2026</p>
        <p className="text-sm text-gray-500 mt-1">
          Today: {today} | Active: {activeFestivals.length} festivals | Cancelled: 1
        </p>
      </div>

      {/* Sticky Tab Bar */}
      <div className="border-b border-slate-700 bg-slate-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-7xl mx-auto">
        {/* Search & Filter (only on overview) */}
        {activeTab === "overview" && (
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search festivals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-8 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="CRITICAL">Critical</option>
                <option value="URGENT">Urgent</option>
                <option value="ON TRACK">On Track</option>
                <option value="PLANNING">Planning</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === "overview" && (
          <OverviewTab
            festivals={filteredFestivals}
            expandedFestival={expandedFestival}
            setExpandedFestival={setExpandedFestival}
          />
        )}
        {activeTab === "timeline" && <TimelineTab />}
        {activeTab === "todo" && (
          <TodoTab checkedTodos={checkedTodos} setCheckedTodos={setCheckedTodos} />
        )}
        {activeTab === "setup" && (
          <SetupTab
            expandedSetup={expandedSetup}
            setExpandedSetup={setExpandedSetup}
            setupChecked={setupChecked}
            setSetupChecked={setSetupChecked}
          />
        )}
        {activeTab === "contracts" && <ContractsTab />}
        {activeTab === "costs" && <CostsTab />}
        {activeTab === "menu" && <MenuTab />}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-700 bg-slate-800 p-6 text-center text-gray-500 text-sm">
        Festival Command Centre | Updated {today}
      </div>
    </div>
  );
}
