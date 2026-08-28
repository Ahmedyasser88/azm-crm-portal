# Story 09 — Live Chat: Real-Time Widget & Agent Panel (Story: KAN-3)

## Prerequisites

- [08-story-communication-core-KAN-3.md](08-story-communication-core-KAN-3.md) completed: this story reuses that story's `Message`/`Conversation` types, `conversationEndpoints`, `app/(pages)/conversations/[id]/page.tsx` (edited here, see Task 6), and its generic `sendMessageAction` (kept as a fallback path, see Edge Cases).
- **Backend dependency**: the `azm-crm-backend` sibling repo's Story 12 (`Live Chat Channel: Real-Time Conversation`) must be deployed, exposing:
  - `POST /api/conversations/live-chat/start` (public, unauthenticated) → `Result<Guid>` (201). Body: `{ name, email, body }`. Resolves the visitor to an existing `Customer` by email or creates one, creates a new `LiveChat`-channel `Conversation` plus one inbound `Message`, and returns the new conversation's id — **every call creates a brand-new conversation**, even for a repeat visitor with the same email (no "resume my last session" lookup exists server-side).
  - `ChatHub` mapped at `/hubs/chat` (SignalR). Two hub methods: `JoinConversation(conversationId: Guid)` (adds the caller's connection to a group keyed by the conversation's id, after confirming the conversation exists — throws `HubException` otherwise) and `SendMessage(conversationId: Guid, body: string)` (persists a `Message` — `Outbound` if the caller's connection is JWT-authenticated, `Inbound` otherwise — then broadcasts a `"ReceiveMessage"` event with a `MessageDto`-shaped payload to every connection joined to that conversation's group). A JWT passed as the `?access_token=` query-string parameter on the hub connection URL authenticates an agent connection the same way an `Authorization: Bearer` header would for a REST call (browsers cannot attach a header to a WebSocket upgrade request) — an anonymous connection (no `access_token`) is fully supported and is exactly how the customer-facing widget in this story connects.
  - **Known backend gaps this story's UI must work around defensively, not silently assume are fixed**: (a) `ChatHub` is not restricted to `LiveChat`-channel conversations — nothing stops an anonymous hub client from calling `JoinConversation`/`SendMessage` against an `Email`/`WhatsApp`/`Sms`/`WebForm` conversation's id if it obtains one; this frontend story cannot fix a backend authorization gap, but must not compound it (see Task 5 and Edge Cases: never surface a non-`LiveChat` conversation's id to the anonymous widget). (b) SignalR groups are connection-scoped and do **not** survive a reconnect — this story's `LiveChatPanel` must re-invoke `JoinConversation` in its `onreconnected` handler, not rely on `withAutomaticReconnect()` alone (see Task 4). (c) `ChatHub.SendMessage`'s authenticated branch, per the backend's own Story 12 plan, was drafted with a real correctness gap — a placeholder `createdBy`/`createdOn` in the broadcast payload instead of the real persisted values — that its own Done Criteria requires fixing before that story ships. **Verify this was actually fixed** (an agent-sent message's broadcast `createdOn` should be a real, non-placeholder timestamp) before relying on the hub broadcast's `createdBy`/`createdOn` for anything beyond display ordering — this story's `MessageThread`/`LiveChatPanel` never render `createdBy` anyway (see Story 08's Edge Cases), so this gap is low-risk for this story specifically, but a stale `createdOn` could still misorder a fast-arriving message relative to ones already in the thread.
- **CORS is already configured** to allow this — confirmed in the `azm-crm-backend` repo: `src/AzmCrm.API/appsettings.json` line 48–52 lists `"AllowedOrigins": ["http://localhost:3100"]`, and `src/AzmCrm.API/Extensions/ApplicationExtensions.cs` lines 39–58 (`AddCustomCors`) builds a default CORS policy with `.AllowAnyHeader().AllowAnyMethod().AllowCredentials()` validated against that allow-list. This is **dev-only** configuration — the deployed frontend's real origin must be added to that same list before this story's browser-to-backend calls work outside local development; flag this to whoever owns that repo's `appsettings.Production.json` as a deploy-time coordination item, not something this story's code can fix.
- **New frontend dependency**: `@microsoft/signalr` — confirmed absent from `package.json`'s `dependencies` (verified by inspection: no signalr/websocket client library listed).
- This story introduces the **first client-side (browser) network call to the backend anywhere in this codebase**. Every other data fetch goes through `apiServerFetch` (`lib/api/fetch/server.ts` line 1: `"use server"` — a Server Action, always executed server-side even when invoked from a Client Component). A SignalR hub connection is inherently a browser-side WebSocket, so this story is a deliberate, first-of-its-kind architectural exception — call this out explicitly during review, not as an incidental implementation detail.

## Story Goal

Satisfy KAN-3's fifth and final acceptance criterion, "Provide live chat functionality", by giving both a support agent (inside this portal) and an anonymous customer (via a standalone widget page) a way to exchange messages in real time on a `LiveChat`-channel conversation, on top of [08-story-communication-core-KAN-3.md](08-story-communication-core-KAN-3.md)'s `Conversation`/`Message` model and conversation detail page.

Outcomes:
1. A **real-time agent panel** on `/conversations/[id]` — when `conversation.channel === "LiveChat"`, the page renders `LiveChatPanel` (a client component) in place of Story 08's plain `SendMessageForm`. It loads the existing message history, connects to `ChatHub` as an authenticated agent, joins the conversation's group, appends any newly broadcast message to the thread live, and lets the agent type and send without a page reload.
2. A **standalone, unauthenticated customer widget page** at `/widget/live-chat` — a small pre-chat form (name, email, first message) that calls the public `POST /api/conversations/live-chat/start`, then switches to a live, two-way chat view connected anonymously to the same hub. **This story only builds the page inside this Next.js app** — packaging it as an embeddable `<script>`/`<iframe>` snippet for an external marketing site is out of scope, a follow-up.
3. A small **server-side token-relay route** (`app/api/chat-token/route.ts`) the agent-side panel calls once before connecting, since the real JWT lives in an httpOnly cookie the browser cannot read directly — see Edge Cases for the security tradeoff this deliberately makes, and why it is necessary given the backend's only supported hub-auth mechanism (Prerequisites).

**Not in scope**: typing indicators, read receipts, or presence (the backend hub emits none of these); any reconnection/message-replay logic beyond re-fetching history on initial load and re-joining the group on reconnect; horizontal scaling of the hub (single-instance only, per the backend story); and fixing the backend's cross-channel hub-access gap (Prerequisites) — this story's frontend code works around it defensively but cannot close it.

## Context — Read These Files First

1. [08-story-communication-core-KAN-3.md](08-story-communication-core-KAN-3.md) — read in full. This story edits the bottom block of `app/(pages)/conversations/[id]/page.tsx` that story creates, and reuses its `Message`/`MessageDirection` types and `conversationEndpoints.getById`/`messages.list`.
2. [lib/api/fetch/server.ts](lib/api/fetch/server.ts) — read in full (123 lines). Line 1 (`"use server"`), line 49 (`getAuthToken`, reading the httpOnly cookie), line 73 (the token attached as an `Authorization: Bearer` header inside `apiServerFetch`, never exposed anywhere else in the module) — confirms there is **no existing mechanism** for client-side JS to obtain this token, which is exactly why Task 2's relay route is needed.
3. [lib/constants/auth.ts](lib/constants/auth.ts) — full file (2 lines): `AUTH_TOKEN_COOKIE = "azm_crm_auth_token"`. Reused by the new relay route via `cookies()`, the same constant `apiServerFetch` and `app/login/actions.ts` already use.
4. [app/login/actions.ts](app/login/actions.ts) lines 27–45 (`setAuthCookies`) — confirms `httpOnly: true` (lines 31 and 39) on both cookies. This story's relay route (Task 2) is the first code in this app that deliberately hands this value to client JS — document why in Edge Cases, don't treat it as incidental.
5. [proxy.ts](proxy.ts) — full file (32 lines). `PUBLIC_PATHS` (line 5) currently contains only `"/login"`; `config.matcher` (line 30) matches nearly every path, including `/widget/*` and `/api/chat-token`. Without adding `/widget` to `PUBLIC_PATHS`, an anonymous visitor hitting `/widget/live-chat` gets redirected to `/login` before the widget ever renders — this story must add it (Task 7). `/api/chat-token` is deliberately **left out** of `PUBLIC_PATHS` (see Task 2 and Edge Cases): it must stay behind the normal auth guard, since only an already-signed-in agent's browser should ever be able to fetch a real access token from it.
6. `.env.local` (2 lines) — confirms `NEXT_PUBLIC_API_BASE_URL=http://localhost:5100` is already exposed to client bundles (the `NEXT_PUBLIC_` prefix inlines it into browser code), directly usable in a Client Component to build the hub's WebSocket URL.
7. `package.json` — full file. Confirms no `@microsoft/signalr` (or any websocket client) dependency exists yet; this story adds it.
8. [components/customers/CustomerForm.tsx](components/customers/CustomerForm.tsx) — the `useState`/`role="alert"` form-error convention the widget's pre-chat intake form (Task 5) follows.
9. [app/(pages)/conversations/[id]/page.tsx](app/(pages)/conversations/[id]/page.tsx) (created by Story 08) — read in full once Story 08 is implemented. This story edits its final block (currently a plain `<SendMessageForm onSubmit={sendMessageAction.bind(null, id)} />`, per that story's Task 7) to conditionally render `LiveChatPanel` instead when the fetched `conversation.channel === "LiveChat"`.
10. Backend Story 12 (`azm-crm-backend/.squad/plans/story/12-story-live-chat-channel-KAN-3.md`, not in this repo) — its `ChatHub.SendMessage`/`JoinConversation` method signatures and the two flagged gaps (cross-channel access, reconnect-and-rejoin) are restated in this plan's Prerequisites verbatim, since the executor of this story does not have that sibling repo checked out.
11. [app/layout.tsx](app/layout.tsx) (23 lines) and [app/(pages)/layout.tsx](app/(pages)/layout.tsx) (9 lines) — read both in full. The root layout is minimal (`<html dir="rtl">`/`<body>` + `Toaster`, no navigation chrome); the agent `Sidebar`/`AppLayout` chrome is applied only by `app/(pages)/layout.tsx`, which wraps `children` in `<AppLayout user={user}>`. **Confirmed**, not assumed: a route created outside the `(pages)` group — `app/widget/live-chat/page.tsx` (Task 5) — therefore renders with no agent sidebar/nav around it, which is exactly the bare, customer-facing shell this story needs. `dir="rtl"`/`lang="ar"` from the root layout still applies to the widget page.

## Implementation tasks

### 1 — Dependency

```bash
pnpm add @microsoft/signalr
```

(`packageManager` in `package.json` pins `pnpm@10.28.0` — use `pnpm`, not `npm`, to keep the lockfile consistent with every other install in this repo.)

### 2 — Token relay route

**Create file: `app/api/chat-token/route.ts`**

```ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_TOKEN_COOKIE } from "@/lib/constants/auth";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  return NextResponse.json({ token });
}
```

This is a plain Route Handler, not a Server Action — it's called from a Client Component via a normal `fetch("/api/chat-token")`, the idiomatic way for browser code to read a small piece of server-only state. It is deliberately **not** added to `proxy.ts`'s `PUBLIC_PATHS` (Task 7 only adds `/widget`), so `proxy.ts`'s existing guard (redirect-to-`/login` when the auth cookie is absent) already protects it — only a browser tab that already has a valid `AUTH_TOKEN_COOKIE` (i.e., an agent who is already viewing `/conversations/[id]`) can reach this route at all. See Edge Cases for the real security tradeoff this still makes, and for what happens if the cookie has expired by the time this route is called.

### 3 — SignalR connection helper

**Create file: `lib/signalr/chatConnection.ts`**

```ts
import * as signalR from "@microsoft/signalr";

const HUB_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/hubs/chat`;

export function createChatConnection(accessTokenFactory?: () => Promise<string>): signalR.HubConnection {
  return new signalR.HubConnectionBuilder()
    .withUrl(HUB_URL, accessTokenFactory ? { accessTokenFactory } : {})
    .withAutomaticReconnect()
    .build();
}

export async function fetchAgentAccessToken(): Promise<string> {
  const response = await fetch("/api/chat-token");
  // A stale/expired auth cookie makes proxy.ts (Task 5's guard, unchanged for this path)
  // redirect this request to the /login page's HTML instead of returning JSON — guard
  // against that rather than letting `.json()` throw an opaque parse error.
  if (!response.ok) throw new Error("تعذر الحصول على رمز الوصول");
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) throw new Error("تعذر الحصول على رمز الوصول");
  const { token } = (await response.json()) as { token: string };
  return token;
}
```

`accessTokenFactory` is SignalR's documented extension point for attaching a bearer token to the connection URL as `?access_token=` on every (re)connect attempt — passed only for the agent panel (Task 4); the widget (Task 5) calls `createChatConnection()` with no argument, connecting anonymously, matching `ChatHub`'s inbound-branch behavior exactly (Prerequisites).

### 4 — Agent-side live chat panel

**Create file: `components/conversations/LiveChatPanel.tsx`** (`"use client"`) — Props:

```ts
export type LiveChatPanelProps = {
  conversationId: string;
  initialMessages: Message[];
};
```

Behavior:
- `useState<Message[]>(initialMessages)` for the rendered thread; `useState<"connecting" | "connected" | "error">("connecting")` for connection status.
- On mount (`useEffect`): build a connection via `createChatConnection(fetchAgentAccessToken)`; register `connection.on("ReceiveMessage", (dto) => setMessages((prev) => [...prev, dto]))`; register `connection.onreconnected(async () => { await connection.invoke("JoinConversation", conversationId); })` — **required**, per Prerequisites, since a reconnected connection does not automatically remain in its previous group; call `await connection.start()` then `await connection.invoke("JoinConversation", conversationId)`, set status to `"connected"`; on any failure in this sequence, catch it, set status to `"error"`, and fall through to the degraded mode below. Clean up with `connection.stop()` on unmount.
- Render the same message-bubble list `MessageThread` (Story 08) uses (either import and reuse its bubble-rendering sub-piece, or duplicate the same `justify-start`/`justify-end` bubble markup directly here — prefer factoring the bubble list out of `MessageThread` into a small shared `MessageBubbleList` component during this story if that keeps both call sites simple, since Story 08's `MessageThread` and this panel need visually identical bubbles but different footers: pagination links there, a live input box here).
- An input row: a controlled `<input>` (or single-line `<textarea>`) plus a send button. On submit, when `status === "connected"`, call `await connection.invoke("SendMessage", conversationId, body)` directly against the hub — **not** `sendMessageAction` — and clear the input (the sender's own message arrives back via its own `"ReceiveMessage"` broadcast, so do not optimistically append it locally as well, or it will appear twice). When `status !== "connected"` (the hub connection never came up, or dropped and hasn't recovered), fall back to calling Story 08's `sendMessageAction(conversationId, body)` instead — the REST endpoint always works regardless of hub health, since the backend's `SendMessageCommandHandler` (in the `azm-crm-backend` sibling repo's Story 08, not a class in this repo) persists every message unconditionally, for every channel including `LiveChat`, before attempting any channel-specific dispatch — and show a small inline notice ("تعذر الاتصال المباشر — سيتم الإرسال دون تحديث فوري") so the agent understands why the reply won't appear until the page refreshes.

### 5 — Customer-facing widget

**Create file: `app/widget/live-chat/actions.ts`**

```ts
"use server";

import { apiServerFetch } from "@/lib/api/fetch";

export type StartLiveChatResult = { success: true; conversationId: string } | { success: false; error: string };

export async function startLiveChatAction(values: {
  name: string;
  email: string;
  body: string;
}): Promise<StartLiveChatResult> {
  const result = await apiServerFetch<string>({
    url: "/api/conversations/live-chat/start",
    method: "POST",
    body: { name: values.name.trim(), email: values.email.trim(), body: values.body.trim() },
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, conversationId: result.data };
}
```

This one Server Action is fine to call from the public widget even though it hits an anonymous backend endpoint — `apiServerFetch` simply won't attach an `Authorization` header (no cookie exists for this visitor), which is exactly correct here; it is not routed through `conversationEndpoints`/`app/(pages)/conversations/actions.ts` since those live under the authenticated `(pages)` route group and this widget is intentionally outside it.

**Create file: `components/widget/LiveChatWidgetForm.tsx`** (`"use client"`) — a pre-chat intake form (الاسم / name, البريد الإلكتروني / email, رسالتك الأولى / first message), following [components/customers/CustomerForm.tsx](components/customers/CustomerForm.tsx)'s `useState`/`role="alert"` convention. On submit, calls `startLiveChatAction`; on success, calls a parent-supplied `onStarted(conversationId, firstMessage)` callback rather than navigating anywhere (the parent page, below, then switches to the live panel).

**Create file: `app/widget/live-chat/page.tsx`** (`"use client"`, a top-level route **outside** the `(pages)` route group — reachable at `/widget/live-chat` regardless of that group's own layout/auth expectations) — holds a small piece of state: `started: boolean`, `conversationId: string | null`, `firstMessage: string`. Before `started`, renders `LiveChatWidgetForm`. After `started`, renders a self-contained live view: connects via `createChatConnection()` (no token — anonymous), joins `conversationId`'s group, seeds its local message list with a single synthetic `Inbound` entry for `firstMessage` (skip an extra `GET .../messages` round-trip for a session that only just began), and otherwise behaves like the agent panel's send/receive loop minus the REST fallback (an anonymous connection has no equivalent authenticated fallback path — if the hub is unreachable here, show an inline "تعذر الاتصال، حاول تحديث الصفحة" message instead).

### 6 — Wire the panel into the conversation detail page

**Edit file: `app/(pages)/conversations/[id]/page.tsx`** (created by Story 08) — replace the final `<SendMessageForm onSubmit={sendMessageAction.bind(null, id)} />` block with:

```tsx
{conversation.channel === "LiveChat" ? (
  <LiveChatPanel conversationId={id} initialMessages={messagesResult.success ? messagesResult.data.items : []} />
) : (
  <SendMessageForm onSubmit={sendMessageAction.bind(null, id)} />
)}
```

(adjust the exact variable names to whatever Story 08's implementation actually calls its fetched `conversation`/`messagesResult` values — this task assumes Story 08's Task 7 naming verbatim).

### 7 — Public route access

**Edit file: `proxy.ts`** — add `/widget` to `PUBLIC_PATHS` (line 5):

```ts
const PUBLIC_PATHS = ["/login", "/widget"];
```

`isPublicPath` (line 10) uses `pathname.startsWith(path)`, so this covers `/widget/live-chat` and any future widget sub-route without further edits. **Do not** add `/api/chat-token` here (Task 2) — that route must stay behind the normal authenticated guard.

No sidebar change in this story — `/widget/live-chat` is a customer-facing entry point, not an agent navigation destination.

## Edge Cases & Failure Modes

- **The token-relay route (Task 2) deliberately weakens the httpOnly cookie's XSS protection for this one token** — before this story, no code path anywhere exposes `AUTH_TOKEN_COOKIE`'s value to browser JS at all; after it, any script running in an authenticated agent's tab (including an XSS payload, should one ever land) can call `GET /api/chat-token` and read the real access token, where previously there was no client-readable copy of it anywhere. This is a deliberate, flagged tradeoff — necessary because `ChatHub`'s only supported authentication mechanism (backend Story 12) is validating the real JWT via `?access_token=`, and a browser cannot attach an httpOnly cookie's value to a URL itself. A future hardening step would have the backend mint a separate, hub-scoped, short-lived token instead of relaying the real one, but that requires a corresponding backend change this story does not make — call this out explicitly to reviewers, don't let it pass as an unremarkable implementation detail.
- **An expired auth cookie between page load and the relay-route call** — if an agent's session token expires while `/conversations/[id]` is already open, `LiveChatPanel`'s later call to `fetchAgentAccessToken()` hits `/api/chat-token`, which `proxy.ts`'s guard (unchanged, still applying to this path) redirects to `/login`; the client's `fetch` follows that redirect and receives the login page's HTML with a 200 status, not JSON. `fetchAgentAccessToken` (Task 3) checks the `content-type` header before parsing specifically to catch this and throw a clean error instead of an opaque JSON-parse exception — surfaced by `LiveChatPanel` as its `"error"` connection status (falling back to the REST `sendMessageAction` path, per Task 4).
- **`ChatHub` is not restricted to `LiveChat`-channel conversations server-side** (Prerequisites) — this story's frontend never hands the anonymous widget any conversation id except the one `startLiveChatAction` itself just created (which is always `LiveChat`-channel, by construction of the backend's `StartLiveChatCommandHandler`), so the widget path cannot be used to probe other channels' conversations. The agent panel only ever calls `JoinConversation` with the id of the conversation the agent is already viewing (which the agent's own authenticated session already has full access to via REST regardless), so this gap has no additional exposure from this story's code — but it remains a backend-side gap this frontend cannot close; do not build any feature on the assumption that the hub enforces channel scoping.
- **Reconnect does not re-join the group automatically** (Prerequisites) — `LiveChatPanel`'s `onreconnected` handler (Task 4) must explicitly re-invoke `JoinConversation`; omitting this means a client that survives a brief network blip (SignalR's `withAutomaticReconnect()` reconnects the underlying connection transparently) silently stops receiving broadcasts thereafter, with no visible error — this is the single most important correctness detail in this story's client code, more so than the initial `JoinConversation` call, since a working demo can easily hide this bug if the connection never drops during testing.
- **The widget always starts a brand-new conversation, never resumes a previous one** — per `StartLiveChatCommandHandler` (backend Story 12), refreshing or reopening `/widget/live-chat` for the same email creates an entirely separate `Conversation` row each time; there is no session/cookie on the widget side that could even attempt to resume one. Same "every submission is a new episode" behavior Story 08 already documents for the web-form path — consistent, not a regression.
- **SignalR connection failure** (hub unreachable, CORS misconfigured for a non-dev origin, a corporate proxy blocking WebSocket upgrades) — both `LiveChatPanel` and the widget page must catch `connection.start()`'s rejection and any later `invoke` failure without crashing the page; the agent panel degrades to the REST fallback (Task 4), the widget shows an inline retry message (Task 5) since it has no REST fallback of its own to degrade to.
- **CORS is currently allow-listed for `http://localhost:3100` only** (Prerequisites) — this story's code makes no assumption about the allow-list beyond local development; deploying anywhere else requires a corresponding backend configuration change this story's code cannot make, only flag.
- **Two widget browser tabs open for the same customer/email simultaneously** — each independently calls `startLiveChatAction`, producing two unrelated `Conversation` rows and two unrelated hub groups; nothing in this story merges them. Not a bug — same one-submission-one-conversation model as everywhere else in this KAN-3 slice.

## Test Plan

No automated test infrastructure exists in this repository (confirmed by inspection of `package.json`, same as Story 08). Manual verification only.

1. **Manual smoke test (widget start + message):** open `/widget/live-chat` in a signed-out browser (or private window), submit name/email/first message, confirm the page switches to the live view without redirecting to `/login`.
2. **Manual smoke test (agent joins, real-time exchange):** as a signed-in agent, navigate to `/conversations` (from Story 08), find the new `LiveChat` conversation, open its detail page, confirm `LiveChatPanel` renders (not the plain `SendMessageForm`); send a message from the agent panel and confirm it appears in the still-open widget tab in real time, and vice versa.
3. **Manual smoke test (reconnect-and-rejoin):** with both tabs connected and exchanging messages, briefly stop and restart the `azm-crm-backend` API process; confirm both clients' connections recover (SignalR's automatic reconnect) and that messages sent **after** the restart still reach both tabs — this specifically exercises the `onreconnected`-re-joins-the-group fix from Task 4/Edge Cases, not just the reconnect itself.
4. **Manual smoke test (fallback path):** simulate a hub-connection failure (e.g. temporarily point `NEXT_PUBLIC_API_BASE_URL` at an unreachable port, or block the `/hubs/chat` request in browser dev tools), confirm `LiveChatPanel` shows its degraded-mode notice and that sending a message still succeeds via the Story 08 REST path (visible after a manual page refresh).
5. **Manual check (token relay does not leak to unauthenticated visitors):** while signed out, request `/api/chat-token` directly and confirm it does not return a token (redirected to `/login` by `proxy.ts`, or a 401 if reached directly without a cookie).

## Verification Steps

1. **Frontend builds:** `pnpm build` from the repository root.
2. **Lint passes:** `pnpm lint`.
3. **Frontend + backend run together:** `pnpm dev` (frontend) and the `azm-crm-backend` API (its KAN-3 Story 12 deployed) both running locally; CORS already allows `http://localhost:3100` (Prerequisites) — no backend config change needed for local verification.
4. **Manual smoke tests:** all five in the Test Plan above.

## Done Criteria

- [ ] `POST /api/conversations/live-chat/start` is reachable from `/widget/live-chat` without requiring sign-in (`proxy.ts`'s `PUBLIC_PATHS` updated).
- [ ] `app/api/chat-token/route.ts` returns the agent's real access token only to an already-authenticated browser session, and is not exempted from `proxy.ts`'s normal guard.
- [ ] `/conversations/[id]` renders `LiveChatPanel` (not the plain reply form) for `LiveChat`-channel conversations, and the plain `SendMessageForm` unchanged for every other channel.
- [ ] An agent and an anonymous widget visitor can exchange messages in real time on the same `LiveChat` conversation.
- [ ] A client that reconnects after a dropped connection re-joins the conversation's group and continues receiving messages (not just reconnects the socket).
- [ ] A hub-connection failure degrades gracefully (REST fallback for the agent panel, an inline retry notice for the widget) rather than crashing either page.
- [ ] `pnpm build` and `pnpm lint` both succeed with no new errors.

**STOP HERE. Report to the user — this KAN-3 slice (frontend Stories 08–09) is now complete once this story lands.**
