# Story 22 — AI-Generated Ticket Summaries (Story: KAN-7)

## Prerequisites

- [05-story-ticket-core-crud-KAN-2.md](05-story-ticket-core-crud-KAN-2.md) completed: this story **edits** `app/(pages)/tickets/[id]/page.tsx`, `lib/types/ticket.ts`, and `app/(pages)/tickets/actions.ts`, all created by that story.
- **Backend dependency**: the `azm-crm-backend` sibling repo's `feature/kan-7-ai-features` branch (Story 25, `AI-Generated Ticket Summaries`) is already implemented, exposing:
  - `POST /api/tickets/{id}/ai-summary` → `Result<TicketAiSummaryDto>` (200) / 400 (AI provider unavailable) / 404. `TicketAiSummaryDto`: `ticketId` (Guid), `summary` (string), `generatedOn` (DateTime).
  - `TicketDto` (returned by the existing `GET /api/tickets/{id}`, consumed by `ticketEndpoints.getById`) now carries two trailing nullable fields: `aiSummary` (string | null) and `aiSummaryGeneratedOn` (string | null) — the persisted result of the last summary generation, `null` until the first call.

  The backend assembles the AI prompt from the ticket's title, category, priority, status, description, and its internal comment thread (oldest-first, capped at 20 comments) — no equivalent context needs to be sent from the frontend; the endpoint takes no request body. Every call **regenerates and overwrites** the persisted summary — there is no history/versioning.

## Story Goal

Let an agent generate a plain-language AI summary of a ticket — its context, history, and current state — with one click, satisfying KAN-7's **"Generate AI ticket summaries"** acceptance criterion.

Outcome: `/tickets/[id]` gains an "ملخص الذكاء الاصطناعي" (AI Summary) card between the SLA card and the history section. It shows the persisted `aiSummary`/`aiSummaryGeneratedOn` when present, or an empty-state message when not, plus a button that calls the generation endpoint and refreshes the page to show the new summary.

**Not in scope**: summary history/versioning (every regeneration overwrites the previous summary, matching the backend's own documented scope decision); editing the AI-generated text before it is saved (the backend persists it directly; the frontend only displays what was returned, exactly as it did for KAN-5's SLA fields); auto-generating a summary on ticket creation or on every detail-page view (generation is explicitly agent-triggered, once per click, to avoid an unwanted AI call on every page load).

## Context — Read These Files First

1. [lib/types/ticket.ts](lib/types/ticket.ts) — read in full (51 lines). The `Ticket` type this story appends `aiSummary`/`aiSummaryGeneratedOn` to (not `TicketListItem`, which the backend's `TicketListItemDto` does not extend).
2. [lib/api/ticket.api.ts](lib/api/ticket.api.ts) — read in full (55 lines). `ticketEndpoints.getById` already returns the extended `Ticket` shape once Task 1 lands; no new entry needed here (mutations live in `actions.ts`, matching this file's read-only-query convention — see Context item 4).
3. [components/tickets/EscalateTicketControl.tsx](components/tickets/EscalateTicketControl.tsx) — read in full (95 lines). Precedent for a `"use client"` ticket-detail control that calls a server action and follows up with `router.refresh()` to pick up the server-rendered page's next fetch, rather than holding server data in local state. This story's `TicketAiSummaryPanel` follows the same shape but with no confirmation modal (a single "توليد الملخص" button, not a destructive action).
4. [app/(pages)/tickets/actions.ts](app/(pages)/tickets/actions.ts) — read in full (162 lines). This story adds a new `generateTicketAiSummaryAction` here, following `escalateTicketAction`'s exact shape (lines 99–116): call `apiServerFetch` directly with a POST to a `/api/tickets/{id}/...` sub-route, return `TicketActionResult`, `revalidatePath` both `/tickets` and `/tickets/{id}`.
5. [app/(pages)/tickets/[id]/page.tsx](app/(pages)/tickets/[id]/page.tsx) lines 106–125 — the exact spot (after `EscalateTicketControl`, before the SLA card) this story inserts `<TicketAiSummaryPanel ... />` into. The page already destructures `ticket` from `ticketEndpoints.getById(id)` (line 32), so `ticket.aiSummary`/`ticket.aiSummaryGeneratedOn` are available with no new fetch.
6. [lib/utils/date.ts](lib/utils/date.ts) — confirm `formatDateTime` — reused here for `aiSummaryGeneratedOn`, exactly as the SLA card (page.tsx lines 112–125) already formats `responseDueOn`/`resolutionDueOn`.

## Implementation tasks

### 1 — Types

**Edit file: `lib/types/ticket.ts`** — add two trailing fields to `Ticket` (after `respondedOn`, line 22):

```ts
respondedOn: string | null;
aiSummary: string | null;
aiSummaryGeneratedOn: string | null;
```

`TicketListItem` (the `Pick<Ticket, ...>` type, lines 25–42) is **not** changed — the backend's `TicketListItemDto` does not carry these fields, matching the SLA fields' own precedent (`slaPolicyId` etc. are on both, but `aiSummary` mirrors `respondedOn`'s "detail-only" placement... actually `respondedOn` **is** picked into `TicketListItem`; `aiSummary`/`aiSummaryGeneratedOn` are the first `Ticket` fields **not** included in `TicketListItem`, since the ticket list view has no use for a full AI summary paragraph per row).

### 2 — Server action

**Edit file: `app/(pages)/tickets/actions.ts`** — add, after `escalateTicketAction` (after line 116):

```ts
export async function generateTicketAiSummaryAction(ticketId: string): Promise<TicketActionResult> {
  const result = await apiServerFetch<void>({
    url: `/api/tickets/${ticketId}/ai-summary`,
    method: "POST",
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/tickets");
  return { success: true };
}
```

The generated `TicketAiSummaryDto` body itself is discarded here (typed `void`) — the panel picks up the new `aiSummary`/`aiSummaryGeneratedOn` via `router.refresh()` re-running the page's own `ticketEndpoints.getById(id)` call, the same "refresh, don't thread data through the action result" pattern `escalateTicketAction`/`EscalateTicketControl` already establish for `isEscalated`/`escalatedOn`.

### 3 — AI summary panel

**Create file: `components/tickets/TicketAiSummaryPanel.tsx`** (`"use client"`) — same shape as `EscalateTicketControl.tsx` minus the modal:

```ts
export type TicketAiSummaryPanelProps = {
  ticketId: string;
  aiSummary: string | null;
  aiSummaryGeneratedOn: string | null;
};
```

State: `error: string | null`, `isSubmitting: boolean`. On button click, call `generateTicketAiSummaryAction(ticketId)`; on failure set `error`; on success call `router.refresh()`. Renders a `.card space-y-4`:

- `<h2>ملخص الذكاء الاصطناعي</h2>`.
- When `aiSummary` is present: `<p className="text-sm text-text-default whitespace-pre-wrap">{aiSummary}</p>` followed by `<p className="text-xs text-text-secondary">آخر تحديث: {formatDateTime(aiSummaryGeneratedOn!)}</p>`.
- When `aiSummary` is `null`: `<p className="text-sm text-text-secondary">لم يتم توليد ملخص بعد.</p>`.
- A button, label switching between `"توليد الملخص"` (no summary yet) and `"إعادة توليد الملخص"` (a summary already exists), `disabled={isSubmitting}`, showing `"جارٍ التوليد..."` while submitting.
- `error && <p role="alert" className="text-sm text-red-600">{error}</p>` below the button, same convention as every other control in this file's precedent.

### 4 — Wire into the ticket detail page

**Edit file: `app/(pages)/tickets/[id]/page.tsx`** — import `TicketAiSummaryPanel` and insert it directly after the `EscalateTicketControl` block (after line 110, before the SLA card at line 112):

```tsx
<TicketAiSummaryPanel
  ticketId={id}
  aiSummary={ticket.aiSummary}
  aiSummaryGeneratedOn={ticket.aiSummaryGeneratedOn}
/>
```

No new data fetch is needed — `ticket` (from the page's existing `ticketEndpoints.getById(id)` call, line 32) already carries the two new fields once Task 1 lands.

## Edge Cases & Failure Modes

- **The backend AI provider is unavailable or times out** — `GenerateTicketSummaryCommandHandler` returns a `Result` failure (400); `generateTicketAiSummaryAction` surfaces it via `TicketActionResult`'s `{success:false, error}` shape, and `TicketAiSummaryPanel` renders it in the shared `role="alert"` paragraph — the persisted `aiSummary` (if any from a prior successful call) is left untouched and keeps rendering, since nothing overwrote it server-side.
- **Regenerating an existing summary** — always overwrites; the panel has no confirmation step (unlike `EscalateTicketControl`'s modal) since regenerating is non-destructive to any other resource and reversible by regenerating again.
- **A ticket with no description and no comments yet** — the backend still returns a summary (it has title/category/priority/status at minimum); no special frontend handling needed.
- **Two agents click "توليد الملخص" concurrently on the same ticket** — last write wins server-side (no optimistic-concurrency check, consistent with every other mutating control in this codebase, e.g. `AssignTicketControl`); not addressed by this story.
- **`aiSummaryGeneratedOn` is non-null but `aiSummary` is somehow null** (should not happen given the backend always sets both together) — the panel's `aiSummary` presence check alone gates which branch renders, so this combination simply falls into the "no summary yet" empty state; not treated as an error.

## Test Plan

No automated test infrastructure exists in this repository. Manual verification only, per Verification Steps below.

## Verification Steps

1. **Frontend builds:** `pnpm build` from the repository root.
2. **Lint passes:** `pnpm lint`.
3. **Frontend runs against a live backend:** `pnpm dev`, with `azm-crm-backend`'s `feature/kan-7-ai-features` branch running locally (Ollama configured per that repo's `appsettings.Development.json`, no API key needed).
4. **Manual smoke test:** open an existing ticket's detail page, confirm the "ملخص الذكاء الاصطناعي" card shows "لم يتم توليد ملخص بعد."; click "توليد الملخص" and confirm a summary appears with a "آخر تحديث" timestamp after the page refreshes; add an internal comment (existing `TicketCommentsSection`), regenerate the summary, and confirm the button now reads "إعادة توليد الملخص" and the summary text changes to reflect the new comment.

## Done Criteria

- [ ] `/tickets/[id]` shows an AI summary card with the persisted summary and generation timestamp, or an empty state when none exists.
- [ ] Clicking the generate/regenerate button calls the backend, persists a new summary, and the page reflects it after refresh.
- [ ] An AI-provider failure surfaces as an inline error without discarding a previously generated summary.
- [ ] `pnpm build` and `pnpm lint` both succeed with no new errors.
