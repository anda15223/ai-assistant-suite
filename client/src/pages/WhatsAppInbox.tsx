import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, MessageCircle, AlertTriangle, HelpCircle, Info, ArrowUpRight } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useMemo } from "react";

const classificationConfig: Record<string, { label: string; color: string; icon: typeof AlertTriangle }> = {
  problem: { label: "Problem", color: "bg-red-50 text-red-600 border-red-200", icon: AlertTriangle },
  question: { label: "Question", color: "bg-blue-50 text-blue-600 border-blue-200", icon: HelpCircle },
  update: { label: "Update", color: "bg-teal-50 text-teal-600 border-teal-200", icon: Info },
  request: { label: "Request", color: "bg-orange-100 text-orange-600 border-orange-200", icon: ArrowUpRight },
};

export default function WhatsAppInbox() {
  const [, navigate] = useLocation();
  const { data: messages, isLoading } = trpc.whatsapp.messages.useQuery();
  const [filter, setFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    if (!messages) return [];
    if (filter === "all") return messages;
    return messages.filter((m: any) => m.classification === filter);
  }, [messages, filter]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-[#6366f1]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#111827]">WhatsApp Inbox</h1>
        <p className="text-[#6b7280] text-sm mt-1">Messages from your employees</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
          className={filter === "all" ? "bg-[#6366f1] hover:bg-[#4f46e5] text-white" : "border-[#e5e7eb] text-[#6b7280]"}
        >
          All ({messages?.length || 0})
        </Button>
        {Object.entries(classificationConfig).map(([key, config]) => {
          const count = messages?.filter((m: any) => m.classification === key).length || 0;
          return (
            <Button
              key={key}
              variant={filter === key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(key)}
              className={filter === key ? "bg-[#6366f1] hover:bg-[#4f46e5] text-white" : "border-[#e5e7eb] text-[#6b7280]"}
            >
              {config.label} ({count})
            </Button>
          );
        })}
      </div>

      {/* Messages list */}
      {filtered.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              {messages?.length === 0
                ? "No WhatsApp messages yet. Messages will appear here once your WhatsApp webhook is connected."
                : "No messages match this filter."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((msg: any) => {
            const config = classificationConfig[msg.classification] || classificationConfig.request;
            const Icon = config.icon;
            return (
              <Card
                key={msg.id}
                className="bg-card border-border hover:border-[#6366f1]/30 transition-colors cursor-pointer"
                onClick={() => navigate(`/whatsapp/${msg.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-foreground">{msg.senderName || "Unknown"}</span>
                        <span className="text-xs text-muted-foreground">{msg.senderPhone}</span>
                        <Badge variant="outline" className={`text-xs ${config.color}`}>
                          <Icon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {msg.aiSummary || msg.messageText || "No content"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {msg.receivedAt ? new Date(msg.receivedAt).toLocaleString() : "Unknown time"}
                      </p>
                    </div>
                    {!msg.isProcessed && (
                      <div className="h-2 w-2 rounded-full bg-[#6366f1] flex-shrink-0 mt-2" />
                    )}
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
