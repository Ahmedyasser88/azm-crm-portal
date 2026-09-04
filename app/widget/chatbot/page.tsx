"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageBubbleList } from "@/components/conversations/MessageBubbleList";
import { ChatbotWidgetForm } from "@/components/widget/ChatbotWidgetForm";
import { sendChatbotMessageAction, type ChatbotReply } from "@/app/widget/chatbot/actions";
import type { Message } from "@/lib/types/message";

export default function ChatbotWidgetPage() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  function handleStarted(reply: ChatbotReply) {
    setConversationId(reply.conversationId);
    setMessages([reply.customerMessage, reply.botReply]);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || !conversationId || isSending) return;

    setIsSending(true);
    setError(null);
    const result = await sendChatbotMessageAction(conversationId, body);
    setIsSending(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setMessages((prev) => [...prev, result.reply.customerMessage, result.reply.botReply]);
    setBody("");
  }

  if (!conversationId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface p-4">
        <ChatbotWidgetForm onStarted={handleStarted} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="card space-y-4 max-w-md w-full">
        <h1 className="text-lg font-semibold text-text-default">مساعد الدردشة الذكي</h1>

        <MessageBubbleList messages={messages} viewerIsAgent={false} />

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="اكتب رسالة..."
            disabled={isSending}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
          />
          <Button type="submit" disabled={isSending}>
            {isSending ? "جارٍ الإرسال..." : "إرسال"}
          </Button>
        </form>
      </div>
    </div>
  );
}
