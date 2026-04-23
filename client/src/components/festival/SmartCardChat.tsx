import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp, Loader2, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Per-SmartCard AI chat. Collapsible panel at the bottom of a SmartCard.
 * Loads history lazily on open, persists every turn, and invalidates the
 * parent card so the board updates in place whenever the AI edits the
 * card via tool calls.
 */

type ChatMsg = { role: "user" | "assistant"; content: string };

export function SmartCardChat({ cardId, cardTitle }: { cardId: number; cardTitle: string }) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loadedHistory, setLoadedHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Load history the first time the panel is opened.
  const historyQ = trpc.smartCard.chat.history.useQuery(
    { cardId, limit: 40 },
    { enabled: open && !loadedHistory },
  );
  useEffect(() => {
    if (historyQ.data && !loadedHistory) {
      setMessages(
        historyQ.data
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      );
      setLoadedHistory(true);
    }
  }, [historyQ.data, loadedHistory]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, historyQ.isFetching]);

  const sendMessage = trpc.smartCard.chat.send.useMutation();

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sendMessage.isPending) return;
    setInput("");
    const prior = messages;
    const next: ChatMsg[] = [...prior, { role: "user", content: text }];
    setMessages(next);
    try {
      const result = await sendMessage.mutateAsync({
        cardId,
        message: text,
        history: prior,
      });
      setMessages([...next, { role: "assistant", content: result.reply }]);
      if (result.actions.length > 0) {
        toast.success(
          `AI applied ${result.actions.length} change${result.actions.length === 1 ? "" : "s"}`,
        );
        utils.smartCard.getFull.invalidate({ cardId });
      }
    } catch (err: any) {
      toast.error(`Chat failed: ${err?.message || "unknown error"}`);
      // Keep the user message in view; drop no assistant reply.
    }
  };

  return (
    <div className="border-t border-border/60 bg-muted/10">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full px-5 py-2.5 flex items-center gap-2 text-sm font-medium text-foreground/80 hover:bg-muted/30 transition"
      >
        <Sparkles className="h-3.5 w-3.5 text-violet-500" />
        <span className="flex-1 text-left">Ask AI about this card</span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <div className="px-5 pb-4 space-y-3">
          <div
            ref={scrollRef}
            className="max-h-72 overflow-y-auto space-y-2 rounded-md border border-border/40 bg-background p-3"
          >
            {historyQ.isFetching && !loadedHistory ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading history…
              </div>
            ) : messages.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                Tell the AI what to add or change for "{cardTitle}". E.g. "Add a todo to call Godik by
                Friday", "Set cooling unit quantity to 3", "What's missing on this card?"
              </p>
            ) : null}

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
              placeholder="Tell the AI what to do…"
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
    </div>
  );
}
