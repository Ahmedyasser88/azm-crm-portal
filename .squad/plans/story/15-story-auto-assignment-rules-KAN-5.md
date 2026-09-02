# Story 15 — Auto-Assign Tickets Based on Rules (Story: KAN-5)

## Prerequisites

- [14-story-sla-policies-KAN-5.md](14-story-sla-policies-KAN-5.md) completed: this story **edits** `app/(pages)/automation/page.tsx` to append a second panel, reuses `AutomationActionResult` from `app/(pages)/automation/slaPolicyActions.ts`, and copies `SlaPoliciesPanel`/`SlaPolicyForm`'s exact shared-CRUD-panel shape.
- [components/tickets/AssignTicketControl.tsx](components/tickets/AssignTicketControl.tsx) completed (KAN-2 Story 06): this story's target-agent field reuses its exact "راو معرّف الموظف" (raw agent-id `<input>`) pattern — there is no backend endpoint to list/search agents by name in this codebase (confirmed: `azm-crm-backend`'s `IdentityController` only exposes `register`/`login`/`refresh-token`/`revoke-token`/`me`, no list-users action), so a rule's target agent is entered as a raw user id, exactly like manual ticket assignment already is.
- **Backend dependency**: the `azm-crm-backend` sibling repo's Story 18 (`Auto-Assign Tickets Based on Rules`) is already implemented on the working tree (verified against `src/AzmCrm.API/Controllers/AssignmentRulesController.cs` and `src/AzmCrm.Application/Features/Automation/DTOs/*.cs` in that repo), exposing:
  - `POST /api/assignment-rules` with body `{name, category, priority, assignedToUserId, evaluationOrder}` (`category`/`priority` nullable) → `Result<Guid>` (201) / 400 / 404 (`assignedToUserId` doesn't resolve to an existing user).
  - `GET /api/assignment-rules/{id}` → `Result<AssignmentRuleDto>` (200) / 404.
  - `GET /api/assignment-rules?pageNumber=&pageSize=&category=&priority=&isActive=` → `Result<PaginatedResult<AssignmentRuleListItemDto>>` (200), ordered by `evaluationOrder` ascending.
  - `PUT /api/assignment-rules/{id}` with body `{name, category, priority, assignedToUserId, evaluationOrder, isActive}` → `Result` (200) / 400 / 404.
  - `DELETE /api/assignment-rules/{id}` → 204 / 404 (soft delete).

  `AssignmentRuleDto`/`AssignmentRuleListItemDto`: `id, name, category, priority, assignedToUserId, assignedToUserName, evaluationOrder, isActive` (`Dto` additionally has `createdOn, updatedOn`). `category` is `TicketCategory | null`, `priority` is `TicketPriority | null` — `null` on either means "any" (a wildcard match). A ticket matching no active rule is created unassigned, unchanged from today.

## Story Goal

Let a support manager configure ordered rules that automatically assign a newly created ticket to a specific agent based on its category and/or priority, satisfying KAN-5's **"Auto-assign tickets based on rules"** acceptance criterion.

Outcome: the `/automation` page (Story 14) gains a second panel, **"قواعد الإسناد التلقائي" (Auto-Assignment Rules)**, listing rules ordered by evaluation order, each showing its category/priority scope (or "أي فئة"/"أي أولوية" for a wildcard), target agent, and active state, with add/edit/delete.

**Not in scope**: any UI to preview which rule would match a given ticket, or to manually "re-run" auto-assignment against existing tickets — the backend only ever applies a rule at ticket-creation time (see the backend story's own scope note); a searchable agent picker (no backend endpoint exists to support one — see Prerequisites).

## Context — Read These Files First

1. [14-story-sla-policies-KAN-5.md](14-story-sla-policies-KAN-5.md) — read in full, especially its Task 4 (`SlaPoliciesPanel`/`SlaPolicyForm`) and Task 5 (`app/(pages)/automation/page.tsx`'s shape) — `AssignmentRulesPanel`/`AssignmentRuleForm` copy that exact shape, substituting two nullable enum filters/fields (`category`, `priority`) and a raw-id agent field for `SlaPolicy`'s single required-enum field.
2. [components/tickets/AssignTicketControl.tsx](components/tickets/AssignTicketControl.tsx) lines 68–87 — the exact "معرّف الموظف" `<input>` + submit `<Button>` shape this story's `assignedToUserId` field in `AssignmentRuleForm` reuses (as a plain required text input, not a picker).
3. [components/tickets/TicketFilters.tsx](components/tickets/TicketFilters.tsx) — read in full. The multi-`<select>` filter row shape (category + priority + isActive, three filters) this story's panel filter row follows, one more filter than Story 14's SLA Policies panel.
4. [lib/constants/ticket.ts](lib/constants/ticket.ts) — read in full (30 lines). Reuse `TICKET_CATEGORIES`/`TICKET_CATEGORY_LABELS` (lines 3–11) and `TICKET_PRIORITIES`/`TICKET_PRIORITY_LABELS` (lines 13–19) for the rule's category/priority `<select>`s, each with a `""` = "أي فئة"/"أي أولوية" wildcard option (unlike Story 14's SLA Policy priority `<select>`, which has no wildcard since `SlaPolicy.Priority` is required).
5. [app/(pages)/automation/slaPolicyActions.ts](<app/(pages)/automation/slaPolicyActions.ts>) (Story 14) — read in full. `AssignmentRuleActions.ts` follows its exact create/update/delete shape and imports its `AutomationActionResult` type rather than redefining it.
6. [components/customers/ConfirmDialog.tsx](components/customers/ConfirmDialog.tsx) — read in full (45 lines). Reused unchanged for rule deletion.

## Implementation tasks

### 1 — Types

**Create file: `lib/types/assignmentRule.ts`**

```ts
import type { TicketCategory, TicketPriority } from "./ticket";

export type AssignmentRule = {
  id: string;
  name: string;
  category: TicketCategory | null;
  priority: TicketPriority | null;
  assignedToUserId: string;
  assignedToUserName: string | null;
  evaluationOrder: number;
  isActive: boolean;
  createdOn: string;
  updatedOn: string | null;
};

export type AssignmentRuleListItem = Pick<
  AssignmentRule,
  | "id"
  | "name"
  | "category"
  | "priority"
  | "assignedToUserId"
  | "assignedToUserName"
  | "evaluationOrder"
  | "isActive"
>;

export type AssignmentRuleFormValues = {
  name: string;
  category: TicketCategory | null;
  priority: TicketPriority | null;
  assignedToUserId: string;
  evaluationOrder: number;
  isActive: boolean;
};
```

### 2 — API client

**Create file: `lib/api/assignmentRule.api.ts`**

```ts
import { apiServerFetch } from "./fetch";
import type { AssignmentRuleListItem } from "../types/assignmentRule";
import type { PaginatedResult } from "../types/pagination";
import type { TicketCategory, TicketPriority } from "../types/ticket";

const ASSIGNMENT_RULES_URL = "/api/assignment-rules";

export const assignmentRuleEndpoints = {
  list: (params: {
    pageNumber?: number;
    pageSize?: number;
    category?: TicketCategory;
    priority?: TicketPriority;
    isActive?: boolean;
  }) =>
    apiServerFetch<PaginatedResult<AssignmentRuleListItem>>({
      url: ASSIGNMENT_RULES_URL,
      params: {
        pageNumber: params.pageNumber ?? 1,
        pageSize: params.pageSize ?? 20,
        category: params.category,
        priority: params.priority,
        isActive: params.isActive,
      },
      cache: "no-store",
    }),
};
```

### 3 — Server actions

**Create file: `app/(pages)/automation/assignmentRuleActions.ts`** — same shape as `slaPolicyActions.ts` (Story 14), importing its `AutomationActionResult` type:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { apiServerFetch } from "@/lib/api/fetch";
import type { AssignmentRuleFormValues } from "@/lib/types/assignmentRule";
import type { AutomationActionResult } from "./slaPolicyActions";

export async function createAssignmentRuleAction(
  values: Omit<AssignmentRuleFormValues, "isActive">
): Promise<AutomationActionResult> {
  const result = await apiServerFetch<string>({
    url: "/api/assignment-rules",
    method: "POST",
    body: {
      name: values.name.trim(),
      category: values.category,
      priority: values.priority,
      assignedToUserId: values.assignedToUserId.trim(),
      evaluationOrder: values.evaluationOrder,
    },
  });

  if (!result.success) return { success: false, error: result.error };

  revalidatePath("/automation");
  return { success: true };
}

export async function updateAssignmentRuleAction(
  id: string,
  values: AssignmentRuleFormValues
): Promise<AutomationActionResult> {
  const result = await apiServerFetch<void>({
    url: `/api/assignment-rules/${id}`,
    method: "PUT",
    body: {
      name: values.name.trim(),
      category: values.category,
      priority: values.priority,
      assignedToUserId: values.assignedToUserId.trim(),
      evaluationOrder: values.evaluationOrder,
      isActive: values.isActive,
    },
  });

  if (!result.success) return { success: false, error: result.error };

  revalidatePath("/automation");
  return { success: true };
}

export async function deleteAssignmentRuleAction(id: string): Promise<AutomationActionResult> {
  const result = await apiServerFetch<void>({ url: `/api/assignment-rules/${id}`, method: "DELETE" });

  if (!result.success) return { success: false, error: result.error };

  revalidatePath("/automation");
  return { success: true };
}
```

### 4 — Form and panel components

**Create file: `components/automation/AssignmentRuleForm.tsx`** (`"use client"`) — same shape as `SlaPolicyForm.tsx` (Story 14). Props:

```ts
export type AssignmentRuleFormProps = {
  mode: "create" | "edit";
  initialValues: AssignmentRuleFormValues;
  onSubmit: (values: AssignmentRuleFormValues) => Promise<AutomationActionResult>;
  onDone: () => void;
};
```

Fields: **الاسم** (`name`, required `<input>`); **الفئة** (`category`, `<select>` with a leading `<option value="">أي فئة</option>` then `TICKET_CATEGORIES`/`TICKET_CATEGORY_LABELS`, mapping `""` ↔ `null`); **الأولوية** (`priority`, same wildcard-`<select>` shape over `TICKET_PRIORITIES`/`TICKET_PRIORITY_LABELS` with a leading "أي أولوية" option); **معرّف الموظف المسؤول** (`assignedToUserId`, required `<input>`, same field/label convention as `AssignTicketControl.tsx` lines 68–76); **ترتيب التقييم** (`evaluationOrder`, `<input type="number" min={0}>`, helper text: "القاعدة ذات الرقم الأصغر تُطبَّق أولاً عند تطابق أكثر من قاعدة"); and — only when `mode === "edit"` — a **نشطة** checkbox.

**Create file: `components/automation/AssignmentRulesPanel.tsx`** (`"use client"`) — Props: `{ rules: AssignmentRuleListItem[]; hasNextPage: boolean; hasPreviousPage: boolean; page: number; categoryFilter: string; priorityFilter: string; activeFilter: string }`. Same four-state shape (`addOpen`/`editingRule`/`deletingRule`/`isDeleting`) and three `<select>` filters (category, priority, active-state) writing to `?assignCategory=`/`?assignPriority=`/`?assignActive=`, clearing `?assignPage=` on change.

Renders a `.card space-y-4`:
- Header: `<h2>قواعد الإسناد التلقائي</h2>` + "+ إضافة قاعدة" button.
- Three filter `<select>`s.
- Empty state: "لا توجد قواعد بعد".
- A `<ul className="space-y-3">` of rows (already sorted by `evaluationOrder` server-side), each showing: `name` (bold) with `"(ترتيب ${evaluationOrder})"` beside it, a badge row (category label or "أي فئة", priority label or "أي أولوية", both `rounded-full bg-primary-100 text-primary`), `"تُسند إلى: ${assignedToUserName ?? assignedToUserId}"`, and an inactive badge when `!isActive` — plus "تعديل"/"حذف" buttons.
- Prev/Next pagination via `?assignPage=`.
- Add/edit modals and `ConfirmDialog`, wired to Task 3's actions.

### 5 — Wire into the `/automation` page

**Edit file: `app/(pages)/automation/page.tsx`** (Story 14) — add `assignPage`/`assignCategory`/`assignPriority`/`assignActive` to the `searchParams` type, fetch `assignmentRuleEndpoints.list({ pageNumber: assignPageNumber, category, priority, isActive })` alongside the existing `slaPolicyEndpoints.list` call, and render `<AssignmentRulesPanel ... />` as a second panel below `<SlaPoliciesPanel />`.

## Edge Cases & Failure Modes

- **`assignedToUserId` does not resolve to an existing user** — rejected server-side with `NotFoundException` (404); the form's `role="alert"` paragraph surfaces the resulting error message. No client-side existence check is possible (no list-users endpoint — see Prerequisites).
- **A rule's category and priority are both left as "أي فئة"/"أي أولوية"** — a valid catch-all rule (`category: null, priority: null`); `AssignmentRuleForm` allows submitting it as-is, matching the backend's explicit support for this case.
- **Two active rules with the same `evaluationOrder`** — allowed by the backend (no uniqueness constraint); the panel's helper text under the "ترتيب التقييم" field is the only guidance given — flagged in the backend's own plan as "a configuration hazard for the manager," not something this frontend validates against.
- **Deleting/deactivating a rule after tickets were already auto-assigned by it** — no retroactive effect; this panel only affects future ticket creation, matching the backend's documented scope.
- **`category`/`priority` `<select>` values round-trip through the empty string `""`** — `AssignmentRuleForm`'s change handlers must map `""` to `null` (not the literal string `"null"` or an empty string sent to the backend, which would fail `IsInEnum()`'s `.When(x => x.Category is not null)` guard by sending an invalid value instead of omitting the field) before calling `onSubmit`.

## Test Plan

No automated test infrastructure exists in this repository. Manual verification only, per the Verification Steps below.

## Verification Steps

1. **Frontend builds:** `pnpm build` from the repository root.
2. **Lint passes:** `pnpm lint`.
3. **Frontend runs against a live backend:** `pnpm dev`, with `azm-crm-backend` running locally.
4. **Manual smoke test:** on `/automation`, create an assignment rule (category `Billing`, no priority, target agent = an existing user id, evaluation order 1); confirm it appears in the list sorted correctly; filter by category and confirm the list narrows; create a ticket with category `Billing` from `/tickets/new`, confirm `GET`'s reflected state on `/tickets/[id]` shows it assigned to that agent and the ticket history shows both a "تم الإنشاء" and an auto-assignment entry; create a ticket with a different category and confirm it remains unassigned; edit the rule to deactivate it, create another `Billing` ticket, confirm it is no longer auto-assigned; delete the rule.

## Done Criteria

- [ ] `/automation` shows a working Auto-Assignment Rules panel (create/edit/delete/filter by category, priority, active-state), sorted by evaluation order.
- [ ] Creating a rule with an unknown `assignedToUserId` surfaces the backend's 404 error in the form.
- [ ] A ticket matching an active rule is auto-assigned on creation, visible on `/tickets/[id]`; a non-matching ticket is unaffected.
- [ ] `pnpm build` and `pnpm lint` both succeed with no new errors.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 16.**
