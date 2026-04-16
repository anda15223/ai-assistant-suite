import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ArrowLeft, Bot, Send, Check, X, RefreshCw, Loader2, FileText,
  CheckSquare, Clock, Mail, User, Calendar, Tag, ArrowRight,
  BookOpen, GraduationCap, Lightbulb, Flame, Users, Archive,
  Zap, AlertTriangle, Sparkles,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useState } from "react";
import { format } from "date-fns";

const classificationConfig: Record<string, { label: string; color: string; icon: any }> = {
  invoice: { label: "Invoice", color: "bg-amber-500/10 text-amber-500 border-amber-500/20", icon: FileText },
  task: { label: "Task", color: "bg-teal-500/10 text-teal-500 border-teal-500/20", icon: CheckSquare },
  reminder: { label: "Reminder", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: Clock },
  general: { label: "General", color: "bg-gray-500/10 text-gray-400 border-gray-500/20", icon: Mail },
  irrelevant: { label: "Irrelevant", color: "bg-gray-500/10 text-gray-500 border-gray-500/20", icon: Mail },
};

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
  correspondence: "Correspondence",
};

const categoryIconMap: Record<string, any> = {
  task: CheckSquare,
  invoice: FileText,
  read_lecture: BookOpen,
  read_learn: GraduationCap,
  might_be_interesting: Lightbulb,
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

export default function EmailDetail({ id }: { id: string }) {
  const [, navigate] = useLocation();
  const emailId = parseInt(id, 10);
  const email = trpc.email.get.useQuery({ id: emailId }, { enabled: !isNaN(emailId) });
  const [draftBody, setDraftBody] = useState("");
  const [instructions, setInstructions] = useState("");
  const [showInstructions, setShowInstructions] = useState(false);
  const [showHtml, setShowHtml] = useState(false);

  const generateDraft = trpc.draft.generate.useMutation({
    onSuccess: (data) => {
      setDraftBody(data.body);
      email.refetch();
      toast.success("Draft reply generated");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateDraft = trpc.draft.update.useMutation({
    onSuccess: () => toast.success("Draft updated"),
    onError: (err) => toast.error(err.message),
  });

  const sendDraft = trpc.draft.send.useMutation({
    onSuccess: () => {
      toast.success("Email sent successfully!");
      email.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const rejectDraft = trpc.draft.reject.useMutation({
    onSuccess: () => {
      toast.info("Draft rejected");
      email.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  if (email.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!email.data) {
    return (
      <div className="text-center py-20">
        <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
        <p className="text-muted-foreground mb-4">Email not found</p>
        <Button variant="ghost" onClick={() => navigate("/emails")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Inbox
        </Button>
      </div>
    );
  }

  const e = email.data;
  const config = classificationConfig[e.classification || "general"];
  const ClassIcon = config?.icon || Mail;
  const analysis = e.aiAnalysis as any;
  const pendingDraft = e.drafts?.find((d: any) => d.status === "pending");
  const linkedTasks = (e as any).linkedTasks || [];
  const hasHtml = !!e.bodyHtml;

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => navigate("/emails")}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Inbox
      </Button>

      {/* Email header card */}
      <Card>
        <CardContent className="pt-6">
          {/* Subject + Classification */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-foreground mb-2">{e.subject || "(No Subject)"}</h1>
              <div className="flex items-center gap-2">
                {e.classification && (
                  <Badge variant="outline" className={`${config?.color || ""}`}>
                    <ClassIcon className="w-3 h-3 mr-1" />
                    {config?.label}
                  </Badge>
                )}
                {e.isRead ? (
                  <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-400 border-green-500/20">Read</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/20">Unread</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Sender/Recipient details */}
          <div className="space-y-2 p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground w-12 shrink-0">From:</span>
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-medium text-foreground">{e.fromName || "Unknown"}</span>
              {e.fromAddress && (
                <span className="text-muted-foreground">&lt;{e.fromAddress}&gt;</span>
              )}
            </div>
            {e.toAddress && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground w-12 shrink-0">To:</span>
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-foreground">{e.toAddress}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground w-12 shrink-0">Date:</span>
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-foreground">
                {e.receivedAt ? format(new Date(e.receivedAt), "EEEE, MMMM d, yyyy 'at' HH:mm") : "Unknown date"}
              </span>
            </div>
            {e.messageId && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground w-12 shrink-0">ID:</span>
                <span className="text-xs text-muted-foreground font-mono truncate">{e.messageId}</span>
              </div>
            )}
          </div>

          <Separator className="my-4" />

          {/* Email body */}
          <div>
            {hasHtml && (
              <div className="flex justify-end mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-6"
                  onClick={() => setShowHtml(!showHtml)}
                >
                  {showHtml ? "Show Plain Text" : "Show HTML"}
                </Button>
              </div>
            )}
            {showHtml && hasHtml ? (
              <div
                className="prose prose-sm prose-invert max-w-none text-sm rounded-lg border border-border/50 p-4 bg-background overflow-auto max-h-[600px]"
                dangerouslySetInnerHTML={{ __html: e.bodyHtml! }}
              />
            ) : (
              <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-auto">
                {e.body || "(No content)"}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Linked Tasks */}
      {linkedTasks.length > 0 && (
        <Card className="border-teal-500/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-teal-500" />
                Linked Tasks
              </CardTitle>
              <Badge variant="outline" className="text-[10px]">{linkedTasks.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {linkedTasks.map((task: any) => {
              const catColor = task.category ? categoryColorMap[task.category] || "" : "";
              const catLabel = task.category ? (categoryLabelMap[task.category] || task.category) : "Uncategorized";
              const CatIcon = task.category ? (categoryIconMap[task.category] || Tag) : Tag;
              const sConfig = statusConfig[task.status] || statusConfig.pending;
              const qConfig = task.quadrant ? quadrantConfig[task.quadrant] : null;
              const QuadrantIcon = qConfig?.icon || null;
              const hasUrgency = task.urgencyScore && task.urgencyScore !== 5;
              const priorityScore = hasUrgency ? Math.round((task.urgencyScore || 5) * 0.6 + (task.importanceScore || 5) * 0.4) : null;

              return (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card hover:border-teal-500/30 transition-colors cursor-pointer"
                  onClick={() => navigate("/tasks")}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {QuadrantIcon && (
                      <Tooltip>
                        <TooltipTrigger>
                          <QuadrantIcon className={`w-4 h-4 shrink-0 ${qConfig?.color}`} />
                        </TooltipTrigger>
                        <TooltipContent>{qConfig?.label}</TooltipContent>
                      </Tooltip>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground truncate">{task.title}</span>
                        {/* PBS / Faktura badge for invoice tasks */}
                        {task.category === "invoice" && task.title && (
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-bold ${
                            task.title.toUpperCase().includes("PBS") || task.description?.toUpperCase().includes("PBS") || task.description?.toUpperCase().includes("BETALINGSSERVICE")
                              ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                              : "bg-orange-500/20 text-orange-400 border-orange-500/30"
                          }`}>
                            {task.title.toUpperCase().includes("PBS") || task.description?.toUpperCase().includes("PBS") || task.description?.toUpperCase().includes("BETALINGSSERVICE") ? "PBS" : "Faktura"}
                          </Badge>
                        )}
                        {priorityScore && (
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-mono ${
                            priorityScore >= 8 ? "bg-red-500/20 text-red-400 border-red-500/40"
                            : priorityScore >= 6 ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                            : "bg-blue-500/20 text-blue-400 border-blue-500/40"
                          }`}>
                            <Zap className="inline h-2.5 w-2.5 mr-0.5" />
                            {priorityScore}/10
                          </Badge>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{task.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* AI Suggestion badge */}
                    {task.suggestedCategory && !task.suggestionConfirmed && (
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-violet-500/15 text-violet-400 border-violet-500/40">
                            <Sparkles className="inline h-2.5 w-2.5 mr-0.5" />
                            AI: {categoryLabelMap[task.suggestedCategory] || task.suggestedCategory}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <div className="text-xs">
                            <div className="font-medium">AI suggests: {categoryLabelMap[task.suggestedCategory] || task.suggestedCategory}</div>
                            {task.suggestionReasoning && <div className="mt-1">{task.suggestionReasoning}</div>}
                            {task.suggestionConfidence != null && <div className="mt-1 opacity-70">Confidence: {task.suggestionConfidence}%</div>}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${catColor}`}>
                      <CatIcon className="inline h-2.5 w-2.5 mr-0.5" />
                      {catLabel}
                    </Badge>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${sConfig.color}`}>
                      {sConfig.label}
                    </Badge>
                    {task.isOverdue && (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    )}
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* AI Analysis */}
      {e.isProcessed && (
        <Card className="border-teal-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bot className="w-4 h-4 text-teal-500" />
              AI Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {e.aiSummary && (
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Summary</span>
                <p className="text-sm text-foreground mt-1">{e.aiSummary}</p>
              </div>
            )}

            {analysis?.suggestedAction && (
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Suggested Action</span>
                <p className="text-sm text-[#6366f1] mt-1 font-medium">{analysis.suggestedAction}</p>
              </div>
            )}

            {analysis?.invoiceData && (
              <div className="space-y-2">
                {/* PBS / Faktura Type Badge */}
                <div className="flex items-center gap-2">
                  {(() => {
                    const action = (analysis.invoiceData.action || "").toUpperCase();
                    const isPbs = action.includes("PBS") || e.subject?.toUpperCase().includes("PBS") || e.subject?.toUpperCase().includes("BETALINGSSERVICE");
                    return (
                      <Badge variant="outline" className={`text-xs font-bold ${
                        isPbs
                          ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                          : "bg-orange-500/20 text-orange-400 border-orange-500/30"
                      }`}>
                        {isPbs ? "PBS — Automatic Payment" : "Faktura — Manual Payment Required"}
                      </Badge>
                    );
                  })()}
                </div>
                <div className="grid grid-cols-2 gap-3 p-3 rounded-md bg-[#eef2ff] border border-[#e0e7ff]">
                  <div>
                    <span className="text-xs text-muted-foreground">Vendor</span>
                    <p className="text-sm font-medium">{analysis.invoiceData.vendor}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Amount</span>
                    <p className="text-sm font-medium">{analysis.invoiceData.amount}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Due Date</span>
                    <p className="text-sm font-medium">{analysis.invoiceData.dueDate}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Invoice #</span>
                    <p className="text-sm font-medium">{analysis.invoiceData.invoiceNumber}</p>
                  </div>
                  {analysis.invoiceData.action && (
                    <div className="col-span-2">
                      <span className="text-xs text-muted-foreground">Action</span>
                      <p className="text-sm font-medium">{analysis.invoiceData.action}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {analysis?.taskData && (
              <div className="p-3 rounded-md bg-teal-500/5 border border-teal-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <CheckSquare className="w-3.5 h-3.5 text-teal-500" />
                  <span className="text-sm font-medium">{analysis.taskData.title}</span>
                  <Badge variant="outline" className="text-[10px] ml-auto">
                    {analysis.taskData.priority}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{analysis.taskData.description}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Draft Reply Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Send className="w-4 h-4" />
            Reply
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Existing pending draft */}
          {pendingDraft ? (
            <div className="space-y-3">
              <div className="p-3 rounded-md bg-card border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Bot className="w-3.5 h-3.5 text-teal-500" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">AI Draft</span>
                  <Badge variant="outline" className="text-[10px] ml-auto bg-amber-500/10 text-amber-500 border-amber-500/20">
                    Pending Approval
                  </Badge>
                </div>
                <Textarea
                  value={draftBody || pendingDraft.body}
                  onChange={(ev) => setDraftBody(ev.target.value)}
                  rows={6}
                  className="mt-2"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="bg-[#6366f1] hover:bg-[#4f46e5] text-white"
                  onClick={() => {
                    if (draftBody && draftBody !== pendingDraft.body) {
                      updateDraft.mutate({ draftId: pendingDraft.id, body: draftBody });
                    }
                    sendDraft.mutate({ draftId: pendingDraft.id });
                  }}
                  disabled={sendDraft.isPending}
                >
                  {sendDraft.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                  Approve & Send
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (draftBody && draftBody !== pendingDraft.body) {
                      updateDraft.mutate({ draftId: pendingDraft.id, body: draftBody });
                    }
                  }}
                  disabled={updateDraft.isPending}
                >
                  Save Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => generateDraft.mutate({ emailId: e.id, instructions })}
                  disabled={generateDraft.isPending}
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" /> Regenerate
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => rejectDraft.mutate({ draftId: pendingDraft.id })}
                  disabled={rejectDraft.isPending}
                >
                  <X className="w-3.5 h-3.5 mr-1" /> Reject
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {showInstructions && (
                <Textarea
                  placeholder="Optional: Add instructions for the AI (e.g., 'Be more formal', 'Mention the deadline')"
                  value={instructions}
                  onChange={(ev) => setInstructions(ev.target.value)}
                  rows={2}
                />
              )}
              <div className="flex gap-2">
                <Button
                  onClick={() => generateDraft.mutate({ emailId: e.id, instructions: instructions || undefined })}
                  disabled={generateDraft.isPending}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {generateDraft.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bot className="w-4 h-4 mr-2" />}
                  Generate AI Reply
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowInstructions(!showInstructions)}>
                  {showInstructions ? "Hide" : "Add"} Instructions
                </Button>
              </div>
            </div>
          )}

          {/* Sent drafts history */}
          {e.drafts?.filter((d: any) => d.status === "sent").length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sent Replies</span>
              {e.drafts.filter((d: any) => d.status === "sent").map((d: any) => (
                <div key={d.id} className="mt-2 p-3 rounded-md bg-green-500/5 border border-green-500/10">
                  <div className="flex items-center gap-2 mb-1">
                    <Check className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-green-500">Sent {d.sentAt ? format(new Date(d.sentAt), "MMM d, HH:mm") : ""}</span>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{d.body}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
