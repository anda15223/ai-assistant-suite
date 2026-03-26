import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  CheckSquare, Plus, Loader2, Mail, MessageSquare, User, ArrowRight,
  Flame, Calendar, Users, Archive, AlertTriangle, ArrowUp, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Link } from "wouter";

const priorityConfig: Record<string, { label: string; color: string }> = {
  urgent: { label: "Urgent", color: "bg-red-500/10 text-red-500 border-red-500/20" },
  high: { label: "High", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  medium: { label: "Medium", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  low: { label: "Low", color: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  in_progress: { label: "In Progress", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  completed: { label: "Completed", color: "bg-green-500/10 text-green-500 border-green-500/20" },
  dismissed: { label: "Dismissed", color: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
};

const quadrantConfig: Record<string, { icon: any; color: string; label: string }> = {
  do_first: { icon: Flame, color: "text-red-400", label: "Do First" },
  schedule: { icon: Calendar, color: "text-amber-400", label: "Schedule" },
  delegate: { icon: Users, color: "text-blue-400", label: "Delegate" },
  archive: { icon: Archive, color: "text-gray-400", label: "Archive" },
};

const sourceIcons: Record<string, any> = {
  email: Mail,
  whatsapp: MessageSquare,
  manual: User,
};

function UrgencyBadge({ urgency, importance }: { urgency: number; importance: number }) {
  const score = Math.round(urgency * 0.6 + importance * 0.4);
  const color = score >= 8 ? "bg-red-500/20 text-red-400 border-red-500/40"
    : score >= 6 ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
    : score >= 4 ? "bg-blue-500/20 text-blue-400 border-blue-500/40"
    : "bg-gray-500/20 text-gray-400 border-gray-500/40";

  return (
    <Tooltip>
      <TooltipTrigger>
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-mono ${color}`}>
          <Zap className="inline h-2.5 w-2.5 mr-0.5" />
          {score}/10
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs">
          <div>Urgency: {urgency}/10</div>
          <div>Importance: {importance}/10</div>
          <div>Priority Score: {score}/10</div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export default function TaskBoard() {
  const taskList = trpc.task.prioritized.useQuery();
  const taskStats = trpc.task.stats.useQuery();
  const createTask = trpc.task.create.useMutation({
    onSuccess: () => {
      toast.success("Task created");
      taskList.refetch();
      taskStats.refetch();
      setDialogOpen(false);
      setNewTitle("");
      setNewDesc("");
      setNewPriority("medium");
    },
    onError: (err) => toast.error(err.message),
  });
  const updateStatus = trpc.task.updateStatus.useMutation({
    onSuccess: () => {
      taskList.refetch();
      taskStats.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const [statusFilter, setStatusFilter] = useState("active");
  const [sortBy, setSortBy] = useState<"priority" | "date" | "due">("priority");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");

  const filteredTasks = useMemo(() => {
    if (!taskList.data) return [];
    let filtered: typeof taskList.data;
    if (statusFilter === "active") filtered = taskList.data.filter(t => t.status === "pending" || t.status === "in_progress");
    else if (statusFilter === "invoices") filtered = taskList.data.filter(t => t.category === "invoice" && (t.status === "pending" || t.status === "in_progress"));
    else if (statusFilter === "completed") filtered = taskList.data.filter(t => t.status === "completed");
    else if (statusFilter === "dismissed") filtered = taskList.data.filter(t => t.status === "dismissed");
    else filtered = [...taskList.data];

    // Sort
    if (sortBy === "priority") {
      filtered.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
    } else if (sortBy === "due") {
      filtered.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    } else {
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return filtered;
  }, [taskList.data, statusFilter, sortBy]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Task Board</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Tasks extracted from emails and manually created — sorted by priority
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/priority">
            <Button variant="outline" size="sm" className="text-amber-500 border-amber-500/30 hover:bg-amber-500/10">
              <Flame className="w-3.5 h-3.5 mr-1.5" />
              Priority Matrix
            </Button>
          </Link>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-amber-500 hover:bg-amber-600 text-black">
                <Plus className="w-4 h-4 mr-2" /> New Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <Input placeholder="Task title" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
                <Textarea placeholder="Description (optional)" value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={3} />
                <Select value={newPriority} onValueChange={(v: any) => setNewPriority(v)}>
                  <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => createTask.mutate({ title: newTitle, description: newDesc, priority: newPriority, source: "manual" })}
                  disabled={!newTitle || createTask.isPending}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-black"
                >
                  {createTask.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Create Task
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="cursor-pointer" onClick={() => setStatusFilter("all")}>
          <CardContent className="py-3 px-4">
            <div className="text-xl font-bold">{taskStats.data?.total ?? "—"}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer" onClick={() => setStatusFilter("active")}>
          <CardContent className="py-3 px-4">
            <div className="text-xl font-bold text-amber-500">{taskStats.data?.pending ?? "—"}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer" onClick={() => setStatusFilter("active")}>
          <CardContent className="py-3 px-4">
            <div className="text-xl font-bold text-blue-500">{taskStats.data?.inProgress ?? "—"}</div>
            <div className="text-xs text-muted-foreground">In Progress</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer" onClick={() => setStatusFilter("completed")}>
          <CardContent className="py-3 px-4">
            <div className="text-xl font-bold text-green-500">{taskStats.data?.completed ?? "—"}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter tabs + Sort */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1.5 flex-wrap">
          {[
            { key: "active", label: "Active" },
            { key: "invoices", label: "Invoices" },
            { key: "completed", label: "Completed" },
            { key: "dismissed", label: "Dismissed" },
            { key: "all", label: "All" },
          ].map(f => (
            <Button
              key={f.key}
              variant={statusFilter === f.key ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(f.key)}
              className={statusFilter === f.key ? "bg-amber-500 hover:bg-amber-600 text-black" : ""}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Sort:</span>
          {[
            { key: "priority" as const, label: "Priority" },
            { key: "date" as const, label: "Date" },
            { key: "due" as const, label: "Due Date" },
          ].map(s => (
            <Button
              key={s.key}
              variant={sortBy === s.key ? "default" : "ghost"}
              size="sm"
              onClick={() => setSortBy(s.key)}
              className={`h-7 text-xs ${sortBy === s.key ? "bg-amber-500/20 text-amber-400" : ""}`}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Task list */}
      {taskList.isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <CheckSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="font-semibold text-foreground mb-1">No tasks found</h3>
            <p className="text-sm text-muted-foreground">
              Tasks will appear here when extracted from emails or created manually.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map(task => {
            const pConfig = priorityConfig[task.priority];
            const sConfig = statusConfig[task.status];
            const SourceIcon = sourceIcons[task.source] || User;
            const qConfig = task.quadrant ? quadrantConfig[task.quadrant] : null;
            const QuadrantIcon = qConfig?.icon || null;
            const hasUrgency = task.urgencyScore && task.urgencyScore !== 5;

            return (
              <Card key={task.id} className={`hover:border-amber-500/20 transition-colors ${task.isOverdue ? "border-red-500/30 bg-red-500/5" : ""}`}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex flex-col items-center gap-1">
                      <SourceIcon className="w-4 h-4 text-muted-foreground" />
                      {QuadrantIcon && (
                        <Tooltip>
                          <TooltipTrigger>
                            <QuadrantIcon className={`w-3.5 h-3.5 ${qConfig?.color}`} />
                          </TooltipTrigger>
                          <TooltipContent>{qConfig?.label}</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-medium text-foreground">{task.title}</span>
                        {hasUrgency && (
                          <UrgencyBadge urgency={task.urgencyScore || 5} importance={task.importanceScore || 5} />
                        )}
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${pConfig?.color || ""}`}>
                          {pConfig?.label}
                        </Badge>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${sConfig?.color || ""}`}>
                          {sConfig?.label}
                        </Badge>
                        {task.category && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {task.category}
                          </Badge>
                        )}
                        {task.isOverdue && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-red-500/20 text-red-400 border-red-500/40">
                            <AlertTriangle className="inline h-2.5 w-2.5 mr-0.5" />
                            Overdue
                          </Badge>
                        )}
                        {task.escalationLevel && task.escalationLevel > 0 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-500/20 text-amber-400 border-amber-500/40">
                            <ArrowUp className="inline h-2.5 w-2.5 mr-0.5" />
                            Esc. {task.escalationLevel}
                          </Badge>
                        )}
                      </div>
                      {task.suggestedAction && (
                        <p className="text-xs text-amber-400/80 mb-1">
                          <Zap className="inline h-3 w-3 mr-1" />
                          {task.suggestedAction}
                        </p>
                      )}
                      {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        {task.dueDate && (
                          <span className={`text-xs ${task.isOverdue ? "text-red-400 font-medium" : "text-muted-foreground"}`}>
                            Due: {format(new Date(task.dueDate), "MMM d, yyyy")}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          Created: {format(new Date(task.createdAt), "MMM d")}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {task.status === "pending" && (
                        <>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => updateStatus.mutate({ taskId: task.id, status: "in_progress" })}>
                            <ArrowRight className="w-3 h-3 mr-1" /> Start
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-green-500" onClick={() => updateStatus.mutate({ taskId: task.id, status: "completed" })}>
                            Done
                          </Button>
                        </>
                      )}
                      {task.status === "in_progress" && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-green-500" onClick={() => updateStatus.mutate({ taskId: task.id, status: "completed" })}>
                          Complete
                        </Button>
                      )}
                      {(task.status === "pending" || task.status === "in_progress") && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => updateStatus.mutate({ taskId: task.id, status: "dismissed" })}>
                          Dismiss
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
