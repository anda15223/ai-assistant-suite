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
} from "lucide-react";
import {
  FESTIVALS,
  ACTIVE_FESTIVALS,
  type Festival,
  type FestivalTask,
  type TaskStatus,
} from "@/data/festivals";

// Local persistence key for task overrides + notes + extra docs
const STORAGE_KEY = "festivals-state-v1";

interface PersistedState {
  taskOverrides: Record<string, { status?: TaskStatus; notes?: string }>;
  festivalNotes: Record<string, string>;
  extraDocs: Record<string, { title: string; url: string }[]>;
}

const emptyState: PersistedState = {
  taskOverrides: {},
  festivalNotes: {},
  extraDocs: {},
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

  const stats = useMemo(() => {
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
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            🎪 Festivals 2026
          </h1>
          <p className="text-muted-foreground mt-1">
            Live overview of all festival prep — sourced from Drive folder &quot;Festivals 2026&quot; +
            one.com inbox/sent. Edit tasks, add notes, draft replies. Saved locally in your browser.
          </p>
        </div>
        <div className="flex gap-3">
          <StatPill label="Festivals" value={ACTIVE_FESTIVALS.length} tone="info" />
          <StatPill label="Tasks done" value={`${stats.done}/${stats.total}`} tone="success" />
          <StatPill label="Overdue" value={stats.overdue} tone={stats.overdue ? "danger" : "muted"} />
        </div>
      </header>

      <Tabs value={activeSlug} onValueChange={setActiveSlug} className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted p-1">
          {ACTIVE_FESTIVALS.map((f) => (
            <TabsTrigger key={f.slug} value={f.slug} className="text-xs">
              {f.emoji} {f.number}. {f.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {ACTIVE_FESTIVALS.map((festival) => (
          <TabsContent key={festival.slug} value={festival.slug} className="mt-6">
            <FestivalView
              festival={festival}
              state={state}
              onTaskUpdate={updateTask}
              onNoteChange={(v) => setFestivalNote(festival.slug, v)}
              onAddDoc={(t, u) => addExtraDoc(festival.slug, t, u)}
              onDraft={openDraft}
            />
          </TabsContent>
        ))}
      </Tabs>

      {/* Draft Reply Dialog */}
      <Dialog open={!!draftTask} onOpenChange={(o) => !o && closeDraft()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Draft email reply</DialogTitle>
            <DialogDescription>
              Edit the draft below, then either copy it or open it in your default mail client. The
              app will eventually wire this to the SMTP send pipeline (one.com) so you can send
              directly from here.
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

function FestivalView({
  festival,
  state,
  onTaskUpdate,
  onNoteChange,
  onAddDoc,
  onDraft,
}: {
  festival: Festival;
  state: PersistedState;
  onTaskUpdate: (id: string, patch: Partial<{ status: TaskStatus; notes: string }>) => void;
  onNoteChange: (v: string) => void;
  onAddDoc: (title: string, url: string) => void;
  onDraft: (task: FestivalTask) => void;
}) {
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocUrl, setNewDocUrl] = useState("");
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

  return (
    <div className="space-y-4">
      {/* Header card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl flex items-center gap-2">
            {festival.emoji} {festival.name}
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
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-1 mb-2">
            {festival.concepts.map((c) => (
              <Badge key={c} variant="secondary">
                {c}
              </Badge>
            ))}
          </div>
          {festival.contacts.length > 0 && (
            <div className="text-sm text-muted-foreground">
              <strong>Contacts:</strong>{" "}
              {festival.contacts
                .map((c) => `${c.name}${c.role ? ` (${c.role})` : ""}${c.email ? ` <${c.email}>` : ""}`)
                .join(" · ")}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Kanban */}
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

      {/* Docs + notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" /> Drive documents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {festival.docs.length === 0 && extras.length === 0 && (
              <p className="text-sm text-muted-foreground">No docs yet — folder may be empty.</p>
            )}
            {festival.docs.map((d) => (
              <a
                key={d.driveId}
                href={driveUrl(d.driveId, d.type)}
                target="_blank"
                rel="noreferrer"
                className="block p-2 rounded border border-border hover:border-blue-500/40 transition"
              >
                <div className="flex items-center gap-2 font-medium">
                  <ExternalLink className="h-4 w-4" /> {d.title}
                </div>
                {d.note && <div className="text-xs text-muted-foreground mt-1">{d.note}</div>}
              </a>
            ))}
            {extras.map((d, i) => (
              <a
                key={`extra-${i}`}
                href={d.url}
                target="_blank"
                rel="noreferrer"
                className="block p-2 rounded border border-dashed border-border hover:border-blue-500/40 transition"
              >
                <div className="flex items-center gap-2 font-medium">
                  <ExternalLink className="h-4 w-4" /> {d.title}
                </div>
              </a>
            ))}
            <div className="flex gap-2 pt-2">
              <input
                placeholder="Title"
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm"
              />
              <input
                placeholder="URL"
                value={newDocUrl}
                onChange={(e) => setNewDocUrl(e.target.value)}
                className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm"
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">📝 Festival notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              rows={8}
              placeholder="Anything to remember for this festival…"
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

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
