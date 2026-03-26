import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, CheckSquare, FileText, Clock, AlertTriangle, RefreshCw, ArrowRight, Loader2, History, RotateCcw, CheckCircle, XCircle, BarChart3, MessageCircle } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useState } from "react";

export default function Dashboard() {
  const [, navigate] = useLocation();
  const emailStats = trpc.email.stats.useQuery();
  const taskStats = trpc.task.stats.useQuery();
  const pendingDrafts = trpc.draft.pending.useQuery();
  const account = trpc.emailAccount.get.useQuery();
  const accounting = trpc.email.accounting.useQuery();
  const waStats = trpc.whatsapp.stats.useQuery();
  const waAccounting = trpc.whatsapp.accounting.useQuery();
  const waPendingDrafts = trpc.whatsapp.pendingDrafts.useQuery();

  const syncEmails = trpc.email.sync.useMutation({
    onSuccess: (data) => {
      toast.success(`Synced ${data.synced} new emails (${data.total} checked). AI is classifying them!`);
      refetchAll();
    },
    onError: (err) => toast.error(err.message),
  });

  const reclassify = trpc.email.reclassifyAll.useMutation({
    onSuccess: (data) => {
      toast.success(`Reclassified ${data.classified} emails. ${data.failed} failed. Total: ${data.total}`);
      refetchAll();
    },
    onError: (err) => toast.error(err.message),
  });

  const refetchAll = () => {
    emailStats.refetch();
    taskStats.refetch();
    pendingDrafts.refetch();
    accounting.refetch();
    waStats.refetch();
    waAccounting.refetch();
    waPendingDrafts.refetch();
  };

  const [syncing, setSyncing] = useState(false);
  const [syncType, setSyncType] = useState<"regular" | "full">("regular");
  const [reclassifying, setReclassifying] = useState(false);

  const handleSync = async (fullResync: boolean = false) => {
    setSyncing(true);
    setSyncType(fullResync ? "full" : "regular");
    try {
      await syncEmails.mutateAsync({ fullResync });
    } finally {
      setSyncing(false);
    }
  };

  const handleReclassify = async () => {
    setReclassifying(true);
    try {
      await reclassify.mutateAsync();
    } finally {
      setReclassifying(false);
    }
  };

  const hasAccount = !!account.data;
  const acct = accounting.data;
  const waAcc = waAccounting.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Command Center</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Your AI-powered email, WhatsApp, and task management dashboard
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {hasAccount ? (
            <>
              <Button
                onClick={() => handleSync(false)}
                disabled={syncing || reclassifying}
                className="bg-amber-500 hover:bg-amber-600 text-black"
              >
                {syncing && syncType === "regular" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                {syncing && syncType === "regular" ? "Syncing..." : "Sync New"}
              </Button>
              <Button
                onClick={() => handleSync(true)}
                disabled={syncing || reclassifying}
                variant="outline"
                className="border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
              >
                {syncing && syncType === "full" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <History className="w-4 h-4 mr-2" />}
                {syncing && syncType === "full" ? "Full sync..." : "Full Resync (since Mar 1)"}
              </Button>
            </>
          ) : (
            <Button onClick={() => navigate("/settings")} variant="outline">
              Configure Email Account
            </Button>
          )}
        </div>
      </div>

      {/* Setup prompt if no account */}
      {!hasAccount && !account.isLoading && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">Email Account Required</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Connect your one.com email account to start using the AI email assistant.
                </p>
                <Button onClick={() => navigate("/settings")} size="sm" className="bg-amber-500 hover:bg-amber-600 text-black">
                  Go to Settings <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* EMAIL ACCOUNTING SUMMARY */}
      {acct && acct.totalEmails > 0 && (
        <Card className={`border-2 ${acct.matched ? "border-green-500/40 bg-green-500/5" : "border-red-500/40 bg-red-500/5"}`}>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3 mb-4">
              <Mail className={`w-5 h-5 ${acct.matched ? "text-green-500" : "text-red-500"}`} />
              <h3 className="font-bold text-lg">Email-to-Task Accounting</h3>
              {acct.matched ? (
                <span className="flex items-center gap-1 text-green-500 text-sm font-medium ml-auto">
                  <CheckCircle className="w-4 h-4" /> Balanced
                </span>
              ) : (
                <span className="flex items-center gap-1 text-red-500 text-sm font-medium ml-auto">
                  <XCircle className="w-4 h-4" /> Mismatch
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{acct.totalEmails}</div>
                <div className="text-xs text-muted-foreground mt-1">Total Emails</div>
              </div>
              <div className="text-center text-muted-foreground text-2xl font-bold">=</div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-500">{acct.invoiceTasks}</div>
                <div className="text-xs text-muted-foreground mt-1">Invoice Tasks</div>
              </div>
              <div className="text-center text-muted-foreground text-2xl font-bold">+</div>
              <div className="text-center">
                <div className="text-2xl font-bold text-teal-500">{acct.regularTasks}</div>
                <div className="text-xs text-muted-foreground mt-1">Regular Tasks</div>
              </div>
            </div>
            <div className="mt-3 text-center text-xs text-muted-foreground">
              Total Tasks: <strong className="text-foreground">{acct.totalTasks}</strong>
              {!acct.matched && (
                <span className="text-red-400 ml-2">
                  ({acct.totalEmails - acct.totalTasks > 0 ? `${acct.totalEmails - acct.totalTasks} emails missing tasks` : `${acct.totalTasks - acct.totalEmails} extra tasks`})
                </span>
              )}
            </div>
            {!acct.matched && hasAccount && (
              <div className="mt-4 flex justify-center">
                <Button
                  onClick={handleReclassify}
                  disabled={reclassifying || syncing}
                  className="bg-red-500 hover:bg-red-600 text-white"
                >
                  {reclassifying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                  {reclassifying ? "Reclassifying all emails (may take 5-10 min)..." : "Fix: Reclassify All Emails"}
                </Button>
              </div>
            )}
            {acct.matched && hasAccount && (
              <div className="mt-4 flex justify-center">
                <Button
                  onClick={handleReclassify}
                  disabled={reclassifying || syncing}
                  variant="outline"
                  size="sm"
                  className="border-green-500/30 text-green-500 hover:bg-green-500/10"
                >
                  {reclassifying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                  {reclassifying ? "Reclassifying..." : "Re-run Classification"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* WHATSAPP ACCOUNTING SUMMARY */}
      {waAcc && waAcc.totalMessages > 0 && (
        <Card className={`border-2 ${waAcc.matched ? "border-green-500/40 bg-green-500/5" : "border-red-500/40 bg-red-500/5"}`}>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3 mb-4">
              <MessageCircle className={`w-5 h-5 ${waAcc.matched ? "text-green-500" : "text-red-500"}`} />
              <h3 className="font-bold text-lg">WhatsApp Message-to-Task Accounting</h3>
              {waAcc.matched ? (
                <span className="flex items-center gap-1 text-green-500 text-sm font-medium ml-auto">
                  <CheckCircle className="w-4 h-4" /> Balanced
                </span>
              ) : (
                <span className="flex items-center gap-1 text-red-500 text-sm font-medium ml-auto">
                  <XCircle className="w-4 h-4" /> Mismatch
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{waAcc.totalMessages}</div>
                <div className="text-xs text-muted-foreground mt-1">Total Messages</div>
              </div>
              <div className="text-center text-muted-foreground text-2xl font-bold">=</div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">{waStats.data?.problems ?? 0}</div>
                <div className="text-xs text-muted-foreground mt-1">Problems</div>
              </div>
              <div className="text-center text-muted-foreground text-2xl font-bold">+</div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{waStats.data?.questions ?? 0}</div>
                <div className="text-xs text-muted-foreground mt-1">Questions</div>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-3">
              <div className="text-center">
                <div className="text-xl font-bold text-teal-400">{waStats.data?.updates ?? 0}</div>
                <div className="text-xs text-muted-foreground mt-1">Updates</div>
              </div>
              <div className="text-center text-muted-foreground text-xl font-bold">+</div>
              <div className="text-center">
                <div className="text-xl font-bold text-amber-400">{waStats.data?.requests ?? 0}</div>
                <div className="text-xs text-muted-foreground mt-1">Requests</div>
              </div>
            </div>
            <div className="mt-3 text-center text-xs text-muted-foreground">
              Total Tasks from WhatsApp: <strong className="text-foreground">{waAcc.totalTasks}</strong>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:border-amber-500/30 transition-colors" onClick={() => navigate("/emails")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Emails</CardTitle>
            <Mail className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emailStats.data?.total ?? "—"}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {emailStats.data?.unread ?? 0} unread
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-amber-500/30 transition-colors" onClick={() => navigate("/whatsapp")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">WhatsApp Messages</CardTitle>
            <MessageCircle className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{waStats.data?.total ?? "—"}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {waStats.data?.problems ?? 0} problems, {waStats.data?.questions ?? 0} questions
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-amber-500/30 transition-colors" onClick={() => navigate("/tasks")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Tasks</CardTitle>
            <CheckSquare className="w-4 h-4 text-teal-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskStats.data?.pending ?? "—"}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {taskStats.data?.inProgress ?? 0} in progress
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-amber-500/30 transition-colors" onClick={() => navigate("/emails")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approvals</CardTitle>
            <Clock className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(pendingDrafts.data?.length ?? 0) + (waPendingDrafts.data?.length ?? 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {pendingDrafts.data?.length ?? 0} email, {waPendingDrafts.data?.length ?? 0} WhatsApp
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Station Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-teal-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Station Alpha</span>
            </div>
            <h3 className="font-semibold mb-1">Festival Architect</h3>
            <p className="text-xs text-muted-foreground">Coming soon — event planning and logistics automation.</p>
          </CardContent>
        </Card>

        <Card className={hasAccount ? "border-green-500/20" : "border-amber-500/20"}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-2 h-2 rounded-full ${hasAccount ? "bg-green-400 animate-pulse" : "bg-amber-400"}`} />
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Station Beta</span>
            </div>
            <h3 className="font-semibold mb-1">Inbox Intelligence</h3>
            <p className="text-xs text-muted-foreground">
              {hasAccount ? "Active — reading, classifying, and managing your emails." : "Waiting for email account configuration."}
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Station Gamma</span>
            </div>
            <h3 className="font-semibold mb-1">Workforce Concierge</h3>
            <p className="text-xs text-muted-foreground">Active — WhatsApp employee communication and task extraction. Connect your Meta Business API to start receiving messages.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
