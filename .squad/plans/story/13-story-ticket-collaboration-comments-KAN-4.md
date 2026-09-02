# Story 13 — Ticket Collaboration: Internal Comments (Story: KAN-4)

## Prerequisites

- [05-story-ticket-core-crud-KAN-2.md](05-story-ticket-core-crud-KAN-2.md) completed: requires `ticketEndpoints` and `app/(pages)/tickets/[id]/page.tsx`, both edited by this story.
- [07-story-ticket-status-escalation-KAN-2.md](07-story-ticket-status-escalation-KAN-2.md) completed: this story's Task 5 appends its new section after the `EscalateTicketControl` that story adds to the same detail page.
- Independent of [10-story-dashboard-core-tickets-customers-KAN-4.md](10-story-dashboard-core-tickets-customers-KAN-4.md), [11-story-agent-tasks-reminders-KAN-4.md](11-story-agent-tasks-reminders-KAN-4.md), and [12-story-quick-reply-templates-KAN-4.md](12-story-quick-reply-templates-KAN-4.md) — this story only touches `/tickets/[id]/page.tsx` and its own new files, none of which the other three KAN-4 stories edit. Can be implemented in any order relative to them.
- **Backend dependency**: the `azm-crm-backend` sibling repo's Story 16 (`Ticket Collaboration: Internal Comments`) must be deployed, exposing:
  - `POST /api/tickets/{id}/comments` → `Result<Guid>` (201) / 400 / 404 (unknown/soft-deleted ticket)
  - `GET /api/tickets/{id}/comments?pageNumber=&pageSize=` → `Result<PaginatedResult<TicketCommentDto>>` (200) / 404 — **oldest first**, unlike ticket history's newest-first ordering.

  `TicketCommentDto` fields (camelCased): `id`, `ticketId`, `content`, `createdBy` (guid), `createdByName` (nullable string — `null` when the author's account no longer resolves), `createdOn`.

## Story Goal

Let a support agent leave an internal comment on a ticket, visible to every other agent who opens it, with the author's name shown — satisfying KAN-4's **"Collaborate with team members"** acceptance criterion. This is a **read-oldest-first, append-only** collaboration thread, structurally the closest existing precedent being `NoteHistorySection`/`AddNoteForm` (KAN-1 Story 03's customer notes) applied to a ticket instead of a customer, with one addition: each entry shows who wrote it, since "who on the team said this" is the entire point here (a customer note never needed that, since it's not a multi-agent conversation in the same way).

Outcomes:
1. A **"التعاون الداخلي" (Internal Collaboration) section** on the ticket detail page (`/tickets/[id]`), below the existing history/assignment/escalation sections, showing every comment oldest-first with its author's name and timestamp.
2. An "إضافة تعليق" action that posts a new comment and refreshes the thread.

**Not in scope for this story**: editing or deleting a posted comment (matches `CustomerNote`'s append-only convention, and the backend exposes no such endpoints), @mentions or notifications, comment threading/replies, and any comment visibility to the customer (strictly an internal/agent-only thread — never surfaced through `/conversations`).

## Context — Read These Files First

1. [components/customers/NoteHistorySection.tsx](components/customers/NoteHistorySection.tsx) — read in full (100 lines). This story's `TicketCommentsSection` is this component with three differences: (a) `?notesPage=` becomes `?commentsPage=`, (b) each entry additionally renders `comment.createdByName ?? "عضو سابق في الفريق"` (see Edge Cases for the fallback), and (c) the ordering is oldest-first exactly as the backend returns it — this component already renders whatever order its `notes` prop arrives in without re-sorting, so no logic change is needed there, only a doc-comment noting the ordering is intentional and must not be reversed.
2. [components/customers/AddNoteForm.tsx](components/customers/AddNoteForm.tsx) — read in full (67 lines). This story's `AddCommentForm` is this component with `content`/`addNoteAction(customerId, values)` replaced by `content`/`addTicketCommentAction(ticketId, values)`, and the field label "ملاحظة" → "تعليق".
3. [lib/types/customerNote.ts](lib/types/customerNote.ts) — read in full (11 lines). `TicketComment`'s exact shape precedent, plus the two new fields (`createdByName`, and `ticketId` instead of `customerId`).
4. [app/(pages)/customers/actions.ts](app/(pages)/customers/actions.ts) lines 67–80 (`logInteractionAction`, for the action-that-refreshes-and-returns-a-result shape) — more precisely, grep this file for `addNoteAction` to find its exact signature (`(customerId: string, values: AddNoteFormValues) => Promise<CustomerActionResult | undefined>`) — `addTicketCommentAction` in `app/(pages)/tickets/actions.ts` (this story edits that file) follows the identical shape with `ticketId` in place of `customerId`.
5. [lib/api/customer.api.ts](lib/api/customer.api.ts) lines 31–38 (`notes.list`) — exact nested-endpoint shape this story's `ticketEndpoints.comments.list` (Task 2) mirrors, added as a sibling of the existing `history` member in `lib/api/ticket.api.ts`.
6. [lib/api/ticket.api.ts](lib/api/ticket.api.ts) — read in full (45 lines). This story edits this file, adding a `comments` member after the existing `history` member (after line 44, before the closing `};` on line 45).
7. [app/(pages)/tickets/actions.ts](app/(pages)/tickets/actions.ts) — read in full (131 lines). This story edits this file, adding `addTicketCommentAction` after the existing `escalateTicketAction` (after line 115) and before `CustomerSearchResult`/`searchCustomersAction` — or anywhere in the file; exact position doesn't matter functionally, but grouping it with the other "mutate and stay on the current page" ticket actions (`assignTicketAction`, `changeTicketStatusAction`, `escalateTicketAction`) keeps the file's existing organization (ticket mutations first, customer-search helper last) intact.
8. [app/(pages)/tickets/[id]/page.tsx](app/(pages)/tickets/[id]/page.tsx) — read in full (108 lines, current end-state after KAN-2 Stories 06–07). This story edits this file: adds a `commentsPage` field to the `searchParams` type (line 16), fetches `ticketEndpoints.comments.list(id, { pageNumber: commentsPageNumber })` alongside the existing `historyResult` fetch, and renders `<TicketCommentsSection ... />` after `<TicketHistorySection ... />` (after line 104, inside the same closing `</div>` at line 105).
9. [lib/utils/date.ts](lib/utils/date.ts) — read in full (12 lines). `formatDateTime`, reused for each comment's `createdOn`.
10. [lib/types/pagination.ts](lib/types/pagination.ts) — read in full (10 lines). `PaginatedResult<T>` this story's `comments.list` response is typed with.

## Implementation tasks

### 1 — Types

**Create file: `lib/types/ticketComment.ts`**

```ts
export type TicketComment = {
  id: string;
  ticketId: string;
  content: string;
  createdBy: string;
  createdByName: string | null;
  createdOn: string;
};

export type AddCommentFormValues = {
  content: string;
};
```

### 2 — API client

**Edit file: `lib/api/ticket.api.ts`** — add `import type { TicketComment } from "../types/ticketComment";` (the type created in Task 1) to the existing import block (alongside the `TicketHistoryEntry` import on line 3), and add a `comments` member as a sibling of `history` (after line 44's closing `},`, before the object's final closing `};`):

```ts
  comments: {
    list: (ticketId: string, params: { pageNumber?: number; pageSize?: number } = {}) =>
      apiServerFetch<PaginatedResult<TicketComment>>({
        url: `${TICKETS_URL}/${ticketId}/comments`,
        params: { pageNumber: params.pageNumber ?? 1, pageSize: params.pageSize ?? 20 },
        cache: "no-store",
      }),
  },
```

### 3 — Server action

**Edit file: `app/(pages)/tickets/actions.ts`** — add, after `escalateTicketAction` (after line 115):

```ts
export async function addTicketCommentAction(
  ticketId: string,
  values: { content: string }
): Promise<TicketActionResult | undefined> {
  const result = await apiServerFetch<string>({
    url: `/api/tickets/${ticketId}/comments`,
    method: "POST",
    body: { content: values.content.trim() },
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath(`/tickets/${ticketId}`);
  return { success: true };
}
```

No `redirect()` — this is a "mutate and stay on the current page" action, the same shape as `assignTicketAction`/`changeTicketStatusAction`/`escalateTicketAction` in this same file (lines 60–115), not `createTicketAction`'s "create and navigate elsewhere" shape.

### 4 — Comment form and thread section

**Create file: `components/tickets/AddCommentForm.tsx`** (`"use client"`) — `AddNoteForm.tsx`'s exact shape (Context item 2), with:

```ts
export type AddCommentFormProps = {
  ticketId: string;
  onAdded: () => void;
};
```

Field: **تعليق** (`content`, required, `<textarea rows={3}>`), calling `addTicketCommentAction(ticketId, values)` on submit.

**Create file: `components/tickets/TicketCommentsSection.tsx`** — `NoteHistorySection.tsx`'s exact shape (Context item 1), `"use client"` for the same `useSearchParams`-based pagination-link reason `NoteHistorySection` itself is a client component. Props:

```ts
export type TicketCommentsSectionProps = {
  ticketId: string;
  comments: TicketComment[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  page: number;
};
```

Renders a `.card space-y-4` with:
- Header: `<h2>التعاون الداخلي</h2>` + `<Button onClick={() => setOpen(true)}>إضافة تعليق</Button>`.
- Empty state: `<p className="text-sm text-text-secondary text-center py-6">لا توجد تعليقات بعد — كن أول من يعلّق</p>`.
- Otherwise a `<ul className="space-y-3">` of `<li className="border-b border-gray-300 last:border-0 pb-3">` rows — **do not sort or reverse `comments`; render exactly as received** (the backend returns oldest-first, a deliberate deviation from `TicketHistorySection`'s newest-first ordering, per the backend's own Story 16 documentation) — each showing the author's name (`comment.createdByName ?? "عضو سابق في الفريق"`, styled `text-xs font-medium text-text-default`), the comment `content` (`whitespace-pre-wrap`), and `formatDateTime(comment.createdOn)`.
- Prev/Next pagination using `?commentsPage=` as the query param name — the fourth independently-namespaced paginated section on this page, alongside the existing `?historyPage=` (Story 05) and any future ones, per the one-param-per-section convention Story 05's Edge Cases already documents.
- The add modal, same `fixed inset-0` overlay shape as `NoteHistorySection` lines 89–97, containing `<AddCommentForm ticketId={ticketId} onAdded={handleAdded} />` where `handleAdded` closes the modal and calls `router.refresh()`.

### 5 — Wire into the ticket detail page

**Edit file: `app/(pages)/tickets/[id]/page.tsx`** — add `commentsPage?: string` to the `searchParams` type (line 16), destructure it (line 21), compute `const commentsPageNumber = Number(commentsPage) || 1;` alongside the existing `historyPageNumber` (line 35), fetch `const commentsResult = await ticketEndpoints.comments.list(id, { pageNumber: commentsPageNumber });` alongside the existing `historyResult` fetch (line 36), and render, after the existing `<TicketHistorySection ... />` call (after line 104, still inside the closing `</div>` at line 105):

```tsx
<TicketCommentsSection
  ticketId={id}
  comments={commentsResult.success ? commentsResult.data.items : []}
  hasNextPage={commentsResult.success ? commentsResult.data.hasNextPage : false}
  hasPreviousPage={commentsResult.success ? commentsResult.data.hasPreviousPage : false}
  page={commentsPageNumber}
/>
```

Add `import { TicketCommentsSection } from "@/components/tickets/TicketCommentsSection";` to the existing import block (alongside the `TicketHistorySection` import on line 4).

## Edge Cases & Failure Modes

- **A comment's author no longer resolves to a known account** (`createdByName` is `null`) — render "عضو سابق في الفريق" ("a former team member") rather than an empty string or the raw `createdBy` guid; this mirrors the backend's own documented fallback behavior for `GetTicketsListQueryHandler`'s assignee-name resolution (the same `IIdentityQueryService` gap).
- **`GET /api/tickets/{id}/comments` orders oldest-first, unlike `GET /api/tickets/{id}/history`'s newest-first** — `TicketCommentsSection` must render `comments` in the exact order received; do not add a `.sort()`/`.reverse()` anywhere in this component or its parent page. This is the single most important correctness rule in this story — reversing it would make a collaboration thread read bottom-to-top like an inverted chat log.
- **Comments are never editable or deletable** — matches the backend's own append-only design (no `PUT`/`DELETE` endpoint exists for a comment); `TicketCommentsSection` has no edit/delete affordance at all, unlike Story 11/12's tasks/templates panels which do.
- **Posting a whitespace-only comment** — rejected server-side (`NotEmpty()` on `content`, which FluentValidation treats a whitespace-only string as failing); the `<textarea>` is marked `required` and the server error still surfaces via `AddCommentForm`'s shared `role="alert"` pattern if bypassed.
- **`content` over 4000 characters** — rejected server-side with a 400; not mirrored client-side (same reasoning as every other field-length edge case in this codebase, e.g. Story 05's ticket title/description limits) — surfaces via the shared error paragraph.
- **Commenting on a ticket that was concurrently soft-deleted** — `POST`/`GET` both 404 (the backend's `AnyAsync` guard excludes soft-deleted tickets); a `GET` 404 on this page would already have triggered `notFound()` earlier in `TicketDetailPage` (line 26) before `TicketCommentsSection` is ever reached, so this case can only manifest as a failed **post** (the ticket existed when the page loaded, was deleted mid-session) — `addTicketCommentAction`'s `result.success === false` surfaces the error via `AddCommentForm`'s shared paragraph; the modal stays open so the agent doesn't lose their typed comment.

## Test Plan

No automated test infrastructure exists in this repository yet (no `test` script in `package.json`, per KAN-1 Story 01's identical note). Manual verification only, per the Verification Steps below.

## Verification Steps

1. **Frontend builds:** `npm run build` (or `pnpm build`) from the repository root.
2. **Lint passes:** `npm run lint`.
3. **Frontend runs against a live backend:** `npm run dev`, with `azm-crm-backend` running locally (Story 16 deployed).
4. **Manual smoke test:** open an existing ticket's detail page, confirm a new "التعاون الداخلي" section renders below the history section with an empty state; post a comment and confirm it appears with your name and a timestamp; log in as a second registered user, open the same ticket, post a second comment, and confirm both comments now show in the order they were posted (oldest first) with the correct author name on each; with more than 20 comments, confirm `?commentsPage=` pagination works independently of `?historyPage=`.

## Done Criteria

- [ ] The ticket detail page shows a "التعاون الداخلي" section listing comments oldest-first, each with the author's resolved name (or a fallback) and timestamp.
- [ ] Posting a comment works end-to-end and the thread refreshes to show it without a full page reload.
- [ ] No edit/delete affordance exists for a posted comment.
- [ ] `?commentsPage=` pagination composes correctly with the existing `?historyPage=` on the same page.
- [ ] `npm run build` and `npm run lint` both succeed with no new errors.
