import { formatDateTime } from "@/lib/utils/date";
import type { Message } from "@/lib/types/message";

export type MessageBubbleListProps = {
  messages: Message[];
  emptyMessage?: string;
  // Which direction renders as "my own message" (primary-colored, pushed to the end side).
  // The agent-facing thread/panel is the default viewer: an agent's own replies are
  // "Outbound". The customer-facing widget passes `viewerIsAgent={false}` so the customer's
  // own messages ("Inbound") get the "my message" styling instead, matching how a normal
  // chat app looks from each side of the conversation.
  viewerIsAgent?: boolean;
};

// Shared bubble-rendering piece reused by both the plain (paginated) message thread
// (`MessageThread`) and the real-time live-chat panel (`LiveChatPanel`) — both need visually
// identical bubbles but different footers (pagination links vs. a live input row).
export function MessageBubbleList({
  messages,
  emptyMessage = "لا توجد رسائل بعد",
  viewerIsAgent = true,
}: MessageBubbleListProps) {
  if (messages.length === 0) {
    return <p className="text-sm text-text-secondary text-center py-6">{emptyMessage}</p>;
  }

  const myDirection = viewerIsAgent ? "Outbound" : "Inbound";

  return (
    <ul className="space-y-2">
      {messages.map((message) => {
        const isMine = message.direction === myDirection;

        return (
          <li key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                isMine ? "bg-primary text-white" : "bg-surface text-text-default"
              }`}
            >
              <p className="whitespace-pre-wrap">{message.body}</p>
              <p className={`mt-1 text-xs ${isMine ? "text-white/70" : "text-text-secondary"}`}>
                {formatDateTime(message.createdOn)}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
