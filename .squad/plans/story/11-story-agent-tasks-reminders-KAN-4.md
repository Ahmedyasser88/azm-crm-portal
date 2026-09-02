# Story 11 — Agent Tasks & Reminders (Story: KAN-4)

## Prerequisites

- [10-story-dashboard-core-tickets-customers-KAN-4.md](10-story-dashboard-core-tickets-customers-KAN-4.md) completed: this story **edits** `app/(pages)/dashboard/page.tsx` to append a second panel below the "تذاكري" panel that story creates. Read that story's Task 4 in full before starting.
- **Backend dependency**: the `azm-crm-backend` sibling repo's Story 14 (`Agent Tasks & Reminders`) must be deployed, exposing:
  - `POST /api/agent-tasks` → `Result<Guid>` (201) / 404 (unknown `customerId`/`ticketId`) / 400 (validation)
  - `GET /api/agent-tasks/{id}` → `Result<AgentTaskDto>` (200) / 404 (missing, or owned by another agent — both 404, never 403)
  - `GET /api/agent-tasks?pageNumber=&pageSize=&isCompleted=` → `Result<PaginatedResult<AgentTaskDto>>` (200) — scoped to the caller only, sorted **incomplete-first, then soonest-due-first, then newest-created-first**; the frontend must not re-sort this list.
  - `PUT /api/agent-tasks/{id}` → `Result` (200) / 404 / 400 — edits `title`/`description`/`dueOn` only.
  - `PUT /api/agent-tasks/{id}/completion` → `Result` (200) / 404 / 400 — body `{ isCompleted: boolean }`.
  - `DELETE /api/agent-tasks/{id}` → 204 / 404.

  `AgentTaskDto` fields (camelCased): `id`, `title`, `description` (nullable), `dueOn` (nullable ISO string), `isCompleted`, `completedOn` (nullable ISO string), `customerId` (nullable), `ticketId` (nullable), `createdOn`, `updatedOn` (nullable). `CreateAgentTaskRequest` body: `{ title, description, dueOn, customerId, ticketId }`. `UpdateAgentTaskRequest` body: `{ title, description, dueOn }`.

## Story Goal

Let a support agent create, view, edit, complete/un-complete, and delete personal to-do items and reminders directly from the dashboard — satisfying KAN-4's **"Manage tasks and reminders"** acceptance criterion.

Outcomes:
1. A **"المهام والتذكيرات" (Tasks & Reminders) panel** on `/dashboard`, below the "تذاكري" panel Story 10 adds, listing the caller's tasks exactly in the order the backend returns them (incomplete-first, soonest-due-first).
2. An "إضافة مهمة" button opening a modal form (Title required, Description optional, Due date/time optional) that creates a task.
3. Each task row has a completion checkbox (toggles `PUT /api/agent-tasks/{id}/completion`), an "تعديل" action opening the same form pre-filled for editing, and a "حذف" action with the existing confirm-dialog pattern.
4. An "إظهار المكتملة" toggle to include/exclude completed tasks (`?isCompleted=`), independent of the ticket panel's `?status=`/`?page=` params.

**Not in scope for this story**: linking a task to a specific customer or ticket from this UI (the backend's optional `customerId`/`ticketId` fields exist and are validated server-side, but this story's create/edit form does not expose them — no customer/ticket picker is built here; every task this UI creates has both fields `null`. Flag a "create task from a ticket/customer page" cross-link as a follow-up if that becomes a real workflow need, the same way KAN-2 Story 05 flagged a batch customer-name lookup as a follow-up rather than over-building), a dedicated `/tasks` page (the dashboard panel is the only surface for this story — reachable, editable, and deletable entirely through modals on `/dashboard`), and any notification/reminder-alert mechanism when a `dueOn` passes (the backend doesn't send one either — see the backend story's own "Not in scope").

## Context — Read These Files First

1. [10-story-dashboard-core-tickets-customers-KAN-4.md](10-story-dashboard-core-tickets-customers-KAN-4.md) Task 4 — the exact `app/(pages)/dashboard/page.tsx` shape (`Promise.all` fetch pattern, `.card space-y-6` outer wrapper) this story edits to append a second panel.
2. [components/customers/NoteHistorySection.tsx](components/customers/NoteHistorySection.tsx) — read in full (100 lines). This story's `AgentTasksPanel` follows its exact shape: `"use client"`, a header row with an "add" button opening a modal (`open` state, the `fixed inset-0 ...` overlay markup at lines 89–97), a list, and prev/next pagination via `buildHref`/`useSearchParams` (lines 20, 31–35). The differences: each task row needs a completion checkbox and an "تعديل"/"حذف" action pair (neither of which `NoteHistorySection` has, since notes are append-only), and the panel also needs a second modal for editing (reusing the same form component in a different mode).
3. [components/customers/AddNoteForm.tsx](components/customers/AddNoteForm.tsx) — read in full (67 lines). Exact controlled-form shape (`useState` values, `role="alert"` error paragraph, `Button disabled={isSubmitting}`) this story's `AgentTaskForm` follows, extended to `create`/`edit` modes the way `components/tickets/TicketForm.tsx` handles both modes for tickets.
4. [components/customers/LogInteractionForm.tsx](components/customers/LogInteractionForm.tsx) lines 12–16 (`nowForDatetimeLocal`) and 107–119 (the `type="datetime-local"` field). This story's optional `dueOn` field reuses the same `<input type="datetime-local">` pattern, but the field is **optional** here (no `required`, and no default value — an empty string means "no due date", not "now"), unlike `occurredOn` which is always required and defaults to now.
5. [app/(pages)/customers/actions.ts](app/(pages)/customers/actions.ts) lines 67–80 (`logInteractionAction`) — the exact `new Date(values.x).toISOString()` conversion this story's `createAgentTaskAction`/`updateAgentTaskAction` use for `dueOn`, applied **only when non-empty** (an empty `dueOn` string must serialize to `null` in the request body, not `"Invalid Date"` from `new Date("").toISOString()` — see Task 2 and Edge Cases).
6. [components/customers/DeleteCustomerButton.tsx](components/customers/DeleteCustomerButton.tsx) — read in full (59 lines) — and [components/customers/ConfirmDialog.tsx](components/customers/ConfirmDialog.tsx) — read in full (46 lines). Exact `useState` + `ConfirmDialog` + `toast.error` (from `sonner`, already a dependency — confirmed by this exact import in `DeleteCustomerButton.tsx` line 5) shape this story's task delete action reuses, calling `router.refresh()` instead of `router.push` (there is no dedicated detail page to navigate away from — deleting a task just needs the dashboard panel to re-render).
7. [app/(pages)/tickets/actions.ts](app/(pages)/tickets/actions.ts) lines 60–77 (`assignTicketAction`) — the exact "mutate and stay on the current page" `TicketActionResult`-returning shape (no `redirect()`) this story's four new server actions in `app/(pages)/dashboard/actions.ts` (a new file) follow, since every agent-task mutation happens via a modal on `/dashboard`, never a full-page navigation.
8. [lib/api/ticket.api.ts](lib/api/ticket.api.ts) — read in full (45 lines). Exact `apiServerFetch`-based read-only endpoints shape this story's `agentTaskEndpoints.list` (the only GET this story's page needs — no `getById` call, since editing happens from the already-loaded list item, not a separate fetch) follows.
9. [lib/types/pagination.ts](lib/types/pagination.ts) — read in full (10 lines). `PaginatedResult<T>` this story's `agentTaskEndpoints.list` response is typed with.
10. [lib/utils/date.ts](lib/utils/date.ts) — read in full (12 lines). `formatDateTime`, reused for `dueOn`/`createdOn` display.

## Implementation tasks

### 1 — Types

**Create file: `lib/types/agentTask.ts`**

```ts
export type AgentTask = {
  id: string;
  title: string;
  description: string | null;
  dueOn: string | null;
  isCompleted: boolean;
  completedOn: string | null;
  customerId: string | null;
  ticketId: string | null;
  createdOn: string;
  updatedOn: string | null;
};

export type AgentTaskFormValues = {
  title: string;
  description: string;
  dueOn: string; // "" means no due date; otherwise a `datetime-local` input value
};
```

### 2 — API client and server actions

**Create file: `lib/api/agentTask.api.ts`**

```ts
import { apiServerFetch } from "./fetch";
import type { AgentTask } from "../types/agentTask";
import type { PaginatedResult } from "../types/pagination";

const AGENT_TASKS_URL = "/api/agent-tasks";

export const agentTaskEndpoints = {
  list: (params: { pageNumber?: number; pageSize?: number; isCompleted?: boolean }) =>
    apiServerFetch<PaginatedResult<AgentTask>>({
      url: AGENT_TASKS_URL,
      params: {
        pageNumber: params.pageNumber ?? 1,
        pageSize: params.pageSize ?? 20,
        isCompleted: params.isCompleted,
      },
      cache: "no-store",
    }),
};
```

**Create file: `app/(pages)/dashboard/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { apiServerFetch } from "@/lib/api/fetch";
import type { AgentTaskFormValues } from "@/lib/types/agentTask";

export type DashboardActionResult = { success: true } | { success: false; error: string };

function dueOnToIso(dueOn: string): string | null {
  return dueOn.trim() ? new Date(dueOn).toISOString() : null;
}

export async function createAgentTaskAction(
  values: AgentTaskFormValues
): Promise<DashboardActionResult> {
  const result = await apiServerFetch<string>({
    url: "/api/agent-tasks",
    method: "POST",
    body: {
      title: values.title.trim(),
      description: values.description.trim() || null,
      dueOn: dueOnToIso(values.dueOn),
      customerId: null,
      ticketId: null,
    },
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateAgentTaskAction(
  id: string,
  values: AgentTaskFormValues
): Promise<DashboardActionResult> {
  const result = await apiServerFetch<void>({
    url: `/api/agent-tasks/${id}`,
    method: "PUT",
    body: {
      title: values.title.trim(),
      description: values.description.trim() || null,
      dueOn: dueOnToIso(values.dueOn),
    },
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function setAgentTaskCompletionAction(
  id: string,
  isCompleted: boolean
): Promise<DashboardActionResult> {
  const result = await apiServerFetch<void>({
    url: `/api/agent-tasks/${id}/completion`,
    method: "PUT",
    body: { isCompleted },
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteAgentTaskAction(id: string): Promise<DashboardActionResult> {
  const result = await apiServerFetch<void>({ url: `/api/agent-tasks/${id}`, method: "DELETE" });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
```

`dueOnToIso("")` returns `null` rather than `new Date("").toISOString()` (which throws `RangeError: Invalid time value`) — this guard is load-bearing, see Edge Cases.

### 3 — Task form component

**Create file: `components/dashboard/AgentTaskForm.tsx`** (`"use client"`) — controlled form mirroring `AddNoteForm.tsx`'s shape (Context item 3). Props:

```ts
export type AgentTaskFormProps = {
  mode: "create" | "edit";
  initialValues: AgentTaskFormValues;
  onSubmit: (values: AgentTaskFormValues) => Promise<{ success: boolean; error?: string }>;
  onDone: () => void;
};
```

Fields, in order: **العنوان** (`title`, required, `<input>`), **الوصف** (`description`, optional, `<textarea rows={3}>`), **تاريخ الاستحقاق** (`dueOn`, optional, `<input type="datetime-local">`, no `required` — Context item 4). On submit, call `onSubmit(values)`; on `{ success: false, error }` show it via the shared `role="alert"` paragraph; on success, call `onDone()` (the parent closes the modal and refreshes, the same two-step `handleAdded`-style callback `NoteHistorySection` uses for `AddNoteForm`, Context item 2).

### 4 — Tasks panel component

**Create file: `components/dashboard/AgentTasksPanel.tsx`** (`"use client"`) — Props: `{ tasks: AgentTask[]; hasNextPage: boolean; hasPreviousPage: boolean; page: number; showCompleted: boolean }`. State: `addOpen`, `editingTask: AgentTask | null`, `deletingTask: AgentTask | null`, `togglingId: string | null` (disables a row's checkbox while its completion toggle is in flight).

Renders a `.card space-y-4`:
- Header row: `<h2>المهام والتذكيرات</h2>`, an "إظهار المكتملة" toggle button (same active/inactive class-switching pattern as `TicketFilters.tsx`'s "تذاكري"/"المُصعّدة فقط" buttons, Context item — see [components/tickets/TicketFilters.tsx](components/tickets/TicketFilters.tsx) lines 112–134 — writing `?isCompleted=` via `useSearchParams`/`useRouter().replace(...)`, clearing `?tasksPage=` on toggle), and an "+ إضافة مهمة" `<Button onClick={() => setAddOpen(true)}>`.
- Empty state: `<p className="text-sm text-text-secondary text-center py-6">لا توجد مهام</p>` when `tasks.length === 0`.
- Otherwise a `<ul className="space-y-3">` of `<li className="border-b border-gray-300 last:border-0 pb-3">` rows, each: a checkbox (`<input type="checkbox" checked={task.isCompleted} disabled={togglingId === task.id} onChange={...}>` calling `setAgentTaskCompletionAction(task.id, !task.isCompleted)` then `router.refresh()`), the title (`className={task.isCompleted ? "line-through text-text-secondary" : "text-text-default"}`), the description if present, `formatDateTime(task.dueOn)` when `task.dueOn` is set (styled `text-xs text-text-secondary`) — omit the due-date line entirely when `dueOn` is `null`, and two `<Button variant="outline" size="sm">` actions ("تعديل" → `setEditingTask(task)`, "حذف" → `setDeletingTask(task)`).
- Prev/Next pagination using `?tasksPage=` as the query param name (distinct from Story 10's `?page=` for the tickets panel and this panel's own `?isCompleted=` — one param per paginated section, per the KAN-1 convention Story 10's Context item 8 documents), built the same `buildHref` way as `NoteHistorySection` (Context item 2).
- The add modal (`addOpen`): same `fixed inset-0` overlay shape as `NoteHistorySection` lines 89–97, containing `<AgentTaskForm mode="create" initialValues={{ title: "", description: "", dueOn: "" }} onSubmit={createAgentTaskAction} onDone={() => { setAddOpen(false); router.refresh(); }} />`.
- The edit modal (`editingTask !== null`): same overlay, containing `<AgentTaskForm mode="edit" initialValues={{ title: editingTask.title, description: editingTask.description ?? "", dueOn: editingTask.dueOn ? editingTask.dueOn.slice(0, 16) : "" }} onSubmit={(values) => updateAgentTaskAction(editingTask.id, values)} onDone={() => { setEditingTask(null); router.refresh(); }} />` — `.slice(0, 16)` truncates the ISO string to the `YYYY-MM-DDTHH:mm` shape a `datetime-local` input expects, mirroring the inverse of `nowForDatetimeLocal`'s own `.slice(0, 16)` (Context item 4).
- The delete confirmation (`deletingTask !== null`): `<ConfirmDialog open title="حذف المهمة" description={`هل أنت متأكد من حذف "${deletingTask.title}"؟`} confirmLabel="حذف" onConfirm={...} onCancel={() => setDeletingTask(null)} isConfirming={isDeleting} />`, calling `deleteAgentTaskAction(deletingTask.id)` on confirm and `toast.error(result.error)` on failure (Context item 6), `router.refresh()` on success.

### 5 — Wire into the dashboard page

**Edit file: `app/(pages)/dashboard/page.tsx`** (created by Story 10) — add `tasksPage`/`isCompleted` to the `searchParams` type, fetch `agentTaskEndpoints.list({ pageNumber: tasksPageNumber, isCompleted: isCompletedFilter })` alongside the existing `Promise.all` (extend it to three entries: summary, tickets, tasks), and render `<AgentTasksPanel tasks={...} hasNextPage={...} hasPreviousPage={...} page={tasksPageNumber} showCompleted={...} />` as a second `.card` panel directly below the "تذاكري" panel, inside the same outer `<div className="space-y-6">`.

## Edge Cases & Failure Modes

- **`dueOn` left empty on create or edit** — `dueOnToIso("")` returns `null` (Task 2); do not call `new Date("").toISOString()` directly, which throws `RangeError: Invalid time value` and would crash the server action. This is the one new pitfall this story introduces relative to `logInteractionAction`'s unconditional conversion (Context item 5), since `occurredOn` there is always required and never empty.
- **Toggling completion twice in quick succession** — `togglingId` disables the checkbox for the in-flight row only; the backend itself has no idempotency guard (its `SetAgentTaskCompletionCommandHandler` always re-stamps `completedOn` to "now" on a repeated `true`, per the backend story's own documented edge case) — this is expected, not a frontend bug to work around.
- **Editing a task while its due date is in the past** — not blocked client-side or server-side (a retroactively-logged task is valid, per the backend story); the row simply keeps showing the past `formatDateTime(dueOn)`.
- **A task has no due date** (`dueOn: null`) — the due-date line is omitted entirely from the row, not rendered as an empty or placeholder string; this matches the backend's own sort placement (undated tasks sort after any dated task within the same completion group, per the backend's Story 14).
- **The tasks list order** — never re-sorted client-side; `AgentTasksPanel` renders `tasks` in the exact order `agentTaskEndpoints.list` returns it (incomplete-first, soonest-due-first, per the backend contract). Do not add a client-side `.sort()` call anywhere in this component.
- **Deleting or completing a task that another concurrent request already deleted** — the backend 404s (its ownership-scoped lookup treats "not found" and "not yours" identically); the mutation's `result.success === false` surfaces via `toast.error(result.error)` for delete, or the shared `role="alert"` paragraph for an edit-form submission, and `router.refresh()` (called regardless of outcome by the confirm-dialog flow) picks up the now-current list either way.
- **`?isCompleted=` and `?tasksPage=` interact with Story 10's `?status=`/`?page=`** — each panel's query params are independent and both survive the other's changes, since every `buildHref`/`updateParam` call constructs its URL from `new URLSearchParams(searchParams.toString())` (preserving unrelated params) before setting only its own key(s), the same convention every prior paginated section in this codebase already follows.

## Test Plan

No automated test infrastructure exists in this repository yet (no `test` script in `package.json`, per KAN-1 Story 01's identical note). Manual verification only, per the Verification Steps below.

## Verification Steps

1. **Frontend builds:** `npm run build` (or `pnpm build`) from the repository root.
2. **Lint passes:** `npm run lint`.
3. **Frontend runs against a live backend:** `npm run dev`, with `azm-crm-backend` running locally (Story 14 deployed).
4. **Manual smoke test:** on `/dashboard`, click "+ إضافة مهمة", create a task with a title and a due date in the near future, confirm it appears in the panel; create a second task with no due date and confirm it appears without a due-date line, sorted after the first; toggle the first task's completion checkbox and confirm it moves to the bottom of the list with a strikethrough title; toggle "إظهار المكتملة" off and confirm the completed task disappears from the panel; edit the second task's title and confirm the change persists after `router.refresh()`; delete a task via the confirm dialog and confirm it's removed.

## Done Criteria

- [ ] `/dashboard` shows a "المهام والتذكيرات" panel listing the caller's tasks in the backend's returned order (never re-sorted client-side).
- [ ] Creating, editing, completing/un-completing, and deleting a task all work end-to-end from modals on the dashboard, with no full-page navigation.
- [ ] The "إظهار المكتملة" toggle and `?tasksPage=` pagination both work and compose correctly with Story 10's `?status=`/`?page=`.
- [ ] An empty `dueOn` never causes a thrown error (`Invalid time value`) on create or edit.
- [ ] `npm run build` and `npm run lint` both succeed with no new errors.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 12.**
