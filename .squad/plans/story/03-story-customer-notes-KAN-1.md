# Story 03 — Customer Notes (Story: KAN-1)

## Prerequisites

- [01-story-customer-core-crud-KAN-1.md](01-story-customer-core-crud-KAN-1.md) completed: requires `lib/api/customer.api.ts`, `app/(pages)/customers/actions.ts`, and the `/customers/[id]` page's `<div className="space-y-6">` wrapper.
- Independent of [02-story-customer-interactions-KAN-1.md](02-story-customer-interactions-KAN-1.md) — notes and interactions are separate sections on the same detail page and can be built in either order, but this plan assumes Story 02 landed first only so both sections' page-wiring edits (Task 5 in each) don't need to be reconciled by hand; nothing here actually depends on Story 02's code.
- **Backend dependency**: the `azm-crm-backend` sibling repo's Story 03 (`Customer Notes`) must be deployed, exposing:
  - `POST /api/customers/{customerId}/notes` → `Result<Guid>` (201) / 404 / 400
  - `GET /api/customers/{customerId}/notes?pageNumber=&pageSize=` → `Result<PaginatedResult<CustomerNoteDto>>` (200) / 404

  `CustomerNoteDto` fields: `id`, `customerId`, `content`, `createdBy` (guid — the authoring agent's user id; this story does not resolve it to a display name, see Edge Cases), `createdOn`. `CreateNoteRequest` body: `{ content }`.

## Story Goal

Let support agents attach free-text notes to a customer profile and view a customer's note history, satisfying KAN-1's "Add notes ... to customer records" acceptance criterion.

Outcomes:
1. An "Add Note" action on `/customers/[id]` opens a small form (content only) and saves it.
2. The note history renders on `/customers/[id]`, newest first, paginated.

**Not in scope**: editing or deleting an existing note (the backend doesn't expose those endpoints either — see the backend story's own scope note) and resolving `createdBy` to a display name (no "list users" endpoint is consumed by this story — see Edge Cases).

## Context — Read These Files First

1. [01-story-customer-core-crud-KAN-1.md](01-story-customer-core-crud-KAN-1.md) — read in full. Reuses the same types/API-client/server-action/component shape.
2. [02-story-customer-interactions-KAN-1.md](02-story-customer-interactions-KAN-1.md) — read in full. `CustomerNote` is structurally simpler than `CustomerInteraction` (no enum, one field), but this story's `NoteHistorySection`/`AddNoteForm`/page-wiring edit are close copies of that story's `InteractionHistorySection`/`LogInteractionForm`/page-wiring edit — mirror that shape rather than re-deriving it.
3. [lib/api/customer.api.ts](lib/api/customer.api.ts) (extended by Story 02 with an `interactions` sub-object) — this story adds a sibling `notes` sub-object to `customerEndpoints`.
4. [app/(pages)/customers/actions.ts](app/(pages)/customers/actions.ts) (extended by Story 02 with `logInteractionAction`) — this story adds a sibling `addNoteAction`.
5. [app/(pages)/customers/[id]/page.tsx](app/(pages)/customers/[id]/page.tsx) — edited by Story 02 to add `InteractionHistorySection`. This story adds `NoteHistorySection` alongside it, inside the same `<div className="space-y-6">` wrapper.
6. [lib/utils/date.ts](lib/utils/date.ts) — `formatDateTime` (lines 1–12), reused to render each note's `createdOn`.

## Implementation tasks

### 1 — Types

**Create file: `lib/types/customerNote.ts`**

```ts
export type CustomerNote = {
  id: string;
  customerId: string;
  content: string;
  createdBy: string;
  createdOn: string;
};

export type AddNoteFormValues = {
  content: string;
};
```

### 2 — API client

**Edit file: `lib/api/customer.api.ts`** — add a `notes` sub-object to `customerEndpoints` (alongside `interactions`):

```ts
  notes: {
    list: (customerId: string, params: { pageNumber?: number; pageSize?: number } = {}) =>
      apiServerFetch<PaginatedResult<CustomerNote>>({
        url: `${CUSTOMERS_URL}/${customerId}/notes`,
        params: { pageNumber: params.pageNumber ?? 1, pageSize: params.pageSize ?? 20 },
        cache: "no-store",
      }),
  },
```

Add `import type { CustomerNote } from "../types/customerNote";` to the file's import block.

### 3 — Server action

**Edit file: `app/(pages)/customers/actions.ts`** — add, alongside `logInteractionAction`:

```ts
export async function addNoteAction(
  customerId: string,
  values: AddNoteFormValues
): Promise<CustomerActionResult | undefined> {
  const result = await apiServerFetch<string>({
    url: `/api/customers/${customerId}/notes`,
    method: "POST",
    body: { content: values.content.trim() },
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath(`/customers/${customerId}`);
  return { success: true };
}
```

Add `import type { AddNoteFormValues } from "@/lib/types/customerNote";` to the file's import block.

### 4 — Components

**Create file: `components/customers/AddNoteForm.tsx`** (`"use client"`) — controlled form (`useState<AddNoteFormValues>`) with a single `<textarea>` ملاحظة (content, required, matching the login-page input styling plus `rows={4}`). On submit, call `addNoteAction(customerId, values)`; on success, reset and close (`onAdded: () => void`); on failure, show the error via the same `role="alert"` pattern used throughout.

**Create file: `components/customers/NoteHistorySection.tsx`** (`"use client"`) — Props: `{ customerId: string; notes: CustomerNote[]; hasNextPage: boolean; hasPreviousPage: boolean; page: number }`. Renders a `.card` with:
- Header: "الملاحظات" + a `Button` "إضافة ملاحظة" that opens `AddNoteForm` inside the same overlay-modal pattern used by `LogInteractionForm` (Story 02) and `ConfirmDialog` (Story 01).
- A list of notes, each showing `content` (preserve line breaks with `whitespace-pre-wrap`) and `formatDateTime(createdOn)`.
- Empty state: "لا توجد ملاحظات بعد" when `notes.length === 0`.
- Prev/Next pagination using `?notesPage=` as the query param name (distinct from `?page=` on the customer list and `?interactionsPage=` from Story 02).
- On successful add (`onAdded`), call `router.refresh()` and close the dialog — same pattern as `InteractionHistorySection`.

### 5 — Page wiring

**Edit file: `app/(pages)/customers/[id]/page.tsx`** — inside the `<div className="space-y-6">` wrapper, after `InteractionHistorySection` (or after the contact-details card if Story 02 has not landed), add:

```tsx
const notesPage = Number(searchParams.notesPage) || 1;
const notesResult = await customerEndpoints.notes.list(id, { pageNumber: notesPage });

// ... inside the JSX:
<NoteHistorySection
  customerId={id}
  notes={notesResult.success ? notesResult.data.items : []}
  hasNextPage={notesResult.success ? notesResult.data.hasNextPage : false}
  hasPreviousPage={notesResult.success ? notesResult.data.hasPreviousPage : false}
  page={notesPage}
/>
```

Add `notesPage` to the page component's existing `searchParams` type (alongside `interactionsPage` from Story 02, if present). As with the interactions section, degrade gracefully (empty list) on a non-404 failure rather than throwing.

## Edge Cases & Failure Modes

- **Adding a note against a customer that was deleted between page load and submit** — 404s server-side; `addNoteAction` returns `{ success: false, error: result.error }`, surfaced in `AddNoteForm`'s error paragraph.
- **Empty/whitespace `content`** — rejected server-side (backend `NotEmpty()`, which also rejects whitespace-only per FluentValidation's default). The `<textarea>` is marked `required`; the server error still surfaces if bypassed.
- **`content` over 4000 characters** — rejected server-side with a 400; not mirrored client-side in this story — the server error surfaces via the shared error paragraph. A live character counter is a reasonable follow-up, not required here.
- **`createdBy` is a raw user id (guid), not a display name** — this story renders it nowhere (the note list only shows content + date) specifically to avoid showing a raw guid in the UI; resolving it to "created by <agent name>" would require a users-lookup endpoint this story does not consume. Flag as a follow-up if "who wrote this note" becomes a requirement.
- **Two agents add notes for the same customer concurrently** — no conflict; each `POST` creates an independent row, same reasoning as Story 02's concurrent-interaction case.
- **Note history section on a customer with zero notes** — renders the "لا توجد ملاحظات بعد" empty state; "إضافة ملاحظة" stays available.

## Test Plan

No automated test infrastructure exists in this repository yet (see Story 01's Test Plan note). Manual verification only, per the Verification Steps below.

## Verification Steps

1. **Frontend builds:** `npm run build` from the repository root.
2. **Lint passes:** `npm run lint`.
3. **Manual smoke test:** with `azm-crm-backend` running (Story 03 deployed) and `npm run dev`, open an existing customer's detail page, confirm the note history section renders empty; add a note via "إضافة ملاحظة" and confirm it appears newest-first with line breaks preserved; add enough notes to exercise pagination and confirm Prev/Next work; attempt to add an empty note and confirm it's rejected.

## Done Criteria

- [ ] `/customers/[id]` shows the customer's notes, newest first, with working pagination.
- [ ] Agents can add a free-text note.
- [ ] An empty note is rejected before/at the server.
- [ ] `npm run build` and `npm run lint` both succeed with no new errors.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 04.**
