import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft, Check, X, Send, AlertTriangle, HelpCircle, Info, ArrowUpRight } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

const classificationConfig: Record<string, { label: string; color: string; icon: typeof AlertTriangle }> = {
  problem: { label: "Problem", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: AlertTriangle },
  question: { label: "Question", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: HelpCircle },
  update: { label: "Update", color: "bg-teal-500/20 text-teal-400 border-teal-500/30", icon: Info },
  request: { label: "Request", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: ArrowUpRight },
};

export default function WhatsAppDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const messageId = parseInt(params.id || "0");

  const { data, isLoading, refetch } = trpc.whatsapp.getMessage.useQuery({ id: messageId });
  const approveMut = trpc.whatsapp.approveDraft.useMutation({
    onSuccess: () => { toast.success("Draft approved"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const rejectMut = trpc.whatsapp.rejectDraft.useMutation({
    onSuccess: () => { toast.success("Draft rejected"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const sendMut = trpc.whatsapp.sendDraft.useMutation({
    onSuccess: () => { toast.success("Reply sent via WhatsApp!"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.whatsapp.updateDraft.useMutation({
    onSuccess: () => { toast.success("Draft updated"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const [editingDraftId, setEditingDraftId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-[#6366f1]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Message not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/whatsapp")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Inbox
        </Button>
      </div>
    );
  }

  const config = classificationConfig[data.classification || "request"] || classificationConfig.request;
  const Icon = config.icon;
  const analysis = data.aiAnalysis as any;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/whatsapp")}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Inbox
      </Button>

      {/* Message header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">{data.senderName || "Unknown"}</h1>
          <p className="text-sm text-muted-foreground">{data.senderPhone}</p>
        </div>
        <Badge variant="outline" className={config.color}>
          <Icon className="h-3 w-3 mr-1" />
          {config.label}
        </Badge>
      </div>

      {/* Message content */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">
            {data.receivedAt ? new Date(data.receivedAt).toLocaleString() : "Unknown time"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground whitespace-pre-wrap">{data.messageText}</p>
        </CardContent>
      </Card>

      {/* AI Analysis */}
      {data.aiSummary && (
        <Card className="bg-card border-[#6366f1]/30">
          <CardHeader>
            <CardTitle className="text-[#6366f1] text-sm">AI Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-foreground">{data.aiSummary}</p>
            {analysis?.suggestedAction && (
              <div className="bg-[#eef2ff] rounded-lg p-3 border border-[#e0e7ff]">
                <p className="text-xs text-[#6366f1] font-semibold mb-1">Suggested Action:</p>
                <p className="text-sm text-foreground">{analysis.suggestedAction}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Draft Replies */}
      {data.drafts && data.drafts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Draft Replies</h2>
          {data.drafts.map((draft: any) => (
            <Card key={draft.id} className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm">
                  To: {draft.toPhone}
                </CardTitle>
                <Badge variant="outline" className={
                  draft.status === "pending" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                  draft.status === "approved" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                  draft.status === "sent" ? "bg-teal-500/20 text-teal-400 border-teal-500/30" :
                  "bg-red-500/20 text-red-400 border-red-500/30"
                }>
                  {draft.status}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                {editingDraftId === draft.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={4}
                      className="bg-background"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          updateMut.mutate({ draftId: draft.id, replyText: editText });
                          setEditingDraftId(null);
                        }}
                        className="bg-[#6366f1] hover:bg-[#4f46e5] text-white"
                      >
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingDraftId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-foreground whitespace-pre-wrap">{draft.replyText}</p>
                )}

                {draft.status === "pending" && editingDraftId !== draft.id && (
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      onClick={() => approveMut.mutate({ draftId: draft.id })}
                      disabled={approveMut.isPending}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Check className="h-4 w-4 mr-1" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => rejectMut.mutate({ draftId: draft.id })}
                      disabled={rejectMut.isPending}
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >
                      <X className="h-4 w-4 mr-1" /> Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setEditingDraftId(draft.id); setEditText(draft.replyText); }}
                    >
                      Edit
                    </Button>
                  </div>
                )}

                {draft.status === "approved" && (
                  <Button
                    size="sm"
                    onClick={() => sendMut.mutate({ draftId: draft.id })}
                    disabled={sendMut.isPending}
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    {sendMut.isPending ? <Loader2 className="animate-spin h-4 w-4 mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                    Send via WhatsApp
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
