"use client";

import { useEffect, useRef, useState } from "react";
import type { HubConnection } from "@microsoft/signalr";
import { Button } from "@/components/ui/button";
import { MessageBubbleList } from "@/components/conversations/MessageBubbleList";
import { createChatConnection, fetchAgentAccessToken } from "@/lib/signalr/chatConnection";
import { sendMessageAction } from "@/app/(pages)/conversations/actions";
import type { Message } from "@/lib/types/message";

export type LiveChatPanelProps = {
  conversationId: string;
  initialMessages: Message[];
};

type ConnectionStatus = "connecting" | "connected" | "error";

export function LiveChatPanel({ conversationId, initialMessages }: LiveChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const connectionRef = useRef<HubConnection | null>(null);

  useEffect(() => {
    let cancelled = false;
    const connection = createChatConnection(fetchAgentAccessToken);
    connectionRef.current = connection;

    connection.on("ReceiveMessage", (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    // SignalR groups are connection-scoped and do not survive a reconnect — without
    // re-invoking JoinConversation here, a client that recovers from a dropped connection
    // would silently stop receiving broadcasts.
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!body.trim()) {
      setError("يرجى كتابة رسالة");
      return;
    }

    setIsSubmitting(true);
    try {
      if (status === "connected" && connectionRef.current) {
        // The sender's own message arrives back via its own "ReceiveMessage" broadcast, so it
        // is not appended optimistically here — doing both would show it twice.
        await connectionRef.current.invoke("SendMessage", conversationId, body.trim());
        setBody("");
      } else {
        // The hub connection never came up, or dropped and hasn't recovered — the REST
        // endpoint always works regardless of hub health, so fall back to it. The agent's own
        // message will not appear in this panel until the page is refreshed.
        const result = await sendMessageAction(conversationId, body);
        if (result.success) {
          setBody("");
        } else {
          setError(result.error);
        }
      }
    } catch {
      setError("تعذر إرسال الرسالة");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-default">محادثة مباشرة</h2>
        {status !== "connected" && (
          <span className="text-xs text-text-secondary">
            {status === "connecting" ? "جارٍ الاتصال..." : "تعذر الاتصال المباشر — سيتم الإرسال دون تحديث فوري"}
          </span>
        )}
      </div>

      <MessageBubbleList messages={messages} />

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="اكتب رسالة..."
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
        />
        <Button type="submit" disabled={isSubmitting}>
          إرسال
        </Button>
      </form>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
