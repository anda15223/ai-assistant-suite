import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckSquare, Plus, Loader2, Mail, MessageSquare, User, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { format } from "date-fns";

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

const sourceIcons: Record<string, any> = {
  email: Mail,
  whatsapp: MessageSquare,
  manual: User,
};

export default function TaskBoard() {
  const taskList = trpc.task.list.useQuery();
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");

  const filteredTasks = useMemo(() => {
    if (!taskList.data) return [];
    if (statusFilter === "active") return taskList.data.filter(t => t.status === "pending" || t.status === "in_progress");
    if (statusFilter === "completed") return taskList.data.filter(t => t.status === "completed");
    if (statusFilter === "dismissed") return taskList.data.filter(t => t.status === "dismissed");
    return taskList.data;
  }, [taskList.data, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Task Board</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Tasks extracted from emails and manually created
          </p>
        </div>
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

      {/* Filter tabs */}
      <div className="flex gap-1.5">
        {[
          { key: "active", label: "Active" },
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
            return (
              <Card key={task.id} className="hover:border-amber-500/20 transition-colors">
                <CardContent className="py-3 px-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <SourceIcon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-medium text-foreground">{task.title}</span>
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
                      </div>
                      {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        {task.dueDate && (
                          <span className="text-xs text-muted-foreground">
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
