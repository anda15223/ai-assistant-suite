import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ExternalLink,
  Calendar,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Mail,
  Plus,
  Copy,
  FolderOpen,
  Table2,
  ClipboardList,
  UtensilsCrossed,
  Users,
  PackageCheck,
  PackageX,
  ChevronDown,
  ChevronUp,
  Zap,
  Droplets,
  Shield,
  Home,
  Snowflake,
} from "lucide-react";
import {
  FESTIVALS,
  ACTIVE_FESTIVALS,
  DEFAULT_SETUP_CHECKLIST,
  DEFAULT_COST_CATEGORIES,
  type Festival,
  type FestivalTask,
  type TaskStatus,
  type SetupChecklistItem,
  type ContractInfo,
  type CostEstimate,
} from "@/data/festivals";

// Local persistence key for task overrides + notes + extra docs
const STORAGE_KEY = "festivals-state-v1";

interface PersistedState {
  taskOverrides: Record<string, { status?: TaskStatus; notes?: string }>;
  festivalNotes: Record<string, string>;
  extraDocs: Record<string, { title: string; url: string }[]>;
  checklistOverrides: Record<string, boolean>;
  costOverrides: Record<string, { estimated?: number; actual?: number; notes?: string }>;
}

const emptyState: PersistedState = {
  taskOverrides: {},
  festivalNotes: {},
  extraDocs: {},
  checklistOverrides: {},
  costOverrides: {},
};

function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState;
    return { ...emptyState, ...JSON.parse(raw) };
  } catch {
    return emptyState;
  }
}

function saveState(s: PersistedState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function priorityColor(p: FestivalTask["priority"]) {
  switch (p) {
    case "high":
      return "bg-red-500/15 text-red-400 border-red-500/30";
    case "medium":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "low":
      return "bg-slate-500/15 text-slate-400 border-slate-500/30";
  }
}

function statusIcon(s: TaskStatus) {
  if (s === "done") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (s === "in_progress") return <Clock className="h-4 w-4 text-amber-500" />;
  return <AlertTriangle className="h-4 w-4 text-red-500" />;
}

function driveUrl(id: string, type: "doc" | "sheet" | "folder") {
  if (type === "folder") return `https://drive.google.com/drive/folders/${id}`;
  if (type === "sheet") return `https://docs.google.com/spreadsheets/d/${id}/edit`;
  return `https://docs.google.com/document/d/${id}/edit`;
}

function buildMailto(to: string, subject: string, body: string) {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
}

function docTypeIcon(type: "doc" | "sheet" | "folder") {
  if (type === "folder") return <FolderOpen className="h-4 w-4 text-yellow-400" />;
  if (type === "sheet") return <Table2 className="h-4 w-4 text-green-400" />;
  return <FileText className="h-4 w-4 text-blue-400" />;
}

function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - new Date().getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function countdownBadge(dateStr?: string) {
  const days = daysUntil(dateStr);
  if (days === null) return null;
  if (days < 0)
    return (
      <Badge variant="outline" className="bg-slate-500/10 text-slate-400 border-slate-500/30">
        Past
      </Badge>
    );
  if (days <= 7)
    return (
      <Badge variant="outline" className="bg-red-500/15 text-red-400 border-red-500/30 animate-pulse">
        {days}d away!
      </Badge>
    );
  if (days <= 30)
    return (
      <Badge variant="outline" className="bg-amber-500/15 text-amber-400 border-amber-500/30">
        {days}d
      </Badge>
    );
  return (
    <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
      {days}d
    </Badge>
  );
}

/** Parse notes to detect "missing items" lines */
function extractMissingItems(note: string): string[] {
  const items: string[] = [];
  const lines = note.split("\n");
  let inMissing = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (/missing\s+items|mangler|missing/i.test(trimmed)) {
      inMissing = true;
      continue;
    }
    if (inMissing && (trimmed.startsWith("-") || trimmed.startsWith("•") || trimmed.match(/^\d+[\.\)]/))) {
      items.push(trimmed.replace(/^[-•\d.)\s]+/, "").trim());
    } else if (inMissing && trimmed === "") {
      inMissing = false;
    }
  }
  return items;
}

/** Detect if a doc is a production plan */
function isProductionPlan(title: string) {
  return /production\s*plan|produktionsplan/i.test(title);
}

/** Detect if a doc is a menu */
function isMenu(title: string) {
  return /menu|priser|prices/i.test(title);
}

export default function Festivals() {
  const [state, setState] = useState<PersistedState>(loadState);
  const [activeSlug, setActiveSlug] = useState<string>(ACTIVE_FESTIVALS[0]?.slug ?? "");
  const [draftTask, setDraftTask] = useState<FestivalTask | null>(null);
  const [draftBody, setDraftBody] = useState("");
  const [draftSubject, setDraftSubject] = useState("");
  const [draftTo, setDraftTo] = useState("");

  useEffect(() => saveState(state), [state]);

  const updateTask = (taskId: string, patch: Partial<{ status: TaskStatus; notes: string }>) => {
    setState((s) => ({
      ...s,
      taskOverrides: {
        ...s.taskOverrides,
        [taskId]: { ...s.taskOverrides[taskId], ...patch },
      },
    }));
  };

  const setFestivalNote = (slug: string, value: string) => {
    setState((s) => ({ ...s, festivalNotes: { ...s.festivalNotes, [slug]: value } }));
  };

  const addExtraDoc = (slug: string, title: string, url: string) => {
    if (!title || !url) return;
    setState((s) => ({
      ...s,
      extraDocs: {
        ...s.extraDocs,
        [slug]: [...(s.extraDocs[slug] || []), { title, url }],
      },
    }));
  };

  const toggleChecklistItem = (key: string) => {
    setState((s) => ({
      ...s,
      checklistOverrides: {
        ...s.checklistOverrides,
        [key]: !s.checklistOverrides[key],
      },
    }));
  };

  const updateCostOverride = (
    key: string,
    patch: { estimated?: number; actual?: number; notes?: string }
  ) => {
    setState((s) => ({
      ...s,
      costOverrides: {
        ...s.costOverrides,
        [key]: { ...s.costOverrides[key], ...patch },
      },
    }));
  };

  const globalStats = useMemo(() => {
    const all = FESTIVALS.flatMap((f) => f.tasks);
    const done = all.filter(
      (t) => (state.taskOverrides[t.id]?.status ?? t.status) === "done"
    ).length;
    const overdue = all.filter((t) => {
      if (!t.deadline) return false;
      const status = state.taskOverrides[t.id]?.status ?? t.status;
      return status !== "done" && new Date(t.deadline) < new Date();
    }).length;
    return { total: all.length, done, overdue };
  }, [state]);

  // Per-festival readiness scores
  const readiness = useMemo(() => {
    const map: Record<string, { done: number; total: number; hasPlan: boolean; hasMenu: boolean }> = {};
    for (const f of ACTIVE_FESTIVALS) {
      const fDone = f.tasks.filter(
        (t) => (state.taskOverrides[t.id]?.status ?? t.status) === "done"
      ).length;
      map[f.slug] = {
        done: fDone,
        total: f.tasks.length,
        hasPlan: f.docs.some((d) => isProductionPlan(d.title)),
        hasMenu: f.docs.some((d) => isMenu(d.title)),
      };
    }
    return map;
  }, [state]);

  const openDraft = (task: FestivalTask) => {
    setDraftTask(task);
    setDraftBody(task.draftReply ?? "");
    setDraftSubject(task.draftSubject ?? "");
    setDraftTo(task.contact ?? "");
  };

  const closeDraft = () => setDraftTask(null);

  const copyDraftToClipboard = () => {
    navigator.clipboard.writeText(draftBody);
  };

  return (
    <div className="p-6 space-y-6">
      {/* ─── Header ─── */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            🎪 Festivals 2026
          </h1>
          <p className="text-muted-foreground mt-1">
            Live overview of all festival prep — sourced from Drive &quot;Festivals 2026&quot; +
            one.com inbox. Edit tasks, add notes, draft replies. Saved locally.
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <StatPill label="Festivals" value={ACTIVE_FESTIVALS.length} tone="info" />
          <StatPill label="Tasks done" value={`${globalStats.done}/${globalStats.total}`} tone="success" />
          <StatPill label="Overdue" value={globalStats.overdue} tone={globalStats.overdue ? "danger" : "muted"} />
        </div>
      </header>

      {/* ─── Festival Tabs ─── */}
      <Tabs value={activeSlug} onValueChange={setActiveSlug} className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted p-1 rounded-lg">
          {ACTIVE_FESTIVALS.map((f) => {
            const r = readiness[f.slug];
            const pct = r ? Math.round((r.done / r.total) * 100) : 0;
            const days = daysUntil(f.startDate);
            const urgent = days !== null && days >= 0 && days <= 14;
            return (
              <TabsTrigger
                key={f.slug}
                value={f.slug}
                className={`text-xs gap-1 ${urgent ? "ring-1 ring-red-500/40" : ""}`}
              >
                <span>{f.emoji}</span>
                <span>{f.name}</span>
                <span className="ml-1 text-[10px] opacity-60">{pct}%</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {ACTIVE_FESTIVALS.map((festival) => (
          <TabsContent key={festival.slug} value={festival.slug} className="mt-6">
            <FestivalView
              festival={festival}
              state={state}
              readiness={readiness[festival.slug]}
              onTaskUpdate={updateTask}
              onNoteChange={(v) => setFestivalNote(festival.slug, v)}
              onAddDoc={(t, u) => addExtraDoc(festival.slug, t, u)}
              onDraft={openDraft}
              onToggleChecklist={toggleChecklistItem}
              onUpdateCost={updateCostOverride}
            />
          </TabsContent>
        ))}
      </Tabs>

      {/* ─── Draft Reply Dialog ─── */}
      <Dialog open={!!draftTask} onOpenChange={(o) => !o && closeDraft()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Draft email reply</DialogTitle>
            <DialogDescription>
              Edit the draft below, then copy or open in your mail client.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">To</label>
              <input
                className="w-full bg-background border border-border rounded px-2 py-1 mt-1"
                value={draftTo}
                onChange={(e) => setDraftTo(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Subject</label>
              <input
                className="w-full bg-background border border-border rounded px-2 py-1 mt-1"
                value={draftSubject}
                onChange={(e) => setDraftSubject(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Body</label>
              <Textarea
                rows={12}
                value={draftBody}
                onChange={(e) => setDraftBody(e.target.value)}
                className="font-mono text-sm mt-1"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={copyDraftToClipboard}>
              <Copy className="h-4 w-4 mr-1" /> Copy
            </Button>
            <a href={buildMailto(draftTo, draftSubject, draftBody)}>
              <Button>
                <Mail className="h-4 w-4 mr-1" /> Open in mail client
              </Button>
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */

function StatPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "info" | "success" | "danger" | "muted";
}) {
  const colors = {
    info: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    success: "bg-green-500/10 text-green-400 border-green-500/30",
    danger: "bg-red-500/10 text-red-400 border-red-500/30",
    muted: "bg-slate-500/10 text-slate-400 border-slate-500/30",
  }[tone];
  return (
    <div className={`rounded-lg border px-4 py-2 ${colors}`}>
      <div className="text-xs font-medium opacity-70">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */

function ReadinessBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const color =
    pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium whitespace-nowrap">{pct}%</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */

function FestivalView({
  festival,
  state,
  readiness,
  onTaskUpdate,
  onNoteChange,
  onAddDoc,
  onDraft,
  onToggleChecklist,
  onUpdateCost,
}: {
  festival: Festival;
  state: PersistedState;
  readiness?: { done: number; total: number; hasPlan: boolean; hasMenu: boolean };
  onTaskUpdate: (id: string, patch: Partial<{ status: TaskStatus; notes: string }>) => void;
  onNoteChange: (v: string) => void;
  onAddDoc: (title: string, url: string) => void;
  onDraft: (task: FestivalTask) => void;
  onToggleChecklist: (key: string) => void;
  onUpdateCost: (key: string, patch: { estimated?: number; actual?: number; notes?: string }) => void;
}) {
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocUrl, setNewDocUrl] = useState("");
  const [showNotes, setShowNotes] = useState(true);
  const note = state.festivalNotes[festival.slug] ?? "";
  const extras = state.extraDocs[festival.slug] ?? [];

  const tasks = festival.tasks.map((t) => ({
    ...t,
    status: state.taskOverrides[t.id]?.status ?? t.status,
    extraNotes: state.taskOverrides[t.id]?.notes ?? "",
  }));

  const todo = tasks.filter((t) => t.status === "todo");
  const inProgress = tasks.filter((t) => t.status === "in_progress");
  const done = tasks.filter((t) => t.status === "done");

  // Separate doc types for organized display
  const productionPlans = festival.docs.filter((d) => isProductionPlan(d.title));
  const menus = festival.docs.filter((d) => isMenu(d.title));
  const otherDocs = festival.docs.filter(
    (d) => !isProductionPlan(d.title) && !isMenu(d.title)
  );

  // Parse missing items from doc notes
  const missingItems: string[] = [];
  for (const d of festival.docs) {
    if (d.note && /missing/i.test(d.note)) {
      const match = d.note.match(/(\d+)\s*missing/i);
      if (match) {
        missingItems.push(`${match[1]} items (${d.title})`);
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* ─── Header Card ─── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                {festival.emoji} {festival.name}
                {countdownBadge(festival.startDate)}
              </CardTitle>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-2">
                {festival.startDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" /> {festival.startDate}
                    {festival.endDate ? ` → ${festival.endDate}` : ""}
                  </span>
                )}
                {festival.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" /> {festival.address}
                  </span>
                )}
                <a
                  href={driveUrl(festival.driveFolderId, "folder")}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-blue-400 hover:underline"
                >
                  <ExternalLink className="h-4 w-4" /> Drive folder
                </a>
              </div>
            </div>

            {/* ─── Readiness indicators ─── */}
            <div className="flex gap-2 flex-wrap">
              {readiness?.hasPlan ? (
                <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30 gap-1">
                  <ClipboardList className="h-3 w-3" /> Plan
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30 gap-1">
                  <ClipboardList className="h-3 w-3" /> No plan
                </Badge>
              )}
              {readiness?.hasMenu ? (
                <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30 gap-1">
                  <UtensilsCrossed className="h-3 w-3" /> Menu
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30 gap-1">
                  <UtensilsCrossed className="h-3 w-3" /> No menu
                </Badge>
              )}
              {missingItems.length > 0 && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 gap-1">
                  <PackageX className="h-3 w-3" /> {missingItems.join(", ")}
                </Badge>
              )}
              {missingItems.length === 0 && readiness?.hasPlan && (
                <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30 gap-1">
                  <PackageCheck className="h-3 w-3" /> All items OK
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-3">
          {/* Concepts */}
          <div className="flex flex-wrap gap-1">
            {festival.concepts.map((c) => (
              <Badge key={c} variant="secondary">
                {c}
              </Badge>
            ))}
          </div>

          {/* Contacts */}
          {festival.contacts.length > 0 && (
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Users className="h-4 w-4 flex-shrink-0" />
              {festival.contacts
                .map((c) => `${c.name}${c.role ? ` (${c.role})` : ""}${c.email ? ` <${c.email}>` : ""}`)
                .join(" · ")}
            </div>
          )}

          {/* Readiness bar */}
          {readiness && (
            <div className="max-w-md">
              <div className="text-xs text-muted-foreground mb-1">
                Task progress: {readiness.done}/{readiness.total}
              </div>
              <ReadinessBar done={readiness.done} total={readiness.total} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Documents Grid (Production Plans / Menus / Other) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Production Plans */}
        <Card className="border-t-2 border-t-blue-500/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-blue-400" /> Production Plans
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {productionPlans.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No production plan found</p>
            ) : (
              productionPlans.map((d) => <DocLink key={d.driveId} doc={d} />)
            )}
          </CardContent>
        </Card>

        {/* Menus */}
        <Card className="border-t-2 border-t-amber-500/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4 text-amber-400" /> Menus & Prices
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {menus.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No menu found</p>
            ) : (
              menus.map((d) => <DocLink key={d.driveId} doc={d} />)
            )}
          </CardContent>
        </Card>

        {/* Other docs + extras */}
        <Card className="border-t-2 border-t-slate-500/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-slate-400" /> Other Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {otherDocs.length === 0 && extras.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No other docs</p>
            ) : (
              <>
                {otherDocs.map((d) => (
                  <DocLink key={d.driveId} doc={d} />
                ))}
                {extras.map((d, i) => (
                  <a
                    key={`extra-${i}`}
                    href={d.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block p-2 rounded border border-dashed border-border hover:border-blue-500/40 transition"
                  >
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <ExternalLink className="h-3 w-3" /> {d.title}
                    </div>
                  </a>
                ))}
              </>
            )}
            {/* Add doc form */}
            <div className="flex gap-2 pt-2">
              <input
                placeholder="Title"
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                className="flex-1 bg-background border border-border rounded px-2 py-1 text-xs"
              />
              <input
                placeholder="URL"
                value={newDocUrl}
                onChange={(e) => setNewDocUrl(e.target.value)}
                className="flex-1 bg-background border border-border rounded px-2 py-1 text-xs"
              />
              <Button
                size="sm"
                onClick={() => {
                  onAddDoc(newDocTitle, newDocUrl);
                  setNewDocTitle("");
                  setNewDocUrl("");
                }}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Kanban ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KanbanColumn
          title="📥 To do"
          tasks={todo}
          color="border-red-500/30"
          onTaskUpdate={onTaskUpdate}
          onDraft={onDraft}
        />
        <KanbanColumn
          title="🔄 In progress"
          tasks={inProgress}
          color="border-amber-500/30"
          onTaskUpdate={onTaskUpdate}
          onDraft={onDraft}
        />
        <KanbanColumn
          title="✅ Done"
          tasks={done}
          color="border-green-500/30"
          onTaskUpdate={onTaskUpdate}
          onDraft={onDraft}
        />
      </div>

      {/* ─── Setup Checklist (collapsible) ─── */}
      <SetupChecklistCard
        festival={festival}
        state={state}
        onToggleItem={onToggleChecklist}
      />

      {/* ─── Contracts Tracker (collapsible) ─── */}
      <ContractsTrackerCard festival={festival} />

      {/* ─── Costs Table (collapsible) ─── */}
      <CostsTableCard
        festival={festival}
        state={state}
        onUpdateCost={onUpdateCost}
      />

      {/* ─── Notes (collapsible) ─── */}
      <Card>
        <CardHeader className="pb-2">
          <button
            className="flex items-center gap-2 w-full text-left"
            onClick={() => setShowNotes(!showNotes)}
          >
            <CardTitle className="text-base flex items-center gap-2 flex-1">
              📝 Festival Notes
              {note && (
                <Badge variant="outline" className="text-xs">
                  {note.split("\n").filter(Boolean).length} lines
                </Badge>
              )}
            </CardTitle>
            {showNotes ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </CardHeader>
        {showNotes && (
          <CardContent className="space-y-3">
            {/* Read-only formatted preview */}
            {note && (
              <div className="rounded-md border border-border bg-muted/30 p-3 text-sm whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                {note.split("\n").map((line, i) => {
                  const trimmed = line.trim();
                  // Highlight section headers (all-caps lines or lines with emojis)
                  if (
                    trimmed.length > 0 &&
                    (trimmed === trimmed.toUpperCase() || /^[🔥🎪🎸🎵🎤🏖️⛵🎶🎈🎉🍺📋]/.test(trimmed))
                  ) {
                    return (
                      <div key={i} className="font-semibold text-foreground mt-2 first:mt-0">
                        {line}
                      </div>
                    );
                  }
                  // Highlight missing items
                  if (/missing|mangler/i.test(trimmed)) {
                    return (
                      <div key={i} className="text-amber-400 font-medium">
                        {line}
                      </div>
                    );
                  }
                  // Bullet items
                  if (trimmed.startsWith("-") || trimmed.startsWith("•")) {
                    return (
                      <div key={i} className="pl-4">
                        {line}
                      </div>
                    );
                  }
                  return <div key={i}>{line || "\u00A0"}</div>;
                })}
              </div>
            )}
            {/* Editable textarea */}
            <Textarea
              rows={6}
              placeholder="Add notes for this festival..."
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              className="text-sm"
            />
          </CardContent>
        )}
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */

function DocLink({ doc }: { doc: { title: string; driveId: string; type: "doc" | "sheet" | "folder"; note?: string } }) {
  return (
    <a
      href={driveUrl(doc.driveId, doc.type)}
      target="_blank"
      rel="noreferrer"
      className="block p-2 rounded border border-border hover:border-blue-500/40 transition"
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        {docTypeIcon(doc.type)} {doc.title}
      </div>
      {doc.note && (
        <div className="text-xs text-muted-foreground mt-1 pl-6">{doc.note}</div>
      )}
    </a>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */

function KanbanColumn({
  title,
  tasks,
  color,
  onTaskUpdate,
  onDraft,
}: {
  title: string;
  tasks: (FestivalTask & { extraNotes: string })[];
  color: string;
  onTaskUpdate: (id: string, patch: Partial<{ status: TaskStatus; notes: string }>) => void;
  onDraft: (task: FestivalTask) => void;
}) {
  return (
    <Card className={`border-l-4 ${color}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span>{title}</span>
          <Badge variant="outline">{tasks.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {tasks.length === 0 && (
          <p className="text-xs text-muted-foreground italic">Nothing here</p>
        )}
        {tasks.map((task) => (
          <div
            key={task.id}
            className="p-3 rounded-md border border-border bg-card/50 space-y-2"
          >
            <div className="flex items-start gap-2">
              <Checkbox
                checked={task.status === "done"}
                onCheckedChange={(c) =>
                  onTaskUpdate(task.id, { status: c ? "done" : "todo" })
                }
                className="mt-1"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 flex-wrap">
                  {statusIcon(task.status)}
                  <span className="font-medium text-sm">{task.title}</span>
                </div>
                {task.detail && (
                  <p className="text-xs text-muted-foreground mt-1">{task.detail}</p>
                )}
                <div className="flex flex-wrap gap-1 mt-2 items-center">
                  <span className={`text-xs px-2 py-0.5 rounded border ${priorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                  {task.deadline && (
                    <span className="text-xs px-2 py-0.5 rounded border bg-purple-500/10 text-purple-400 border-purple-500/30">
                      📅 {task.deadline}
                    </span>
                  )}
                  {task.source && (
                    <span className="text-xs text-muted-foreground">from {task.source}</span>
                  )}
                </div>
                <div className="flex gap-1 mt-2">
                  {task.status !== "in_progress" && task.status !== "done" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-xs"
                      onClick={() => onTaskUpdate(task.id, { status: "in_progress" })}
                    >
                      Start
                    </Button>
                  )}
                  {task.draftReply && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs"
                      onClick={() => onDraft(task)}
                    >
                      <Mail className="h-3 w-3 mr-1" /> Draft reply
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */

function SetupChecklistCard({
  festival,
  state,
  onToggleItem,
}: {
  festival: Festival;
  state: PersistedState;
  onToggleItem: (key: string) => void;
}) {
  const [showChecklist, setShowChecklist] = useState(true);

  const checklist = festival.setupChecklist || DEFAULT_SETUP_CHECKLIST.map((item, i) => ({
    ...item,
    id: `${festival.slug}-default-${i}`,
  }));

  const categories: Array<SetupChecklistItem['category']> = [
    'electricity',
    'tent',
    'cooling',
    'gas_safety',
    'pos',
    'food_delivery',
    'staff',
    'accommodation',
  ];

  const categoryInfo: Record<SetupChecklistItem['category'], { icon: any; color: string; label: string }> = {
    electricity: { icon: Zap, color: 'text-yellow-400', label: 'Electricity' },
    tent: { icon: Home, color: 'text-blue-400', label: 'Tent' },
    cooling: { icon: Snowflake, color: 'text-cyan-400', label: 'Cooling' },
    gas_safety: { icon: Shield, color: 'text-red-400', label: 'Gas Safety' },
    pos: { icon: FileText, color: 'text-green-400', label: 'POS' },
    food_delivery: { icon: PackageCheck, color: 'text-orange-400', label: 'Food' },
    staff: { icon: Users, color: 'text-purple-400', label: 'Staff' },
    accommodation: { icon: MapPin, color: 'text-pink-400', label: 'Accommodation' },
  };

  const groupedItems: Record<SetupChecklistItem['category'], SetupChecklistItem[]> = {} as any;
  for (const cat of categories) {
    groupedItems[cat] = checklist.filter((item) => item.category === cat);
  }

  const totalItems = checklist.length;
  const checkedItems = checklist.filter((item) => {
    const key = `${festival.slug}-${item.id}`;
    return state.checklistOverrides[key];
  }).length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <button
          className="flex items-center gap-2 w-full text-left"
          onClick={() => setShowChecklist(!showChecklist)}
        >
          <CardTitle className="text-base flex items-center gap-2 flex-1">
            ✅ Setup Checklist
            {totalItems > 0 && (
              <Badge variant="outline" className="text-xs">
                {checkedItems}/{totalItems}
              </Badge>
            )}
          </CardTitle>
          {showChecklist ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </CardHeader>
      {showChecklist && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {categories.map((cat) => {
              const items = groupedItems[cat];
              const info = categoryInfo[cat];
              const Icon = info.icon;

              return (
                <div key={cat} className="space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`h-4 w-4 ${info.color}`} />
                    <span className="text-xs font-semibold text-muted-foreground">{info.label}</span>
                  </div>
                  <div className="space-y-2">
                    {items.map((item) => {
                      const key = `${festival.slug}-${item.id}`;
                      const isChecked = state.checklistOverrides[key];

                      const statusColor =
                        item.status === 'critical'
                          ? 'bg-red-500/10 border-red-500/30'
                          : item.status === 'warning'
                          ? 'bg-amber-500/10 border-amber-500/30'
                          : item.status === 'na'
                          ? 'bg-slate-500/10 border-slate-500/30'
                          : 'bg-slate-500/5 border-slate-500/20';

                      return (
                        <div
                          key={item.id}
                          className={`p-2 rounded border text-xs space-y-1 ${statusColor}`}
                        >
                          <div className="flex items-start gap-2">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => onToggleItem(key)}
                              className="mt-0.5"
                              disabled={item.status === 'na'}
                            />
                            <span
                              className={`flex-1 leading-snug ${
                                isChecked ? 'line-through text-muted-foreground' : ''
                              } ${item.status === 'na' ? 'line-through text-muted-foreground' : ''}`}
                            >
                              {item.label}
                            </span>
                          </div>
                          {item.status === 'critical' && (
                            <div className="text-red-400 text-xs font-medium pl-6">CRITICAL</div>
                          )}
                          {item.status === 'warning' && (
                            <div className="text-amber-400 text-xs font-medium pl-6">⚠ Warning</div>
                          )}
                          {item.status === 'na' && (
                            <div className="text-slate-400 text-xs font-medium pl-6">N/A</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */

function ContractsTrackerCard({ festival }: { festival: Festival }) {
  const [showContract, setShowContract] = useState(true);
  const contract = festival.contract;

  if (!contract) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <button
            className="flex items-center gap-2 w-full text-left"
            onClick={() => setShowContract(!showContract)}
          >
            <CardTitle className="text-base flex items-center gap-2 flex-1">
              📋 Contracts Tracker
            </CardTitle>
            {showContract ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </CardHeader>
        {showContract && (
          <CardContent>
            <p className="text-xs text-muted-foreground italic">No contract data added yet</p>
          </CardContent>
        )}
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <button
          className="flex items-center gap-2 w-full text-left"
          onClick={() => setShowContract(!showContract)}
        >
          <CardTitle className="text-base flex items-center gap-2 flex-1">
            📋 Contracts Tracker
            {contract.signed ? (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Signed</Badge>
            ) : (
              <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30">
                Not signed
              </Badge>
            )}
          </CardTitle>
          {showContract ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </CardHeader>
      {showContract && (
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Commission</label>
                <p className="text-sm">
                  {contract.commissionPct ? `${contract.commissionPct}%` : 'Not specified'}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Exclusivity</label>
                <p className="text-sm">{contract.exclusivity || 'None'}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Power Included</label>
                <p className="text-sm">{contract.powerIncluded ? 'Yes' : 'No'}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Power Cost</label>
                <p className="text-sm">
                  {contract.powerCost ? `${contract.powerCost} DKK` : 'Included or not specified'}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Gas Check Required</label>
                <p className="text-sm">{contract.gasCheckRequired ? 'Yes' : 'No'}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Organic Required</label>
                {contract.organicRequired ? (
                  <p className="text-sm bg-amber-500/10 border border-amber-500/30 rounded px-2 py-1 text-amber-400">
                    Yes {contract.organicPct && `— ${contract.organicPct}% minimum`}
                  </p>
                ) : (
                  <p className="text-sm">No</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Stand Location</label>
                <p className="text-sm">{contract.standLocation || 'Not specified'}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Payment Terms</label>
                <p className="text-sm">{contract.paymentTerms || 'Not specified'}</p>
              </div>
            </div>
          </div>

          {contract.notes && (
            <div className="mt-4 pt-4 border-t border-border space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Notes</label>
              <p className="text-sm text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded p-2">
                {contract.notes}
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */

function CostsTableCard({
  festival,
  state,
  onUpdateCost,
}: {
  festival: Festival;
  state: PersistedState;
  onUpdateCost: (key: string, patch: { estimated?: number; actual?: number; notes?: string }) => void;
}) {
  const [showCosts, setShowCosts] = useState(true);

  const costs = festival.costEstimates || DEFAULT_COST_CATEGORIES.map((cat, i) => ({
    ...cat,
    actual: undefined,
  }));

  const totals = {
    estimated: costs.reduce((sum, c) => {
      const key = `${festival.slug}-${c.category}`;
      const override = state.costOverrides[key];
      return sum + (override?.estimated ?? c.estimated ?? 0);
    }, 0),
    actual: costs.reduce((sum, c) => {
      const key = `${festival.slug}-${c.category}`;
      const override = state.costOverrides[key];
      return sum + (override?.actual ?? c.actual ?? 0);
    }, 0),
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <button
          className="flex items-center gap-2 w-full text-left"
          onClick={() => setShowCosts(!showCosts)}
        >
          <CardTitle className="text-base flex items-center gap-2 flex-1">
            💰 Costs Table
            {totals.estimated > 0 && (
              <Badge variant="outline" className="text-xs">
                Est. {totals.estimated} DKK
              </Badge>
            )}
          </CardTitle>
          {showCosts ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </CardHeader>
      {showCosts && (
        <CardContent className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Category</th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">Estimated (DKK)</th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">Actual (DKK)</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Notes</th>
                </tr>
              </thead>
              <tbody className="space-y-1">
                {costs.map((cost) => {
                  const key = `${festival.slug}-${cost.category}`;
                  const override = state.costOverrides[key];
                  const estimated = override?.estimated ?? cost.estimated;
                  const actual = override?.actual ?? cost.actual;

                  const variance = estimated && actual ? actual - estimated : null;
                  const rowColor =
                    variance === null || variance === 0
                      ? ''
                      : variance < 0
                      ? 'bg-green-500/10'
                      : 'bg-red-500/10';

                  return (
                    <tr key={cost.category} className={`border-b border-border/50 ${rowColor}`}>
                      <td className="py-2 px-2 font-medium text-xs">{cost.category}</td>
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          value={estimated ?? ''}
                          onChange={(e) =>
                            onUpdateCost(key, { estimated: e.target.value ? parseFloat(e.target.value) : undefined })
                          }
                          className="w-24 bg-background border border-border rounded px-1 py-0.5 text-right text-xs"
                          placeholder="—"
                        />
                      </td>
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          value={actual ?? ''}
                          onChange={(e) =>
                            onUpdateCost(key, { actual: e.target.value ? parseFloat(e.target.value) : undefined })
                          }
                          className="w-24 bg-background border border-border rounded px-1 py-0.5 text-right text-xs"
                          placeholder="—"
                        />
                      </td>
                      <td className="py-2 px-2 text-left">
                        <input
                          type="text"
                          value={override?.notes ?? cost.notes ?? ''}
                          onChange={(e) => onUpdateCost(key, { notes: e.target.value })}
                          className="flex-1 bg-background border border-border rounded px-1 py-0.5 text-xs"
                          placeholder="Notes..."
                        />
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-t-border font-semibold bg-slate-500/5">
                  <td className="py-2 px-2">Total</td>
                  <td className="py-2 px-2 text-right">{totals.estimated > 0 ? totals.estimated : '—'} DKK</td>
                  <td className={`py-2 px-2 text-right ${
                    totals.actual > 0 && totals.estimated > 0
                      ? totals.actual < totals.estimated
                        ? 'text-green-400'
                        : 'text-red-400'
                      : ''
                  }`}>
                    {totals.actual > 0 ? totals.actual : '—'} DKK
                  </td>
                  <td className="py-2 px-2 text-right text-xs text-muted-foreground">
                    {totals.actual > 0 && totals.estimated > 0
                      ? `${totals.actual < totals.estimated ? '+' : ''}${(totals.actual - totals.estimated).toFixed(0)}`
                      : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
