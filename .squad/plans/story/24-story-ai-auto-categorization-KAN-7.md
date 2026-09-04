# Story 24 — Auto-Categorize Incoming Tickets (Story: KAN-7)

## Prerequisites

- [05-story-ticket-core-crud-KAN-2.md](05-story-ticket-core-crud-KAN-2.md) completed: this story **edits** `lib/types/ticket.ts`, `components/tickets/TicketForm.tsx`, and `app/(pages)/tickets/actions.ts`, all created by that story.
- **Backend dependency**: the `azm-crm-backend` sibling repo's `feature/kan-7-ai-features` branch (Story 27, `Auto-Categorize Incoming Tickets`) is already implemented:
  - `POST /api/tickets` (`CreateTicketRequest`) now accepts `category` as **optional/nullable** (previously required). When omitted, `CreateTicketCommandHandler` classifies the ticket's `title`/`description` into one of `TicketCategory`'s six existing values via a new `IIncomingTicketCategorizer`, and **never fails the request** — on any AI failure or unparseable model response it falls back to `TicketCategory.General`. The response shape (`Result<Guid>`, 201) is unchanged; the created ticket's resolved category is visible immediately on the returned `TicketDto`/`TicketListItemDto` exactly as an explicitly-chosen category already is.
  - `PUT /api/tickets/{id}` (`UpdateTicketRequest`) still requires `category` — auto-categorization only applies at **creation** time, never on update.

## Story Goal

Let an agent leave a new ticket's category unset and have the backend classify it automatically from its title/description, satisfying KAN-7's **"Auto-categorize incoming tickets"** acceptance criterion.

Outcome: the ticket **creation** form (`/tickets/new`) gains a `"تصنيف تلقائي (الذكاء الاصطناعي)"` (Auto-categorize (AI)) option in the category `<select>`. Choosing it omits `category` from the create request entirely, letting the backend resolve it; the created ticket then shows whichever category the AI (or its `General` fallback) chose, on both the ticket list and detail pages — no new UI is needed there since `TICKET_CATEGORY_LABELS` already renders every real `TicketCategory` value.

**Not in scope**: a confidence score or a human-confirmation step before the AI-resolved category is applied (the backend commits it directly, matching its own documented scope decision); auto-categorization on **edit** (`updateTicketAction`/`UpdateTicketRequest` keep `category` required, unchanged by this story); re-categorizing an existing ticket after creation (no such endpoint exists); showing which tickets were auto- vs. manually-categorized (the backend persists no such marker — `TicketDto.Category` is indistinguishable either way, the same "no AI-generated audit marker" scope decision documented across every KAN-7 story).

## Context — Read These Files First

1. [lib/types/ticket.ts](lib/types/ticket.ts) — read in full (51 lines). `TicketFormValues.category` (line 48) is currently `TicketCategory` (always a real value); this story widens it to accept an auto-detect sentinel on the **create** path only.
2. [components/tickets/TicketForm.tsx](components/tickets/TicketForm.tsx) — read in full (142 lines). The category `<select>` (lines 90–107) this story adds one more `<option>` to, and `handleSubmit` (lines 29–45), which currently has no category-specific validation to adjust.
3. [app/(pages)/tickets/actions.ts](app/(pages)/tickets/actions.ts) lines 12–35 — `createTicketAction`'s current body-building shape (`category: values.category`), which this story changes to conditionally omit the field.
4. [lib/constants/ticket.ts](lib/constants/ticket.ts) — read in full (30 lines). `TICKET_CATEGORIES`/`TICKET_CATEGORY_LABELS` this story does **not** edit (the six real categories are unchanged) — the auto-detect option is handled separately in `TicketForm`, not added to this shared label map, since `TICKET_CATEGORY_LABELS` is also used to render an already-resolved `Ticket.category` (e.g. `app/(pages)/tickets/[id]/page.tsx` line 54) where an "auto" pseudo-value would never legitimately appear.
5. [app/(pages)/tickets/new/page.tsx](app/(pages)/tickets/new/page.tsx) lines 27–33 — `TicketForm`'s `initialValues` for `mode="create"`, which hardcodes `category: "General"` (this story changes that literal to the new auto-detect sentinel, so a new ticket defaults to AI categorization unless the agent picks a specific one).

## Implementation tasks

### 1 — Types

**Edit file: `lib/types/ticket.ts`** — widen `TicketFormValues.category` (line 48) to a union that includes an auto-detect sentinel, distinct from any real `TicketCategory` value:

```ts
export type TicketFormValues = {
  customerId: string;
  title: string;
  description: string;
  category: TicketCategory | "Auto";
  priority: TicketPriority;
};
```

`"Auto"` is chosen as the sentinel because it can never collide with a real `TicketCategory` value (all six are `PascalCase` domain words — `General`, `Technical`, `Billing`, `AccountAccess`, `FeatureRequest`, `Other` — none of which is `"Auto"`).

### 2 — Form UI

**Edit file: `components/tickets/TicketForm.tsx`** — in the category `<select>` (lines 95–106), add one `<option>` before the mapped `TICKET_CATEGORIES` list, **only when `mode === "create"`** (an edit form's category select keeps exactly the six real options, since `PUT` still requires a real value):

```tsx
<select
  id="ticket-category"
  value={values.category}
  onChange={(e) => handleChange("category", e.target.value as TicketFormValues["category"])}
  className={inputClassName}
>
  {mode === "create" && <option value="Auto">تصنيف تلقائي (الذكاء الاصطناعي)</option>}
  {TICKET_CATEGORIES.map((category) => (
    <option key={category} value={category}>
      {TICKET_CATEGORY_LABELS[category]}
    </option>
  ))}
</select>
```

No change to `handleSubmit` (lines 29–45) — `"Auto"` is a valid `TicketFormValues["category"]` value and flows through to `onSubmit(values)` unchanged; the omission of `category` from the actual HTTP request body happens in `createTicketAction` (Task 3), not in the form component.

### 3 — Server action

**Edit file: `app/(pages)/tickets/actions.ts`** — in `createTicketAction` (lines 12–35), change the request body's `category` field to omit itself when the sentinel is chosen:

```ts
body: {
  customerId: values.customerId,
  title: values.title.trim(),
  description: values.description.trim() || null,
  category: values.category === "Auto" ? null : values.category,
  priority: values.priority,
},
```

`updateTicketAction` (lines 37–59) is **not** changed — its `values` parameter type is `Omit<TicketFormValues, "customerId">`, which now technically includes `category: TicketCategory | "Auto"` per Task 1's widened type, but the edit form (Task 2) never renders the `"Auto"` option, so an edit submission's `category` is always a real `TicketCategory` value in practice. This is a known, deliberate type-level looseness — see Edge Cases.

### 4 — Default the create form to auto-categorize

**Edit file: `app/(pages)/tickets/new/page.tsx`** — change the `initialValues.category` literal (line 31, currently `"General"`) passed to `TicketForm` to `"Auto"` — a new ticket defaults to AI categorization, and the agent opts **into** a specific category by changing the select, rather than opting into AI by remembering a non-default option exists.

## Edge Cases & Failure Modes

- **The AI categorizer fails or returns an unparseable response** — invisible to the frontend entirely: the backend's `IIncomingTicketCategorizer` falls back to `TicketCategory.General` and the create request still succeeds (201) with a real category on the response — `createTicketAction` never sees a failure caused by this path.
- **An agent submits the create form with `category: "Auto"` but the ticket ends up categorized `"General"` because the AI call failed** — indistinguishable from a ticket the AI genuinely classified as `General`; not surfaced as an error anywhere (see Story Goal, "Not in scope" — no audit marker exists).
- **`updateTicketAction`'s type signature technically allows `category: "Auto"`** (Task 3's note) — since `TicketForm`'s edit mode never renders that option, this can only happen via a bypassed client (e.g. a hand-crafted request) — the backend's `UpdateTicketRequest.Category` is a non-nullable `TicketCategory` enum, so a literal `"Auto"` string fails backend model binding/validation and the request 400s, surfaced via the existing `TicketActionResult` error path. Not specially handled beyond that.
- **An agent picks a specific category, then changes their mind back to "تصنيف تلقائي"** — no different from any other form field change; the select is fully controlled (`values.category`), so switching back and forth before submit is loss-free.
- **`TICKET_CATEGORY_LABELS[ticket.category]`** (ticket list/detail pages) **receiving `"Auto"` as a stored value** — cannot happen: `"Auto"` is a frontend-only form sentinel, never sent to the backend as a `Ticket.Category` value and never returned by `GET`/`POST` responses, which only ever carry the six real enum values.

## Test Plan

No automated test infrastructure exists in this repository. Manual verification only, per Verification Steps below.

## Verification Steps

1. **Frontend builds:** `pnpm build` from the repository root.
2. **Lint passes:** `pnpm lint`.
3. **Frontend runs against a live backend:** `pnpm dev`, with `azm-crm-backend`'s `feature/kan-7-ai-features` branch running locally.
4. **Manual smoke test:** open `/tickets/new`, confirm the category select defaults to "تصنيف تلقائي (الذكاء الاصطناعي)"; submit a ticket titled `"لا أستطيع الدخول إلى حسابي"` (an account-access-shaped title) with that option left selected, and confirm the created ticket's detail page shows a real, plausible category (e.g. "الوصول للحساب") rather than a raw `"Auto"` value; create a second ticket picking an explicit category (e.g. "الفواتير") and confirm it is saved exactly as chosen, unaffected by the AI path; edit either ticket and confirm the edit form's category select has no "تصنيف تلقائي" option.

## Done Criteria

- [ ] `/tickets/new`'s category select defaults to, and offers, an AI auto-categorize option; the edit form does not.
- [ ] Submitting with auto-categorize selected omits `category` from the create request and the resulting ticket shows a real, backend-resolved category.
- [ ] Submitting with an explicit category is unaffected and behaves exactly as before this story.
- [ ] `pnpm build` and `pnpm lint` both succeed with no new errors.
