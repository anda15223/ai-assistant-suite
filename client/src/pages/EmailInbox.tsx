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
  invoice: { label: "Invoice", color: "bg-amber-500/10 text-amber-500 border-amber-500/20", icon: FileText },
  task: { label: "Task", color: "bg-teal-500/10 text-teal-500 border-teal-500/20", icon: CheckSquare },
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
          <h1 className="text-2xl font-bold tracking-tight">Email Inbox</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Every email is either an <strong className="text-amber-500">Invoice</strong> or a <strong className="text-teal-500">Task</strong>
          </p>
        </div>
        <Button onClick={handleSync} disabled={syncing} className="bg-amber-500 hover:bg-amber-600 text-black">
          {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          {syncing ? "Syncing..." : "Sync Emails"}
        </Button>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search emails..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {filters.map(f => (
            <Button
              key={f.key}
              variant={filter === f.key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f.key)}
              className={filter === f.key ? "bg-amber-500 hover:bg-amber-600 text-black" : ""}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Email list */}
      {emailList.isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredEmails.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="font-semibold text-foreground mb-1">No emails found</h3>
            <p className="text-sm text-muted-foreground">
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
                className={`cursor-pointer hover:border-amber-500/30 transition-all ${!email.isRead ? "border-l-2 border-l-amber-500" : ""}`}
                onClick={() => navigate(`/emails/${email.id}`)}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${cls === "invoice" ? "bg-amber-500/10" : "bg-teal-500/10"}`}>
                      <IconComp className={`w-4 h-4 ${cls === "invoice" ? "text-amber-500" : "text-teal-500"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-sm font-medium truncate ${!email.isRead ? "text-foreground" : "text-muted-foreground"}`}>
                          {email.fromName || email.fromAddress}
                        </span>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${config.color}`}>
                          {config.label}
                        </Badge>
                        <span className="ml-auto text-xs text-muted-foreground shrink-0">
                          {email.receivedAt ? format(new Date(email.receivedAt), "MMM d, HH:mm") : ""}
                        </span>
                      </div>
                      <p className={`text-sm truncate ${!email.isRead ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                        {email.subject || "(No Subject)"}
                      </p>
                      {email.aiSummary && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
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
