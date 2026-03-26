import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Bot, Send, Check, X, RefreshCw, Loader2, FileText, CheckSquare, Clock, Mail } from "lucide-react";
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

export default function EmailDetail({ id }: { id: string }) {
  const [, navigate] = useLocation();
  const emailId = parseInt(id, 10);
  const email = trpc.email.get.useQuery({ id: emailId }, { enabled: !isNaN(emailId) });
  const [draftBody, setDraftBody] = useState("");
  const [instructions, setInstructions] = useState("");
  const [showInstructions, setShowInstructions] = useState(false);

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
        <p className="text-muted-foreground">Email not found</p>
        <Button variant="ghost" onClick={() => navigate("/emails")} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Inbox
        </Button>
      </div>
    );
  }

  const e = email.data;
  const config = classificationConfig[e.classification || "general"];
  const analysis = e.aiAnalysis as any;
  const pendingDraft = e.drafts?.find((d: any) => d.status === "pending");

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => navigate("/emails")}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Inbox
      </Button>

      {/* Email header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-foreground mb-2">{e.subject || "(No Subject)"}</h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{e.fromName || e.fromAddress}</span>
                {e.fromName && <span>&lt;{e.fromAddress}&gt;</span>}
                <span>·</span>
                <span>{e.receivedAt ? format(new Date(e.receivedAt), "MMM d, yyyy 'at' HH:mm") : ""}</span>
              </div>
            </div>
            {e.classification && (
              <Badge variant="outline" className={`${config?.color || ""} shrink-0`}>
                {config?.label}
              </Badge>
            )}
          </div>

          {/* Email body */}
          <div className="mt-4 pt-4 border-t border-border">
            <div className="prose prose-sm prose-invert max-w-none text-sm text-muted-foreground whitespace-pre-wrap">
              {e.body || "(No content)"}
            </div>
          </div>
        </CardContent>
      </Card>

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
                <p className="text-sm text-amber-500 mt-1 font-medium">{analysis.suggestedAction}</p>
              </div>
            )}

            {analysis?.invoiceData && (
              <div className="grid grid-cols-2 gap-3 p-3 rounded-md bg-amber-500/5 border border-amber-500/10">
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
                  onChange={(e) => setDraftBody(e.target.value)}
                  rows={6}
                  className="mt-2"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="bg-amber-500 hover:bg-amber-600 text-black"
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
                  onChange={(e) => setInstructions(e.target.value)}
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
