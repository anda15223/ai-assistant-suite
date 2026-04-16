import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Loader2, Mail, FileText, CheckSquare, Search } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

const classificationConfig: Record<string, { label: string; color: string; icon: any }> = {
  invoice: { label: "Invoice", color: "bg-[#eef2ff] text-[#6366f1] border-[#e0e7ff]", icon: FileText },
  task: { label: "Task", color: "bg-[#ecfdf5] text-[#059669] border-[#a7f3d0]", icon: CheckSquare },
};

export default function EmailInbox() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const emailList = trpc.email.list.useQuery();
  const syncEmails = trpc.email.sync.useMutation({
    onSuccess: (data) => {
      toast.success(`Synced ${data.synced} new emails`);
      emailList.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const [syncing, setSyncing] = useState(false);
  const handleSync = async () => {
    setSyncing(true);
    try { await syncEmails.mutateAsync({}); } finally { setSyncing(false); }
  };

  const filteredEmails = useMemo(() => {
    if (!emailList.data) return [];
    let result = emailList.data;
    if (filter !== "all") {
      result = result.filter(e => e.classification === filter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        (e.subject?.toLowerCase().includes(q)) ||
        (e.fromName?.toLowerCase().includes(q)) ||
        (e.fromAddress?.toLowerCase().includes(q)) ||
        (e.aiSummary?.toLowerCase().includes(q))
      );
    }
    return result;
  }, [emailList.data, filter, search]);

  const filters = [
    { key: "all", label: "All" },
    { key: "invoice", label: "Invoices" },
    { key: "task", label: "Tasks" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#111827]">Email Inbox</h1>
          <p className="text-[#6b7280] text-sm mt-1">
            Every email is either an <strong className="text-[#6366f1]">Invoice</strong> or a <strong className="text-[#059669]">Task</strong>
          </p>
        </div>
        <Button onClick={handleSync} disabled={syncing} className="bg-[#6366f1] hover:bg-[#4f46e5] text-white">
          {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          {syncing ? "Syncing..." : "Sync Emails"}
        </Button>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
          <Input
            placeholder="Search emails..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 border-[#e5e7eb] focus:border-[#6366f1] focus:ring-[#6366f1]/20"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {filters.map(f => (
            <Button
              key={f.key}
              variant={filter === f.key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f.key)}
              className={filter === f.key ? "bg-[#6366f1] hover:bg-[#4f46e5] text-white" : "border-[#e5e7eb] text-[#6b7280] hover:bg-[#f8f9fc]"}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Email list */}
      {emailList.isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[#6366f1]" />
        </div>
      ) : filteredEmails.length === 0 ? (
        <Card className="border-[#e5e7eb]">
          <CardContent className="py-16 text-center">
            <Mail className="w-12 h-12 text-[#9ca3af] mx-auto mb-4 opacity-50" />
            <h3 className="font-semibold text-[#111827] mb-1">No emails found</h3>
            <p className="text-sm text-[#6b7280]">
              {emailList.data?.length === 0
                ? "Click 'Sync Emails' to fetch your latest emails."
                : "No emails match your current filter."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredEmails.map((email) => {
            const cls = email.classification === "invoice" ? "invoice" : "task";
            const config = classificationConfig[cls];
            const IconComp = config.icon;
            return (
              <Card
                key={email.id}
                className={`cursor-pointer border-[#e5e7eb] hover:border-[#6366f1]/30 hover:shadow-sm transition-all ${!email.isRead ? "border-l-2 border-l-[#6366f1]" : ""}`}
                onClick={() => navigate(`/emails/${email.id}`)}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${cls === "invoice" ? "bg-[#eef2ff]" : "bg-[#ecfdf5]"}`}>
                      <IconComp className={`w-4 h-4 ${cls === "invoice" ? "text-[#6366f1]" : "text-[#059669]"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-sm font-medium truncate ${!email.isRead ? "text-[#111827]" : "text-[#6b7280]"}`}>
                          {email.fromName || email.fromAddress}
                        </span>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${config.color}`}>
                          {config.label}
                        </Badge>
                        <span className="ml-auto text-xs text-[#9ca3af] shrink-0">
                          {email.receivedAt ? format(new Date(email.receivedAt), "MMM d, HH:mm") : ""}
                        </span>
                      </div>
                      <p className={`text-sm truncate ${!email.isRead ? "font-medium text-[#111827]" : "text-[#6b7280]"}`}>
                        {email.subject || "(No Subject)"}
                      </p>
                      {email.aiSummary && (
                        <p className="text-xs text-[#9ca3af] mt-1 line-clamp-1">
                          {email.aiSummary}
                        </p>
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
