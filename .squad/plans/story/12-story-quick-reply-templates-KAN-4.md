# Story 12 — Quick Reply Templates (Story: KAN-4)

## Prerequisites

- [10-story-dashboard-core-tickets-customers-KAN-4.md](10-story-dashboard-core-tickets-customers-KAN-4.md) completed: this story **edits** `app/(pages)/dashboard/page.tsx` to append a third management panel. It does **not** depend on [11-story-agent-tasks-reminders-KAN-4.md](11-story-agent-tasks-reminders-KAN-4.md) — both stories only append their own independent panel to the same file and can be implemented in either order, but implementing them in numeric order avoids a merge in that one file.
- [08-story-communication-core-KAN-3.md](08-story-communication-core-KAN-3.md) completed: that story created `components/conversations/SendMessageForm.tsx` and `app/(pages)/conversations/actions.ts`; this story **edits** both to wire a template picker into the message composer.
- **Backend dependency**: the `azm-crm-backend` sibling repo's Story 15 (`Quick Reply Templates`) must be deployed, exposing:
  - `POST /api/quick-reply-templates` → `Result<Guid>` (201) / 400
  - `GET /api/quick-reply-templates/{id}` → `Result<QuickReplyTemplateDto>` (200) / 404
  - `GET /api/quick-reply-templates?pageNumber=&pageSize=&search=` → `Result<PaginatedResult<QuickReplyTemplateListItemDto>>` (200) — **alphabetical by title**, not newest-first.
  - `PUT /api/quick-reply-templates/{id}` → `Result` (200) / 404 / 400
  - `DELETE /api/quick-reply-templates/{id}` → 204 / 404

  `QuickReplyTemplateDto`: `id`, `title`, `body`, `createdOn`, `updatedOn` (nullable). `QuickReplyTemplateListItemDto`: `id`, `title`, `body`, `createdOn` (no `updatedOn`). Templates are **team-shared**: any authenticated agent can create, edit, or delete any template — there is no ownership/authorship restriction to model in the frontend.

## Story Goal

Let any support agent maintain a shared library of canned response templates and insert one directly into a conversation reply — satisfying KAN-4's **"Use quick reply templates"** acceptance criterion.

Outcomes:
1. A **"قوالب الردود السريعة" (Quick Reply Templates) panel** on `/dashboard` — a searchable list with add/edit/delete, shared across all agents (no ownership check anywhere in this UI, matching the backend's "any agent, any template" model).
2. On a non-live-chat conversation's detail page (`/conversations/[id]`), the existing `SendMessageForm` gains a "استخدام قالب رد سريع" control: a dropdown listing template titles (searchable) that, on selection, inserts that template's body into the reply textarea.

**Not in scope for this story**: per-agent private templates or any role-based restriction on who may edit/delete a template (the backend has no such concept — see the backend story's own "Not in scope"), template categories, `{{placeholder}}` variable substitution in a template body, and wiring quick replies into `LiveChatPanel` (the live-chat send path is a distinct, real-time component from KAN-3's live-chat story; only the plain `SendMessageForm` used by non-live-chat channels is touched here — see Edge Cases for what this means for a `LiveChat` conversation).

## Context — Read These Files First

1. [10-story-dashboard-core-tickets-customers-KAN-4.md](10-story-dashboard-core-tickets-customers-KAN-4.md) Task 4, and [11-story-agent-tasks-reminders-KAN-4.md](11-story-agent-tasks-reminders-KAN-4.md) Task 5 — the accumulating `app/(pages)/dashboard/page.tsx` shape (`Promise.all` fetch pattern, stacked `.card` panels inside one `<div className="space-y-6">`) this story appends a third panel to.
2. [components/customers/CustomerSearch.tsx](components/customers/CustomerSearch.tsx) — read in full (43 lines). Exact 300ms-debounced `useEffect`/`setTimeout` search-writes-to-`?search=` pattern this story's template panel search box reuses.
3. [components/tickets/CustomerPicker.tsx](components/tickets/CustomerPicker.tsx) — read in full. Precedent for a debounced search **dropdown** (not a full-page filter) driven by a Server Action called directly from a client event handler — the exact shape this story's message-composer template picker (Task 5) follows, calling a new `listQuickReplyTemplatesAction` instead of `searchCustomersAction`.
4. [components/customers/NoteHistorySection.tsx](components/customers/NoteHistorySection.tsx) and [components/customers/AddNoteForm.tsx](components/customers/AddNoteForm.tsx) — read both in full. This story's `QuickReplyTemplatesPanel`/`QuickReplyTemplateForm` follow the same add-modal-plus-list shape, extended with edit/delete exactly as [11-story-agent-tasks-reminders-KAN-4.md](11-story-agent-tasks-reminders-KAN-4.md)'s `AgentTasksPanel`/`AgentTaskForm` do — read that story's Task 3–4 as the closer precedent (edit + delete on a shared-not-owned resource, no completion checkbox).
5. [components/customers/DeleteCustomerButton.tsx](components/customers/DeleteCustomerButton.tsx) and [components/customers/ConfirmDialog.tsx](components/customers/ConfirmDialog.tsx) — read both in full. Exact delete-confirmation shape this story's template delete action reuses.
6. [components/conversations/SendMessageForm.tsx](components/conversations/SendMessageForm.tsx) — read in full (63 lines). This story **edits** this file: it adds a template-picker control above the existing `<textarea>` (around line 41) that, on template selection, updates the `body` state.
7. [app/(pages)/conversations/actions.ts](app/(pages)/conversations/actions.ts) — read in full (52 lines). This story **adds** a new `listQuickReplyTemplatesAction` here, following the exact shape of `searchCustomersAction` in [app/(pages)/tickets/actions.ts](app/(pages)/tickets/actions.ts) lines 119–130 (a Server Action invoked directly from a client event handler, not a `<form action>`).
8. [app/(pages)/conversations/[id]/page.tsx](app/(pages)/conversations/[id]/page.tsx) lines 85–95 — confirms `SendMessageForm` is rendered only in the non-`LiveChat` branch; `LiveChatPanel` (rendered instead for `channel === "LiveChat"`) is untouched by this story (see Story Goal, "Not in scope").
9. [lib/api/ticket.api.ts](lib/api/ticket.api.ts) — read in full (45 lines). Exact `apiServerFetch`-based endpoints shape this story's `quickReplyTemplate.api.ts` follows, including a `search` filter parameter shaped like `ticketEndpoints.list`'s `search`.
10. [lib/types/pagination.ts](lib/types/pagination.ts) — read in full (10 lines). `PaginatedResult<T>` this story's list response is typed with.

## Implementation tasks

### 1 — Types

**Create file: `lib/types/quickReplyTemplate.ts`**

```ts
export type QuickReplyTemplate = {
  id: string;
  title: string;
  body: string;
  createdOn: string;
  updatedOn: string | null;
};

export type QuickReplyTemplateListItem = Pick<QuickReplyTemplate, "id" | "title" | "body" | "createdOn">;

export type QuickReplyTemplateFormValues = {
  title: string;
  body: string;
};
```

### 2 — API client

**Create file: `lib/api/quickReplyTemplate.api.ts`**

```ts
import { apiServerFetch } from "./fetch";
import type { QuickReplyTemplateListItem } from "../types/quickReplyTemplate";
import type { PaginatedResult } from "../types/pagination";

const QUICK_REPLY_TEMPLATES_URL = "/api/quick-reply-templates";

export const quickReplyTemplateEndpoints = {
  list: (params: { pageNumber?: number; pageSize?: number; search?: string }) =>
    apiServerFetch<PaginatedResult<QuickReplyTemplateListItem>>({
      url: QUICK_REPLY_TEMPLATES_URL,
      params: {
        pageNumber: params.pageNumber ?? 1,
        pageSize: params.pageSize ?? 20,
        search: params.search,
      },
      cache: "no-store",
    }),
};
```

### 3 — Server actions

**Create file: `app/(pages)/dashboard/quickReplyActions.ts`** — a second actions file alongside Story 11's `app/(pages)/dashboard/actions.ts`, kept separate since it manages an unrelated resource (matching this codebase's one-actions-file-per-resource convention — `app/(pages)/tickets/actions.ts` and `app/(pages)/conversations/actions.ts` are already separate files despite both living under `app/(pages)/`):

```ts
"use server";

import { revalidatePath } from "next/cache";
import { apiServerFetch } from "@/lib/api/fetch";
import type { QuickReplyTemplateFormValues } from "@/lib/types/quickReplyTemplate";

export type DashboardActionResult = { success: true } | { success: false; error: string };

export async function createQuickReplyTemplateAction(
  values: QuickReplyTemplateFormValues
): Promise<DashboardActionResult> {
  const result = await apiServerFetch<string>({
    url: "/api/quick-reply-templates",
    method: "POST",
    body: { title: values.title.trim(), body: values.body.trim() },
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateQuickReplyTemplateAction(
  id: string,
  values: QuickReplyTemplateFormValues
): Promise<DashboardActionResult> {
  const result = await apiServerFetch<void>({
    url: `/api/quick-reply-templates/${id}`,
    method: "PUT",
    body: { title: values.title.trim(), body: values.body.trim() },
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteQuickReplyTemplateAction(id: string): Promise<DashboardActionResult> {
  const result = await apiServerFetch<void>({ url: `/api/quick-reply-templates/${id}`, method: "DELETE" });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
```

**Edit file: `app/(pages)/conversations/actions.ts`** — add, after `sendMessageAction` (after line 51):

```ts
export type QuickReplyOption = { id: string; title: string; body: string };

export async function listQuickReplyTemplatesAction(query: string): Promise<QuickReplyOption[]> {
  const result = await quickReplyTemplateEndpoints.list({ search: query.trim() || undefined, pageSize: 10 });
  if (!result.success) return [];

  return result.data.items.map((template) => ({
    id: template.id,
    title: template.title,
    body: template.body,
  }));
}
```

Add `import { quickReplyTemplateEndpoints } from "@/lib/api/quickReplyTemplate.api";` to this file's existing import block. Unlike `searchCustomersAction` in `app/(pages)/tickets/actions.ts` (Context item 7), an empty `query` is **not** short-circuited to `[]` here — the picker should list all templates (alphabetically, from the backend) when first opened, before the agent has typed anything, since a small shared template library is meant to be browsable, not only searchable.

### 4 — Templates panel and form

**Create file: `components/dashboard/QuickReplyTemplateForm.tsx`** (`"use client"`) — same shape as [11-story-agent-tasks-reminders-KAN-4.md](11-story-agent-tasks-reminders-KAN-4.md)'s `AgentTaskForm`. Props:

```ts
export type QuickReplyTemplateFormProps = {
  mode: "create" | "edit";
  initialValues: QuickReplyTemplateFormValues;
  onSubmit: (values: QuickReplyTemplateFormValues) => Promise<{ success: boolean; error?: string }>;
  onDone: () => void;
};
```

Fields: **العنوان** (`title`, required, `<input>`), **النص** (`body`, required, `<textarea rows={4}>`).

**Create file: `components/dashboard/QuickReplyTemplatesPanel.tsx`** (`"use client"`) — Props: `{ templates: QuickReplyTemplateListItem[]; hasNextPage: boolean; hasPreviousPage: boolean; page: number; initialSearch: string }`. State: `addOpen`, `editingTemplate`, `deletingTemplate`, plus a debounced `search` state writing to `?templatesSearch=` (same `useEffect`/`setTimeout` shape as `CustomerSearch.tsx`, Context item 2, but scoped to this panel's own query param, clearing `?templatesPage=` on change — the third independently-namespaced paginated section on this page, after Story 10's `?page=`/`?status=` and Story 11's `?tasksPage=`/`?isCompleted=`).

Renders a `.card space-y-4`:
- Header row: `<h2>قوالب الردود السريعة</h2>` + "+ إضافة قالب" button.
- A search `<input>` below the header (same styling as `CustomerSearch.tsx`).
- Empty state: "لا توجد قوالب بعد" when `templates.length === 0`.
- Otherwise a `<ul className="space-y-3">` of rows showing `title` (bold), a truncated preview of `body` (`className="text-sm text-text-secondary line-clamp-2"`), and "تعديل"/"حذف" `<Button variant="outline" size="sm">` actions — no completion checkbox (templates aren't completable) and no author name shown (Story Goal: shared, not attributed in this UI).
- Prev/Next pagination using `?templatesPage=`.
- Add/edit modals and the delete `ConfirmDialog`, wired to the three server actions from Task 3, following [11-story-agent-tasks-reminders-KAN-4.md](11-story-agent-tasks-reminders-KAN-4.md) Task 4's exact modal/dialog wiring pattern.

### 5 — Wire into the dashboard page

**Edit file: `app/(pages)/dashboard/page.tsx`** (created by Story 10, already edited by Story 11) — add `templatesPage`/`templatesSearch` to the `searchParams` type, extend the `Promise.all` with `quickReplyTemplateEndpoints.list({ pageNumber: templatesPageNumber, search: templatesSearch })`, and render `<QuickReplyTemplatesPanel ... />` as a third `.card` panel below the tasks panel.

### 6 — Wire a template picker into the message composer

**Edit file: `components/conversations/SendMessageForm.tsx`** — add a "use client" template-picker control directly above the existing `<textarea>` (before line 41): a `<button type="button">` labeled "استخدام قالب رد سريع" that toggles a dropdown; opening it calls `listQuickReplyTemplatesAction("")` (Task 3) to populate an initial list, with a small search `<input>` inside the dropdown that re-calls the action (debounced 300ms, same pattern as `CustomerPicker.tsx`) as the agent types. Each result renders as a `<button type="button">` showing the template's `title`; clicking one:

```ts
setBody((current) => (current.trim() ? `${current}\n${template.body}` : template.body));
```

— appends the template body on a new line when the agent has already typed something, or replaces an empty textarea outright, and closes the dropdown. This is a deliberate, documented choice (see Edge Cases) since a "quick reply" is meant to save typing, not silently discard whatever the agent had already written.

Add `import { listQuickReplyTemplatesAction, type QuickReplyOption } from "@/app/(pages)/conversations/actions";` to this file's existing imports.

## Edge Cases & Failure Modes

- **Any agent can edit or delete any other agent's template** — this is the backend's own deliberate design (Prerequisites), not a frontend gap; `QuickReplyTemplatesPanel` shows no author/ownership information and no restriction on which "تعديل"/"حذف" buttons render, matching that model exactly.
- **Two agents edit the same template concurrently** — "last write wins" server-side (per the backend story's own documented gap); the frontend has no optimistic-concurrency check either, so a stale edit silently overwrites a newer one. Not addressed by this story — flag as a known limitation if it becomes a real workflow problem.
- **Inserting a template into a non-empty reply textarea** — appended on a new line rather than replacing the agent's in-progress text (Task 6); this is the frontend's own scope decision (the backend has no opinion on this, since `SendMessageCommand`/`ConversationsController` are untouched — see Prerequisites/Story Goal) and should not be "fixed" to silently replace text instead without discussion, since that would lose typed content.
- **Selecting a quick reply on a `LiveChat` conversation** — cannot happen through this story's UI: `SendMessageForm` (the only component this story edits) is never rendered for `channel === "LiveChat"` (Context item 8); `LiveChatPanel`'s own input is untouched, so live-chat conversations have no quick-reply picker after this story. Flag as a follow-up if live-chat quick replies become a requirement — it would need its own integration into `LiveChatPanel`, not a trivial reuse of this story's work.
- **Searching for a template that doesn't exist / an empty template library** — `listQuickReplyTemplatesAction` returns `[]` (its own `!result.success` fallback, or a genuinely empty backend result); the picker dropdown shows an empty list rather than an error, mirroring `searchCustomersAction`'s existing fallback-to-`[]` convention.
- **`title`/`body` left empty on create or edit** — rejected server-side (`NotEmpty()` on both); not mirrored client-side beyond the `<input>`/`<textarea>`'s `required` attribute (same reasoning as every other form in this codebase) — a bypassed empty submission surfaces via the shared `role="alert"` error paragraph.
- **`?templatesSearch=`/`?templatesPage=` interact with Story 10's and Story 11's own params** — all three panels' query params are independent, following the same `new URLSearchParams(searchParams.toString())`-preserves-unrelated-params convention documented in Story 10/11.

## Test Plan

No automated test infrastructure exists in this repository yet (no `test` script in `package.json`, per KAN-1 Story 01's identical note). Manual verification only, per the Verification Steps below.

## Verification Steps

1. **Frontend builds:** `npm run build` (or `pnpm build`) from the repository root.
2. **Lint passes:** `npm run lint`.
3. **Frontend runs against a live backend:** `npm run dev`, with `azm-crm-backend` running locally (Story 15 deployed).
4. **Manual smoke test:** on `/dashboard`, create a quick reply template ("تأخير الطلب" / "نعتذر عن التأخير..."), confirm it appears in the alphabetically-sorted list; search for part of its body text and confirm it's still found; edit its body and confirm the change persists; open a non-live-chat conversation, click "استخدام قالب رد سريع", select the template, and confirm its body is inserted into the reply textarea (both when the textarea is empty and when it already has typed text); send the message and confirm it posts normally; delete the template from the dashboard and confirm it disappears; log in as a second user and confirm they can see, edit, and delete the first user's template (shared, not per-agent).

## Done Criteria

- [ ] `/dashboard` shows a "قوالب الردود السريعة" panel with working create/search/edit/delete, alphabetically sorted, shared across all agents.
- [ ] The non-live-chat conversation reply form has a working quick-reply picker that inserts a selected template's body into the textarea (appending when text already exists, replacing when empty).
- [ ] `?templatesSearch=`/`?templatesPage=` compose correctly with Story 10's and Story 11's own dashboard query params.
- [ ] `npm run build` and `npm run lint` both succeed with no new errors.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 13.**
