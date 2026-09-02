# Story 10 — Dashboard Core: My Assigned Tickets & Customer Summary (Story: KAN-4)

## Prerequisites

- [05-story-ticket-core-crud-KAN-2.md](05-story-ticket-core-crud-KAN-2.md) completed: this story's ticket links reuse `ticketEndpoints`' patterns and `/tickets/{id}` as the link target.
- [06-story-ticket-assignment-KAN-2.md](06-story-ticket-assignment-KAN-2.md) completed: `Ticket.assignedToUserId` is what the backend's "my tickets" filter is built on.
- [01-story-customer-core-crud-KAN-1.md](01-story-customer-core-crud-KAN-1.md) completed: this story links to `/customers/{id}` for the embedded customer summary.
- **Backend dependency**: the `azm-crm-backend` sibling repo's Story 13 (`Dashboard Core: My Assigned Tickets & Customer Summary`) must be deployed, exposing:
  - `GET /api/dashboard/tickets?pageNumber=&pageSize=&status=` → `Result<PaginatedResult<DashboardTicketDto>>` (200) — tickets assigned to the caller only, resolved server-side from the bearer token (no `userId` parameter).
  - `GET /api/dashboard/summary` → `Result<DashboardSummaryDto>` (200) — per-status counts plus `escalatedCount`, scoped to the caller.

  `DashboardTicketDto` fields (camelCased over the wire): `id`, `title`, `category` (string enum), `priority` (string enum), `status` (string enum), `createdOn`, `isEscalated`, `escalatedOn` (nullable), `customer` (nullable `CustomerSummaryDto`). `CustomerSummaryDto`: `id`, `fullName`, `companyName` (nullable), `email` (nullable), `phoneNumber` (nullable). `customer` is `null` when the ticket's customer was soft-deleted — see Edge Cases. `DashboardSummaryDto`: `totalAssigned`, `new`, `open`, `inProgress`, `onHold`, `resolved`, `closed`, `reopened`, `escalatedCount` — all `number`.
- This is the first story in the KAN-4 ("Agent Dashboard") slice on the frontend. It introduces `app/(pages)/dashboard/page.tsx`'s real content (replacing the placeholder) and the `components/dashboard/` folder. [11-story-agent-tasks-reminders-KAN-4.md](11-story-agent-tasks-reminders-KAN-4.md) and [12-story-quick-reply-templates-KAN-4.md](12-story-quick-reply-templates-KAN-4.md) each **edit** this story's `app/(pages)/dashboard/page.tsx` to append one more panel, the same way KAN-1 Stories 02–04 each added one section to `/customers/[id]/page.tsx` — this story must leave room for that. [13-story-ticket-collaboration-comments-KAN-4.md](13-story-ticket-collaboration-comments-KAN-4.md) touches only `/tickets/[id]/page.tsx` and is independent of all three dashboard stories.

## Story Goal

Give a support agent a real dashboard at `/dashboard` (replacing the current placeholder) showing the tickets assigned to them and, for each, the customer it belongs to — covering two of KAN-4's five acceptance criteria in one pass: **"View all assigned tickets in one place"** and **"Access customer information from the dashboard"**.

Outcomes:
1. Headline summary cards (total assigned, and a few key status/escalation counts) from `GET /api/dashboard/summary`.
2. A **"تذاكري" (My Tickets) panel** listing tickets from `GET /api/dashboard/tickets`, each showing title (linking to `/tickets/{id}`), category/priority/status/escalation badges, creation date, and the linked customer's name (and company, when present — linking to `/customers/{id}`), or a "بيانات العميل غير متاحة" fallback when the embedded customer is `null`.
3. A status filter (`?status=`) and pagination (`?page=`) over the same panel.

**Not in scope for this story**: tasks/reminders (Story 11), quick reply templates (Story 12), ticket collaboration comments (Story 13), and any way to view a teammate's dashboard — the backend endpoints accept no `userId` parameter, so there is nothing for this story's UI to expose for that either.

## Context — Read These Files First

1. [app/(pages)/dashboard/page.tsx](app/(pages)/dashboard/page.tsx) — read in full (11 lines). The current placeholder this story **replaces entirely**. `lib/constants/sidebar.ts` line 7 already routes `/dashboard` here with the "لوحة التحكم" label — no sidebar change needed.
2. [lib/api/ticket.api.ts](lib/api/ticket.api.ts) — read in full (45 lines). `ticketEndpoints`' exact shape (`apiServerFetch` calls with `cache: "no-store"`) this story's new `dashboardEndpoints` mirrors.
3. [lib/api/customer.api.ts](lib/api/customer.api.ts) — read in full (47 lines). Precedent for a nested-resource-style endpoints object; not called directly by this story (the backend already embeds the customer summary), but its `CustomerListItem` field set (`id`, `fullName`, `companyName`, `email`, `phoneNumber`) is exactly `CustomerSummaryDto`'s shape (Prerequisites), confirming no new customer type is needed beyond the dashboard-scoped one this story defines.
4. [lib/types/ticket.ts](lib/types/ticket.ts) — read in full (43 lines). `TicketCategory`/`TicketPriority`/`TicketStatus` string-union types this story's `DashboardTicket` type reuses via `import type`.
5. [lib/constants/ticket.ts](lib/constants/ticket.ts) — read in full (30 lines). `TICKET_CATEGORY_LABELS`/`TICKET_PRIORITY_LABELS`/`TICKET_STATUS_LABELS` this story's ticket panel reuses as-is — no new labels needed.
6. [app/(pages)/tickets/[id]/page.tsx](app/(pages)/tickets/[id]/page.tsx) lines 47–61 — the exact inline badge markup (`<span className="inline-block rounded-full bg-primary-100 text-primary text-xs font-medium px-2 py-0.5">`, and the `bg-destructive/10 text-destructive` variant for the escalated badge) this story's ticket panel repeats literally — this codebase has no shared `Badge` component, badges are written inline at each call site.
7. [components/tickets/TicketFilters.tsx](components/tickets/TicketFilters.tsx) lines 50–61 (`updateParam`) and 112–122 (the "تذاكري" toggle button). Exact `useSearchParams`/`useRouter().replace(...)`-based single-param-update pattern this story's new `DashboardStatusFilter` component follows, simplified to one `<select>` instead of multiple filters.
8. [components/customers/NoteHistorySection.tsx](components/customers/NoteHistorySection.tsx) lines 31–35, 66–87. Exact `buildHref`/prev-next-pagination-link shape this story's ticket panel reuses, with `?page=` as the param name (this page has no other paginated section yet, so no need for a more specific name like `?ticketsPage=` — Story 11/12 add their own independently-paginated panels below this one and will each pick their own param name, e.g. `?tasksPage=`, following the same one-param-per-section convention KAN-1 established).
9. [lib/utils/date.ts](lib/utils/date.ts) — read in full (12 lines). `formatDateTime`, reused for `createdOn`.
10. [lib/types/pagination.ts](lib/types/pagination.ts) — read in full (10 lines). `PaginatedResult<T>` this story's `dashboardEndpoints.myTickets` response is typed with.

## Implementation tasks

### 1 — Types

**Create file: `lib/types/dashboard.ts`**

```ts
import type { TicketCategory, TicketPriority, TicketStatus } from "./ticket";

export type CustomerSummary = {
  id: string;
  fullName: string;
  companyName: string | null;
  email: string | null;
  phoneNumber: string | null;
};

export type DashboardTicket = {
  id: string;
  title: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdOn: string;
  isEscalated: boolean;
  escalatedOn: string | null;
  customer: CustomerSummary | null;
};

export type DashboardSummary = {
  totalAssigned: number;
  new: number;
  open: number;
  inProgress: number;
  onHold: number;
  resolved: number;
  closed: number;
  reopened: number;
  escalatedCount: number;
};
```

### 2 — API client

**Create file: `lib/api/dashboard.api.ts`**

```ts
import { apiServerFetch } from "./fetch";
import type { DashboardTicket, DashboardSummary } from "../types/dashboard";
import type { TicketStatus } from "../types/ticket";
import type { PaginatedResult } from "../types/pagination";

const DASHBOARD_URL = "/api/dashboard";

export const dashboardEndpoints = {
  myTickets: (params: { pageNumber?: number; pageSize?: number; status?: TicketStatus }) =>
    apiServerFetch<PaginatedResult<DashboardTicket>>({
      url: `${DASHBOARD_URL}/tickets`,
      params: {
        pageNumber: params.pageNumber ?? 1,
        pageSize: params.pageSize ?? 20,
        status: params.status,
      },
      cache: "no-store",
    }),
  summary: () =>
    apiServerFetch<DashboardSummary>({ url: `${DASHBOARD_URL}/summary`, cache: "no-store" }),
};
```

This follows `ticketEndpoints`' exact shape (Context item 2) — `undefined` filter values are dropped by `apiServerFetch`'s `getFullUrl`, so passing `params.status` straight through when unset is safe.

### 3 — Status filter component

**Create file: `components/dashboard/DashboardStatusFilter.tsx`** (`"use client"`) — a single native `<select>` over `TICKET_STATUSES`/`TICKET_STATUS_LABELS` (Context item 5), writing `?status=` via `useSearchParams`/`useRouter().replace(...)` and clearing `?page=` on change — the same `updateParam` shape as `TicketFilters.tsx` (Context item 7), reduced to one field:

```ts
export type DashboardStatusFilterProps = { initialStatus: string };
```

### 4 — Dashboard page

**Create file: `app/(pages)/dashboard/page.tsx`** (Server Component, replacing the placeholder in full) — reads `searchParams: Promise<{ page?: string; status?: string }>`, fetches `dashboardEndpoints.summary()` and `dashboardEndpoints.myTickets({ pageNumber, status })` via `Promise.all` (independent reads, no reason to serialize them). Degrades gracefully: `summary` renders only when its fetch succeeds (no summary cards on failure, not a page-level error — a dashboard should still show the ticket list even if the summary call has a transient issue); the tickets panel falls back to an empty list on failure, matching every other list page's `result.success ? result.data.items : []` convention in this codebase.

Renders:
- A `.card` header: `<h1>` "لوحة التحكم" + a one-line subtitle.
- When `summary` loaded: a `grid grid-cols-2 gap-4 sm:grid-cols-4` of four `.card`-styled stat tiles (plain `<div className="card space-y-1">` each, no new shared component — matching this codebase's "duplicate small JSX rather than add an abstraction" convention already visible in the ticket detail page's repeated badge markup, Context item 6): **الإجمالي** (`summary.totalAssigned`), **جديدة** (`summary.new`), **قيد التنفيذ** (`summary.inProgress`), **مُصعّدة** (`summary.escalatedCount`, using the `text-destructive` tone from Context item 6 on the number).
- A `.card space-y-4` "تذاكري" panel: header row with `<h2>تذاكري</h2>` and `<DashboardStatusFilter initialStatus={status ?? ""} />`; below it, either the empty state `<p className="text-sm text-text-secondary text-center py-6">لا توجد تذاكر مُسندة إليك</p>` or a `<ul className="space-y-3">` of `<li className="border-b border-gray-300 last:border-0 pb-3">` rows, each showing: the title as a `<Link href={`/tickets/${ticket.id}`}>`, the three-or-four inline badges from Context item 6 (category/priority/status, plus the escalated badge only `{ticket.isEscalated && ...}`), the customer line (`ticket.customer` present: `<Link href={`/customers/${ticket.customer.id}`}>` showing `ticket.customer.companyName ? `${fullName} — ${companyName}` : fullName`, styled `text-xs text-text-secondary hover:underline`, matching the `فتح تذكرة`/`عرض التذاكر` cross-link styling precedent from Story 05; `ticket.customer` `null`: a plain `<p className="text-xs text-text-secondary">بيانات العميل غير متاحة</p>`), and `formatDateTime(ticket.createdOn)` right-aligned. Prev/Next pagination using `?page=` built exactly like `NoteHistorySection`'s `buildHref` (Context item 8), preserving `?status=` via `new URLSearchParams(searchParams.toString())`.

Leave room in this file's returned `<div className="space-y-6">` for Stories 11 and 12 to each append one more `.card` panel below the "تذاكري" panel, the same way KAN-1's customer detail page accumulated sections across Stories 02–04.

## Edge Cases & Failure Modes

- **A dashboard ticket's embedded `customer` is `null`** (its customer was soft-deleted after the ticket was created) — the panel renders "بيانات العميل غير متاحة" instead of a broken link or a thrown error; this is the backend's documented, expected shape for that case (Prerequisites), not a bug to work around.
- **`GET /api/dashboard/summary` fails** (network error, 500) — the summary cards section is simply omitted (`{summary && (...)}`); the "تذاكري" panel below still renders from its own independent fetch. Do not let a summary failure block the whole page.
- **`GET /api/dashboard/tickets` fails** — the panel shows its empty state ("لا توجد تذاكر مُسندة إليك") rather than distinguishing "zero tickets" from "fetch failed"; this mirrors every other list page in this codebase (e.g. `TicketsPage`'s `result.success ? result.data.items : []`) and keeps the dashboard resilient rather than throwing on a transient backend hiccup.
- **An agent has zero assigned tickets** — `totalAssigned`/every summary count is `0` (not omitted), and the ticket panel shows its empty state — both are valid, non-error states per the backend contract (Prerequisites).
- **A ticket is both `InProgress` and escalated** — `summary.inProgress` and `summary.escalatedCount` both count it; this is intentional (the backend documents escalation as an orthogonal flag, not a status bucket, in its own Story 13 plan) — do not treat the two counts as mutually exclusive or expect them to sum to `totalAssigned`.
- **`?status=` in the URL holds a value not in `TICKET_STATUSES`** (a hand-edited URL) — passed straight through to `dashboardEndpoints.myTickets`; the backend's model binder rejects an unrecognized enum string with a framework-level 400, which surfaces as a failed fetch and the panel's empty state (previous bullet) rather than a page crash, since this story does not add a page-level `throw new Error(...)` for this fetch (unlike the tickets list page, which does throw on a non-404 error — this dashboard panel deliberately degrades instead, since a single bad filter value on a "my dashboard" page shouldn't break the whole view).

## Test Plan

No automated test infrastructure exists in this repository yet (no `test` script in `package.json`, per KAN-1 Story 01's identical note). Manual verification only, per the Verification Steps below.

## Verification Steps

1. **Frontend builds:** `npm run build` (or `pnpm build`) from the repository root.
2. **Lint passes:** `npm run lint`.
3. **Frontend runs against a live backend:** `npm run dev`, with `azm-crm-backend` running locally (Story 13 deployed) and `NEXT_PUBLIC_API_BASE_URL` pointing at it.
4. **Manual smoke test:** log in, land on `/dashboard`, confirm the summary cards render with correct counts; assign a ticket to yourself (via `/tickets/{id}`'s existing assignment control from KAN-2 Story 06) and confirm it appears in the "تذاكري" panel with its category/priority/status badges, creation date, and the correct customer name linking to `/customers/{id}`; filter by status via the dropdown and confirm the list narrows and `?status=` updates in the URL; with more than one page of assigned tickets, confirm pagination works and preserves the status filter.

## Done Criteria

- [ ] `/dashboard` shows summary cards (total assigned, new, in progress, escalated) sourced from `GET /api/dashboard/summary`.
- [ ] `/dashboard` lists the caller's assigned tickets with category/priority/status/escalation badges, creation date, and the linked customer's name (or a fallback when the customer is unavailable).
- [ ] The status filter and pagination both work and compose correctly (`?status=` is preserved across page changes).
- [ ] No way exists in the UI to view another agent's dashboard.
- [ ] `npm run build` and `npm run lint` both succeed with no new errors.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 11.**
