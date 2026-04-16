import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { DashboardLayoutSkeleton } from "@/components/DashboardLayoutSkeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  Calendar,
  Clock,
  Flame,
  Loader2,
  RefreshCw,
  Zap,
  Archive,
  Users,
  ArrowUp,
  Moon,
  Trash2,
  Timer,
  ExternalLink,
  Tag,
  BookOpen,
  GraduationCap,
  Lightbulb,
  FileText,
  CheckSquare,
  Sparkles,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useLocation } from "wouter";

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

const quadrantConfig = {
  do_first: {
    title: "DO FIRST",
    subtitle: "Urgent & Important",
    icon: Flame,
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/30",
    badgeClass: "bg-red-500/20 text-red-400 border-red-500/40",
  },
  schedule: {
    title: "SCHEDULE",
    subtitle: "Not Urgent & Important",
    icon: Calendar,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/30",
    badgeClass: "bg-amber-500/20 text-amber-400 border-amber-500/40",
  },
  delegate: {
    title: "DELEGATE",
    subtitle: "Urgent & Not Important",
    icon: Users,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/30",
    badgeClass: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  },
  archive: {
    title: "ARCHIVE",
    subtitle: "Not Urgent & Not Important",
    icon: Archive,
    color: "text-gray-400",
    bg: "bg-gray-500/10 border-gray-500/30",
    badgeClass: "bg-gray-500/20 text-gray-400 border-gray-500/40",
  },
};

function UrgencyBar({ score, label }: { score: number; label: string }) {
  const pct = (score / 10) * 100;
  const color = score >= 8 ? "bg-red-500" : score >= 6 ? "bg-amber-500" : score >= 4 ? "bg-blue-500" : "bg-gray-500";
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground w-8">{label}</span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-foreground font-mono w-4 text-right">{score}</span>
    </div>
  );
}

function TaskCard({ task, onSnooze, onStatusChange, onCategoryChange, onOpenEmail, onAcceptSuggestion, onRejectSuggestion }: {
  task: any;
  onSnooze: (taskId: number) => void;
  onStatusChange: (taskId: number, status: string) => void;
  onCategoryChange: (taskId: number, category: string) => void;
  onOpenEmail: (emailId: number) => void;
  onAcceptSuggestion: (taskId: number) => void;
  onRejectSuggestion: (taskId: number) => void;
}) {
  const isOverdue = task.isOverdue;
  const isSnoozed = task.snoozedUntil && new Date(task.snoozedUntil) > new Date();
  const hasEmail = task.emailId != null;
  const catColor = task.category ? categoryColorMap[task.category] || "" : "";
  const catLabel = task.category ? (categoryLabelMap[task.category] || task.category) : "other";

  return (
    <div className={`p-3 rounded-lg border transition-all hover:border-[#6366f1]/30 ${
      isOverdue ? "border-red-500/50 bg-red-500/5" : isSnoozed ? "border-purple-500/30 bg-purple-500/5 opacity-60" : "border-border bg-card"
    }`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <h4 className="text-sm font-medium text-foreground leading-tight line-clamp-2">{task.title}</h4>
          {task.category === "invoice" && task.title && (
            <Badge variant="outline" className={`text-[10px] px-1 py-0 font-bold ${
              task.title.toUpperCase().includes("PBS") || task.description?.toUpperCase().includes("PBS") || task.description?.toUpperCase().includes("BETALINGSSERVICE")
                ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                : "bg-orange-500/20 text-orange-400 border-orange-500/30"
            }`}>
              {task.title.toUpperCase().includes("PBS") || task.description?.toUpperCase().includes("PBS") || task.description?.toUpperCase().includes("BETALINGSSERVICE") ? "PBS" : "Faktura"}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {hasEmail && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-400 hover:text-blue-300" onClick={() => onOpenEmail(task.emailId)}>
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open email</TooltipContent>
            </Tooltip>
          )}
          {isOverdue && (
            <Tooltip>
              <TooltipTrigger>
                <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
              </TooltipTrigger>
              <TooltipContent>Overdue</TooltipContent>
            </Tooltip>
          )}
          {task.escalationLevel > 0 && (
            <Tooltip>
              <TooltipTrigger>
                <ArrowUp className="h-3.5 w-3.5 text-amber-400" />
              </TooltipTrigger>
              <TooltipContent>Escalated {task.escalationLevel}x</TooltipContent>
            </Tooltip>
          )}
          {isSnoozed && (
            <Tooltip>
              <TooltipTrigger>
                <Moon className="h-3.5 w-3.5 text-purple-400" />
              </TooltipTrigger>
              <TooltipContent>Snoozed until {new Date(task.snoozedUntil).toLocaleDateString()}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      <div className="space-y-1 mb-2">
        <UrgencyBar score={task.urgencyScore || 5} label="URG" />
        <UrgencyBar score={task.importanceScore || 5} label="IMP" />
      </div>

      {/* AI Category Suggestion */}
      {task.suggestedCategory && !task.suggestionConfirmed && (
        <div className="flex items-center gap-1.5 mb-2 p-1.5 rounded bg-violet-500/10 border border-violet-500/20">
          <Sparkles className="h-3 w-3 text-violet-400 shrink-0" />
          <Tooltip>
            <TooltipTrigger>
              <span className="text-[10px] text-violet-400 truncate">
                AI: {categoryLabelMap[task.suggestedCategory] || task.suggestedCategory}
                {task.suggestionConfidence != null && <span className="opacity-70 ml-1">{task.suggestionConfidence}%</span>}
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <div className="text-xs">{task.suggestionReasoning || "Based on email content analysis"}</div>
            </TooltipContent>
          </Tooltip>
          <div className="flex gap-0.5 ml-auto shrink-0">
            <Button variant="ghost" size="icon" className="h-5 w-5 text-green-400 hover:bg-green-500/10" onClick={() => onAcceptSuggestion(task.id)}>
              <Check className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-5 w-5 text-red-400 hover:bg-red-500/10" onClick={() => onRejectSuggestion(task.id)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {task.suggestedAction && (
        <p className="text-xs text-[#6366f1]/80 mb-2 line-clamp-1">
          <Zap className="inline h-3 w-3 mr-1" />
          {task.suggestedAction}
        </p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {/* Category badge with dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex items-center focus:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded">
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 cursor-pointer hover:opacity-80 transition-opacity ${catColor}`}>
                  <Tag className="inline h-2.5 w-2.5 mr-0.5" />
                  {catLabel}
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
                      if (!isActive) onCategoryChange(task.id, cat.value);
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
          {task.dueDate && (
            <span className={`text-[10px] ${isOverdue ? "text-red-400" : "text-muted-foreground"}`}>
              <Clock className="inline h-2.5 w-2.5 mr-0.5" />
              {new Date(task.dueDate).toLocaleDateString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onSnooze(task.id)}>
                <Moon className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Snooze 24h</TooltipContent>
          </Tooltip>
          {task.status === "pending" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-green-400" onClick={() => onStatusChange(task.id, "completed")}>
                  <span className="text-xs">✓</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Complete</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}

function QuadrantPanel({ quadrant, tasks, onSnooze, onStatusChange, onCategoryChange, onOpenEmail, onAcceptSuggestion, onRejectSuggestion }: {
  quadrant: keyof typeof quadrantConfig;
  tasks: any[];
  onSnooze: (taskId: number) => void;
  onStatusChange: (taskId: number, status: string) => void;
  onCategoryChange: (taskId: number, category: string) => void;
  onOpenEmail: (emailId: number) => void;
  onAcceptSuggestion: (taskId: number) => void;
  onRejectSuggestion: (taskId: number) => void;
}) {
  const config = quadrantConfig[quadrant];
  const Icon = config.icon;
  const activeTasks = tasks.filter(t => t.status !== "completed" && t.status !== "dismissed");

  return (
    <Card className={`${config.bg} overflow-hidden`}>
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${config.color}`} />
            <CardTitle className={`text-sm font-bold tracking-wider ${config.color}`}>{config.title}</CardTitle>
          </div>
          <Badge className={config.badgeClass}>{activeTasks.length}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">{config.subtitle}</p>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2 max-h-[400px] overflow-y-auto">
        {activeTasks.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No tasks in this quadrant</p>
        ) : (
          activeTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onSnooze={onSnooze}
              onStatusChange={onStatusChange}
              onCategoryChange={onCategoryChange}
              onOpenEmail={onOpenEmail}
              onAcceptSuggestion={onAcceptSuggestion}
              onRejectSuggestion={onRejectSuggestion}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default function PriorityView() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [isReprioritizing, setIsReprioritizing] = useState(false);

  const { data: allTasks, isLoading: tasksLoading, refetch: refetchTasks } = trpc.task.prioritized.useQuery();
  const { data: distribution, refetch: refetchDist } = trpc.task.priorityDistribution.useQuery();
  const { data: autoArchiveStats, refetch: refetchAutoArchive } = trpc.task.autoArchiveStats.useQuery();
  const { data: autoArchivePreview, refetch: refetchPreview } = trpc.task.autoArchivePreview.useQuery();
  const [isAutoArchiving, setIsAutoArchiving] = useState(false);

  const autoArchiveRun = trpc.task.autoArchiveRun.useMutation({
    onSuccess: (result) => {
      toast.success(`Auto-archived ${result.archived} stale tasks`);
      refetchTasks();
      refetchDist();
      refetchAutoArchive();
      refetchPreview();
      setIsAutoArchiving(false);
    },
    onError: (err) => {
      toast.error(`Auto-archive failed: ${err.message}`);
      setIsAutoArchiving(false);
    },
  });

  const reprioritize = trpc.task.reprioritize.useMutation({
    onSuccess: (result) => {
      toast.success(`Re-prioritized ${result.updated} tasks (${result.failed} failed)`);
      refetchTasks();
      refetchDist();
      setIsReprioritizing(false);
    },
    onError: (err) => {
      toast.error(`Re-prioritization failed: ${err.message}`);
      setIsReprioritizing(false);
    },
  });

  const snoozeMutation = trpc.task.snooze.useMutation({
    onSuccess: () => {
      toast.success("Task snoozed for 24 hours");
      refetchTasks();
    },
  });

  const statusMutation = trpc.task.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Task status updated");
      refetchTasks();
      refetchDist();
    },
  });

  const categoryMutation = trpc.task.updateCategory.useMutation({
    onSuccess: (data) => {
      toast.success(`Category changed to "${categoryLabelMap[data.category] || data.category}"`);
      refetchTasks();
      refetchDist();
    },
    onError: (err) => toast.error(err.message),
  });

  const acceptSuggestion = trpc.task.acceptSuggestion.useMutation({
    onSuccess: () => {
      toast.success("AI suggestion accepted");
      refetchTasks();
      refetchDist();
    },
    onError: (err) => toast.error(err.message),
  });

  const rejectSuggestion = trpc.task.rejectSuggestion.useMutation({
    onSuccess: () => {
      toast.info("AI suggestion dismissed");
      refetchTasks();
      refetchDist();
    },
    onError: (err) => toast.error(err.message),
  });

  if (authLoading) return <DashboardLayoutSkeleton />;
  if (!user) return <DashboardLayoutSkeleton />;

  // Group tasks by quadrant
  const tasksByQuadrant = {
    do_first: (allTasks || []).filter((t: any) => t.quadrant === "do_first"),
    schedule: (allTasks || []).filter((t: any) => t.quadrant === "schedule"),
    delegate: (allTasks || []).filter((t: any) => t.quadrant === "delegate"),
    archive: (allTasks || []).filter((t: any) => t.quadrant === "archive" || !t.quadrant),
  };

  const totalActive = (allTasks || []).filter((t: any) => t.status !== "completed" && t.status !== "dismissed").length;

  const handleCategoryChange = (taskId: number, category: string) => {
    categoryMutation.mutate({ taskId, category });
  };

  const handleOpenEmail = (emailId: number) => {
    navigate(`/emails/${emailId}`);
  };

  const handleAcceptSuggestion = (taskId: number) => {
    acceptSuggestion.mutate({ taskId });
  };

  const handleRejectSuggestion = (taskId: number) => {
    rejectSuggestion.mutate({ taskId });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground font-[Outfit]">Priority Matrix</h1>
            <p className="text-muted-foreground text-sm">
              Eisenhower Matrix — {totalActive} active tasks sorted by urgency and importance
            </p>
          </div>
          <Button
            onClick={() => {
              setIsReprioritizing(true);
              reprioritize.mutate();
            }}
            disabled={isReprioritizing}
            className="bg-[#6366f1] hover:bg-[#4f46e5] text-white font-semibold"
          >
            {isReprioritizing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Re-prioritizing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Re-prioritize All
              </>
            )}
          </Button>
        </div>

        {/* Distribution Summary */}
        {distribution && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(Object.keys(quadrantConfig) as Array<keyof typeof quadrantConfig>).map((q) => {
              const config = quadrantConfig[q];
              const Icon = config.icon;
              const count = distribution[q] || 0;
              return (
                <Card key={q} className={`${config.bg} p-3`}>
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${config.color}`} />
                    <span className={`text-xs font-bold tracking-wider ${config.color}`}>{config.title}</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground mt-1">{count}</p>
                </Card>
              );
            })}
          </div>
        )}

        {/* Eisenhower Matrix Grid */}
        {tasksLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#6366f1]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Row 1: Urgent+Important | Not Urgent+Important */}
            <QuadrantPanel
              quadrant="do_first"
              tasks={tasksByQuadrant.do_first}
              onSnooze={(id) => snoozeMutation.mutate({ taskId: id, hours: 24 })}
              onStatusChange={(id, status) => statusMutation.mutate({ taskId: id, status: status as any })}
              onCategoryChange={handleCategoryChange}
              onOpenEmail={handleOpenEmail}
              onAcceptSuggestion={handleAcceptSuggestion}
              onRejectSuggestion={handleRejectSuggestion}
            />
            <QuadrantPanel
              quadrant="schedule"
              tasks={tasksByQuadrant.schedule}
              onSnooze={(id) => snoozeMutation.mutate({ taskId: id, hours: 24 })}
              onStatusChange={(id, status) => statusMutation.mutate({ taskId: id, status: status as any })}
              onCategoryChange={handleCategoryChange}
              onOpenEmail={handleOpenEmail}
              onAcceptSuggestion={handleAcceptSuggestion}
              onRejectSuggestion={handleRejectSuggestion}
            />
            {/* Row 2: Urgent+Not Important | Not Urgent+Not Important */}
            <QuadrantPanel
              quadrant="delegate"
              tasks={tasksByQuadrant.delegate}
              onSnooze={(id) => snoozeMutation.mutate({ taskId: id, hours: 24 })}
              onStatusChange={(id, status) => statusMutation.mutate({ taskId: id, status: status as any })}
              onCategoryChange={handleCategoryChange}
              onOpenEmail={handleOpenEmail}
              onAcceptSuggestion={handleAcceptSuggestion}
              onRejectSuggestion={handleRejectSuggestion}
            />
            <QuadrantPanel
              quadrant="archive"
              tasks={tasksByQuadrant.archive}
              onSnooze={(id) => snoozeMutation.mutate({ taskId: id, hours: 24 })}
              onStatusChange={(id, status) => statusMutation.mutate({ taskId: id, status: status as any })}
              onCategoryChange={handleCategoryChange}
              onOpenEmail={handleOpenEmail}
              onAcceptSuggestion={handleAcceptSuggestion}
              onRejectSuggestion={handleRejectSuggestion}
            />
          </div>
        )}

        {/* Auto-Archive Section */}
        <Card className="border-orange-500/20 bg-orange-500/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer className="h-5 w-5 text-orange-400" />
                <CardTitle className="text-base font-bold text-orange-400">Auto-Archive (30-Day Rule)</CardTitle>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-sm font-bold text-orange-400">{autoArchiveStats?.candidates ?? 0}</span>
                  <span className="text-xs text-muted-foreground ml-1">candidates</span>
                  <span className="text-xs text-muted-foreground mx-2">|</span>
                  <span className="text-sm font-bold text-muted-foreground">{autoArchiveStats?.alreadyArchived ?? 0}</span>
                  <span className="text-xs text-muted-foreground ml-1">previously archived</span>
                </div>
                <Button
                  onClick={() => {
                    setIsAutoArchiving(true);
                    autoArchiveRun.mutate();
                  }}
                  disabled={isAutoArchiving || isReprioritizing || (autoArchiveStats?.candidates ?? 0) === 0}
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600 text-black font-semibold"
                >
                  {isAutoArchiving ? (
                    <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Archiving...</>
                  ) : (
                    <><Trash2 className="mr-1.5 h-3.5 w-3.5" />Dismiss Stale</>
                  )}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Tasks in the Archive quadrant with no activity for 30+ days are automatically eligible for dismissal.
            </p>
          </CardHeader>
          {(autoArchivePreview?.length ?? 0) > 0 && (
            <CardContent className="pt-0 pb-3">
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                {autoArchivePreview?.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-2 rounded border border-orange-500/10 bg-background/50 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <Archive className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <span className="truncate text-foreground">{task.title}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{task.category || "other"}</Badge>
                      <span className="text-[10px] text-muted-foreground">
                        Last active: {task.lastActivityAt ? new Date(task.lastActivityAt).toLocaleDateString() : "never"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
