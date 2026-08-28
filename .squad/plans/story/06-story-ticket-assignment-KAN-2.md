# Story 06 — Ticket Assignment to Agents (Story: KAN-2)

## Prerequisites

- [05-story-ticket-core-crud-KAN-2.md](05-story-ticket-core-crud-KAN-2.md) completed: requires `lib/types/ticket.ts`, `lib/api/ticket.api.ts`, `app/(pages)/tickets/actions.ts`, and the `/tickets/[id]` page's `<div className="space-y-6">` wrapper (left open by that story for exactly this purpose).
- **Backend dependency**: the `azm-crm-backend` sibling repo's Story 06 (`Ticket Assignment to Agents`) must be deployed, exposing:
  - `PUT /api/tickets/{id}/assign` → `Result` (200) / 404 (unknown ticket, or an `assignedToUserId` that doesn't resolve to any `ApplicationUser`) / 400
  - `GET /api/tickets/{id}` and `GET /api/tickets` responses now additionally include `assignedToUserId` (nullable guid) and `assignedToUserName` (nullable string)
  - `GET /api/tickets?assignedToUserId=...` filters the list to one agent's tickets

  `AssignTicketRequest` body: `{ assignedToUserId: string | null }` — `null` unassigns. `TicketDto`/`TicketListItemDto` gain `assignedToUserId`/`assignedToUserName` as **trailing** fields (no reordering of existing fields).

## Story Goal

Let support agents assign a ticket to a specific agent account, or unassign it, satisfying KAN-2's "Assign tickets to specific agents" acceptance criterion. Every assignment change is recorded as a `TicketHistory` entry, automatically picked up by [05-story-ticket-core-crud-KAN-2.md](05-story-ticket-core-crud-KAN-2.md)'s `TicketHistorySection` with no changes to that component.

Outcomes:
1. An assignment control on `/tickets/[id]` shows the current assignee (or "غير مسندة" / unassigned) and lets an agent assign, reassign, or unassign the ticket.
2. A **one-click "أسند إليّ" (assign to me)** shortcut, since the backend exposes no "list all agents" endpoint (see Edge Cases) — the only agent an operator can assign *by name* without external knowledge of another agent's id is themselves.
3. `/tickets` gains an "تذاكري" (My Tickets) quick filter and shows the assignee's name in the list.

**Not in scope**: a picker/dropdown of all agents (no backend endpoint exists to list them — see Edge Cases for the precise limitation and what would be needed to add one), enforcing that the assigned account is an active agent (the backend doesn't check this either), and assignment notifications.

## Context — Read These Files First

1. [05-story-ticket-core-crud-KAN-2.md](05-story-ticket-core-crud-KAN-2.md) — read in full. This story edits several files that story created (`lib/types/ticket.ts`, `lib/api/ticket.api.ts`, `app/(pages)/tickets/actions.ts`, `app/(pages)/tickets/page.tsx`, `app/(pages)/tickets/[id]/page.tsx`, `components/tickets/TicketFilters.tsx`) rather than creating a parallel set of files.
2. [lib/types/identity.ts](lib/types/identity.ts) — `CurrentUser` (8 lines): `userId`, `fullName`, `username`, `email`, `mobileNumber`, `roles`. `userId`/`fullName` are exactly what the "assign to me" shortcut needs.
3. [lib/api/identity.api.ts](lib/api/identity.api.ts) — read in full (21 lines). `getCurrentUser()` (lines 17–20) resolves to `CurrentUser | null`, already used by every page under `app/(pages)/layout.tsx` for the header — this story calls it a second time directly from `/tickets/[id]/page.tsx` (a second, cheap `GET /api/identity/me` call) to know the signed-in agent's id/name for the "assign to me" button. There is no per-request caching to reuse here; a second call is the straightforward option and consistent with how `apiServerFetch` is used everywhere else in this codebase (no shared request-level cache exists).
4. [components/customers/DeleteCustomerButton.tsx](components/customers/DeleteCustomerButton.tsx) — read in full (56 lines). Precedent for a small client component that calls a server action, shows a `sonner` `toast.error(...)` on failure, and `router.refresh()`/`router.push(...)` on success — the shape `AssignTicketControl` (Task 3) follows, minus the confirm dialog (assigning isn't destructive enough to need one, unlike deleting).
5. [app/(pages)/tickets/[id]/page.tsx](app/(pages)/tickets/[id]/page.tsx) — created by Story 05. This story **edits** this file to fetch the current user and render the new assignment control inside the existing `<div className="space-y-6">` wrapper.
6. [app/(pages)/tickets/page.tsx](app/(pages)/tickets/page.tsx) and [components/tickets/TicketFilters.tsx](components/tickets/TicketFilters.tsx) — created by Story 05. This story edits both: the list table gains an "المسندة إلى" column, and the filters gain an "تذاكري" toggle.
7. [lib/api/ticket.api.ts](lib/api/ticket.api.ts) — created by Story 05 (`ticketEndpoints.list`/`getById`/`history.list`). This story only edits the shared `lib/types/ticket.ts` fields these calls already deserialize into — no new endpoint function is needed for *reading* assignment data (it rides along on the existing `getById`/`list` responses), only for *writing* it (Task 2's `assignTicketAction`).

## Implementation tasks

### 1 — Types

**Edit file: `lib/types/ticket.ts`** — append two fields to `Ticket` and `TicketListItem` (`TicketListItem` is a `Pick<Ticket, ...>`, so its own field list needs the two names added too):

```ts
export type Ticket = {
  id: string;
  customerId: string;
  title: string;
  description: string | null;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdOn: string;
  updatedOn: string | null;
  assignedToUserId: string | null;
  assignedToUserName: string | null;
};

export type TicketListItem = Pick<
  Ticket,
  | "id"
  | "customerId"
  | "title"
  | "category"
  | "priority"
  | "status"
  | "createdOn"
  | "assignedToUserId"
  | "assignedToUserName"
>;
```

### 2 — Server action

**Edit file: `app/(pages)/tickets/actions.ts`** — add, alongside `createTicketAction`/`updateTicketAction`:

```ts
export async function assignTicketAction(
  ticketId: string,
  assignedToUserId: string | null
): Promise<TicketActionResult> {
  const result = await apiServerFetch<void>({
    url: `/api/tickets/${ticketId}/assign`,
    method: "PUT",
    body: { assignedToUserId },
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/tickets");
  return { success: true };
}
```

### 3 — Assignment control component

**Create file: `components/tickets/AssignTicketControl.tsx`** (`"use client"`) — Props:

```ts
export type AssignTicketControlProps = {
  ticketId: string;
  assignedToUserId: string | null;
  assignedToUserName: string | null;
  currentUserId: string;
  currentUserName: string;
};
```

Renders a `.card` with:
- Header: "الإسناد".
- Current state: "مسندة إلى **{assignedToUserName}**" when assigned, or "غير مسندة" (unassigned) when `assignedToUserId` is `null`. If `assignedToUserId` is non-null but `assignedToUserName` is `null` (the resolved agent's account no longer exists — see Edge Cases), show the raw `assignedToUserId` guid instead of a blank name, so the operator isn't left looking at nothing.
- **"أسند إليّ" button** — shown whenever `assignedToUserId !== currentUserId` (i.e. hidden when the ticket is already assigned to the signed-in agent). Calls `assignTicketAction(ticketId, currentUserId)`.
- **"إلغاء الإسناد" button** (`variant="outline"`) — shown only when `assignedToUserId` is non-null. Calls `assignTicketAction(ticketId, null)`.
- A small raw-id assign field as a fallback for assigning to *another* named agent, since no agent-picker is possible (see Edge Cases): a text `<input>` labeled "معرّف الموظف" (agent id) + a "إسناد" button that calls `assignTicketAction(ticketId, input.trim())` — validate client-side only that the field is non-empty before calling; the backend 404s on an unknown id, surfaced via `toast.error(...)`.
- All three actions: on success, `router.refresh()`; on failure, `toast.error(result.error)` (same `sonner` pattern as `DeleteCustomerButton`) and no navigation.

### 4 — Ticket detail page wiring

**Edit file: `app/(pages)/tickets/[id]/page.tsx`** — import `getCurrentUser` from `@/lib/api/identity.api` and `AssignTicketControl` from `@/components/tickets/AssignTicketControl`. After fetching the ticket, fetch the current user:

```ts
const currentUser = await getCurrentUser();
```

Inside the JSX, add (after the main ticket-details card, alongside where `TicketHistorySection` renders):

```tsx
{currentUser && (
  <AssignTicketControl
    ticketId={id}
    assignedToUserId={ticket.assignedToUserId}
    assignedToUserName={ticket.assignedToUserName}
    currentUserId={currentUser.userId}
    currentUserName={currentUser.fullName}
  />
)}
```

`currentUser` should never actually be `null` here in practice (`proxy.ts` already blocks unauthenticated access to every `/tickets/*` route), but guard it anyway rather than asserting non-null, consistent with how `getCurrentUser()`'s own doc-comment (`lib/api/identity.api.ts` lines 10–16) describes it as resolving to `null` when a redirect is already underway.

### 5 — List page: assignee column and "my tickets" filter

**Edit file: `app/(pages)/tickets/page.tsx`** — add `assignedToUserId` to the `searchParams` type; when `assignedToUserId === "me"` (a sentinel string, not a real guid — see below), resolve it to the current user's id before calling `ticketEndpoints.list`:

```ts
const currentUser = await getCurrentUser();
const resolvedAssignedToUserId =
  assignedToUserId === "me" ? currentUser?.userId : assignedToUserId;

const result = await ticketEndpoints.list({
  // ...existing params...
  customerId,
  status: status as TicketStatus | undefined,
  category: category as TicketCategory | undefined,
  priority: priority as TicketPriority | undefined,
  search,
  assignedToUserId: resolvedAssignedToUserId,
});
```

Using the literal string `"me"` in the URL (`?assignedToUserId=me`) rather than the operator's real guid keeps the "تذاكري" link shareable/bookmarkable and identical for every agent, resolved server-side per-request from whoever is actually signed in — add one new column "المسندة إلى" to the table, rendering `item.assignedToUserName ?? "—"`.

**Edit file: `components/tickets/TicketFilters.tsx`** (created by Story 05) — add a "تذاكري" toggle button/link that sets `?assignedToUserId=me` (and a way to clear it back to unfiltered), following the same `useSearchParams`-based URL-building pattern already used for the status/category/priority selects.

## Edge Cases & Failure Modes

- **There is no backend endpoint to list all agents/users** — confirmed: `IdentityController` (`azm-crm-backend/src/AzmCrm.API/Controllers/IdentityController.cs`) only exposes `register`, `login`, `refresh-token`, `revoke-token`, and `me` — no `GET /api/identity/users` or equivalent. This is why `AssignTicketControl` cannot offer a dropdown of agents and instead offers only "assign to me" (always resolvable, since the signed-in agent's id/name are already known via `getCurrentUser()`) plus a raw-id text field for assigning to someone else. Document this precisely: **assigning to a *named* colleague requires knowing their id out-of-band** (e.g. from a shared list, or by having them "assign to me" from their own session and reading it off the ticket) until a backend agent-listing endpoint exists — flag that as a follow-up, not something this story can work around on the frontend alone.
- **Assigning to an unknown/mistyped agent id via the raw-id field** — the backend's `AssignTicketCommandHandler` checks the id via `IIdentityQueryService.GetUserInfoAsync` and 404s if it doesn't resolve to any `ApplicationUser`; surfaced via `toast.error(result.error)`.
- **Re-assigning to the currently-assigned agent** — the backend no-ops (no new history row, still `Result.Success()`); `AssignTicketControl` simply re-renders the same state after `router.refresh()`. The "أسند إليّ" button is hidden once already assigned to the current user specifically to avoid inviting this no-op, but the raw-id field could still be used to "reassign" to the same id — harmless.
- **Unassigning an already-unassigned ticket** — same no-op backend behavior; the "إلغاء الإسناد" button is hidden whenever `assignedToUserId` is already `null`, so this path is only reachable via a stale UI state before a refresh (e.g. two browser tabs) — harmless if it does fire.
- **`assignedToUserName` is `null` while `assignedToUserId` is non-null** — happens if the assigned `ApplicationUser` account was hard-deleted after assignment (never done by this codebase's own endpoints, but possible via direct DB access) without the FK's `DeleteBehavior.SetNull` having fired for some reason, or more simply if `GetTicketByIdQueryHandler`'s name lookup itself fails transiently. `AssignTicketControl` falls back to showing the raw id (Task 3) rather than rendering an empty/undefined name.
- **The "تذاكري" link's `?assignedToUserId=me` sentinel colliding with a real user id that happens to be the literal string `"me"`** — impossible; every `ApplicationUser.Id` is a `Guid` (`IdentityUser<Guid>`), never the string `"me"`.
- **An unauthenticated request somehow reaching `/tickets/[id]` despite `proxy.ts`** — `getCurrentUser()` resolves to `null`; the assignment control is simply not rendered (Task 4's `{currentUser && (...)}` guard) rather than crashing on a missing `currentUserId` prop.

## Test Plan

No automated test infrastructure exists in this repository yet (see Story 05's Test Plan note). Manual verification only, per the Verification Steps below.

## Verification Steps

1. **Frontend builds:** `npm run build` from the repository root.
2. **Lint passes:** `npm run lint`.
3. **Manual smoke test:** with `azm-crm-backend` running (Story 06 deployed) and `npm run dev`, open an existing ticket's detail page, confirm it shows "غير مسندة"; click "أسند إليّ" and confirm it now shows your own name and the "أسند إليّ" button disappears while "إلغاء الإسناد" appears; confirm the ticket's history section shows an `Assigned` entry; click "إلغاء الإسناد" and confirm it returns to "غير مسندة" with an `Unassigned` history entry; use the raw agent-id field with a nonexistent guid and confirm the rejection surfaces via a toast; on `/tickets`, click "تذاكري" and confirm the list filters to tickets assigned to you; confirm the "المسندة إلى" column shows names correctly.

## Done Criteria

- [ ] `/tickets/[id]` shows the current assignee (or "غير مسندة") and supports assign-to-me, unassign, and raw-id assign.
- [ ] Assignment and unassignment each produce a visible `TicketHistory` entry in the existing history section.
- [ ] `/tickets` shows an "المسندة إلى" column and a working "تذاكري" quick filter.
- [ ] Assigning to an unknown agent id surfaces a clear error via toast.
- [ ] `npm run build` and `npm run lint` both succeed with no new errors.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 07.**
