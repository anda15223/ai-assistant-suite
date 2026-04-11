import { AIChatBox, type Message } from "@/components/AIChatBox";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

const SUGGESTED_PROMPTS = [
  "Show me all unread emails",
  "Find all invoices from last month",
  "What are my urgent tasks?",
  "Search emails about 'festival contracts'",
  "Create a task to review vendor agreements",
  "Give me a dashboard overview",
];

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);

  const chatMutation = trpc.chat.send.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response },
      ]);
    },
    onError: (error) => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Sorry, something went wrong: ${error.message}`,
        },
      ]);
    },
  });

  const handleSend = (content: string) => {
    const userMessage: Message = { role: "user", content };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    // Send only user/assistant messages (filter system)
    const chatHistory = newMessages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    chatMutation.mutate({ messages: chatHistory });
  };

  return (
    <div className="h-[calc(100vh-6rem)]">
      <AIChatBox
        messages={messages}
        onSendMessage={handleSend}
        isLoading={chatMutation.isPending}
        placeholder="Ask me to search emails, manage tasks, extract invoices..."
        height="100%"
        emptyStateMessage="I can search your emails, manage tasks, extract invoice data, and more. What would you like to do?"
        suggestedPrompts={SUGGESTED_PROMPTS}
      />
    </div>
  );
}
