# Story 02 — Customer Interaction History (Story: KAN-1)

## Prerequisites

- [01-story-customer-core-crud-KAN-1.md](01-story-customer-core-crud-KAN-1.md) completed: this story edits the `/customers/[id]` page it creates, and reuses `lib/types/customer.ts`, `lib/types/pagination.ts`, `lib/api/customer.api.ts`, and the `CustomerForm`/`ConfirmDialog` component conventions it establishes.
- **Backend dependency**: the `azm-crm-backend` sibling repo's Story 02 (`Customer Interaction History`) must be deployed, exposing:
  - `POST /api/customers/{customerId}/interactions` → `Result<Guid>` (201) / 404 (unknown `customerId`) / 400 (validation)
  - `GET /api/customers/{customerId}/interactions?pageNumber=&pageSize=` → `Result<PaginatedResult<CustomerInteractionDto>>` (200) / 404

  `CustomerInteractionDto` fields: `id`, `customerId`, `type` (string enum — one of `"Call"`, `"Email"`, `"Meeting"`, `"WhatsApp"`, `"Sms"`, `"Other"`, serialized as its name via the backend's `JsonStringEnumConverter`), `subject`, `description` (nullable), `occurredOn` (ISO datetime string), `createdOn`. `CreateInteractionRequest` body: `{ type, subject, description, occurredOn }`.

## Story Goal

Let support agents log a new interaction (call, email, meeting, WhatsApp, SMS, or other touchpoint) against a customer and view that customer's interaction history in chronological order, satisfying KAN-1's "View full interaction history per customer" acceptance criterion.

Outcomes:
1. An "Add Interaction" action on `/customers/[id]` opens a small form (type, subject, description, date/time) and logs it.
2. The interaction history renders on `/customers/[id]`, newest first, paginated.

**Not in scope**: editing or deleting a logged interaction (the backend doesn't expose those endpoints either — see the backend story's own scope note), and automatic interaction creation from other modules (tickets, communication channels — those are separate, not-yet-built KAN-2/KAN-3 stories).

## Context — Read These Files First

1. [01-story-customer-core-crud-KAN-1.md](01-story-customer-core-crud-KAN-1.md) — read in full. This story repeats the same types/API-client/server-action/component shape it establishes; do not re-derive the pattern from scratch.
2. [lib/api/customer.api.ts](lib/api/customer.api.ts) (created in Story 01) — the `customerEndpoints` object this story extends with an `interactions.list` read.
3. [app/(pages)/customers/actions.ts](app/(pages)/customers/actions.ts) (created in Story 01) — the `"use server"` mutation-action pattern (`createCustomerAction`'s shape: build request body, call `apiServerFetch`, return `CustomerActionResult`) this story's `logInteractionAction` mirrors, minus the `redirect()` (logging an interaction does not navigate away).
4. [app/(pages)/customers/[id]/page.tsx](app/(pages)/customers/[id]/page.tsx) (created in Story 01) — this story **edits** this file to add an interaction-history section below the contact-details card, inside the `<div className="space-y-6">` wrapper Story 01 left for this purpose.
5. [components/customers/ConfirmDialog.tsx](components/customers/ConfirmDialog.tsx) (created in Story 01) — not reused directly here (no delete/confirm action in this story), but its `"use client"` + overlay-modal shape is the pattern the new "Add Interaction" form dialog follows, since `components/ui/` still has no `Dialog` primitive (confirmed in Story 01, Task-list item 10).
6. [components/customers/CustomerForm.tsx](components/customers/CustomerForm.tsx) (created in Story 01) — the controlled-form-with-`useState` shape (Arabic labels, login-page input styling, `role="alert"` error display, `Button disabled={isSubmitting}`) this story's `LogInteractionForm` follows.
7. [lib/utils/date.ts](lib/utils/date.ts) — `formatDateTime` (lines 1–12), reused to render each interaction's `occurredOn`/`createdOn`.

## Implementation tasks

### 1 — Types

**Create file: `lib/types/customerInteraction.ts`**

```ts
export type InteractionType = "Call" | "Email" | "Meeting" | "WhatsApp" | "Sms" | "Other";

export type CustomerInteraction = {
  id: string;
  customerId: string;
  type: InteractionType;
  subject: string;
  description: string | null;
  occurredOn: string;
  createdOn: string;
};

export type LogInteractionFormValues = {
  type: InteractionType;
  subject: string;
  description: string;
  occurredOn: string; // datetime-local input value, e.g. "2026-08-27T10:00"
};
```

**Create file: `lib/constants/customerInteraction.ts`**

```ts
import type { InteractionType } from "@/lib/types/customerInteraction";

export const INTERACTION_TYPE_LABELS: Record<InteractionType, string> = {
  Call: "مكالمة",
  Email: "بريد إلكتروني",
  Meeting: "اجتماع",
  WhatsApp: "واتساب",
  Sms: "رسالة نصية",
  Other: "أخرى",
};

export const INTERACTION_TYPES = Object.keys(INTERACTION_TYPE_LABELS) as InteractionType[];
```

### 2 — API client

**Edit file: `lib/api/customer.api.ts`** — add an `interactions` sub-object to `customerEndpoints` (after `getById`):

```ts
  interactions: {
    list: (customerId: string, params: { pageNumber?: number; pageSize?: number } = {}) =>
      apiServerFetch<PaginatedResult<CustomerInteraction>>({
        url: `${CUSTOMERS_URL}/${customerId}/interactions`,
        params: { pageNumber: params.pageNumber ?? 1, pageSize: params.pageSize ?? 20 },
        cache: "no-store",
      }),
  },
```

Add `import type { CustomerInteraction } from "../types/customerInteraction";` to the file's import block.

### 3 — Server action

**Edit file: `app/(pages)/customers/actions.ts`** — add, following `createCustomerAction`'s shape but without a redirect:

```ts
export async function logInteractionAction(
  customerId: string,
  values: LogInteractionFormValues
): Promise<CustomerActionResult | undefined> {
  const result = await apiServerFetch<string>({
    url: `/api/customers/${customerId}/interactions`,
    method: "POST",
    body: {
      type: values.type,
      subject: values.subject.trim(),
      description: values.description.trim() || null,
      occurredOn: new Date(values.occurredOn).toISOString(),
    },
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath(`/customers/${customerId}`);
  return { success: true };
}
```

Add `import type { LogInteractionFormValues } from "@/lib/types/customerInteraction";` to the file's import block.

### 4 — Components

**Create file: `components/customers/LogInteractionForm.tsx`** (`"use client"`) — controlled form (`useState<LogInteractionFormValues>`, defaulting `occurredOn` to the current local datetime formatted for `<input type="datetime-local">`) with:
- A native `<select>` for النوع (type), options from `INTERACTION_TYPES`/`INTERACTION_TYPE_LABELS` (no shadcn `Select` primitive — same "plain HTML" reasoning as Story 01, Task-list item 10).
- `<input>` الموضوع (subject, required, matches the login-page input styling).
- `<textarea>` الوصف (description, optional).
- `<input type="datetime-local">` تاريخ ووقت التفاعل (occurredOn, required).
- On submit, call `logInteractionAction(customerId, values)`; on success, reset the form and close (props: `onLogged: () => void`); on failure, show the error via the same `role="alert"` pattern as `CustomerForm`.

**Create file: `components/customers/InteractionHistorySection.tsx`** (`"use client"`, since it toggles the add-interaction dialog) — Props: `{ customerId: string; interactions: CustomerInteraction[]; hasNextPage: boolean; hasPreviousPage: boolean; page: number }`. Renders a `.card` with:
- Header: "سجل التفاعلات" + a `Button` "إضافة تفاعل" that opens `LogInteractionForm` inside the same overlay-modal pattern as `ConfirmDialog` (Story 01).
- A list of interactions (not a `<table>` — free-form list reads better for a mixed subject/description/date history), each row showing `INTERACTION_TYPE_LABELS[type]` as a small badge-like `<span>`, `subject` bolded, `description` beneath when present, and `formatDateTime(occurredOn)` right-aligned.
- Empty state: "لا يوجد تفاعلات مسجلة بعد" when `interactions.length === 0`.
- Prev/Next pagination controls identical in shape to the customer list page's (Story 01, Task 6), using `?interactionsPage=` as the query param name (distinct from the customer list's own `?page=`, since this section lives on the detail page which has no other paginated list yet in this story).
- On successful log (`onLogged`), call `router.refresh()` (`useRouter` from `next/navigation`) to re-fetch the server-rendered interaction list, then close the dialog.

### 5 — Page wiring

**Edit file: `app/(pages)/customers/[id]/page.tsx`** — inside the existing `<div className="space-y-6">` wrapper, after the contact-details card, add:

```tsx
const interactionsPage = Number(searchParams.interactionsPage) || 1;
const interactionsResult = await customerEndpoints.interactions.list(id, {
  pageNumber: interactionsPage,
});

// ... inside the JSX, after the contact-details card:
<InteractionHistorySection
  customerId={id}
  interactions={interactionsResult.success ? interactionsResult.data.items : []}
  hasNextPage={interactionsResult.success ? interactionsResult.data.hasNextPage : false}
  hasPreviousPage={interactionsResult.success ? interactionsResult.data.hasPreviousPage : false}
  page={interactionsPage}
/>
```

The page component's props must now accept `searchParams: { interactionsPage?: string }` alongside the `params: { id: string }` it already destructures. If `interactionsResult.success` is `false` with `status !== 404` (a 404 here would only happen if the *customer itself* is gone, already handled by the `getById` call above it), degrade gracefully by passing an empty list rather than throwing — an interaction-list failure should not break the whole customer detail page.

## Edge Cases & Failure Modes

- **Logging an interaction against a customer that was deleted between page load and submit** — `POST /api/customers/{customerId}/interactions` 404s server-side (the backend checks the customer still exists and is not soft-deleted); `logInteractionAction` returns `{ success: false, error: result.error }`, surfaced in `LogInteractionForm`'s error paragraph. No special-case handling beyond the existing generic error path.
- **`type` sent as anything other than the six known enum names** — impossible from this UI since `LogInteractionForm`'s `<select>` only offers `INTERACTION_TYPES`' values; not a client-side concern, but documents why no extra validation is added.
- **Empty/whitespace `subject`** — rejected server-side (backend `NotEmpty()`); the form marks the `<input>` `required` (native browser validation catches the common case), and the server error still surfaces if bypassed (e.g. programmatic submission).
- **`description` over 2000 characters** — rejected server-side with a 400; not mirrored client-side in this story (same reasoning as Story 01's field-length edge case) — the server error surfaces via the shared error paragraph.
- **`occurredOn` far in the past or future** — explicitly allowed by the backend (agents may log historical interactions); no client-side bound is enforced.
- **Two agents log interactions for the same customer concurrently** — no conflict; each `POST` creates an independent row. `router.refresh()` after your own submit only reflects your own write plus whatever was already server-rendered at that moment — a concurrent agent's simultaneous log will appear on the next natural refresh/navigation, not live-pushed. Acceptable for this story; real-time sync is out of scope.
- **Interaction history section on a customer with zero interactions** — renders the "لا يوجد تفاعلات مسجلة بعد" empty state; the "إضافة تفاعل" button is still available.

## Test Plan

No automated test infrastructure exists in this repository yet (see Story 01's Test Plan note). Manual verification only, per the Verification Steps below.

## Verification Steps

1. **Frontend builds:** `npm run build` from the repository root.
2. **Lint passes:** `npm run lint`.
3. **Manual smoke test:** with `azm-crm-backend` running (Story 02 deployed) and `npm run dev`, open an existing customer's detail page, confirm the interaction history section renders empty; log an interaction of each type via "إضافة تفاعل" and confirm it appears newest-first; log enough interactions to exercise pagination (more than the default page size) and confirm Prev/Next work; attempt to log with an empty subject and confirm the browser/server rejects it.

## Done Criteria

- [ ] `/customers/[id]` shows the customer's interaction history, newest first, with working pagination.
- [ ] Agents can log a new interaction (all six types) with subject, optional description, and a date/time.
- [ ] An empty subject is rejected before/at the server.
- [ ] `npm run build` and `npm run lint` both succeed with no new errors.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 03.**
