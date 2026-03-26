import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  CheckSquare, Plus, Loader2, Mail, MessageSquare, User, ArrowRight,
  Flame, Calendar, Users, Archive, AlertTriangle, ArrowUp, Zap,
  ExternalLink, Tag, BookOpen, GraduationCap, Lightbulb, FileText,
  Sparkles, Check, X,
} from "lucide-react";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Link, useLocation } from "wouter";

const TASK_CATEGORIES = [
  { value: "task", label: "Task", icon: CheckSquare, color: "text-blue-400" },
  { value: "invoice", label: "Invoice", icon: FileText, color: "text-green-400" },
  { value: "read_lecture", label: "Read as Lecture", icon: BookOpen, color: "text-purple-400" },
  { value: "read_learn", label: "Read to Learn", icon: GraduationCap, color: "text-cyan-400" },
  { value: "might_be_interesting", label: "Might Be Interesting", icon: Lightbulb, color: "text-yellow-400" },
];

const categoryColorMap: Record<string, string> = {
  task: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  invoice: "bg-green-500/10 text-green-400 border-green-500/30",
  read_lecture: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  read_learn: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  might_be_interesting: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
};

const categoryLabelMap: Record<string, string> = {
  task: "Task",
  invoice: "Invoice",
  read_lecture: "Lecture",
  read_learn: "Learn",
  might_be_interesting: "Interesting",
};

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
  const [, navigate] = useLocation();
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
  const updateCategory = trpc.task.updateCategory.useMutation({
    onSuccess: (data) => {
      toast.success(`Category changed to "${categoryLabelMap[data.category] || data.category}"`);
      taskList.refetch();
      taskStats.refetch();
    },
    onError: (err) => toast.error(err.message),
  });
  const acceptSuggestion = trpc.task.acceptSuggestion.useMutation({
    onSuccess: () => {
      toast.success("AI suggestion accepted");
      taskList.refetch();
      taskStats.refetch();
    },
    onError: (err) => toast.error(err.message),
  });
  const rejectSuggestion = trpc.task.rejectSuggestion.useMutation({
    onSuccess: () => {
      toast.info("AI suggestion dismissed");
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
    else if (statusFilter === "read_lecture") filtered = taskList.data.filter(t => t.category === "read_lecture");
    else if (statusFilter === "read_learn") filtered = taskList.data.filter(t => t.category === "read_learn");
    else if (statusFilter === "might_be_interesting") filtered = taskList.data.filter(t => t.category === "might_be_interesting");
    else if (statusFilter === "suggestions") filtered = taskList.data.filter(t => t.suggestedCategory && !t.suggestionConfirmed);
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

  // Count pending AI suggestions
  const pendingSuggestionCount = useMemo(() => {
    if (!taskList.data) return 0;
    return taskList.data.filter(t => t.suggestedCategory && !t.suggestionConfirmed).length;
  }, [taskList.data]);

  // Count tasks per category for filter tabs
  const categoryCounts = useMemo(() => {
    if (!taskList.data) return {} as Record<string, number>;
    const counts: Record<string, number> = {};
    taskList.data.forEach(t => {
      if (t.category) {
        counts[t.category] = (counts[t.category] || 0) + 1;
      }
    });
    return counts;
  }, [taskList.data]);

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
            { key: "invoices", label: `Invoices${categoryCounts["invoice"] ? ` (${categoryCounts["invoice"]})` : ""}` },
            { key: "read_lecture", label: `Lectures${categoryCounts["read_lecture"] ? ` (${categoryCounts["read_lecture"]})` : ""}`, icon: BookOpen },
            { key: "read_learn", label: `Learn${categoryCounts["read_learn"] ? ` (${categoryCounts["read_learn"]})` : ""}`, icon: GraduationCap },
            { key: "might_be_interesting", label: `Interesting${categoryCounts["might_be_interesting"] ? ` (${categoryCounts["might_be_interesting"]})` : ""}`, icon: Lightbulb },
            { key: "suggestions", label: `AI Suggestions${pendingSuggestionCount ? ` (${pendingSuggestionCount})` : ""}`, icon: Sparkles },
            { key: "completed", label: "Completed" },
            { key: "dismissed", label: "Dismissed" },
            { key: "all", label: "All" },
          ].map(f => {
            const FIcon = (f as any).icon;
            return (
              <Button
                key={f.key}
                variant={statusFilter === f.key ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(f.key)}
                className={statusFilter === f.key ? "bg-amber-500 hover:bg-amber-600 text-black" : ""}
              >
                {FIcon && <FIcon className="w-3 h-3 mr-1" />}
                {f.label}
              </Button>
            );
          })}
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
            <h3 className="text-lg font-semibold mb-1">No tasks found</h3>
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
            const catColor = task.category ? categoryColorMap[task.category] || "" : "";
            const catLabel = task.category ? (categoryLabelMap[task.category] || task.category) : null;
            const hasEmail = task.emailId != null;

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
                        {/* Category badge with dropdown to reassign */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="inline-flex items-center focus:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded">
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 cursor-pointer hover:opacity-80 transition-opacity ${catColor}`}>
                                <Tag className="inline h-2.5 w-2.5 mr-0.5" />
                                {catLabel || "Uncategorized"}
                              </Badge>
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-48">
                            <DropdownMenuLabel className="text-xs">Change Category</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {TASK_CATEGORIES.map(cat => {
                              const CatIcon = cat.icon;
                              const isActive = task.category === cat.value;
                              return (
                                <DropdownMenuItem
                                  key={cat.value}
                                  onClick={() => {
                                    if (!isActive) {
                                      updateCategory.mutate({ taskId: task.id, category: cat.value });
                                    }
                                  }}
                                  className={`cursor-pointer ${isActive ? "bg-accent" : ""}`}
                                >
                                  <CatIcon className={`w-3.5 h-3.5 mr-2 ${cat.color}`} />
                                  <span className="text-sm">{cat.label}</span>
                                  {isActive && <span className="ml-auto text-xs text-muted-foreground">current</span>}
                                </DropdownMenuItem>
                              );
                            })}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        {/* AI Suggestion badge */}
                        {task.suggestedCategory && !task.suggestionConfirmed && (
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-violet-500/15 text-violet-400 border-violet-500/40 animate-pulse">
                                <Sparkles className="inline h-2.5 w-2.5 mr-0.5" />
                                AI: {categoryLabelMap[task.suggestedCategory] || task.suggestedCategory}
                                {task.suggestionConfidence != null && (
                                  <span className="ml-1 opacity-70">{task.suggestionConfidence}%</span>
                                )}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <div className="text-xs">
                                <div className="font-medium mb-1">AI Category Suggestion</div>
                                <div>{task.suggestionReasoning || "Based on email content analysis"}</div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
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
                    <div className="flex flex-col gap-1 shrink-0">
                      {/* AI Suggestion accept/reject */}
                      {task.suggestedCategory && !task.suggestionConfirmed && (
                        <div className="flex gap-0.5 mb-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                                onClick={() => acceptSuggestion.mutate({ taskId: task.id })}
                                disabled={acceptSuggestion.isPending}
                              >
                                <Check className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Accept AI suggestion: {categoryLabelMap[task.suggestedCategory] || task.suggestedCategory}</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                onClick={() => rejectSuggestion.mutate({ taskId: task.id })}
                                disabled={rejectSuggestion.isPending}
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Dismiss AI suggestion</TooltipContent>
                          </Tooltip>
                        </div>
                      )}
                      {/* Open Email button */}
                      {hasEmail && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-blue-400 hover:text-blue-300"
                              onClick={() => navigate(`/emails/${task.emailId}`)}
                            >
                              <ExternalLink className="w-3 h-3 mr-1" /> Email
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Open original email</TooltipContent>
                        </Tooltip>
                      )}
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
