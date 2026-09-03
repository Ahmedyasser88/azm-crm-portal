# Story 23 — AI-Suggested Ticket Replies (Story: KAN-7)

## Prerequisites

- [22-story-ai-ticket-summaries-KAN-7.md](22-story-ai-ticket-summaries-KAN-7.md) completed: this story **edits** `app/(pages)/tickets/[id]/page.tsx` a second time, inserting its own panel directly below `TicketAiSummaryPanel` in the same new "AI" section that story establishes. It does not depend on Story 22's persisted `aiSummary` fields functionally — it only shares that story's insertion point — but is numbered after it so both AI panels land on the ticket detail page in one predictable block rather than two separate merges.
- [05-story-ticket-core-crud-KAN-2.md](05-story-ticket-core-crud-KAN-2.md) completed: this story **edits** `app/(pages)/tickets/actions.ts`, created by that story.
- **Backend dependency**: the `azm-crm-backend` sibling repo's `feature/kan-7-ai-features` branch (Story 26, `AI-Suggested Ticket Replies`) is already implemented, exposing:
  - `GET /api/tickets/{id}/suggested-reply` → `Result<TicketReplySuggestionDto>` (200) / 400 (AI provider unavailable) / 404. `TicketReplySuggestionDto`: `suggestedReply` (string).

  The backend assembles the same title/category/priority/status/description/comment-thread context Story 22's summary endpoint uses, and returns a **fresh, non-persisted** draft reply on every call — nothing is written to the `Ticket` row. There is no FK linking `Ticket` (KAN-2) to `Conversation` (KAN-3) anywhere in this codebase, so the suggested reply cannot be inserted directly into a conversation's message composer the way KAN-4 Story 12's quick-reply-template picker inserts into `SendMessageForm` — the agent copies the text out manually, the same "frontend copies text into an existing send call" precedent that story's own plan documents for this exact limitation.

## Story Goal

Let an agent generate a draft, customer-facing reply from a ticket's context with one click, satisfying KAN-7's **"Suggest replies based on ticket context"** acceptance criterion.

Outcome: `/tickets/[id]` gains an "الرد المقترح" (Suggested Reply) card below the AI summary card. A button fetches a fresh suggestion on demand; once shown, the agent can copy it to the clipboard to paste into whichever conversation channel (email, WhatsApp, live chat, etc.) they're actually replying through.

**Not in scope**: persisting or historizing suggested replies (each click discards the previous suggestion, matching the backend's own non-persisted design); auto-wiring the suggestion into `SendMessageForm` or any conversation's composer (no `Ticket`↔`Conversation` link exists to resolve which conversation, if any, corresponds to this ticket); editing the suggested text in place before copying (the agent edits it after pasting, in whichever composer they use).

## Context — Read These Files First

1. [22-story-ai-ticket-summaries-KAN-7.md](22-story-ai-ticket-summaries-KAN-7.md) Tasks 2–4 — the `generateTicketAiSummaryAction`/`TicketAiSummaryPanel`/ticket-detail-page insertion shape this story's own reply-suggestion action/panel sit directly beside. Unlike that story's action, this one is a **read** (`GET`, no persistence) triggered on demand, not a mutation followed by `router.refresh()`.
2. [app/(pages)/tickets/actions.ts](app/(pages)/tickets/actions.ts) lines 138–149 — `searchCustomersAction`'s shape: a server action called directly from a client event handler that returns plain data (not a `TicketActionResult`), swallowing failures. This story's `getSuggestedTicketReplyAction` instead returns a discriminated result (`{success:true; reply:string} | {success:false; error:string}`) since a failed AI call has no reasonable "empty list" fallback — the agent needs to see that generation failed, not silently see nothing happen.
3. [components/tickets/EscalateTicketControl.tsx](components/tickets/EscalateTicketControl.tsx) — read in full (95 lines) for its `isSubmitting`/`error` state-handling shape, reused here without the confirmation modal or `router.refresh()` (this panel holds its own fetched reply text in local state — there is nothing server-rendered to refresh).
4. [app/(pages)/tickets/[id]/page.tsx](app/(pages)/tickets/[id]/page.tsx) — confirms where Story 22 inserts `TicketAiSummaryPanel`; this story's `TicketSuggestedReplyPanel` is added immediately after it.

## Implementation tasks

### 1 — Server action

**Edit file: `app/(pages)/tickets/actions.ts`** — add, after `generateTicketAiSummaryAction` (Story 22):

```ts
export type SuggestedReplyResult = { success: true; reply: string } | { success: false; error: string };

export async function getSuggestedTicketReplyAction(ticketId: string): Promise<SuggestedReplyResult> {
  const result = await apiServerFetch<{ suggestedReply: string }>({
    url: `/api/tickets/${ticketId}/suggested-reply`,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, reply: result.data.suggestedReply };
}
```

This is a plain `GET` (`apiServerFetch`'s default `method`), matching the endpoint's own `[HttpGet]` — unlike Story 22's `POST`, no ticket state changes.

### 2 — Suggested reply panel

**Create file: `components/tickets/TicketSuggestedReplyPanel.tsx`** (`"use client"`):

```ts
export type TicketSuggestedReplyPanelProps = { ticketId: string };
```

State: `reply: string | null`, `error: string | null`, `isLoading: boolean`, `copied: boolean`. On button click, call `getSuggestedTicketReplyAction(ticketId)`; on failure set `error` and clear `reply`; on success set `reply` and clear `error`. Renders a `.card space-y-4`:

- `<h2>الرد المقترح</h2>`.
- A button labeled `"اقتراح رد"` when `reply` is `null`, `"إعادة الاقتراح"` once a reply has been shown; `disabled={isLoading}`, text `"جارٍ الاقتراح..."` while loading.
- When `reply` is set: a read-only `<textarea readOnly rows={5} value={reply} />` (same `inputClassName` styling convention as other forms in this codebase) plus a `"نسخ"` (Copy) button that calls `navigator.clipboard.writeText(reply)` and briefly shows `"تم النسخ"` (toggle `copied` true, reset after ~2s via `setTimeout`) instead of `"نسخ"`.
- `error && <p role="alert" className="text-sm text-red-600">{error}</p>`.

### 3 — Wire into the ticket detail page

**Edit file: `app/(pages)/tickets/[id]/page.tsx`** — import `TicketSuggestedReplyPanel` and render it directly after `TicketAiSummaryPanel` (Story 22):

```tsx
<TicketSuggestedReplyPanel ticketId={id} />
```

No props beyond `ticketId` — the panel fetches on demand and holds its own state, unlike `TicketAiSummaryPanel` which reads persisted fields from the page's existing `ticket` fetch.

## Edge Cases & Failure Modes

- **The backend AI provider is unavailable or times out** — surfaced via the panel's `error` state in the shared `role="alert"` paragraph; no stale reply is shown since a failed call also clears any previously fetched `reply` (the agent must retry, not act on a suggestion left over from a different, earlier state of the ticket).
- **`navigator.clipboard.writeText` throws** (e.g. a non-secure context or a browser without Clipboard API permission) — wrap the call in `try/catch`; on failure, fall back to selecting the textarea's text (`textareaRef.current?.select()`) so the agent can still copy manually via `Ctrl+C`, rather than failing silently.
- **Clicking "إعادة الاقتراح" repeatedly** — each click discards the previous suggestion and fetches a fresh one; no debounce needed since it is an explicit button click, not a type-ahead search.
- **A ticket with a very long comment thread** — the backend caps its own context assembly at 20 comments (Story 22's Prerequisites document this identically for the summary endpoint); no frontend truncation is needed.
- **Copying an empty ticket description/no comments yet** — the backend still returns a generic but valid reply drafted from title/category/priority/status alone; no special frontend handling.

## Test Plan

No automated test infrastructure exists in this repository. Manual verification only, per Verification Steps below.

## Verification Steps

1. **Frontend builds:** `pnpm build` from the repository root.
2. **Lint passes:** `pnpm lint`.
3. **Frontend runs against a live backend:** `pnpm dev`, with `azm-crm-backend`'s `feature/kan-7-ai-features` branch running locally.
4. **Manual smoke test:** open a ticket's detail page, click "اقتراح رد" and confirm a draft reply appears in the read-only textarea; click "نسخ" and paste elsewhere to confirm the clipboard held the exact suggested text; click "إعادة الاقتراح" and confirm a new (possibly different) draft replaces the old one.

## Done Criteria

- [ ] `/tickets/[id]` shows a suggested-reply card that fetches a draft reply on demand.
- [ ] The suggested reply can be copied to the clipboard with a visible confirmation.
- [ ] An AI-provider failure surfaces as an inline error with no stale suggestion left displayed.
- [ ] `pnpm build` and `pnpm lint` both succeed with no new errors.
