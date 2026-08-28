# Story 07 — Ticket Status Tracking & Escalation (Story: KAN-2)

## Prerequisites

- [05-story-ticket-core-crud-KAN-2.md](05-story-ticket-core-crud-KAN-2.md) completed: requires `lib/types/ticket.ts` (`Ticket.status` already exists, defaulting to `"New"`), `lib/api/ticket.api.ts`, `app/(pages)/tickets/actions.ts`, and the `/tickets/[id]` page's `<div className="space-y-6">` wrapper.
- Independent of [06-story-ticket-assignment-KAN-2.md](06-story-ticket-assignment-KAN-2.md) — status/escalation and assignment are separate sections on the same ticket detail page and can be implemented in either order, but this plan assumes Story 06 landed first only so both stories' edits to the same shared files (`lib/types/ticket.ts`, `app/(pages)/tickets/page.tsx`, `components/tickets/TicketFilters.tsx`, `app/(pages)/tickets/[id]/page.tsx`) don't need to be reconciled by hand. This story adds no dependency on `assignedToUserId`/`assignedToUserName` itself.
- **Backend dependency**: the `azm-crm-backend` sibling repo's Story 07 (`Ticket Status Tracking & Escalation`) must be deployed, exposing:
  - `PUT /api/tickets/{id}/status` → `Result` (200) / 404 / 400
  - `POST /api/tickets/{id}/escalate` → `Result` (200) / 404 / 400
  - `GET /api/tickets/{id}` and `GET /api/tickets` responses now additionally include `isEscalated` (bool) and `escalatedOn` (nullable datetime)
  - `GET /api/tickets?isEscalated=true` filters the list to escalated tickets only

  `ChangeTicketStatusRequest` body: `{ status: TicketStatus }` (any status value is accepted — the backend enforces no state machine). `EscalateTicketRequest` body: `{ reason: string | null }`. `TicketDto`/`TicketListItemDto` gain `isEscalated`/`escalatedOn` as **trailing** fields, after `assignedToUserId`/`assignedToUserName` if Story 06 landed first.

## Story Goal

Let support agents move a ticket through its status lifecycle and escalate a ticket that needs urgent attention, satisfying KAN-2's final acceptance criterion, "Track ticket status and escalation." Both actions are logged as `TicketHistory` entries, automatically picked up by [05-story-ticket-core-crud-KAN-2.md](05-story-ticket-core-crud-KAN-2.md)'s `TicketHistorySection` with no changes to that component.

Outcomes:
1. A status control on `/tickets/[id]` lets an agent change the ticket's status to any of the seven defined values.
2. An "تصعيد" (escalate) action on `/tickets/[id]` marks the ticket as escalated (with an optional reason) and shows an "مُصعّدة" badge once escalated, alongside the escalation timestamp.
3. `/tickets` gains an "المُصعّدة فقط" (escalated only) filter toggle and shows an escalation indicator per row.

**Not in scope**: enforcing a status transition workflow (any status may move to any other — the backend enforces none, and this story doesn't add client-side restrictions either, to avoid drifting from what the backend actually allows), and de-escalation (there is no `un-escalate` endpoint — once escalated, only creating a new ticket starts unescalated).

## Context — Read These Files First

1. [05-story-ticket-core-crud-KAN-2.md](05-story-ticket-core-crud-KAN-2.md) — read in full. This story edits several files that story created, following the exact same "edit the shared DTO/list/detail-page files" pattern [06-story-ticket-assignment-KAN-2.md](06-story-ticket-assignment-KAN-2.md) already used for `assignedToUserId`/`assignedToUserName` — read that story too as a second worked example of the same editing pattern before touching `lib/types/ticket.ts`, `app/(pages)/tickets/page.tsx`, `components/tickets/TicketFilters.tsx`, or `app/(pages)/tickets/[id]/page.tsx`.
2. [components/customers/AttachmentsSection.tsx](components/customers/AttachmentsSection.tsx) lines 1–24 — precedent for a small, self-contained `.card` section with its own inline "open a form dialog" state (`open`/`setOpen`), the shape `EscalateTicketControl`'s reason dialog follows, since `components/ui/` has no `Dialog` primitive (established in KAN-1 Story 01).
3. [components/customers/DeleteCustomerButton.tsx](components/customers/DeleteCustomerButton.tsx) — read in full (56 lines). The `sonner` `toast.error(...)` + `router.refresh()` pattern this story's `ChangeStatusControl`/`EscalateTicketControl` both reuse, same as [06-story-ticket-assignment-KAN-2.md](06-story-ticket-assignment-KAN-2.md)'s `AssignTicketControl`.
4. [lib/constants/ticket.ts](lib/constants/ticket.ts) — created by Story 05. `TICKET_STATUSES`/`TICKET_STATUS_LABELS` are exactly what the status-change `<select>` needs; no new constants file is required for status.
5. [app/(pages)/tickets/[id]/page.tsx](app/(pages)/tickets/[id]/page.tsx) — created by Story 05, edited by Story 06 (assignment control + `getCurrentUser()` call). This story adds two more controls (status, escalate) to the same file.
6. [app/(pages)/tickets/page.tsx](app/(pages)/tickets/page.tsx) and [components/tickets/TicketFilters.tsx](components/tickets/TicketFilters.tsx) — created by Story 05, edited by Story 06 (`assignedToUserId` filter, assignee column). This story adds an `isEscalated` filter and an escalation indicator column.

## Implementation tasks

### 1 — Types

**Edit file: `lib/types/ticket.ts`** — append two fields to `Ticket` and `TicketListItem` (after `assignedToUserId`/`assignedToUserName` if Story 06 already added them; otherwise directly after the Story 05 fields):

```ts
export type Ticket = {
  // ...existing fields (plus assignedToUserId/assignedToUserName if Story 06 landed)...
  isEscalated: boolean;
  escalatedOn: string | null;
};

export type TicketListItem = Pick<
  Ticket,
  // ...existing keys...
  | "isEscalated"
  | "escalatedOn"
>;
```

### 2 — Server actions

**Edit file: `app/(pages)/tickets/actions.ts`** — add, alongside the existing ticket actions:

```ts
import type { TicketStatus } from "@/lib/types/ticket";

export async function changeTicketStatusAction(
  ticketId: string,
  status: TicketStatus
): Promise<TicketActionResult> {
  const result = await apiServerFetch<void>({
    url: `/api/tickets/${ticketId}/status`,
    method: "PUT",
    body: { status },
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/tickets");
  return { success: true };
}

export async function escalateTicketAction(
  ticketId: string,
  reason: string
): Promise<TicketActionResult> {
  const result = await apiServerFetch<void>({
    url: `/api/tickets/${ticketId}/escalate`,
    method: "POST",
    body: { reason: reason.trim() || null },
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/tickets");
  return { success: true };
}
```

Add the `import type { TicketStatus } from "@/lib/types/ticket";` line to the file's existing import block (it currently only imports `TicketFormValues` from that module).

### 3 — Status control component

**Create file: `components/tickets/ChangeStatusControl.tsx`** (`"use client"`) — Props: `{ ticketId: string; status: TicketStatus }`. Renders a `.card` with:
- Header: "الحالة".
- A native `<select>` (from `TICKET_STATUSES`/`TICKET_STATUS_LABELS`) whose value is the current `status`. On change, immediately call `changeTicketStatusAction(ticketId, newStatus)` (no separate "save" button needed for a single-field control — mirrors how a native `<select>` is typically used for an inline status change); on success, `router.refresh()`; on failure, `toast.error(result.error)` and revert the `<select>`'s local state back to the original `status` prop (since the DOM `<select>` already visually changed before the request resolved).
- Show a brief "جارٍ التحديث..." disabled state on the `<select>` while the request is in flight.

### 4 — Escalate control component

**Create file: `components/tickets/EscalateTicketControl.tsx`** (`"use client"`) — Props: `{ ticketId: string; isEscalated: boolean; escalatedOn: string | null }`. Renders a `.card` with:
- Header: "التصعيد".
- When `isEscalated`, a small badge/line: "مُصعّدة منذ {formatDateTime(escalatedOn)}" (guard `escalatedOn` being non-null here — the backend always sets it together with `isEscalated = true`, so this should never render with a null value in practice, but fall back to just "مُصعّدة" with no timestamp if it ever is).
- A "تصعيد" button (`variant="destructive"`, signaling urgency) that opens a small inline reason form (same "plain overlay + `.card`" pattern as `LogInteractionForm`'s dialog in KAN-1 Story 02 — a single optional `<textarea>` for "السبب" plus a submit button) calling `escalateTicketAction(ticketId, reason)`. **Always show this button, even when already escalated** — re-escalating is a meaningful, non-idempotent action per the backend's own design (see Edge Cases), not a state the UI should hide once reached.
- On success, close the dialog and `router.refresh()`; on failure, `toast.error(result.error)`, keep the dialog open so the agent can retry.

### 5 — Ticket detail page wiring

**Edit file: `app/(pages)/tickets/[id]/page.tsx`** — import `ChangeStatusControl` and `EscalateTicketControl`. Inside the `<div className="space-y-6">` wrapper, alongside the assignment control (if Story 06 landed) and before `TicketHistorySection`, add:

```tsx
<ChangeStatusControl ticketId={id} status={ticket.status} />
<EscalateTicketControl
  ticketId={id}
  isEscalated={ticket.isEscalated}
  escalatedOn={ticket.escalatedOn}
/>
```

Also add an "مُصعّدة" badge next to the existing category/priority/status badges in the main ticket-details card (Story 05's markup) when `ticket.isEscalated` is `true`, so escalation is visible at a glance without scrolling to the dedicated control.

### 6 — List page: escalation filter and indicator

**Edit file: `app/(pages)/tickets/page.tsx`** — add `isEscalated` to the `searchParams` type (as a `"true"`/`undefined` string, since URL query params are always strings) and pass `isEscalated: isEscalated === "true" ? true : undefined` to `ticketEndpoints.list(...)`. Add an "مُصعّدة" column to the table (or fold it into the existing status column as a small icon/badge next to the status label) rendering an indicator when `item.isEscalated` is `true`.

**Edit file: `components/tickets/TicketFilters.tsx`** — add an "المُصعّدة فقط" toggle (a checkbox or a link-style toggle, consistent with whatever shape Story 06's "تذاكري" toggle used) that sets `?isEscalated=true` / clears it, following the same `useSearchParams`-based URL-building pattern as every other filter in this component.

## Edge Cases & Failure Modes

- **No status transition rules are enforced** — `ChangeStatusControl`'s `<select>` offers all seven `TICKET_STATUSES` regardless of the ticket's current status (e.g. `Closed → Open` is selectable), matching the backend's own lack of a state machine. Do not add client-side transition restrictions that the backend doesn't also enforce — that would create a UI that's stricter than the API, confusing anyone hitting the API directly.
- **Changing status to the value it already has** — the backend no-ops (no new history row, still success); `ChangeStatusControl`'s `<select>` simply shows the same value after `router.refresh()`.
- **Escalating an already-escalated ticket is *not* a no-op** — every click of "تصعيد" updates `escalatedOn` to the current time and logs a new history entry, even if `isEscalated` was already `true` (this is the backend's deliberate design — see the backend story's own note). `EscalateTicketControl` must not hide or disable the button once escalated, and must not treat repeat clicks as an error.
- **`reason` on escalate over 1000 characters** — rejected server-side with a 400; not mirrored client-side — surfaces via the reason dialog's error state (mirror `LogInteractionForm`'s `role="alert"` pattern inside the dialog).
- **`status` sent as an unrecognized value** — impossible from `ChangeStatusControl`'s `<select>` (only ever offers `TICKET_STATUSES`' values); not a client-side concern, documents why no extra validation is added, mirroring the identical note in KAN-1 Story 02 for `InteractionType`.
- **The status `<select>`'s optimistic-looking native behavior vs. an in-flight request failing** — Task 3 explicitly calls for reverting the `<select>`'s value back to the original `status` prop on failure, since the browser's native `<select>` already shows the newly-picked option the instant the user picks it, before the server action resolves; without the revert, a failed change would leave the UI showing a status that was never actually saved.
- **Combining `isEscalated=true` with the other filters** (`customerId`, `status`, `category`, `priority`, `search`, `assignedToUserId` from Story 06) — one more independent, AND-combined filter, consistent with every other filter added across Stories 05–06.
- **A ticket escalated, then its status changed, in either order** — both are independent fields on the same `Ticket` row with independent history event types (`Escalated` vs. `StatusChanged`); no interaction between them needs handling on the frontend.

## Test Plan

No automated test infrastructure exists in this repository yet (see Story 05's Test Plan note). Manual verification only, per the Verification Steps below.

## Verification Steps

1. **Frontend builds:** `npm run build` from the repository root.
2. **Lint passes:** `npm run lint`.
3. **Manual smoke test:** with `azm-crm-backend` running (Story 07 deployed) and `npm run dev`, open an existing ticket's detail page, change its status via the `<select>` and confirm the detail page reflects it and a `StatusChanged` history entry appears; click "تصعيد", enter a reason, submit, and confirm an "مُصعّدة" badge appears with a timestamp and an `Escalated` history entry; click "تصعيد" again with a different reason and confirm a *second* `Escalated` history entry appears (not deduplicated); on `/tickets`, toggle "المُصعّدة فقط" and confirm only escalated tickets show; confirm the list's escalation indicator matches each ticket's actual state.

## Done Criteria

- [ ] `/tickets/[id]` has a working status-change control covering all seven statuses, with no artificial transition restrictions.
- [ ] `/tickets/[id]` has a working escalate action (with optional reason) that can be triggered repeatedly, each time updating the timestamp and logging a new history entry.
- [ ] An escalated ticket shows a clear "مُصعّدة" indicator on both the detail page and the list.
- [ ] `/tickets` has a working "المُصعّدة فقط" filter.
- [ ] `npm run build` and `npm run lint` both succeed with no new errors.

This completes KAN-2's five acceptance criteria across Stories 05–07: create/track (05), categories/priorities (05), assign to agents (06), status/escalation (07), and complete history (05's `TicketHistorySection`, fed by every mutating action across all three stories).
