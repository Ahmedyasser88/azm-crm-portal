"use client";

import { useEffect, useRef, useState } from "react";
import type { HubConnection } from "@microsoft/signalr";
import { Button } from "@/components/ui/button";
import { MessageBubbleList } from "@/components/conversations/MessageBubbleList";
import { LiveChatWidgetForm } from "@/components/widget/LiveChatWidgetForm";
import { createChatConnection } from "@/lib/signalr/chatConnection";
import type { Message } from "@/lib/types/message";

export default function LiveChatWidgetPage() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<"connecting" | "connected" | "error">("connecting");
  const [body, setBody] = useState("");
  const connectionRef = useRef<HubConnection | null>(null);

  function handleStarted(newConversationId: string, firstMessage: string) {
    setConversationId(newConversationId);
    setMessages([
      {
        id: "local-first-message",
        conversationId: newConversationId,
        direction: "Inbound",
        body: firstMessage,
        createdBy: "",
        createdOn: new Date().toISOString(),
      },
    ]);
  }

  useEffect(() => {
    if (!conversationId) return;

    let cancelled = false;
    const connection = createChatConnection();
    connectionRef.current = connection;

    connection.on("ReceiveMessage", (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    connection.onreconnected(async () => {
      try {
        await connection.invoke("JoinConversation", conversationId);
      } catch {
        if (!cancelled) setStatus("error");
      }
    });

    connection.onclose(() => {
      if (!cancelled) setStatus("error");
    });

    (async () => {
      try {
        await connection.start();
        await connection.invoke("JoinConversation", conversationId);
        if (!cancelled) setStatus("connected");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      connection.stop();
    };
  }, [conversationId]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || status !== "connected" || !connectionRef.current || !conversationId) return;

    try {
      await connectionRef.current.invoke("SendMessage", conversationId, body.trim());
      setBody("");
    } catch {
      setStatus("error");
    }
  }

  if (!conversationId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface p-4">
        <LiveChatWidgetForm onStarted={handleStarted} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="card space-y-4 max-w-md w-full">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-text-default">محادثة مباشرة</h1>
          {status !== "connected" && (
            <span className="text-xs text-text-secondary">
              {status === "connecting" ? "جارٍ الاتصال..." : "تعذر الاتصال، حاول تحديث الصفحة"}
            </span>
          )}
        </div>

        <MessageBubbleList messages={messages} viewerIsAgent={false} />

        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="اكتب رسالة..."
            disabled={status !== "connected"}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
          />
          <Button type="submit" disabled={status !== "connected"}>
            إرسال
          </Button>
        </form>
      </div>
    </div>
  );
}
