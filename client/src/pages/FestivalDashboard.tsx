import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  LayoutDashboard,
  FileText,
  Users,
  Brain,
  Printer,
  CheckCircle2,
  Circle,
  AlertTriangle,
  ChevronRight,
  Calendar,
  Clock,
  Target,
  TrendingUp,
  ExternalLink,
  Search,
  Bell,
  Utensils,
  ScrollText,
  Truck,
} from "lucide-react";

// ── Festival data (shared with Command Centre) ──────────────────────────

interface FestivalMeta {
  slug: string;
  name: string;
  dates: string;
  daysAway: number | null;
  location: string;
  concepts: string[];
  contacts: { name: string; role: string }[];
  phasesComplete: number;
  totalPhases: number;
  currentPhase: number;
  criticalAlerts: { text: string; deadline: string; status: "passed" | "upcoming" }[];
  driveUrl?: string;
}

const FESTIVALS: FestivalMeta[] = [
  {
    slug: "jelling",
    name: "Jelling Musikfestival",
    dates: "21-24 May 2026",
    daysAway: 35,
    location: "Jelling, Denmark",
    concepts: ["The Fish Project", "Gyros by Gaia", "La Creperie", "Chicks & Buns"],
    contacts: [
      { name: "Lea Haldrup", role: "Finance" },
      { name: "Jonas Kring", role: "On-site" },
      { name: "Filip Faergeman", role: "POS" },
    ],
    phasesComplete: 2,
    totalPhases: 9,
    currentPhase: 3,
    criticalAlerts: [
      { text: "Tent facade + flame cert", deadline: "PASSED", status: "passed" },
      { text: "POS sortiment template overdue", deadline: "15 Apr", status: "passed" },
    ],
    driveUrl: "https://drive.google.com/drive/folders/1C6xyUvondxS67EDcBbUPEyuXuJwgW4ky",
  },
  {
    slug: "heartland",
    name: "Heartland",
    dates: "15-22 Jun 2026",
    daysAway: 60,
    location: "Egeskov, Kvaerndrup",
    concepts: ["The Fish Project", "Gyros by Gaia"],
    contacts: [{ name: "Mia Rasmussen", role: "Vendor contact" }],
    phasesComplete: 2,
    totalPhases: 9,
    currentPhase: 3,
    criticalAlerts: [],
  },
  {
    slug: "copenhell",
    name: "Copenhell",
    dates: "15-22 Jun 2026",
    daysAway: 60,
    location: "Refshaleoen, Copenhagen",
    concepts: ["The Fish Project"],
    contacts: [],
    phasesComplete: 2,
    totalPhases: 9,
    currentPhase: 3,
    criticalAlerts: [{ text: "50% organic sourcing required", deadline: "1 Jun", status: "upcoming" }],
  },
  {
    slug: "tinderbox",
    name: "Tinderbox",
    dates: "25-27 Jun 2026",
    daysAway: 70,
    location: "Falen 177, Odense",
    concepts: ["Fish / Gaia", "Gyropolis"],
    contacts: [{ name: "Lisbet Foged", role: "Food Manager" }],
    phasesComplete: 2,
    totalPhases: 9,
    currentPhase: 3,
    criticalAlerts: [
      { text: "Gas anmeldelse due", deadline: "5 May", status: "upcoming" },
      { text: "Ruby staff registration", deadline: "18 May", status: "upcoming" },
    ],
  },
];

// ── Phase definitions ───────────────────────────────────────────────────

type PhaseStatus = "complete" | "in-progress" | "not-started" | "overdue" | "blocked";

interface Phase {
  number: number;
  name: string;
  status: PhaseStatus;
}

function getPhases(phasesComplete: number, currentPhase: number): Phase[] {
  const names = [
    "Research & Decision",
    "Application & Contract",
    "Pre-production Planning",
    "Staff & Accreditation",
    "Logistics & Transport",
    "On-site Setup",
    "Live Operations",
    "Teardown & Departure",
    "Financial Close",
  ];
  return names.map((name, i) => {
    const num = i + 1;
    let status: PhaseStatus = "not-started";
    if (num <= phasesComplete) status = "complete";
    else if (num === currentPhase) status = "in-progress";
    return { number: num, name, status };
  });
}

// ── Sub-pages (tab content) ─────────────────────────────────────────────

type SubPage =
  | "overview"
  | "concepts"
  | "contracts"
  | "documents"
  | "staff"
  | "brain"
  | "print"
  | `phase-${number}`;

// ── Festival sidebar navigation ─────────────────────────────────────────

function FestivalSidebar({
  festival,
  activePage,
  onNavigate,
}: {
  festival: FestivalMeta;
  activePage: SubPage;
  onNavigate: (page: SubPage) => void;
}) {
  const [, setLocation] = useLocation();
  const phases = getPhases(festival.phasesComplete, festival.currentPhase);

  const menuItems: { id: SubPage; icon: any; label: string }[] = [
    { id: "overview", icon: LayoutDashboard, label: "Overview" },
    { id: "concepts", icon: Utensils, label: "Concepts" },
    { id: "contracts", icon: ScrollText, label: "Contracts" },
    { id: "documents", icon: FileText, label: "Documents" },
    { id: "staff", icon: Users, label: "Staff" },
    { id: "brain", icon: Brain, label: "Brain / AI Chat" },
    { id: "print", icon: Printer, label: "Print PDF" },
  ];

  const phaseProgressPct = Math.round((festival.phasesComplete / festival.totalPhases) * 100);

  return (
    <div className="w-64 bg-white border-r border-[#e5e7eb] flex flex-col h-screen sticky top-0 overflow-hidden">
      {/* Back button */}
      <button
        onClick={() => setLocation("/festivals")}
        className="flex items-center gap-2 px-4 py-3 text-sm text-[#6b7280] hover:text-[#111827] hover:bg-[#f1f3f9] transition-colors border-b border-[#f3f4f6]"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Festivals
      </button>

      {/* Festival header */}
      <div className="px-4 py-4 border-b border-[#f3f4f6]">
        <h2 className="text-[15px] font-semibold text-[#111827] uppercase tracking-wide">
          {festival.name}
        </h2>
        <p className="text-xs text-[#6b7280] mt-1">{festival.dates}</p>
        {festival.daysAway && (
          <p className="text-xs text-[#6366f1] font-medium mt-0.5">{festival.daysAway} days away</p>
        )}
        {/* Phase progress */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-[#6b7280] mb-1">
            <span>Phases: {festival.phasesComplete}/{festival.totalPhases} complete</span>
            <span>{phaseProgressPct}%</span>
          </div>
          <div className="h-1.5 bg-[#e5e7eb] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#10b981] rounded-full transition-all"
              style={{ width: `${phaseProgressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto">
        {/* Menu section */}
        <div className="px-3 pt-3 pb-1">
          <span className="text-[11px] uppercase tracking-[0.05em] text-[#9ca3af] font-medium px-1">
            Festival Menu
          </span>
        </div>
        <nav className="px-2 space-y-0.5">
          {menuItems.map((item) => {
            const active = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-lg transition-colors ${
                  active
                    ? "bg-[#eef2ff] text-[#6366f1] font-medium"
                    : "text-[#6b7280] hover:bg-[#f1f3f9] hover:text-[#111827]"
                }`}
              >
                <item.icon className={`w-4 h-4 ${active ? "text-[#6366f1]" : "text-[#9ca3af]"}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Phases section */}
        <div className="px-3 pt-5 pb-1">
          <span className="text-[11px] uppercase tracking-[0.05em] text-[#9ca3af] font-medium px-1">
            Phases
          </span>
        </div>
        <nav className="px-2 space-y-0.5 pb-4">
          {phases.map((phase) => {
            const active = activePage === `phase-${phase.number}`;
            return (
              <button
                key={phase.number}
                onClick={() => onNavigate(`phase-${phase.number}`)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-lg transition-colors group ${
                  active
                    ? "bg-[#eef2ff] text-[#6366f1] font-medium"
                    : phase.status === "complete"
                      ? "text-[#6b7280] hover:bg-[#f1f3f9]"
                      : phase.status === "in-progress"
                        ? "text-[#111827] hover:bg-[#f1f3f9] font-medium"
                        : "text-[#9ca3af] hover:bg-[#f1f3f9]"
                }`}
              >
                <PhaseIcon status={phase.status} />
                <span className="flex-1 text-left truncate">
                  <span className="text-[#9ca3af] mr-1.5">{phase.number}</span>
                  {phase.name}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Critical alerts */}
      {festival.criticalAlerts.length > 0 && (
        <div className="border-t border-[#f3f4f6] p-3 space-y-2">
          {festival.criticalAlerts.map((alert, i) => (
            <div
              key={i}
              className={`px-3 py-2 rounded-lg text-xs border-l-[3px] ${
                alert.status === "passed"
                  ? "bg-[#fee2e2] border-[#ef4444] text-[#991b1b]"
                  : "bg-[#fef3c7] border-[#f59e0b] text-[#92400e]"
              }`}
            >
              <div className="flex items-start gap-1.5">
                <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">{alert.text}</p>
                  <p className="opacity-75 mt-0.5">{alert.deadline}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PhaseIcon({ status }: { status: PhaseStatus }) {
  switch (status) {
    case "complete":
      return <CheckCircle2 className="w-4 h-4 text-[#10b981] shrink-0" />;
    case "in-progress":
      return <div className="w-4 h-4 rounded-full border-2 border-[#6366f1] bg-[#eef2ff] shrink-0" />;
    case "overdue":
      return <AlertTriangle className="w-4 h-4 text-[#ef4444] shrink-0" />;
    case "blocked":
      return <AlertTriangle className="w-4 h-4 text-[#f59e0b] shrink-0" />;
    default:
      return <Circle className="w-4 h-4 text-[#d1d5db] shrink-0" />;
  }
}

// ── Overview page ───────────────────────────────────────────────────────

function FestivalOverview({ festival }: { festival: FestivalMeta }) {
  const phases = getPhases(festival.phasesComplete, festival.currentPhase);
  const totalTasks = 42; // placeholder — will come from real data
  const doneTasks = 9;
  const overdueTasks = festival.criticalAlerts.filter((a) => a.status === "passed").length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#111827]">{festival.name}</h1>
        <p className="text-sm text-[#6b7280] mt-1">
          {festival.dates} &middot; {festival.location}
          {festival.driveUrl && (
            <a
              href={festival.driveUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 ml-2 text-[#6366f1] hover:underline"
            >
              Drive <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon={Calendar}
          label="Days until festival"
          value={festival.daysAway ?? "—"}
          color="text-[#6366f1]"
          bgColor="bg-[#eef2ff]"
        />
        <MetricCard
          icon={Target}
          label="Tasks complete"
          value={`${doneTasks}/${totalTasks}`}
          color="text-[#10b981]"
          bgColor="bg-[#d1fae5]"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Overdue deadlines"
          value={overdueTasks}
          color={overdueTasks > 0 ? "text-[#ef4444]" : "text-[#10b981]"}
          bgColor={overdueTasks > 0 ? "bg-[#fee2e2]" : "bg-[#d1fae5]"}
        />
        <MetricCard
          icon={Utensils}
          label="Concepts running"
          value={festival.concepts.length}
          color="text-[#6366f1]"
          bgColor="bg-[#eef2ff]"
        />
      </div>

      {/* Middle row */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Task progress by phase */}
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <h3 className="text-[15px] font-semibold text-[#111827] mb-4">Phase Progress</h3>
          <div className="space-y-3">
            {phases.map((phase) => (
              <div key={phase.number} className="flex items-center gap-3">
                <PhaseIcon status={phase.status} />
                <span className="text-sm text-[#6b7280] flex-1 min-w-0 truncate">
                  {phase.name}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    phase.status === "complete"
                      ? "bg-[#d1fae5] text-[#065f46]"
                      : phase.status === "in-progress"
                        ? "bg-[#eef2ff] text-[#6366f1]"
                        : "bg-[#f3f4f6] text-[#9ca3af]"
                  }`}
                >
                  {phase.status === "complete"
                    ? "Done"
                    : phase.status === "in-progress"
                      ? "Active"
                      : "Pending"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Team on this festival */}
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-semibold text-[#111827]">Team</h3>
            <button className="text-xs text-[#6366f1] hover:underline font-medium">
              + Invite
            </button>
          </div>
          {festival.contacts.length > 0 ? (
            <div className="space-y-3">
              {festival.contacts.map((c, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#eef2ff] flex items-center justify-center">
                    <span className="text-xs font-medium text-[#6366f1]">
                      {c.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#111827] font-medium truncate">{c.name}</p>
                    <p className="text-xs text-[#9ca3af]">{c.role}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#d1fae5] text-[#065f46]">
                    Active
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#9ca3af]">No team members assigned yet.</p>
          )}
        </div>
      </div>

      {/* Concepts row */}
      <div className="bg-white border border-[#e5e7eb] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <h3 className="text-[15px] font-semibold text-[#111827] mb-4">Concepts</h3>
        <div className="flex flex-wrap gap-2">
          {festival.concepts.map((concept) => (
            <span
              key={concept}
              className="px-3 py-1.5 bg-white border border-[#e5e7eb] rounded-md text-sm text-[#111827] hover:border-[#6366f1] transition-colors cursor-pointer"
            >
              {concept}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: any;
  label: string;
  value: string | number;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <p className="text-2xl font-semibold text-[#111827]">{value}</p>
          <p className="text-xs text-[#6b7280]">{label}</p>
        </div>
      </div>
    </div>
  );
}

// ── Phase dashboard (generic) ───────────────────────────────────────────

function PhaseDashboard({ phase, festival }: { phase: Phase; festival: FestivalMeta }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <PhaseIcon status={phase.status} />
            <h1 className="text-2xl font-semibold text-[#111827]">
              Phase {phase.number}: {phase.name}
            </h1>
          </div>
          <p className="text-sm text-[#6b7280] mt-1">{festival.name}</p>
        </div>
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            phase.status === "complete"
              ? "bg-[#d1fae5] text-[#065f46] cursor-default"
              : "bg-[#6366f1] text-white hover:bg-[#4f46e5]"
          }`}
          disabled={phase.status === "complete"}
        >
          {phase.status === "complete" ? "Completed" : "Mark phase complete"}
        </button>
      </div>

      {/* Phase-specific content placeholder */}
      <div className="bg-white border border-[#e5e7eb] rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <p className="text-sm text-[#6b7280]">
          Phase {phase.number} dashboard content will be populated with real data from the Command Centre.
          Each phase has its own set of cards, checklists, and progress tracking.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-4">
          {phase.number === 3 && (
            <>
              <PlaceholderCard title="Production Plan" status="in-progress" />
              <PlaceholderCard title="Menu Finalized" status="complete" />
              <PlaceholderCard title="Fidibus Brief" status="not-started" />
              <PlaceholderCard title="Goods Order" status="not-started" />
              <PlaceholderCard title="Sales Forecast" status="not-started" />
              <PlaceholderCard title="Accommodation" status="not-started" />
            </>
          )}
          {phase.number === 4 && (
            <>
              <PlaceholderCard title="Manpower Plan" status="not-started" />
              <PlaceholderCard title="Accreditation Submitted" status="in-progress" />
              <PlaceholderCard title="Wristband Allocation" status="not-started" />
              <PlaceholderCard title="Staff Confirmation" status="not-started" />
            </>
          )}
          {phase.number === 5 && (
            <>
              <PlaceholderCard title="Transport Booked" status="not-started" />
              <PlaceholderCard title="Cooling Containers" status="complete" />
              <PlaceholderCard title="Gas Supply" status="not-started" />
              <PlaceholderCard title="Load List" status="not-started" />
            </>
          )}
          {(phase.number < 3 || phase.number > 5) && (
            <PlaceholderCard title={`${phase.name} tasks`} status={phase.status === "complete" ? "complete" : "not-started"} />
          )}
        </div>
      </div>
    </div>
  );
}

function PlaceholderCard({ title, status }: { title: string; status: string }) {
  return (
    <div className="border border-[#e5e7eb] rounded-lg p-4 hover:border-[#6366f1]/30 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[#111827]">{title}</span>
        <span
          className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
            status === "complete"
              ? "bg-[#d1fae5] text-[#065f46]"
              : status === "in-progress"
                ? "bg-[#eef2ff] text-[#6366f1]"
                : "bg-[#f3f4f6] text-[#9ca3af]"
          }`}
        >
          {status === "complete" ? "Done" : status === "in-progress" ? "In progress" : "To do"}
        </span>
      </div>
    </div>
  );
}

// ── Placeholder sub-pages ───────────────────────────────────────────────

function ConceptsPage({ festival }: { festival: FestivalMeta }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[#111827]">Concepts</h1>
      <div className="grid md:grid-cols-2 gap-4">
        {festival.concepts.map((concept) => (
          <div key={concept} className="bg-white border border-[#e5e7eb] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:border-[#6366f1]/30 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-[#eef2ff] flex items-center justify-center">
                <Utensils className="w-5 h-5 text-[#6366f1]" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-[#111827]">{concept}</h3>
                <p className="text-xs text-[#6b7280]">Festival concept</p>
              </div>
            </div>
            <div className="space-y-2 text-sm text-[#6b7280]">
              <p>Tent size, commission, accreditation and task data will be pulled from the Command Centre contract details.</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DocumentsPage({ festival }: { festival: FestivalMeta }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#111827]">Documents</h1>
        {festival.driveUrl && (
          <a
            href={festival.driveUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#6366f1] bg-[#eef2ff] rounded-lg hover:bg-[#e0e7ff] transition-colors"
          >
            Open Drive <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {["Production Plans", "Menus & Prices", "Contracts", "Other"].map((cat) => (
          <div key={cat} className="bg-white border border-[#e5e7eb] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <h3 className="text-[15px] font-semibold text-[#111827] mb-3">{cat}</h3>
            <p className="text-sm text-[#9ca3af]">Documents will be listed here from Google Drive.</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PrintPage({ festival }: { festival: FestivalMeta }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827]">Print PDF for Fidibus</h1>
          <p className="text-sm text-[#6b7280] mt-1">Setup instructions only. No financial data.</p>
        </div>
        <button className="px-4 py-2 bg-[#6366f1] text-white rounded-lg text-sm font-medium hover:bg-[#4f46e5] transition-colors">
          Download PDF
        </button>
      </div>
      <div className="bg-white border border-[#e5e7eb] rounded-xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.06)] max-w-2xl">
        <div className="border-b border-[#e5e7eb] pb-4 mb-4">
          <h2 className="text-xl font-semibold">{festival.name}</h2>
          <p className="text-sm text-[#6b7280]">{festival.dates} &middot; {festival.location}</p>
        </div>
        <div className="space-y-4 text-sm">
          <div>
            <span className="text-[11px] uppercase tracking-[0.05em] text-[#9ca3af] font-medium">Setup Access</span>
            <p className="text-[#111827]">—</p>
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-[0.05em] text-[#9ca3af] font-medium">Setup Deadline</span>
            <p className="text-[#111827]">—</p>
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-[0.05em] text-[#9ca3af] font-medium">Tent Dimensions</span>
            <p className="text-[#111827]">Per concept — will be filled from contract data</p>
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-[0.05em] text-[#9ca3af] font-medium">Gas Check</span>
            <p className="text-[#111827]">—</p>
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-[0.05em] text-[#9ca3af] font-medium">Teardown Deadline</span>
            <p className="text-[#111827]">—</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Festival Dashboard ─────────────────────────────────────────────

export default function FestivalDashboard({ slug }: { slug: string }) {
  const [activePage, setActivePage] = useState<SubPage>("overview");
  const festival = FESTIVALS.find((f) => f.slug === slug) ?? FESTIVALS[0];
  const phases = getPhases(festival.phasesComplete, festival.currentPhase);

  // Set page title
  useEffect(() => {
    document.title = `${festival.name} 2026 — AI Suite`;
    return () => {
      document.title = "AI Assistant Suite Blueprint";
    };
  }, [festival.name]);

  const renderContent = () => {
    if (activePage === "overview") return <FestivalOverview festival={festival} />;
    if (activePage === "concepts") return <ConceptsPage festival={festival} />;
    if (activePage === "documents") return <DocumentsPage festival={festival} />;
    if (activePage === "print") return <PrintPage festival={festival} />;
    if (activePage === "staff") {
      return (
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold text-[#111827]">Staff</h1>
          <div className="bg-white border border-[#e5e7eb] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <p className="text-sm text-[#6b7280]">Org team members assigned to this festival.</p>
          </div>
        </div>
      );
    }
    if (activePage === "contracts") {
      return (
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold text-[#111827]">Contracts</h1>
          <div className="bg-white border border-[#e5e7eb] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <p className="text-sm text-[#6b7280]">Contract details extracted from PDFs will appear here.</p>
          </div>
        </div>
      );
    }
    if (activePage === "brain") {
      return (
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold text-[#111827]">Brain / AI Chat</h1>
          <div className="bg-white border border-[#e5e7eb] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <p className="text-sm text-[#6b7280]">Festival-scoped AI chat. The brain knows all {festival.name} data.</p>
          </div>
        </div>
      );
    }
    // Phase pages
    if (activePage.startsWith("phase-")) {
      const phaseNum = parseInt(activePage.replace("phase-", ""));
      const phase = phases.find((p) => p.number === phaseNum);
      if (phase) return <PhaseDashboard phase={phase} festival={festival} />;
    }
    return <FestivalOverview festival={festival} />;
  };

  return (
    <div className="flex min-h-screen bg-[#f8f9fc]">
      <FestivalSidebar
        festival={festival}
        activePage={activePage}
        onNavigate={setActivePage}
      />
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <div className="h-16 border-b border-[#e5e7eb] bg-white flex items-center justify-between px-8 sticky top-0 z-40">
          <div />
          <div className="hidden md:flex items-center max-w-md flex-1 mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9ca3af]" />
              <input
                type="text"
                placeholder="Search anything..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-[#f8f9fc] border border-[#e5e7eb] rounded-lg text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/20"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-[#f1f3f9] transition-colors">
              <Bell className="h-4 w-4 text-[#6b7280]" />
            </button>
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 p-8">{renderContent()}</main>
      </div>
    </div>
  );
}
