# Story 08 — Communication Core: Conversations & Messages (Story: KAN-3)

## Prerequisites

- [01-story-customer-core-crud-KAN-1.md](01-story-customer-core-crud-KAN-1.md) completed: this story's conversation-create flow searches existing customers via the same `customerEndpoints`/`CustomerPicker` machinery ticket creation uses.
- [05-story-ticket-core-crud-KAN-2.md](05-story-ticket-core-crud-KAN-2.md) completed: this story **reuses** `components/tickets/CustomerPicker.tsx` and `searchCustomersAction` (`app/(pages)/tickets/actions.ts` lines 117–130) as-is — no new customer-search component or action is created. It also reuses the "`.bind()`, not an inline arrow, for a Server Action passed from a Server Component into a Client Component" rule that story's Context section documents.
- This is the first frontend story in the KAN-3 ("Communication Channels Integration") slice.
- **Backend dependency**: the `azm-crm-backend` sibling repo's Story 08 (`Communication Core: Conversations, Messages & Web Form Submissions`) must be deployed, exposing:
  - `POST /api/conversations` → `Result<Guid>` (201) / 404 (unknown `customerId`) / 400 (validation)
  - `GET /api/conversations/{id}` → `Result<ConversationDto>` (200) / 404
  - `GET /api/conversations?pageNumber=&pageSize=&customerId=&channel=&status=` → `Result<PaginatedResult<ConversationListItemDto>>` (200) — **no `search` query parameter exists on this endpoint**, unlike `GET /api/tickets`.
  - `POST /api/conversations/{id}/messages` → `Result<Guid>` (201) / 404 / 400. The message is always persisted even if the underlying channel's outbound dispatch fails — see Edge Cases.
  - `GET /api/conversations/{id}/messages?pageNumber=&pageSize=` → `Result<PaginatedResult<MessageDto>>` (200) / 404 — **ordered oldest-first**, the opposite of every other paginated list in this app (`GET /api/tickets/{id}/history`, `GET /api/customers/{id}/interactions` are both newest-first). See Task 7 and Edge Cases for how this story's default `pageSize` sidesteps the resulting UX problem.

  `ConversationDto`/`ConversationListItemDto` fields (camelCased over the wire): `id`, `customerId`, `channel` (string enum), `subject` (nullable), `status` (string enum), `createdOn`, and (full DTO only) `updatedOn` (nullable). `MessageDto`: `id`, `conversationId`, `direction` (string enum), `body`, `createdBy` (guid — `00000000-0000-0000-0000-000000000000` for every inbound message, see Edge Cases), `createdOn`. `CreateConversationRequest` body: `{ customerId, channel, subject }`. `SendMessageRequest` body: `{ body }`.

  Enum values (serialized as their names):
  - `CommunicationChannel`: `"Email"`, `"WhatsApp"`, `"LiveChat"`, `"Sms"`, `"WebForm"`.
  - `MessageDirection`: `"Inbound"`, `"Outbound"`.
  - `ConversationStatus`: `"Open"`, `"Closed"` — nothing in this story (or in any currently-planned backend story) ever sets a conversation to `"Closed"`; every conversation created through this story's UI is `Open` and stays that way.

## Story Goal

Give support agents one channel-agnostic screen to start a conversation with a customer, reply to it, and read its message thread — covering, in combination with the backend's Stories 09–11 (each of which registers exactly one new outbound `IChannelMessageSender` and one inbound webhook against this same `Conversation`/`Message` model with **zero additional frontend changes**), four of KAN-3's five acceptance criteria: "Send and receive emails within the CRM", "Integrate WhatsApp messaging", "Support SMS communication", and "Accept submissions from web forms" (the web-form submission itself is posted by a public marketing site directly to the backend's anonymous `POST /api/conversations/web-form`, never through this portal — this story's job is only to let an agent see and reply to the conversation that submission creates). The fifth criterion, "Provide live chat functionality", needs a real-time layer this story does not build — see [09-story-live-chat-KAN-3.md](09-story-live-chat-KAN-3.md).

Outcomes:
1. A **conversations list** page at `/conversations` with channel/status filters and pagination (no free-text search — the backend list endpoint has no `search` parameter).
2. A **create conversation** page at `/conversations/new` — reusing the ticket module's `CustomerPicker`, since starting a conversation requires an existing `customerId` the same way creating a ticket does.
3. A **conversation detail** page at `/conversations/[id]` showing the conversation's channel/status/subject, the customer it belongs to, its full message thread (oldest-first, per the backend), and a reply box that posts a new outbound message via the existing generic `POST /api/conversations/{id}/messages` endpoint.
4. A **"المحادثات" (Conversations) sidebar entry**.
5. Cross-links from the customer detail page (`/customers/[id]`) to start a conversation for that customer and to view that customer's conversations — mirroring the existing ticket cross-links on the same page.

**Not in scope for this story**: closing a conversation (no backend endpoint), editing or deleting a message, any UI for the public `web-form`/`live-chat/start` endpoints (those are called by an external site or widget, never by this portal), and live-chat's real-time send/receive (Story 09 adds a real-time panel on top of this story's same detail page).

## Context — Read These Files First

1. [05-story-ticket-core-crud-KAN-2.md](05-story-ticket-core-crud-KAN-2.md) — read in full. This story repeats the same types/API-client/server-action/page shape a second time for a new entity; do not re-derive the pattern. It also directly **reuses** two of that story's files (see below) rather than rebuilding them.
2. [components/tickets/CustomerPicker.tsx](components/tickets/CustomerPicker.tsx) — read in full (75 lines). This component imports `searchCustomersAction` directly from `@/app/(pages)/tickets/actions` (line 4) — this story's `ConversationForm` (Task 5) imports and reuses this exact component unchanged, from its existing path under `components/tickets/`, rather than duplicating it under `components/conversations/`.
3. [app/(pages)/tickets/actions.ts](app/(pages)/tickets/actions.ts) lines 117–130 (`searchCustomersAction`) — the function `CustomerPicker` already depends on; not edited by this story.
4. [app/(pages)/tickets/actions.ts](app/(pages)/tickets/actions.ts) lines 1–34 (`createTicketAction`) — the exact `"use server"` mutation shape (`apiServerFetch` → check `!result.success` → `revalidatePath` → `redirect`) this story's `createConversationAction` mirrors.
5. [lib/api/ticket.api.ts](lib/api/ticket.api.ts) — full file (45 lines). The `ticketEndpoints` shape (`list`/`getById`/nested `history.list`) this story's `conversationEndpoints` mirrors, with a nested `messages.list` in place of `history.list`.
6. [lib/types/ticket.ts](lib/types/ticket.ts) and [lib/types/ticketHistory.ts](lib/types/ticketHistory.ts) — full files. The `Ticket`/`TicketListItem`/`TicketHistoryEntry` type shapes this story's `lib/types/conversation.ts`/`lib/types/message.ts` mirror.
7. [app/(pages)/tickets/[id]/page.tsx](app/(pages)/tickets/[id]/page.tsx) — read in full (107 lines). Lines 23–28 (`getById` + `notFound()`/error-throw pattern), lines 32–33 (degrade-to-raw-id customer lookup), lines 40–42 (`<div className="space-y-6">` wrapper + `SetBreadcrumbLabel`) are the exact structure `app/(pages)/conversations/[id]/page.tsx` (Task 8) follows. Story 09 ([09-story-live-chat-KAN-3.md](09-story-live-chat-KAN-3.md)) later edits the bottom of this story's version of this file to swap in a real-time panel for `LiveChat` conversations — leave that composition point easy to find (see Task 8).
8. [app/(pages)/tickets/page.tsx](app/(pages)/tickets/page.tsx) — read in full (165 lines). Lines 49–60 (`buildPageHref`), lines 82–139 (empty-state + table), lines 141–162 (prev/next pagination) are the exact list-page shape `app/(pages)/conversations/page.tsx` (Task 8) follows, minus the `search` filter (not supported by the backend list endpoint — see Prerequisites) and the assignment/escalation columns (tickets-only concepts).
9. [components/tickets/TicketFilters.tsx](components/tickets/TicketFilters.tsx) — read in full (137 lines). Lines 50–61 (`updateParam`, URL-param write pattern) is what `ConversationFilters` (Task 6) reuses for its channel/status selects; this story's filters component has **no search `<input>`/debounce logic** (lines 28–48 of this file), since there is nothing to debounce without a `search` param.
10. [components/tickets/TicketHistorySection.tsx](components/tickets/TicketHistorySection.tsx) — read in full (88 lines). The pagination-link pattern (lines 24–31, `buildHref` via `usePathname`/`useSearchParams`) this story's `MessageThread` (Task 7) reuses for its (rarely-reached) `messagesPage` pagination — but unlike this read-only history section, `MessageThread` also composes with a reply form below it (Task 7).
11. [app/(pages)/customers/[id]/page.tsx](app/(pages)/customers/[id]/page.tsx) lines 68–79 — the current action-button row (`<div className="flex gap-2">` at line 68 through its closing `</div>` at line 79), holding, in order, the "عرض التذاكر"/"فتح تذكرة" ticket cross-links, then "تعديل", then `DeleteCustomerButton`. This story (Task 9) inserts two more links into this same row.
12. [lib/constants/sidebar.ts](lib/constants/sidebar.ts) — full file (13 lines). `navItems` currently has `dashboard`, `customers`, `tickets`, `deals`, `reports` (lines 8–12) — this story inserts a `conversations` entry after `tickets` (line 10).
13. [components/layout/Sidebar.tsx](components/layout/Sidebar.tsx) — full file (76 lines). The `ICONS` record (lines 16–22) maps a `navItems[].icon` string to a `lucide-react` component; this story adds a `"message-circle"` → `MessageCircle` mapping, importing `MessageCircle` alongside the existing `lucide-react` imports (lines 6–13).
14. [components/ui/Breadcrumb.tsx](components/ui/Breadcrumb.tsx) — its `labels` map is auto-generated from `navItems`, so the new `conversations` nav entry (Task 9) automatically gives `/conversations` a correct Arabic breadcrumb label with **no changes needed to this file**; its `actionLabels` map already covers `/conversations/new` for the same reason (`new` is already a recognized action segment).
15. [components/customers/SetBreadcrumbLabel.tsx](components/customers/SetBreadcrumbLabel.tsx) — full file (28 lines), a generic, entity-agnostic component reused as-is (imported from its existing path) for conversation ids — do not duplicate it under `components/conversations/`.
16. [components/customers/CustomerForm.tsx](components/customers/CustomerForm.tsx) — the `useState`/`role="alert"` error paragraph/`disabled={isSubmitting}` form convention `ConversationForm` (Task 5) and `SendMessageForm` (Task 7) both follow.
17. [lib/types/pagination.ts](lib/types/pagination.ts) — full file (9 lines). `PaginatedResult<T>` — note the `totalPages` field, referenced in Edge Cases when discussing why this story does not attempt a "jump to the last page of messages" feature.
18. [lib/utils/date.ts](lib/utils/date.ts) — `formatDateTime`, reused for every conversation/message timestamp.
19. [lib/api/customer.api.ts](lib/api/customer.api.ts) — `customerEndpoints.list`/`getById`, used the same way the ticket module uses them (customer-name resolution for the detail page, cross-link hrefs).

## Implementation tasks

### 1 — Types

**Create file: `lib/types/conversation.ts`**

```ts
export type CommunicationChannel = "Email" | "WhatsApp" | "LiveChat" | "Sms" | "WebForm";
export type ConversationStatus = "Open" | "Closed";

export type Conversation = {
  id: string;
  customerId: string;
  channel: CommunicationChannel;
  subject: string | null;
  status: ConversationStatus;
  createdOn: string;
  updatedOn: string | null;
};

export type ConversationListItem = Pick<
  Conversation,
  "id" | "customerId" | "channel" | "subject" | "status" | "createdOn"
>;

export type ConversationFormValues = {
  customerId: string;
  channel: CommunicationChannel;
  subject: string;
};
```

**Create file: `lib/types/message.ts`**

```ts
export type MessageDirection = "Inbound" | "Outbound";

export type Message = {
  id: string;
  conversationId: string;
  direction: MessageDirection;
  body: string;
  createdBy: string;
  createdOn: string;
};
```

**Create file: `lib/constants/conversation.ts`**

```ts
import type { CommunicationChannel, ConversationStatus } from "@/lib/types/conversation";

export const CHANNEL_LABELS: Record<CommunicationChannel, string> = {
  Email: "بريد إلكتروني",
  WhatsApp: "واتساب",
  LiveChat: "محادثة مباشرة",
  Sms: "رسالة نصية",
  WebForm: "نموذج الموقع",
};
export const CHANNELS = Object.keys(CHANNEL_LABELS) as CommunicationChannel[];

export const CONVERSATION_STATUS_LABELS: Record<ConversationStatus, string> = {
  Open: "مفتوحة",
  Closed: "مغلقة",
};
export const CONVERSATION_STATUSES = Object.keys(CONVERSATION_STATUS_LABELS) as ConversationStatus[];
```

### 2 — API client

**Create file: `lib/api/conversation.api.ts`**

```ts
import { apiServerFetch } from "./fetch";
import type { Conversation, ConversationListItem, CommunicationChannel, ConversationStatus } from "../types/conversation";
import type { Message } from "../types/message";
import type { PaginatedResult } from "../types/pagination";

const CONVERSATIONS_URL = "/api/conversations";

export const conversationEndpoints = {
  list: (params: {
    pageNumber?: number;
    pageSize?: number;
    customerId?: string;
    channel?: CommunicationChannel;
    status?: ConversationStatus;
  }) =>
    apiServerFetch<PaginatedResult<ConversationListItem>>({
      url: CONVERSATIONS_URL,
      params: {
        pageNumber: params.pageNumber ?? 1,
        pageSize: params.pageSize ?? 20,
        customerId: params.customerId,
        channel: params.channel,
        status: params.status,
      },
      cache: "no-store",
    }),
  getById: (id: string) =>
    apiServerFetch<Conversation>({ url: `${CONVERSATIONS_URL}/${id}`, cache: "no-store" }),
  messages: {
    // pageSize defaults to 100 (the backend's validated maximum — see Edge Cases) so a
    // typical conversation's entire thread loads on one page, in the correct oldest-first
    // order, without the agent landing on the oldest page of a long thread by default.
    list: (conversationId: string, params: { pageNumber?: number; pageSize?: number } = {}) =>
      apiServerFetch<PaginatedResult<Message>>({
        url: `${CONVERSATIONS_URL}/${conversationId}/messages`,
        params: { pageNumber: params.pageNumber ?? 1, pageSize: params.pageSize ?? 100 },
        cache: "no-store",
      }),
  },
};
```

This follows [lib/api/ticket.api.ts](lib/api/ticket.api.ts)'s exact shape — plain reads through `apiServerFetch`, `cache: "no-store"` since conversation data changes frequently. `undefined` filter values are already dropped by `apiServerFetch`'s `getFullUrl` (`lib/api/fetch/server.ts` lines 34–43), so passing `params.channel`/`params.status` straight through when unset is safe.

### 3 — Server actions

**Create file: `app/(pages)/conversations/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiServerFetch } from "@/lib/api/fetch";
import type { ConversationFormValues } from "@/lib/types/conversation";

export type ConversationActionResult = { success: true } | { success: false; error: string };

export async function createConversationAction(
  values: ConversationFormValues
): Promise<ConversationActionResult | undefined> {
  const result = await apiServerFetch<string>({
    url: "/api/conversations",
    method: "POST",
    body: {
      customerId: values.customerId,
      channel: values.channel,
      subject: values.subject.trim() || null,
    },
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/conversations");
  redirect(`/conversations/${result.data}`);
}

export async function sendMessageAction(
  conversationId: string,
  body: string
): Promise<ConversationActionResult | undefined> {
  const result = await apiServerFetch<string>({
    url: `/api/conversations/${conversationId}/messages`,
    method: "POST",
    body: { body: body.trim() },
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath(`/conversations/${conversationId}`);
  // Redirects back to the same conversation with no `messagesPage` query param — resets
  // to the default (pageSize: 100) view, which shows the whole thread for the common case.
  // See Edge Cases for the rare, long-thread exception.
  redirect(`/conversations/${conversationId}`);
}
```

No new customer-search action is added here — `ConversationForm` (Task 5) imports `CustomerPicker` from `components/tickets/`, which already imports `searchCustomersAction` from `app/(pages)/tickets/actions.ts` directly.

### 4 — Conversation filters component

**Create file: `components/conversations/ConversationFilters.tsx`** (`"use client"`) — mirrors [components/tickets/TicketFilters.tsx](components/tickets/TicketFilters.tsx)'s `updateParam` URL-write pattern (lines 50–61 of that file) but with **no search `<input>`/debounce** (the backend list endpoint has no `search` parameter). Props:

```ts
export type ConversationFiltersProps = {
  initialChannel: string;
  initialStatus: string;
};
```

Renders two native `<select>`s (channel from `CHANNELS`/`CHANNEL_LABELS`, status from `CONVERSATION_STATUSES`/`CONVERSATION_STATUS_LABELS`, each with an "الكل" empty option), both writing to the URL via `useSearchParams`/`useRouter().replace(...)` and resetting `?page=` on any change — same `updateParam` helper shape as `TicketFilters`.

### 5 — Conversation form component

**Create file: `components/conversations/ConversationForm.tsx`** (`"use client"`) — controlled form mirroring [components/customers/CustomerForm.tsx](components/customers/CustomerForm.tsx)'s shape. Props:

```ts
export type ConversationFormProps = {
  initialValues: ConversationFormValues; // customerId is "" for a blank create form
  initialCustomerLabel?: string;
  onSubmit: (values: ConversationFormValues) => Promise<ConversationActionResult | undefined>;
};
```

This form has **no `mode` prop** — unlike `TicketForm`, there is no edit mode at all (no `PUT /api/conversations/{id}` endpoint exists), so this component only ever renders the create shape. Fields, in order:
- **العميل** (`customerId`, via `<CustomerPicker>` imported from `@/components/tickets/CustomerPicker`).
- **القناة** (`channel`, native `<select>` from `CHANNELS`/`CHANNEL_LABELS`, default `"Email"`).
- **الموضوع** (`subject`, optional `<input>`, matches the backend's 200-character cap — not separately enforced client-side, same reasoning as the ticket module's field-length edge cases).

On submit: if `values.customerId` is empty, set a client-side error ("يرجى اختيار عميل") without calling `onSubmit` — same reasoning as `TicketForm`'s identical check. Otherwise call `onSubmit(values)`; on `{ success: false, error }` show it via the shared `role="alert"` paragraph; a `success`/`undefined` result means `onSubmit` already redirected.

### 6 — Message thread and reply components

**Create file: `components/conversations/MessageThread.tsx`** (`"use client"`, following [components/tickets/TicketHistorySection.tsx](components/tickets/TicketHistorySection.tsx)'s pagination-link shape) — Props:

```ts
export type MessageThreadProps = {
  messages: Message[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  page: number;
};
```

Renders a `.card` containing:
- A list of messages **in the order received** (the backend already returns oldest-first — do not re-sort), each as a simple bubble: `direction === "Outbound"` messages aligned to the flex-end side (`justify-end`, a `bg-primary text-white` bubble), `direction === "Inbound"` messages aligned to the flex-start side (`justify-start`, a `bg-surface` bubble) — using logical `justify-start`/`justify-end` (not hardcoded left/right) so this reads correctly regardless of the document's text direction. Each bubble shows only `body` and `formatDateTime(createdOn)` — **no sender name is resolved or displayed** (see Edge Cases for why `createdBy` is not rendered).
- Empty state: "لا توجد رسائل بعد".
- Prev/Next pagination using `?messagesPage=` as the query param name (own namespace, same convention as `?historyPage=`/`?interactionsPage=`/etc.), built via `useSearchParams`/`usePathname` the same way `TicketHistorySection` does — reachable in practice only for a conversation with more than 100 messages (see Task 2's `pageSize: 100` default and Edge Cases).

**Create file: `components/conversations/SendMessageForm.tsx`** (`"use client"`) — controlled `body` `<textarea rows={3}>` plus a "إرسال" submit button, following [components/customers/CustomerForm.tsx](components/customers/CustomerForm.tsx)'s `useState`/`role="alert"`/`disabled={isSubmitting}` convention. Props:

```ts
export type SendMessageFormProps = {
  onSubmit: (body: string) => Promise<ConversationActionResult | undefined>;
};
```

On submit: if `body.trim()` is empty, set a client-side error ("يرجى كتابة رسالة") without calling `onSubmit`. Otherwise call `onSubmit(body)`; a `success`/`undefined` result means the caller already redirected (see Task 3's `sendMessageAction`); on `{ success: false, error }` show it via the shared error paragraph and keep the typed text so the agent doesn't lose it.

### 7 — Pages

**Create file: `app/(pages)/conversations/page.tsx`** (Server Component) — reads `searchParams: Promise<{ page?: string; channel?: string; status?: string; customerId?: string }>`, calls `conversationEndpoints.list({ pageNumber, channel: channel as CommunicationChannel | undefined, status: status as ConversationStatus | undefined, customerId })`. Renders, following [app/(pages)/tickets/page.tsx](app/(pages)/tickets/page.tsx)'s structure:
- Header: `<h1>` "المحادثات" + a "محادثة جديدة" button linking to `/conversations/new` (or `/conversations/new?customerId=${customerId}` when `customerId` is present in the URL, same composition as the tickets list page's `newTicketHref`).
- `<ConversationFilters initialChannel={channel ?? ""} initialStatus={status ?? ""} />`.
- A `.card`-wrapped `<table>` with columns: القناة (`CHANNEL_LABELS[channel]`, as a small badge), العميل (`customerId`, linking to `/customers/{customerId}` — displayed as the raw id, since `ConversationListItemDto` carries no customer name; same limitation the ticket list page's Edge Cases already documents), الموضوع (`subject ?? "—"`), الحالة (`CONVERSATION_STATUS_LABELS[status]`), تاريخ الإنشاء (`formatDateTime(createdOn)`).
- Empty state and Prev/Next pagination identical in shape to the tickets list page.

**Create file: `app/(pages)/conversations/new/page.tsx`** (Server Component) — reads `searchParams: Promise<{ customerId?: string }>`. When `customerId` is present, call `customerEndpoints.getById(customerId)` to resolve a display label, falling back to rendering the picker empty on failure (same reasoning as the ticket module's new-ticket page). Renders `.card` "محادثة جديدة" + `<ConversationForm initialValues={{ customerId: customerId ?? "", channel: "Email", subject: "" }} initialCustomerLabel={...} onSubmit={createConversationAction} />`.

**Create file: `app/(pages)/conversations/[id]/page.tsx`** (Server Component) — `params: Promise<{ id: string }>`, `searchParams: Promise<{ messagesPage?: string }>`. Fetch via `conversationEndpoints.getById(id)`; `if (!result.success) { if (result.status === 404) notFound(); throw new Error(result.error); }`. Fetch the owning customer via `customerEndpoints.getById(conversation.customerId)` for display, degrading to the raw id on failure (same as the ticket detail page). Fetch messages via `conversationEndpoints.messages.list(id, { pageNumber: messagesPageNumber })` (default `pageSize: 100`, per Task 2), degrading to an empty list on a non-404 failure. Renders `<SetBreadcrumbLabel segment={id} label={conversation.subject ?? CHANNEL_LABELS[conversation.channel]} />`, a `.card` with the channel/status badges, subject (if any), a "العميل" line linking to `/customers/{conversation.customerId}`, then `<MessageThread .../>` and, **at the very bottom, in its own clearly-separated block** — Story 09 ([09-story-live-chat-KAN-3.md](09-story-live-chat-KAN-3.md)) replaces exactly this bottom block with a real-time panel when `conversation.channel === "LiveChat"`, so keep it as a simple, easily-swappable final element — `<SendMessageForm onSubmit={sendMessageAction.bind(null, id)} />` (`.bind()`, not an inline arrow — same load-bearing reason documented in the ticket module's Story 05 plan).

### 8 — Navigation

**Edit file: `lib/constants/sidebar.ts`** — insert a new entry after `tickets` (line 10) and before `deals` (line 11):

```ts
{ label: "المحادثات", href: "/conversations", icon: "message-circle" },
```

**Edit file: `components/layout/Sidebar.tsx`** — add `MessageCircle` to the `lucide-react` import (lines 6–13) and add `"message-circle": MessageCircle,` to the `ICONS` record (after line 21, the `"bar-chart-3": BarChart3,` line).

### 9 — Cross-links from the customer detail page

**Edit file: `app/(pages)/customers/[id]/page.tsx`** — in the action-button row (lines 68–79), add two more links, immediately after the existing "فتح تذكرة" link (line 74) and before "تعديل" (line 75):

```tsx
<Link href={`/conversations?customerId=${id}`}>
  <Button variant="outline">عرض المحادثات</Button>
</Link>
<Link href={`/conversations/new?customerId=${id}`}>
  <Button variant="outline">محادثة جديدة</Button>
</Link>
```

## Edge Cases & Failure Modes

- **The conversations list cannot show a customer's name, only their id** — `ConversationListItemDto` carries only `customerId`, the same N+1-avoidance tradeoff already documented in the ticket module's Story 05 Edge Cases (resolving one customer name per row would mean 20 extra lookups per page). The list links the raw `customerId` to `/customers/{customerId}`; the conversation **detail** page does the one-off lookup and shows the real name.
- **`GetConversationMessages` returns messages oldest-first, not newest-first** — a deliberate backend choice (chat-thread reading order), the opposite of every other paginated child-list in this app. This story's `conversationEndpoints.messages.list` requests `pageSize: 100` (the backend's validated maximum for both list endpoints) by default specifically so a typical conversation's **entire** thread fits on page 1, sidestepping the bad default UX of otherwise landing an agent on the oldest page of a long-running thread. A conversation with **more than 100 messages** still defaults to showing only the oldest 100 — `MessageThread`'s `?messagesPage=` pagination link is the only way to reach later messages in that case. This story does not build a "jump to the last page" shortcut (which `PaginatedResult.totalPages` would make possible) — flag as a follow-up if long-running threads become common.
- **No sender name is ever displayed per message** — `MessageDto.CreatedBy` is a raw `Guid` (and is literally `Guid.Empty` for every inbound message, per the backend's `SaveChangesAsync` stamping logic when there is no authenticated caller) with no batch user-name-resolution endpoint available to this story. `MessageThread` renders only `direction`-based styling (agent vs. customer), never `createdBy` — do not attempt to resolve or display it.
- **`POST /api/conversations/{id}/messages` always returns success even if the underlying channel's outbound dispatch silently failed** (e.g. the backend's SMTP send throws) — the backend logs a warning server-side and still returns 201, per its Story 08's documented, deliberate choice. This story's UI has **no way to detect or surface a delivery failure** — a message will show as sent in `MessageThread` regardless of whether the customer's channel actually received it. This is not a frontend bug to fix; it mirrors the backend's own documented tradeoff.
- **Sending a message on a `LiveChat`-channel conversation via this story's `SendMessageForm`** works exactly like any other channel (the message persists via the same REST endpoint) but does **not** broadcast in real time to a connected widget — that capability doesn't exist until [09-story-live-chat-KAN-3.md](09-story-live-chat-KAN-3.md) is implemented. Not a bug in this story; a `LiveChat` conversation created here is simply not real-time until Story 09 lands.
- **Creating a conversation without selecting a customer** — `ConversationForm`'s client-side check catches the common case; if bypassed, the backend's `CreateConversationCommandHandler` 404s on the invalid/empty `customerId`, surfaced via the shared error paragraph.
- **`?customerId=` in the URL does not resolve to an existing customer** — on `/conversations`, the list is simply filtered to zero results (an optional filter, not a route parameter, so the backend 200s with an empty page). On `/conversations/new?customerId=<bad-id>`, the `customerEndpoints.getById` prefetch fails and the page falls back to an empty `CustomerPicker` rather than throwing.
- **Empty/whitespace `subject`** — sent as `null` (per `createConversationAction`'s `values.subject.trim() || null`), which the backend accepts (`Subject` is optional); `subject` over 200 characters is rejected server-side with a 400, surfaced via the shared error paragraph, not mirrored client-side.
- **Empty/whitespace message `body`** — `SendMessageForm`'s client-side check catches the common case; a `body` over 4000 characters is rejected server-side with a 400, surfaced the same way.
- **`PageSize` requested outside the backend's validated 1–100 range** — cannot happen from this story's UI, since `conversationEndpoints.list`/`messages.list` never request more than their hardcoded defaults (20 and 100 respectively) and neither exposes a user-editable page-size control.
- **A conversation belonging to a soft-deleted customer** — the conversation itself still 200s, but the customer-name lookup 404s; the detail page falls back to showing the raw `customerId` as the link text, same pattern as the ticket detail page's identical edge case.

## Test Plan

No automated test infrastructure exists in this repository (no `test` script in `package.json`, no test framework in `dependencies`/`devDependencies` — confirmed by inspection). Manual verification only, per the Verification Steps below.

## Verification Steps

1. **Frontend builds:** `pnpm build` from the repository root (the `packageManager` field pins `pnpm@10.28.0`).
2. **Lint passes:** `pnpm lint`.
3. **Frontend runs against a live backend:** `pnpm dev`, with `azm-crm-backend` running locally (its KAN-3 Story 08 deployed) and `.env.local`'s `NEXT_PUBLIC_API_BASE_URL` pointing at it.
4. **Manual smoke test:** confirm "المحادثات" appears in the sidebar and navigates to `/conversations` with an empty state on a fresh database; from an existing customer's detail page, click "محادثة جديدة" and confirm it lands on `/conversations/new` with that customer pre-selected; create a conversation (pick a channel, optional subject) and confirm redirect to its detail page; send a reply and confirm it appears in the thread, oldest-first, after the redirect; filter the conversations list by channel/status and confirm results narrow correctly; from the customer detail page, click "عرض المحادثات" and confirm the list is filtered to that customer's conversations; navigate to a nonexistent conversation id and confirm the existing 404 page renders.

## Done Criteria

- [ ] "المحادثات" appears in the sidebar navigation and links to `/conversations`.
- [ ] `/conversations` lists conversations with working channel/status filters and pagination, including an empty state.
- [ ] `/conversations/new` requires selecting an existing customer (via the reused `CustomerPicker`) and creates a conversation with a chosen channel and optional subject.
- [ ] `/conversations/[id]` shows all conversation fields, the resolved customer name (linked to their profile), and the message thread in oldest-first order, defaulting to showing the whole thread for a conversation with 100 or fewer messages.
- [ ] An agent can send a reply from `/conversations/[id]` and see it appear in the thread.
- [ ] The customer detail page has working "محادثة جديدة"/"عرض المحادثات" links, alongside the existing ticket links.
- [ ] A nonexistent conversation id renders the existing 404 page.
- [ ] `pnpm build` and `pnpm lint` both succeed with no new errors.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 09.**
