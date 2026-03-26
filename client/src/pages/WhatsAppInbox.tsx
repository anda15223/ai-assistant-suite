import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, MessageCircle, AlertTriangle, HelpCircle, Info, ArrowUpRight } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useMemo } from "react";

const classificationConfig: Record<string, { label: string; color: string; icon: typeof AlertTriangle }> = {
  problem: { label: "Problem", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: AlertTriangle },
  question: { label: "Question", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: HelpCircle },
  update: { label: "Update", color: "bg-teal-500/20 text-teal-400 border-teal-500/30", icon: Info },
  request: { label: "Request", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: ArrowUpRight },
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
        <Loader2 className="animate-spin h-8 w-8 text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">WhatsApp Inbox</h1>
        <p className="text-muted-foreground mt-1">Messages from your employees</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
          className={filter === "all" ? "bg-amber-500 hover:bg-amber-600 text-black" : ""}
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
              className={filter === key ? "bg-amber-500 hover:bg-amber-600 text-black" : ""}
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
                className="bg-card border-border hover:border-amber-500/50 transition-colors cursor-pointer"
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
                      <div className="h-2 w-2 rounded-full bg-amber-500 flex-shrink-0 mt-2" />
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
