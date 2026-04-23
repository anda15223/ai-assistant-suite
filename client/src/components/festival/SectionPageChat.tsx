import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp, Loader2, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Section-page AI chat. Broader scope than SmartCardChat — can update any
 * scalar answer on this section, create festival action items tagged to it,
 * edit the SmartCard if the section has one, and mark SmartCard file
 * warnings as intentional.
 *
 * Unlike SmartCardChat, this chat is NOT persisted to the DB. History is
 * session-only so the AI keeps recent turns in mind but nothing leaks
 * between sessions / users.
 */

type ChatMsg = { role: "user" | "assistant"; content: string };

export function SectionPageChat({
  festivalId,
  sectionKey,
  sectionTitle,
}: {
  festivalId: number;
  sectionKey: string;
  sectionTitle: string;
}) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Reset history when navigating between sections
  useEffect(() => {
    setMessages([]);
  }, [festivalId, sectionKey]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = trpc.plan.section.chat.send.useMutation();

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sendMessage.isPending) return;
    setInput("");
    const prior = messages;
    const next: ChatMsg[] = [...prior, { role: "user", content: text }];
    setMessages(next);
    try {
      const result = await sendMessage.mutateAsync({
        festivalId,
        sectionKey,
        message: text,
        history: prior,
      });
      setMessages([...next, { role: "assistant", content: result.reply }]);
      if (result.actions.length > 0) {
        toast.success(
          `AI applied ${result.actions.length} change${result.actions.length === 1 ? "" : "s"}`,
        );
        // Refresh anything the AI might have touched on this page
        utils.plan.answer.listByFestival.invalidate({ festivalId });
        utils.plan.festival.overview.invalidate();
        utils.plan.actionItem.list.invalidate({ festivalId, sectionKey });
        utils.smartCard.getFull.invalidate();
      }
    } catch (err: any) {
      toast.error(`Chat failed: ${err?.message || "unknown error"}`);
    }
  };

  return (
    <Card className="overflow-hidden border-violet-200/40">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full px-5 py-3 flex items-center gap-2 text-sm font-medium hover:bg-muted/30 transition"
      >
        <Sparkles className="h-4 w-4 text-violet-500" />
        <span className="flex-1 text-left">
          Ask AI about <span className="font-semibold">{sectionTitle}</span>
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <div className="px-5 pb-4 space-y-3 border-t border-border/40">
          <div
            ref={scrollRef}
            className="max-h-72 overflow-y-auto space-y-2 rounded-md border border-border/40 bg-background p-3 mt-3"
          >
            {messages.length === 0 && (
              <p className="text-xs text-muted-foreground italic">
                I only know about <span className="font-medium">{sectionTitle}</span>. Try things like:
                "Set the delivery deadline to next Friday", "Add a todo to confirm with the supplier",
                or "What's missing on this page?".
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "text-sm rounded-md px-3 py-2 max-w-[90%] whitespace-pre-wrap leading-relaxed",
                  m.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-muted text-foreground",
                )}
              >
                {m.content}
              </div>
            ))}
            {sendMessage.isPending && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> AI is working…
              </div>
            )}
          </div>

          <div className="flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={`Tell the AI what to change on "${sectionTitle}"…`}
              className="min-h-[44px] max-h-32 text-sm resize-none"
              disabled={sendMessage.isPending}
            />
            <Button
              onClick={handleSend}
              disabled={sendMessage.isPending || !input.trim()}
              size="sm"
              className="h-11 px-3"
            >
              {sendMessage.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
