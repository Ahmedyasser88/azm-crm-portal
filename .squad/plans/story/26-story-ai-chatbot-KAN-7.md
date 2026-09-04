# Story 26 — AI Chatbot for Customer Self-Service (Story: KAN-7)

## Prerequisites

- [08-story-communication-core-KAN-3.md](08-story-communication-core-KAN-3.md) completed: this story reuses `lib/types/message.ts` (`Message`) and `components/conversations/MessageBubbleList.tsx` unchanged.
- [09-story-live-chat-KAN-3.md](09-story-live-chat-KAN-3.md) completed: this story's new public widget page, form, and actions file are modeled directly on `app/widget/live-chat/page.tsx`, `components/widget/LiveChatWidgetForm.tsx`, and `app/widget/live-chat/actions.ts` — copy their shape, not their SignalR connection (see Story Goal).
- **Backend dependency**: the `azm-crm-backend` sibling repo's `feature/kan-7-ai-features` branch (Story 29, `Deploy AI Chatbot for Customer Self-Service`) is already implemented, exposing two `[AllowAnonymous]` actions on `ConversationsController`:
  - `POST /api/conversations/chatbot/start` (body: `{name, email, body}`) → `Result<ChatbotReplyDto>` (201) / 400.
  - `POST /api/conversations/chatbot/{id}/messages` (body: `{body}`) → `Result<ChatbotReplyDto>` (200) / 400 / 404 (a `{id}` belonging to a non-`Chatbot`-channel conversation 404s indistinguishably from a nonexistent id).

  `ChatbotReplyDto`: `conversationId` (Guid), `customerMessage` (`MessageDto`), `botReply` (`MessageDto`) — `MessageDto`'s shape (`id, conversationId, direction, body, createdBy, createdOn`) is identical to this repo's existing `Message` type, so **no new message type is needed**. Both actions persist the customer's message first, then call the AI provider grounded on up to 3 matching `Published` knowledge base articles (a smaller, independent re-implementation of Story 25's `Contains` match, keyed on the customer's message instead of a ticket title); on any AI failure, a static fallback reply (`"Thanks for reaching out — one of our agents will follow up shortly."`, translated server-side... actually returned in English regardless of the `Accept-Language: ar` header this app always sends — see Edge Cases) is returned instead of an error, so the chatbot never surfaces an AI outage as a broken conversation. This channel does **not** use SignalR — every reply arrives synchronously in the same HTTP response that sent the customer's message, unlike Story 09's live chat.

## Story Goal

Let a customer get an instant, knowledge-base-grounded AI answer without waiting for a human agent, satisfying KAN-7's **"Deploy AI chatbot for customer self-service"** acceptance criterion.

Outcome: a new public, unauthenticated `/widget/chatbot` page — a start form (name, email, first message) that, on submit, immediately shows both the customer's own message and the bot's reply; from then on, each message the customer sends returns the bot's reply synchronously in the same request, with no real-time/SignalR connection (turn-based request/response, not push-based).

**Not in scope**: real-time (SignalR) delivery of chatbot messages — the backend explicitly does not extend `ChatHub` to this channel (flagged as a backend follow-up); multi-turn conversation memory beyond the persisted message history already rendered on screen (each AI call is grounded only on the single latest customer message, not the full thread — a backend scope decision, not a frontend one); a sidebar entry (this is a public, unauthenticated surface like `/widget/live-chat` and `/widget/knowledge-base`, neither of which appears in `navItems`); linking this conversation to a specific ticket.

## Context — Read These Files First

1. [app/widget/live-chat/page.tsx](app/widget/live-chat/page.tsx) — read in full (121 lines). This story's `app/widget/chatbot/page.tsx` copies its two-phase shape (`!conversationId` renders the start form; once set, renders the message thread) but **removes** the entire `useEffect`/`HubConnection` block (lines 32–69) and `handleSend`'s SignalR `invoke` call (lines 71–81) — there is no hub to connect to for this channel. `MessageBubbleList` (line 103, `viewerIsAgent={false}`) is reused identically.
2. [app/widget/live-chat/actions.ts](app/widget/live-chat/actions.ts) — read in full (24 lines). `startLiveChatAction`'s exact `apiServerFetch` shape this story's `startAiChatAction` follows, except the response type is `ChatbotReplyDto` (both messages), not a bare conversation id string.
3. [components/widget/LiveChatWidgetForm.tsx](components/widget/LiveChatWidgetForm.tsx) — read in full (95 lines). Copied verbatim in shape for `components/widget/ChatbotWidgetForm.tsx`, changing only its `onStarted` callback's payload (this story's callback receives the full first exchange, not just the raw first message string — see Task 3) and its heading text.
4. [components/conversations/MessageBubbleList.tsx](components/conversations/MessageBubbleList.tsx) — read in full (52 lines). Reused with no changes; `viewerIsAgent={false}` renders the customer's own (`Inbound`) messages as "my message", exactly as the live-chat widget already does.
5. [lib/types/message.ts](lib/types/message.ts) — read in full (11 lines). `Message`'s shape matches `MessageDto` exactly (see Prerequisites) — this story imports it unchanged, no new type file.

## Implementation tasks

### 1 — Server actions

**Create file: `app/widget/chatbot/actions.ts`**:

```ts
"use server";

import { apiServerFetch } from "@/lib/api/fetch";
import type { Message } from "@/lib/types/message";

export type ChatbotReply = { conversationId: string; customerMessage: Message; botReply: Message };

export type ChatbotActionResult = { success: true; reply: ChatbotReply } | { success: false; error: string };

export async function startAiChatAction(values: {
  name: string;
  email: string;
  body: string;
}): Promise<ChatbotActionResult> {
  const result = await apiServerFetch<ChatbotReply>({
    url: "/api/conversations/chatbot/start",
    method: "POST",
    body: { name: values.name.trim(), email: values.email.trim(), body: values.body.trim() },
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, reply: result.data };
}

export async function sendChatbotMessageAction(
  conversationId: string,
  body: string
): Promise<ChatbotActionResult> {
  const result = await apiServerFetch<ChatbotReply>({
    url: `/api/conversations/chatbot/${conversationId}/messages`,
    method: "POST",
    body: { body: body.trim() },
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, reply: result.data };
}
```

`ChatbotReply` is defined locally in this file (not in `lib/types/`) since it is a chatbot-specific response envelope, not a reusable domain type — `Message` itself (imported, not redefined) is the reusable piece, exactly matching `ChatbotReplyDto`'s nested `MessageDto` fields.

### 2 — Chatbot start form

**Create file: `components/widget/ChatbotWidgetForm.tsx`** (`"use client"`) — same structure as `LiveChatWidgetForm.tsx` (name/email/message fields, same `inputClassName`, same `error`/`isSubmitting` state), with two differences:

```ts
export type ChatbotWidgetFormProps = {
  onStarted: (reply: ChatbotReply) => void;
};
```

- Heading text: `"مساعد الدردشة الذكي"` instead of `"محادثة مباشرة"`.
- On submit, call `startAiChatAction({ name, email, body: message })` (Task 1) instead of `startLiveChatAction`; on success call `onStarted(result.reply)` (the full exchange), not `onStarted(conversationId, message)` — the page (Task 3) already has both the customer's message and the bot's reply from this one call, so it does not need to synthesize a local placeholder message the way `LiveChatWidgetPage.handleStarted` does (`app/widget/live-chat/page.tsx` lines 18–30).

### 3 — Chatbot page

**Create file: `app/widget/chatbot/page.tsx`** — same two-phase shape as `app/widget/live-chat/page.tsx`, with the SignalR block removed entirely:

```tsx
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
```

Each send appends **two** messages (`customerMessage` then `botReply`) at once, since the backend persists and returns both from a single call — unlike the live-chat widget, where the customer's own message is added to local state immediately on submit and the reply arrives later, asynchronously, over the SignalR connection.

## Edge Cases & Failure Modes

- **The AI provider fails or times out mid-conversation** — invisible as an error to the customer: `ChatbotReplyGenerator.GenerateAsync` catches the failure server-side and returns its static fallback reply instead; the frontend receives a normal 200/201 `ChatbotReplyDto` either way and cannot distinguish an AI-generated reply from the fallback — no special handling needed.
- **The fallback reply text is hardcoded in English on the backend** (`"Thanks for reaching out — one of our agents will follow up shortly."`), while every other user-facing string in this app is Arabic and this app always sends `Accept-Language: ar` (`lib/api/fetch/server.ts` line 72) — this story renders whatever `botReply.body` the backend returns, in whichever language that is; it does **not** attempt to detect and re-translate the fallback string client-side. Flag as a known inconsistency, not something this story fixes (the fix belongs in the backend's `ChatbotReplyGenerator`).
- **Sending a message after the underlying conversation was closed/deleted server-side** (cannot happen through this UI, but possible via a stale `conversationId` in browser state after a long-lived tab) — `SendChatbotMessageCommandHandler` 404s; `sendChatbotMessageAction` surfaces it via `ChatbotActionResult`'s `{success:false, error}`, rendered in the shared `role="alert"` paragraph — the customer's typed `body` is **not** cleared on failure (unlike a successful send), so they don't lose what they typed.
- **Submitting an empty message** — the `<input>` has no `required` attribute in this turn-based form (unlike the start form's fields); `handleSend` itself guards `!body.trim()` and no-ops rather than sending, mirroring `LiveChatWidgetPage.handleSend`'s identical guard.
- **Rapid double-submit while a send is in flight** — `isSending` disables both the input and the button and `handleSend` early-returns when `isSending` is already `true`, preventing two concurrent sends against the same conversation.
- **A customer who already has an open, non-`Chatbot`-channel conversation with the same email** — irrelevant to this flow: `StartAiChatCommandHandler` finds-or-creates a `Customer` by email but always creates a **new** `Conversation` with `Channel = Chatbot` — it never reuses or appends to an existing `Email`/`WhatsApp`/etc. conversation. Not a frontend concern.

## Test Plan

No automated test infrastructure exists in this repository. Manual verification only, per Verification Steps below.

## Verification Steps

1. **Frontend builds:** `pnpm build` from the repository root.
2. **Lint passes:** `pnpm lint`.
3. **Frontend runs against a live backend:** `pnpm dev`, with `azm-crm-backend`'s `feature/kan-7-ai-features` branch running locally.
4. **Manual smoke test:** publish a knowledge base article (KAN-6) with content relevant to a sample question; open `/widget/chatbot`, submit the start form with a message related to that article, and confirm both the customer's message and a grounded bot reply appear; send a follow-up message and confirm a new customer/bot message pair is appended without a page reload; send a message on a topic with no matching published article and confirm a reasonable (fallback-or-AI) reply still appears rather than an error.

## Done Criteria

- [ ] `/widget/chatbot` lets an anonymous visitor start a conversation and receive an immediate AI reply.
- [ ] Subsequent messages in the same conversation return a reply synchronously, with no SignalR/real-time connection involved.
- [ ] An AI-provider failure never surfaces as a broken conversation — a reply (fallback or otherwise) always renders.
- [ ] `pnpm build` and `pnpm lint` both succeed with no new errors.

This story satisfies KAN-7's "Deploy AI chatbot for customer self-service" acceptance criterion and completes all five KAN-7 acceptance criteria across Stories 22–26.
