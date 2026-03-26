import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { DashboardLayoutSkeleton } from "@/components/DashboardLayoutSkeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

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

function TaskCard({ task, onSnooze, onStatusChange }: {
  task: any;
  onSnooze: (taskId: number) => void;
  onStatusChange: (taskId: number, status: string) => void;
}) {
  const isOverdue = task.isOverdue;
  const isSnoozed = task.snoozedUntil && new Date(task.snoozedUntil) > new Date();

  return (
    <div className={`p-3 rounded-lg border transition-all hover:border-amber-500/40 ${
      isOverdue ? "border-red-500/50 bg-red-500/5" : isSnoozed ? "border-purple-500/30 bg-purple-500/5 opacity-60" : "border-border bg-card"
    }`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-medium text-foreground leading-tight line-clamp-2">{task.title}</h4>
        <div className="flex items-center gap-1 shrink-0">
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

      {task.suggestedAction && (
        <p className="text-xs text-amber-400/80 mb-2 line-clamp-1">
          <Zap className="inline h-3 w-3 mr-1" />
          {task.suggestedAction}
        </p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {task.category || "other"}
          </Badge>
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

function QuadrantPanel({ quadrant, tasks, onSnooze, onStatusChange }: {
  quadrant: keyof typeof quadrantConfig;
  tasks: any[];
  onSnooze: (taskId: number) => void;
  onStatusChange: (taskId: number, status: string) => void;
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
            <TaskCard key={task.id} task={task} onSnooze={onSnooze} onStatusChange={onStatusChange} />
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default function PriorityView() {
  const { user, loading: authLoading } = useAuth();
  const [isReprioritizing, setIsReprioritizing] = useState(false);

  const { data: allTasks, isLoading: tasksLoading, refetch: refetchTasks } = trpc.task.prioritized.useQuery();
  const { data: distribution, refetch: refetchDist } = trpc.task.priorityDistribution.useQuery();

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
            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
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
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Row 1: Urgent+Important | Not Urgent+Important */}
            <QuadrantPanel
              quadrant="do_first"
              tasks={tasksByQuadrant.do_first}
              onSnooze={(id) => snoozeMutation.mutate({ taskId: id, hours: 24 })}
              onStatusChange={(id, status) => statusMutation.mutate({ taskId: id, status: status as any })}
            />
            <QuadrantPanel
              quadrant="schedule"
              tasks={tasksByQuadrant.schedule}
              onSnooze={(id) => snoozeMutation.mutate({ taskId: id, hours: 24 })}
              onStatusChange={(id, status) => statusMutation.mutate({ taskId: id, status: status as any })}
            />
            {/* Row 2: Urgent+Not Important | Not Urgent+Not Important */}
            <QuadrantPanel
              quadrant="delegate"
              tasks={tasksByQuadrant.delegate}
              onSnooze={(id) => snoozeMutation.mutate({ taskId: id, hours: 24 })}
              onStatusChange={(id, status) => statusMutation.mutate({ taskId: id, status: status as any })}
            />
            <QuadrantPanel
              quadrant="archive"
              tasks={tasksByQuadrant.archive}
              onSnooze={(id) => snoozeMutation.mutate({ taskId: id, hours: 24 })}
              onStatusChange={(id, status) => statusMutation.mutate({ taskId: id, status: status as any })}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
