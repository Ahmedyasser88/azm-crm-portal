# Story 05 — Ticket Core CRUD, Categorization & History (Story: KAN-2)

## Prerequisites

- [01-story-customer-core-crud-KAN-1.md](01-story-customer-core-crud-KAN-1.md) completed: this story's ticket-create flow searches existing customers via `customerEndpoints.list` (created in that story) and the ticket detail page fetches a customer via `customerEndpoints.getById`.
- This is the first story in the KAN-2 ("Ticket Management System") slice.
- **Backend dependency**: the `azm-crm-backend` sibling repo's Story 05 (`Ticket Core CRUD, Categorization & History`) must be deployed, exposing:
  - `POST /api/tickets` → `Result<Guid>` (201) / 404 (unknown `customerId`) / 400 (validation)
  - `GET /api/tickets/{id}` → `Result<TicketDto>` (200) / 404
  - `GET /api/tickets?pageNumber=&pageSize=&customerId=&status=&category=&priority=&search=` → `Result<PaginatedResult<TicketListItemDto>>` (200)
  - `PUT /api/tickets/{id}` → `Result` (200) / 404 / 400
  - `GET /api/tickets/{id}/history?pageNumber=&pageSize=` → `Result<PaginatedResult<TicketHistoryDto>>` (200) / 404

  `TicketDto` fields (camelCased over the wire): `id`, `customerId`, `title`, `description` (nullable), `category` (string enum), `priority` (string enum), `status` (string enum), `createdOn`, `updatedOn` (nullable). `TicketListItemDto`: `id`, `customerId`, `title`, `category`, `priority`, `status`, `createdOn` — **no customer name field** (see Edge Cases). `TicketHistoryDto`: `id`, `ticketId`, `eventType` (string enum), `description`, `oldValue` (nullable), `newValue` (nullable), `createdBy` (guid), `createdOn`. `CreateTicketRequest` body: `{ customerId, title, description, category, priority }`. `UpdateTicketRequest` body: `{ title, description, category, priority }` — **no `customerId`**, a ticket cannot be moved to a different customer once created.

  Enum values (serialized as their names via the backend's global `JsonStringEnumConverter`):
  - `TicketCategory`: `"General"`, `"Technical"`, `"Billing"`, `"AccountAccess"`, `"FeatureRequest"`, `"Other"`
  - `TicketPriority`: `"Low"`, `"Medium"`, `"High"`, `"Urgent"`
  - `TicketStatus`: `"New"`, `"Open"`, `"InProgress"`, `"OnHold"`, `"Resolved"`, `"Closed"`, `"Reopened"` — a new ticket always starts as `"New"`, set server-side (not part of `CreateTicketRequest`).
  - `TicketHistoryEventType`: `"Created"`, `"Updated"`, `"Assigned"`, `"Unassigned"`, `"StatusChanged"`, `"Escalated"` — this story only ever produces `"Created"` and `"Updated"` entries; the other four are produced by [06-story-ticket-assignment-KAN-2.md](06-story-ticket-assignment-KAN-2.md) and [07-story-ticket-status-escalation-KAN-2.md](07-story-ticket-status-escalation-KAN-2.md).

## Story Goal

Give support agents a page to create and track support tickets against a customer, tag each ticket with a category and priority, edit it, and view its complete change history — covering three of KAN-2's five acceptance criteria: "Create and track support tickets", "Assign categories and priorities to tickets", and the foundation for "View complete ticket history" (Stories 06–07 add more event types to the same history view without changing this story's code).

Outcomes:
1. A **ticket list** page at `/tickets` with search, status/category/priority filters, and pagination.
2. A **create ticket** page at `/tickets/new` — with a customer search-and-select control, since creating a ticket requires an existing `customerId` and there is no way to type a raw id usably.
3. A **ticket detail** page at `/tickets/[id]` showing all ticket fields, the customer it belongs to, and its full history, with an Edit action.
4. An **edit ticket** page at `/tickets/[id]/edit` (title, description, category, priority — **not** the customer).
5. A **"التذاكر" (Tickets) sidebar entry**, since — unlike `/customers` in KAN-1 — no nav entry for tickets exists yet.
6. Small cross-links from the customer detail page (`/customers/[id]`) to open a ticket for that customer and to view that customer's tickets, since tickets are customer-scoped data.

**Not in scope for this story**: assigning a ticket to an agent (Story 06), status transitions beyond the initial `New` and escalation (Story 07), and deleting a ticket (KAN-2's acceptance criteria don't call for it, and the backend exposes no delete endpoint for tickets).

## Context — Read These Files First

1. [01-story-customer-core-crud-KAN-1.md](01-story-customer-core-crud-KAN-1.md) — read in full. This story repeats the exact same types/API-client/server-action/page shape it establishes for a second entity; do not re-derive the pattern.
2. [02-story-customer-interactions-KAN-1.md](02-story-customer-interactions-KAN-1.md) — read in full. `TicketHistorySection` (this story) is a **read-only, simpler** version of `InteractionHistorySection` — a paginated list with no "add" dialog, since ticket history entries are produced automatically by the create/update/assign/status/escalate actions, not typed in directly by an agent.
3. [lib/api/customer.api.ts](lib/api/customer.api.ts) — the `customerEndpoints` object (`list`, `getById`) this story's `ticket.api.ts` mirrors, and which this story's customer-picker and ticket-detail page call directly for cross-entity lookups.
4. [app/(pages)/customers/actions.ts](app/(pages)/customers/actions.ts) — the `"use server"` mutation-action pattern (`createCustomerAction`'s shape: build request body, call `apiServerFetch`, `revalidatePath`, `redirect` on success) this story's `app/(pages)/tickets/actions.ts` mirrors for `createTicketAction`/`updateTicketAction`, plus a new `searchCustomersAction` this story adds for the customer picker (see Task 4).
5. [app/(pages)/customers/[id]/edit/page.tsx](app/(pages)/customers/[id]/edit/page.tsx) lines 38–42 — **`onSubmit={updateCustomerAction.bind(null, id)}`**. This is load-bearing: an inline arrow function `(values) => updateTicketAction(id, values)` passed from a Server Component into a Client Component is **not serializable as a Server Action reference** and crashes the page at render time (this exact bug was hit and fixed during KAN-1 Story 01 — see that story's plan file for the full incident). `app/(pages)/tickets/[id]/edit/page.tsx` (this story) must use `.bind()`, never an inline arrow, for the same reason.
6. [lib/constants/sidebar.ts](lib/constants/sidebar.ts) — lines 7–12 (`navItems`). Currently has `dashboard`, `customers`, `deals`, `reports` — **no `tickets` entry**, unlike KAN-1 where the `/customers` nav entry pre-existed. This story adds one.
7. [components/layout/Sidebar.tsx](components/layout/Sidebar.tsx) lines 6–20. The `ICONS` record maps a `navItems[].icon` string to a Lucide component; this story adds a `"ticket"` → `Ticket` mapping (the `Ticket` icon exists in the installed `lucide-react` version — confirmed via its type definitions).
8. [components/ui/Breadcrumb.tsx](components/ui/Breadcrumb.tsx) — read in full (52 lines). Its `labels` map (lines 10–12) is auto-generated from `navItems`, so adding the `tickets` nav entry (Task 6) automatically gives `/tickets` a correct Arabic breadcrumb label with **no changes needed to this file**. Its `actionLabels` map (lines 17–20, `new`/`edit`) already covers `/tickets/new` and `/tickets/[id]/edit` for the same reason. Its `dynamicLabels` (the `breadcrumbLabelsAtom`, read via `useAtomValue` at line 24) is what this story uses (via `SetBreadcrumbLabel`, item 9) to show a ticket's title instead of its raw id on `/tickets/[id]` and `/tickets/[id]/edit`.
9. [components/customers/SetBreadcrumbLabel.tsx](components/customers/SetBreadcrumbLabel.tsx) — read in full (26 lines). A generic, entity-agnostic component (despite living under `components/customers/`) that registers `{ [segment]: label }` into `breadcrumbLabelsAtom`. This story reuses it as-is (imported from its existing path) for ticket ids — do not duplicate it under `components/tickets/`.
10. [lib/api/identity.api.ts](lib/api/identity.api.ts) — read in full (21 lines). Not consumed by this story directly, but `CurrentUser.userId` ([lib/types/identity.ts](lib/types/identity.ts) line 2) is what [06-story-ticket-assignment-KAN-2.md](06-story-ticket-assignment-KAN-2.md) uses for an "assign to me" shortcut — noted here so this story's `TicketDetailPage` structure (Task 6) leaves room for that story's assignment section without needing rework.
11. [lib/utils/date.ts](lib/utils/date.ts) — `formatDateTime` (lines 1–12), reused for every ticket/history timestamp.
12. [app/(pages)/customers/[id]/page.tsx](app/(pages)/customers/[id]/page.tsx) — read in full (112 lines). This story **edits** this file (Task 7) to add two small links; the `<div className="space-y-6">` wrapper (line 58) and the `flex gap-2` action-button row (lines 68–73, holding "تعديل"/`DeleteCustomerButton`) are where the new links slot in.

## Implementation tasks

### 1 — Types

**Create file: `lib/types/ticket.ts`**

```ts
export type TicketCategory = "General" | "Technical" | "Billing" | "AccountAccess" | "FeatureRequest" | "Other";
export type TicketPriority = "Low" | "Medium" | "High" | "Urgent";
export type TicketStatus = "New" | "Open" | "InProgress" | "OnHold" | "Resolved" | "Closed" | "Reopened";

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
};

export type TicketListItem = Pick<
  Ticket,
  "id" | "customerId" | "title" | "category" | "priority" | "status" | "createdOn"
>;

export type TicketFormValues = {
  customerId: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
};
```

**Create file: `lib/types/ticketHistory.ts`**

```ts
export type TicketHistoryEventType = "Created" | "Updated" | "Assigned" | "Unassigned" | "StatusChanged" | "Escalated";

export type TicketHistoryEntry = {
  id: string;
  ticketId: string;
  eventType: TicketHistoryEventType;
  description: string;
  oldValue: string | null;
  newValue: string | null;
  createdBy: string;
  createdOn: string;
};
```

**Create file: `lib/constants/ticket.ts`**

```ts
import type { TicketCategory, TicketPriority, TicketStatus } from "@/lib/types/ticket";

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  General: "عام",
  Technical: "تقني",
  Billing: "الفواتير",
  AccountAccess: "الوصول للحساب",
  FeatureRequest: "طلب ميزة",
  Other: "أخرى",
};
export const TICKET_CATEGORIES = Object.keys(TICKET_CATEGORY_LABELS) as TicketCategory[];

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  Low: "منخفضة",
  Medium: "متوسطة",
  High: "عالية",
  Urgent: "عاجلة",
};
export const TICKET_PRIORITIES = Object.keys(TICKET_PRIORITY_LABELS) as TicketPriority[];

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  New: "جديدة",
  Open: "مفتوحة",
  InProgress: "قيد التنفيذ",
  OnHold: "قيد الانتظار",
  Resolved: "تم الحل",
  Closed: "مغلقة",
  Reopened: "أعيد فتحها",
};
export const TICKET_STATUSES = Object.keys(TICKET_STATUS_LABELS) as TicketStatus[];
```

**Create file: `lib/constants/ticketHistory.ts`**

```ts
import type { TicketHistoryEventType } from "@/lib/types/ticketHistory";

export const TICKET_HISTORY_EVENT_LABELS: Record<TicketHistoryEventType, string> = {
  Created: "إنشاء",
  Updated: "تحديث",
  Assigned: "إسناد",
  Unassigned: "إلغاء الإسناد",
  StatusChanged: "تغيير الحالة",
  Escalated: "تصعيد",
};
```

### 2 — API client

**Create file: `lib/api/ticket.api.ts`**

```ts
import { apiServerFetch } from "./fetch";
import type { Ticket, TicketListItem, TicketCategory, TicketPriority, TicketStatus } from "../types/ticket";
import type { TicketHistoryEntry } from "../types/ticketHistory";
import type { PaginatedResult } from "../types/pagination";

const TICKETS_URL = "/api/tickets";

export const ticketEndpoints = {
  list: (params: {
    pageNumber?: number;
    pageSize?: number;
    customerId?: string;
    status?: TicketStatus;
    category?: TicketCategory;
    priority?: TicketPriority;
    search?: string;
  }) =>
    apiServerFetch<PaginatedResult<TicketListItem>>({
      url: TICKETS_URL,
      params: {
        pageNumber: params.pageNumber ?? 1,
        pageSize: params.pageSize ?? 20,
        customerId: params.customerId,
        status: params.status,
        category: params.category,
        priority: params.priority,
        search: params.search,
      },
      cache: "no-store",
    }),
  getById: (id: string) =>
    apiServerFetch<Ticket>({ url: `${TICKETS_URL}/${id}`, cache: "no-store" }),
  history: {
    list: (ticketId: string, params: { pageNumber?: number; pageSize?: number } = {}) =>
      apiServerFetch<PaginatedResult<TicketHistoryEntry>>({
        url: `${TICKETS_URL}/${ticketId}/history`,
        params: { pageNumber: params.pageNumber ?? 1, pageSize: params.pageSize ?? 20 },
        cache: "no-store",
      }),
  },
};
```

This follows [lib/api/customer.api.ts](lib/api/customer.api.ts)'s exact shape — plain reads through `apiServerFetch`, `cache: "no-store"` since ticket data changes frequently. `undefined` filter values (e.g. no `status` chosen) are already dropped by `apiServerFetch`'s `getFullUrl` (`lib/api/fetch/server.ts` lines 34–43), so passing `params.status` straight through when it's `undefined` is safe.

### 3 — Server actions

**Create file: `app/(pages)/tickets/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiServerFetch } from "@/lib/api/fetch";
import { customerEndpoints } from "@/lib/api/customer.api";
import type { TicketFormValues } from "@/lib/types/ticket";

export type TicketActionResult = { success: true } | { success: false; error: string };

export async function createTicketAction(
  values: TicketFormValues
): Promise<TicketActionResult | undefined> {
  const result = await apiServerFetch<string>({
    url: "/api/tickets",
    method: "POST",
    body: {
      customerId: values.customerId,
      title: values.title.trim(),
      description: values.description.trim() || null,
      category: values.category,
      priority: values.priority,
    },
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/tickets");
  redirect(`/tickets/${result.data}`);
}

export async function updateTicketAction(
  id: string,
  values: Omit<TicketFormValues, "customerId">
): Promise<TicketActionResult | undefined> {
  const result = await apiServerFetch<void>({
    url: `/api/tickets/${id}`,
    method: "PUT",
    body: {
      title: values.title.trim(),
      description: values.description.trim() || null,
      category: values.category,
      priority: values.priority,
    },
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/tickets");
  revalidatePath(`/tickets/${id}`);
  redirect(`/tickets/${id}`);
}

export type CustomerSearchResult = { id: string; label: string };

export async function searchCustomersAction(query: string): Promise<CustomerSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const result = await customerEndpoints.list({ search: trimmed, pageSize: 10 });
  if (!result.success) return [];

  return result.data.items.map((customer) => ({
    id: customer.id,
    label: customer.companyName ? `${customer.fullName} — ${customer.companyName}` : customer.fullName,
  }));
}
```

`searchCustomersAction` is a Server Action invoked directly from a client event handler (not via a `<form action>`) — this is a standard, supported Next.js pattern; the component calling it (Task 5) awaits it like any async function.

### 4 — Customer picker component

**Create file: `components/tickets/CustomerPicker.tsx`** (`"use client"`) — a debounced (300ms) search-and-select control, since there is no way to usefully type a raw customer GUID. Props:

```ts
export type CustomerPickerProps = {
  value: string; // selected customerId, "" when none
  onSelect: (customerId: string, label: string) => void;
  initialLabel?: string; // pre-fills the visible text when arriving with a known customerId (e.g. from ?customerId=)
};
```

Internal state: `query` (the text input's value, defaulting to `initialLabel ?? ""`), `results: CustomerSearchResult[]`, `open: boolean` (dropdown visibility). On `query` change (debounced), call `searchCustomersAction(query)` and set `results`; open the dropdown when `results.length > 0`. Render a text `<input>` (same styling as every other input in this codebase — `"w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"`) plus an absolutely-positioned dropdown `<ul>` below it listing `results`, each item a `<button type="button">` that calls `onSelect(result.id, result.label)`, sets `query` to `result.label`, and closes the dropdown. Clear `value`/show a validation-relevant empty state when `query` no longer matches the selected label (out of scope to over-engineer — the parent form's `required` validation on `value` before submit is enough, per Edge Cases).

### 5 — Ticket form component

**Create file: `components/tickets/TicketForm.tsx`** (`"use client"`) — controlled form mirroring [components/customers/CustomerForm.tsx](components/customers/CustomerForm.tsx)'s shape (`useState`, `role="alert"` error paragraph, `Button disabled={isSubmitting}`). Props:

```ts
export type TicketFormProps = {
  mode: "create" | "edit";
  initialValues: TicketFormValues; // customerId is "" for a blank create form
  initialCustomerLabel?: string; // passed through to CustomerPicker when prefilled
  onSubmit: (values: TicketFormValues) => Promise<TicketActionResult | undefined>;
};
```

Fields, in order:
- **العميل** (`customerId`, via `CustomerPicker`) — rendered **only when `mode === "create"`** (a `UpdateTicketRequest` has no `customerId` field; editing a ticket never changes its customer). In edit mode, render the customer as read-only text instead (the caller passes `initialCustomerLabel` for this).
- **العنوان** (`title`, required, `<input>`).
- **الوصف** (`description`, optional, `<textarea rows={4}>`).
- **الفئة** (`category`, native `<select>` from `TICKET_CATEGORIES`/`TICKET_CATEGORY_LABELS`).
- **الأولوية** (`priority`, native `<select>` from `TICKET_PRIORITIES`/`TICKET_PRIORITY_LABELS`).

On submit: if `mode === "create"` and `values.customerId` is empty, set a client-side error ("يرجى اختيار عميل") without calling `onSubmit` (the backend would 404 on an empty/invalid `customerId`, but catching it client-side avoids a round-trip for the single most likely mistake on this form). Otherwise call `onSubmit(values)`; on `{ success: false, error }`, show it in the shared `role="alert"` pattern; a `success`/`undefined` result means `onSubmit` already redirected.

No shadcn `Select`/`Dialog` primitives — same "plain HTML, no new component-kit dependency" reasoning already established in KAN-1 Story 01 (`components/ui/` still only has `Breadcrumb`, `avatar`, `button`, `dropdown-menu`).

### 6 — Ticket history section

**Create file: `components/tickets/TicketHistorySection.tsx`** — Props: `{ ticketId: string; history: TicketHistoryEntry[]; hasNextPage: boolean; hasPreviousPage: boolean; page: number }`. This is a **Server Component** (no dialog, no client state needed) unless pagination requires client-side URL manipulation — for consistency with [components/customers/InteractionHistorySection.tsx](components/customers/InteractionHistorySection.tsx)'s pagination-link pattern (which needs `useSearchParams`/`usePathname` to preserve other query params), make it `"use client"` too, dropping only the add-dialog parts. Renders a `.card` with:
- Header: "سجل التذكرة" (no add button — history entries are system-generated).
- A list of entries, each showing `TICKET_HISTORY_EVENT_LABELS[eventType]` as a small badge, `description`, and — when both `oldValue`/`newValue` are present — a compact "`oldValue` ← `newValue`" line, plus `formatDateTime(createdOn)`.
- Empty state: "لا يوجد سجل بعد" (only reachable in theory, since `CreateTicketCommandHandler` always logs a `Created` entry — practically every ticket has at least one row).
- Prev/Next pagination using `?historyPage=` as the query param name, built via `useSearchParams` the same way `InteractionHistorySection` does, to avoid clobbering other query params on the same page.

### 7 — Pages

**Create file: `app/(pages)/tickets/page.tsx`** (Server Component) — reads `searchParams: Promise<{ page?: string; search?: string; status?: string; category?: string; priority?: string; customerId?: string }>`, calls `ticketEndpoints.list({ pageNumber, search, status: status as TicketStatus | undefined, category: category as TicketCategory | undefined, priority: priority as TicketPriority | undefined, customerId })`. Renders:
- Header: `<h1>` "التذاكر" + `<Link href="/tickets/new">` (or `/tickets/new?customerId=${customerId}` when `customerId` is present in the URL, so the "عرض التذاكر" link from a customer page and the "فتح تذكرة" button both compose naturally) `<Button>تذكرة جديدة</Button>`.
- **Create file: `components/tickets/TicketFilters.tsx`** (`"use client"`) — a search `<input>` (debounced 300ms, same pattern as [components/customers/CustomerSearch.tsx](components/customers/CustomerSearch.tsx)) plus three native `<select>`s (status/category/priority, each with a "الكل" / "all" empty option), all writing to the URL via `useSearchParams`/`useRouter().replace(...)`, resetting `?page=` on any change.
- A `.card`-wrapped `<table>` (plain HTML, matching [app/(pages)/customers/page.tsx](app/(pages)/customers/page.tsx)'s precedent) with columns: العنوان (`title`, linking to `/tickets/{id}`), العميل (`customerId`, linking to `/customers/{customerId}` — displayed as the id itself, since `TicketListItemDto` carries no customer name; see Edge Cases), الفئة (`TICKET_CATEGORY_LABELS[category]`), الأولوية (`TICKET_PRIORITY_LABELS[priority]`), الحالة (`TICKET_STATUS_LABELS[status]`), تاريخ الإنشاء (`formatDateTime(createdOn)`).
- Empty state and Prev/Next pagination identical in shape to the customers list page.

**Create file: `app/(pages)/tickets/new/page.tsx`** (Server Component) — reads `searchParams: Promise<{ customerId?: string }>`. When `customerId` is present, call `customerEndpoints.getById(customerId)` to resolve a display label (fall back to just rendering the picker empty if that lookup fails — never throw here, a bad `?customerId=` in the URL shouldn't break the create page). Renders `.card` "تذكرة جديدة" + `<TicketForm mode="create" initialValues={{ customerId: customerId ?? "", title: "", description: "", category: "General", priority: "Medium" }} initialCustomerLabel={...} onSubmit={createTicketAction} />`.

**Create file: `app/(pages)/tickets/[id]/page.tsx`** (Server Component) — `params: Promise<{ id: string }>`, `searchParams: Promise<{ historyPage?: string }>`. Fetch the ticket via `ticketEndpoints.getById(id)`; `if (!result.success) { if (result.status === 404) notFound(); throw new Error(result.error); }`. Then fetch the owning customer via `customerEndpoints.getById(ticket.customerId)` for display (degrade to showing the raw id as the customer link's text if that call fails — a ticket should still render even if the one extra lookup breaks). Fetch history via `ticketEndpoints.history.list(id, { pageNumber: historyPageNumber })`, degrading to an empty list on a non-404 failure (same pattern as every KAN-1 detail-page child-list fetch). Renders `<SetBreadcrumbLabel segment={id} label={ticket.title} />`, a `.card` with the title, category/priority/status as small badges, description, a "العميل" line linking to `/customers/{ticket.customerId}` (showing the resolved customer's `fullName`, or the raw id if the lookup failed), and an "تعديل" button linking to `/tickets/${id}/edit`. Then renders `<TicketHistorySection ... />` below, inside the same `<div className="space-y-6">` wrapper pattern KAN-1's customer detail page uses — **leave room here**: Stories 06–07 add an assignment section and a status/escalation section to this same file, inside this wrapper, the same way KAN-1 Stories 02–04 each added one section to `/customers/[id]/page.tsx`.

**Create file: `app/(pages)/tickets/[id]/edit/page.tsx`** (Server Component) — same `getById` + `notFound()`/error handling as the detail page, then `customerEndpoints.getById(ticket.customerId)` to get a display label for the read-only customer field. Renders `.card` "تعديل التذكرة" + `<SetBreadcrumbLabel segment={id} label={ticket.title} />` + `<TicketForm mode="edit" initialValues={{ customerId: ticket.customerId, title: ticket.title, description: ticket.description ?? "", category: ticket.category, priority: ticket.priority }} initialCustomerLabel={customerLabel} onSubmit={updateTicketAction.bind(null, id)} />` — **`.bind()`, not an inline arrow** (Context item 5).

### 8 — Navigation

**Edit file: `lib/constants/sidebar.ts`** — insert a new entry after `customers` (line 9) and before `deals` (line 10):

```ts
{ label: "التذاكر", href: "/tickets", icon: "ticket" },
```

**Edit file: `components/layout/Sidebar.tsx`** — add `Ticket` to the `lucide-react` import (line 6–12) and add `ticket: Ticket,` to the `ICONS` record (after line 19, the `"bar-chart-3": BarChart3,` line).

### 9 — Cross-links from the customer detail page

**Edit file: `app/(pages)/customers/[id]/page.tsx`** — in the action-button row (lines 68–73, alongside the existing "تعديل" `Link`/`Button` and `DeleteCustomerButton`), add two more, before the existing "تعديل" button:

```tsx
<Link href={`/tickets?customerId=${id}`}>
  <Button variant="outline">عرض التذاكر</Button>
</Link>
<Link href={`/tickets/new?customerId=${id}`}>
  <Button variant="outline">فتح تذكرة</Button>
</Link>
```

## Edge Cases & Failure Modes

- **The tickets list cannot show a customer's name, only their id** — `TicketListItemDto` carries only `customerId`, and the backend's `GetTicketsListQueryHandler` deliberately resolves no customer-name lookup for the list (unlike [06-story-ticket-assignment-KAN-2.md](06-story-ticket-assignment-KAN-2.md)'s agent-name batch resolution via `IIdentityQueryService.GetUsersInfoAsync`, which exists specifically because that story needed it and the customers case never got an equivalent). Resolving 20 customer names per page would mean 20 extra `GET /api/customers/{id}` calls per list render — an explicit N+1 tradeoff this story does **not** make. The list links the raw `customerId` to `/customers/{customerId}` instead. The ticket **detail** page does the one-off lookup (a single extra `GET`, not N+1) and shows the real name. Flag a batch customer-lookup endpoint as a backend follow-up if list-page customer names become a real requirement.
- **`?customerId=` in the URL (from the customer page's cross-links) does not resolve to an existing customer** — on `/tickets`, the list is simply filtered to zero results (the backend 200s with an empty page rather than 404ing, since `customerId` is an optional filter, not a route parameter). On `/tickets/new?customerId=<bad-id>`, the `customerEndpoints.getById` prefetch fails; the page falls back to rendering `CustomerPicker` with an empty `initialLabel` rather than throwing — the agent can still search for and pick a valid customer.
- **Creating a ticket without selecting a customer** — `TicketForm`'s client-side check catches the common case (empty `customerId`) before submitting; if bypassed, the backend's `CreateTicketCommandHandler` 404s on the empty/invalid `customerId` and the error surfaces via the shared error paragraph.
- **Empty/whitespace `title`** — rejected server-side (`NotEmpty()`); the `<input>` is marked `required`, and the server error still surfaces if bypassed.
- **`title` over 200 / `description` over 4000 characters** — rejected server-side with a 400; not mirrored client-side in this story (same reasoning as KAN-1's field-length edge cases) — surfaces via the shared error paragraph.
- **Editing a ticket without changing title/category/priority** — the backend's `UpdateTicketCommandHandler` writes zero new `TicketHistory` rows in that case (its diff-and-log guards only fire on an actual change) and still returns success; the edit page redirects to the detail page exactly as if something had changed.
- **Only `title`/`category`/`priority` changes are logged to history — not `description`** — a deliberate backend scope decision (see the backend story's own note); `TicketHistorySection` has nothing special to render for this, it just never sees a description-change entry. Do not treat a "silent" description edit as a bug.
- **`status` sent as an unrecognized value in a filter query param** (e.g. `?status=Cancelled`) — since the frontend only ever sends values from `TICKET_STATUSES` (populated from the same enum the backend defines), this can't happen from the UI; a hand-edited URL with a bogus `status` value is passed straight through in `ticketEndpoints.list`'s `params`, and the backend's model binder rejects an unrecognized enum string with a framework-level 400 before the query even runs — `TicketsPage`'s generic `throw new Error(result.error)` fallback (mirroring the customers list page) handles this, though the resulting message may be a raw ASP.NET Core binding error rather than a friendly one.
- **Combining search + all three filters** — all four apply as independent, AND-combined filters on the backend; any subset (including none) is valid. `TicketFilters` writes/removes each query param independently, so any combination is reachable from the URL.
- **Ticket history pagination and the customer/ticket detail page's other future sections** (assignment, status/escalation from Stories 06–07) **each need their own query-param namespace** — this story uses `?historyPage=`, matching KAN-1's `?interactionsPage=`/`?notesPage=`/`?attachmentsPage=` convention of one distinct param per paginated section on the same page.
- **A ticket detail page for a ticket belonging to a soft-deleted customer** — the ticket itself still 200s (tickets aren't cascade-soft-deleted when their customer is, per the backend story's own edge case), but the customer-name lookup 404s; the detail page falls back to showing the raw `customerId` as the link text rather than throwing.

## Test Plan

No automated test infrastructure exists in this repository yet (no `test` script in `package.json`, per KAN-1 Story 01's identical note). Manual verification only, per the Verification Steps below.

## Verification Steps

1. **Frontend builds:** `npm run build` (or `pnpm build`) from the repository root.
2. **Lint passes:** `npm run lint`.
3. **Frontend runs against a live backend:** `npm run dev`, with `azm-crm-backend` running locally (Story 05 deployed) and `NEXT_PUBLIC_API_BASE_URL` pointing at it.
4. **Manual smoke test:** confirm "التذاكر" appears in the sidebar and navigates to `/tickets` with an empty state on a fresh database; from an existing customer's detail page, click "فتح تذكرة" and confirm it lands on `/tickets/new` with that customer pre-selected; create a ticket (title, description, category, priority) and confirm redirect to its detail page showing all fields, the resolved customer name, and a `Created` history entry; edit the ticket's title/category/priority and confirm the redirect back to the detail page shows updated fields and new history entries for each changed field; search/filter the tickets list by status/category/priority and confirm results narrow correctly; from the customer detail page, click "عرض التذاكر" and confirm the list is filtered to that customer's tickets; navigate to a nonexistent ticket id and confirm the 404 page renders.

## Done Criteria

- [ ] "التذاكر" appears in the sidebar navigation and links to `/tickets`.
- [ ] `/tickets` lists tickets with working search, status/category/priority filters, and pagination, including an empty state.
- [ ] `/tickets/new` requires selecting an existing customer (via search, not a raw id field) and creates a ticket, defaulting to `status: "New"`.
- [ ] `/tickets/[id]` shows all ticket fields, the resolved customer name (linked to their profile), and the ticket's history (at minimum, the `Created` entry).
- [ ] `/tickets/[id]/edit` edits title/description/category/priority (not the customer) and logs one history entry per changed structured field.
- [ ] The customer detail page has working "فتح تذكرة"/"عرض التذاكر" links.
- [ ] A nonexistent ticket id renders the existing 404 page on both the detail and edit routes.
- [ ] `npm run build` and `npm run lint` both succeed with no new errors.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 06.**
