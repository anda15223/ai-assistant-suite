import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, CheckSquare, FileText, Clock, AlertTriangle, RefreshCw, ArrowRight, Loader2, History, RotateCcw, CheckCircle, XCircle, BarChart3, MessageCircle, Archive, Trash2 } from "lucide-react";
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
  const autoArchiveStats = trpc.task.autoArchiveStats.useQuery();

  const syncEmails = trpc.email.sync.useMutation({
    onSuccess: (data) => {
      toast.success(`Synced ${data.synced} new emails (${data.total} checked). AI is classifying them!`);
      refetchAll();
    },
    onError: (err) => toast.error(err.message),
  });

  const classifyBatch = trpc.email.classifyBatch.useMutation({
    onSuccess: (data) => {
      if (data.remaining > 0) {
        setBatchProgress(prev => ({ ...prev, processed: prev.processed + data.classified, failed: prev.failed + data.failed, remaining: data.remaining }));
        toast.info(`Batch done: ${data.classified} classified. ${data.remaining} remaining...`);
        setTimeout(() => {
          classifyBatch.mutate();
        }, 1500);
      } else {
        setBatchProgress({ processing: false, processed: 0, failed: 0, remaining: 0 });
        setReclassifying(false);
        toast.success(`All emails classified! ${data.classified} in this batch.`);
        refetchAll();
      }
    },
    onError: (err) => {
      setBatchProgress(prev => ({ ...prev, processing: false }));
      setReclassifying(false);
      toast.error(`Batch failed: ${err.message}. You can retry — it will continue from where it stopped.`);
      refetchAll();
    },
  });

  const missingCount = trpc.email.missingTaskCount.useQuery();

  const refetchAll = () => {
    emailStats.refetch();
    taskStats.refetch();
    pendingDrafts.refetch();
    accounting.refetch();
    waStats.refetch();
    waAccounting.refetch();
    waPendingDrafts.refetch();
    autoArchiveStats.refetch();
  };

  const [syncing, setSyncing] = useState(false);
  const [syncType, setSyncType] = useState<"regular" | "full">("regular");
  const [reclassifying, setReclassifying] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ processing: false, processed: 0, failed: 0, remaining: 0 });
  const [autoArchiving, setAutoArchiving] = useState(false);

  const autoArchiveRun = trpc.task.autoArchiveRun.useMutation({
    onSuccess: (data) => {
      toast.success(`Auto-archived ${data.archived} stale tasks`);
      refetchAll();
      setAutoArchiving(false);
    },
    onError: (err) => {
      toast.error(err.message);
      setAutoArchiving(false);
    },
  });

  const handleSync = async (fullResync: boolean = false) => {
    setSyncing(true);
    setSyncType(fullResync ? "full" : "regular");
    try {
      await syncEmails.mutateAsync({ fullResync });
    } finally {
      setSyncing(false);
    }
  };

  const handleClassifyMissing = () => {
    const missing = missingCount.data?.missing ?? 0;
    if (missing === 0) {
      toast.info("All emails already have tasks!");
      return;
    }
    setReclassifying(true);
    setBatchProgress({ processing: true, processed: 0, failed: 0, remaining: missing });
    classifyBatch.mutate();
  };

  const handleStopBatch = () => {
    setReclassifying(false);
    setBatchProgress(prev => ({ ...prev, processing: false }));
    toast.info("Stopped batch processing. You can resume anytime — it picks up where it left off.");
    refetchAll();
  };

  const hasAccount = !!account.data;
  const acct = accounting.data;
  const waAcc = waAccounting.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#111827]">Dashboard</h1>
          <p className="text-[#6b7280] text-sm mt-1">
            Your AI-powered email, WhatsApp, and task management overview
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {hasAccount ? (
            <>
              <Button
                onClick={() => handleSync(false)}
                disabled={syncing || reclassifying}
                className="bg-[#6366f1] hover:bg-[#4f46e5] text-white"
              >
                {syncing && syncType === "regular" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                {syncing && syncType === "regular" ? "Syncing..." : "Sync New"}
              </Button>
              <Button
                onClick={() => handleSync(true)}
                disabled={syncing || reclassifying}
                variant="outline"
                className="border-[#6366f1]/30 text-[#6366f1] hover:bg-[#eef2ff]"
              >
                {syncing && syncType === "full" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <History className="w-4 h-4 mr-2" />}
                {syncing && syncType === "full" ? "Full sync..." : "Full Resync (since Mar 1)"}
              </Button>
            </>
          ) : (
            <Button onClick={() => navigate("/settings")} variant="outline" className="border-[#e5e7eb]">
              Configure Email Account
            </Button>
          )}
        </div>
      </div>

      {/* Setup prompt if no account */}
      {!hasAccount && !account.isLoading && (
        <Card className="border-[#fde68a] bg-[#fffbeb]">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#fef3c7] border border-[#fde68a] flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-[#d97706]" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[#111827] mb-1">Email Account Required</h3>
                <p className="text-sm text-[#6b7280] mb-3">
                  Connect your one.com email account to start using the AI email assistant.
                </p>
                <Button onClick={() => navigate("/settings")} size="sm" className="bg-[#6366f1] hover:bg-[#4f46e5] text-white">
                  Go to Settings <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* EMAIL ACCOUNTING SUMMARY */}
      {acct && acct.totalEmails > 0 && (
        <Card className={`border-2 ${acct.matched ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3 mb-4">
              <Mail className={`w-5 h-5 ${acct.matched ? "text-green-600" : "text-red-500"}`} />
              <h3 className="font-semibold text-lg text-[#111827]">Email-to-Task Accounting</h3>
              {acct.matched ? (
                <span className="flex items-center gap-1 text-green-600 text-sm font-medium ml-auto">
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
                <div className="text-2xl font-bold text-[#111827]">{acct.totalEmails}</div>
                <div className="text-xs text-[#6b7280] mt-1">Total Emails</div>
              </div>
              <div className="text-center text-[#9ca3af] text-2xl font-bold">=</div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#6366f1]">{acct.invoiceTasks}</div>
                <div className="text-xs text-[#6b7280] mt-1">Invoice Tasks</div>
              </div>
              <div className="text-center text-[#9ca3af] text-2xl font-bold">+</div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#0ea5e9]">{acct.regularTasks}</div>
                <div className="text-xs text-[#6b7280] mt-1">Regular Tasks</div>
              </div>
            </div>
            <div className="mt-3 text-center text-xs text-[#6b7280]">
              Total Tasks: <strong className="text-[#111827]">{acct.totalTasks}</strong>
              {!acct.matched && (
                <span className="text-red-500 ml-2">
                  ({acct.totalEmails - acct.totalTasks > 0 ? `${acct.totalEmails - acct.totalTasks} emails missing tasks` : `${acct.totalTasks - acct.totalEmails} extra tasks`})
                </span>
              )}
            </div>
            {!acct.matched && hasAccount && (
              <div className="mt-4 space-y-3">
                {reclassifying && batchProgress.processing ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#6366f1] flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing emails in batches of 5...
                      </span>
                      <span className="text-[#6b7280]">
                        {batchProgress.processed} done / {batchProgress.remaining} remaining
                      </span>
                    </div>
                    <div className="w-full bg-[#e5e7eb] rounded-full h-2">
                      <div
                        className="bg-[#6366f1] h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, ((batchProgress.processed) / (batchProgress.processed + batchProgress.remaining)) * 100)}%` }}
                      />
                    </div>
                    {batchProgress.failed > 0 && (
                      <p className="text-xs text-red-500">{batchProgress.failed} failed (fallback tasks created)</p>
                    )}
                    <div className="flex justify-center">
                      <Button onClick={handleStopBatch} variant="outline" size="sm" className="border-red-200 text-red-500 hover:bg-red-50">
                        Stop Processing
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <Button
                      onClick={handleClassifyMissing}
                      disabled={reclassifying || syncing}
                      className="bg-red-500 hover:bg-red-600 text-white"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Fix: Classify {missingCount.data?.missing ?? (acct.totalEmails - acct.totalTasks)} Missing Emails (5 at a time)
                    </Button>
                  </div>
                )}
              </div>
            )}
            {acct.matched && hasAccount && (
              <div className="mt-3 flex justify-center">
                <span className="text-xs text-green-600">All emails have tasks — accounting is balanced</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* WHATSAPP ACCOUNTING SUMMARY */}
      {waAcc && waAcc.totalMessages > 0 && (
        <Card className={`border-2 ${waAcc.matched ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3 mb-4">
              <MessageCircle className={`w-5 h-5 ${waAcc.matched ? "text-green-600" : "text-red-500"}`} />
              <h3 className="font-semibold text-lg text-[#111827]">WhatsApp Message-to-Task Accounting</h3>
              {waAcc.matched ? (
                <span className="flex items-center gap-1 text-green-600 text-sm font-medium ml-auto">
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
                <div className="text-2xl font-bold text-[#111827]">{waAcc.totalMessages}</div>
                <div className="text-xs text-[#6b7280] mt-1">Total Messages</div>
              </div>
              <div className="text-center text-[#9ca3af] text-2xl font-bold">=</div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-500">{waStats.data?.problems ?? 0}</div>
                <div className="text-xs text-[#6b7280] mt-1">Problems</div>
              </div>
              <div className="text-center text-[#9ca3af] text-2xl font-bold">+</div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">{waStats.data?.questions ?? 0}</div>
                <div className="text-xs text-[#6b7280] mt-1">Questions</div>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-3">
              <div className="text-center">
                <div className="text-xl font-bold text-[#0ea5e9]">{waStats.data?.updates ?? 0}</div>
                <div className="text-xs text-[#6b7280] mt-1">Updates</div>
              </div>
              <div className="text-center text-[#9ca3af] text-xl font-bold">+</div>
              <div className="text-center">
                <div className="text-xl font-bold text-[#6366f1]">{waStats.data?.requests ?? 0}</div>
                <div className="text-xs text-[#6b7280] mt-1">Requests</div>
              </div>
            </div>
            <div className="mt-3 text-center text-xs text-[#6b7280]">
              Total Tasks from WhatsApp: <strong className="text-[#111827]">{waAcc.totalTasks}</strong>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer border-[#e5e7eb] hover:border-[#6366f1]/30 hover:shadow-md transition-all" onClick={() => navigate("/emails")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#6b7280]">Total Emails</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-[#eef2ff] flex items-center justify-center">
              <Mail className="w-4 h-4 text-[#6366f1]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#111827]">{emailStats.data?.total ?? "—"}</div>
            <p className="text-xs text-[#6b7280] mt-1">
              {emailStats.data?.unread ?? 0} unread
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer border-[#e5e7eb] hover:border-green-300 hover:shadow-md transition-all" onClick={() => navigate("/whatsapp")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#6b7280]">WhatsApp Messages</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#111827]">{waStats.data?.total ?? "—"}</div>
            <p className="text-xs text-[#6b7280] mt-1">
              {waStats.data?.problems ?? 0} problems, {waStats.data?.questions ?? 0} questions
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer border-[#e5e7eb] hover:border-[#6366f1]/30 hover:shadow-md transition-all" onClick={() => navigate("/tasks")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#6b7280]">Active Tasks</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-[#eef2ff] flex items-center justify-center">
              <CheckSquare className="w-4 h-4 text-[#6366f1]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#111827]">{taskStats.data?.pending ?? "—"}</div>
            <p className="text-xs text-[#6b7280] mt-1">
              {taskStats.data?.inProgress ?? 0} in progress
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer border-[#e5e7eb] hover:border-orange-300 hover:shadow-md transition-all" onClick={() => navigate("/emails")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#6b7280]">Pending Approvals</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
              <Clock className="w-4 h-4 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#111827]">{(pendingDrafts.data?.length ?? 0) + (waPendingDrafts.data?.length ?? 0)}</div>
            <p className="text-xs text-[#6b7280] mt-1">
              {pendingDrafts.data?.length ?? 0} email, {waPendingDrafts.data?.length ?? 0} WhatsApp
            </p>
          </CardContent>
        </Card>
      </div>

      {/* AUTO-ARCHIVE CARD */}
      {(autoArchiveStats.data?.candidates ?? 0) > 0 && (
        <Card className="border-2 border-orange-200 bg-orange-50">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3 mb-3">
              <Archive className="w-5 h-5 text-orange-500" />
              <h3 className="font-semibold text-lg text-[#111827]">Auto-Archive</h3>
              <span className="text-xs text-[#6b7280] ml-auto">30-day inactivity rule</span>
            </div>
            <div className="flex items-center gap-6">
              <div>
                <div className="text-3xl font-bold text-orange-500">{autoArchiveStats.data?.candidates ?? 0}</div>
                <div className="text-xs text-[#6b7280] mt-1">Tasks ready to dismiss</div>
              </div>
              <div>
                <div className="text-xl font-bold text-[#9ca3af]">{autoArchiveStats.data?.alreadyArchived ?? 0}</div>
                <div className="text-xs text-[#6b7280] mt-1">Previously auto-archived</div>
              </div>
              <div className="ml-auto">
                <Button
                  onClick={() => {
                    setAutoArchiving(true);
                    autoArchiveRun.mutate();
                  }}
                  disabled={autoArchiving || syncing || reclassifying}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                >
                  {autoArchiving ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Archiving...</>
                  ) : (
                    <><Trash2 className="w-4 h-4 mr-2" />Dismiss Stale Tasks</>
                  )}
                </Button>
              </div>
            </div>
            <p className="text-xs text-[#6b7280] mt-3">
              These tasks are in the Archive quadrant and have had no activity for 30+ days. Dismissing them removes them from active views.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Station Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-[#e5e7eb] hover:border-[#6366f1]/20 transition-colors">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-2 h-2 rounded-full bg-[#6366f1] animate-pulse" />
              <span className="text-[10px] uppercase tracking-wider text-[#9ca3af] font-medium">Station Alpha</span>
            </div>
            <h3 className="font-semibold text-[#111827] mb-1">Festival Architect</h3>
            <p className="text-xs text-[#6b7280]">Active — festival planning, logistics tracking, and command centre.</p>
          </CardContent>
        </Card>

        <Card className={`border-[#e5e7eb] ${hasAccount ? "hover:border-green-300" : "hover:border-[#6366f1]/20"} transition-colors`}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-2 h-2 rounded-full ${hasAccount ? "bg-green-500 animate-pulse" : "bg-[#6366f1]"}`} />
              <span className="text-[10px] uppercase tracking-wider text-[#9ca3af] font-medium">Station Beta</span>
            </div>
            <h3 className="font-semibold text-[#111827] mb-1">Inbox Intelligence</h3>
            <p className="text-xs text-[#6b7280]">
              {hasAccount ? "Active — reading, classifying, and managing your emails." : "Waiting for email account configuration."}
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#e5e7eb] hover:border-green-300 transition-colors">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] uppercase tracking-wider text-[#9ca3af] font-medium">Station Gamma</span>
            </div>
            <h3 className="font-semibold text-[#111827] mb-1">Workforce Concierge</h3>
            <p className="text-xs text-[#6b7280]">Active — WhatsApp employee communication and task extraction.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
