# Story 16 — Escalation Rules for Overdue Tickets (Story: KAN-5)

## Prerequisites

- [14-story-sla-policies-KAN-5.md](14-story-sla-policies-KAN-5.md) and [15-story-auto-assignment-rules-KAN-5.md](15-story-auto-assignment-rules-KAN-5.md) completed: this story **edits** `app/(pages)/automation/page.tsx` a third time to append a third panel, and its `EscalationRulesPanel`/`EscalationRuleForm`/`escalationRuleActions.ts` copy the exact shared-CRUD shape those two stories established, reusing `AutomationActionResult` from `slaPolicyActions.ts`.
- **Backend dependency**: the `azm-crm-backend` sibling repo's Story 19 (`Escalation Rules for Overdue Tickets`) is already implemented on the working tree (verified against `src/AzmCrm.API/Controllers/EscalationRulesController.cs` and `src/AzmCrm.Infrastructure/Sla/SlaMonitoringBackgroundService.cs` in that repo), exposing:
  - `POST /api/escalation-rules` with body `{name, priority, overdueMinutes}` (`priority` nullable) → `Result<Guid>` (201) / 400.
  - `GET /api/escalation-rules/{id}` → `Result<EscalationRuleDto>` (200) / 404.
  - `GET /api/escalation-rules?pageNumber=&pageSize=&priority=&isActive=` → `Result<PaginatedResult<EscalationRuleListItemDto>>` (200).
  - `PUT /api/escalation-rules/{id}` with body `{name, priority, overdueMinutes, isActive}` → `Result` (200) / 400 / 404.
  - `DELETE /api/escalation-rules/{id}` → 204 / 404 (soft delete).

  `EscalationRuleDto`/`EscalationRuleListItemDto`: `id, name, priority, overdueMinutes, isActive` (`Dto` additionally has `createdOn, updatedOn`). `priority` is `TicketPriority | null` (`null` = a catch-all rule applying to every priority). A recurring background scan (`SlaMonitoringBackgroundService`, interval configured server-side via `SlaMonitoring:IntervalMinutes`, default 5 minutes — no frontend control over this interval) finds overdue, not-yet-escalated open tickets and escalates them automatically once the matching active rule's `overdueMinutes` grace period has elapsed past `ResolutionDueOn`; the escalation is visible on the ticket exactly as a manual escalation is (`isEscalated: true`, `escalatedOn` stamped, a `TicketHistory` entry).

## Story Goal

Let a support manager configure how many minutes past a ticket's resolution due date it takes before the ticket is automatically escalated, satisfying KAN-5's **"Configure escalation rules for overdue tickets"** acceptance criterion.

Outcome: the `/automation` page gains a third panel, **"قواعد التصعيد التلقائي" (Escalation Rules)**, listing rules with their priority scope (or "أي أولوية" for a catch-all) and grace period in minutes, with add/edit/delete. No new frontend surface is needed for the scan itself — it runs entirely server-side and its effect (`isEscalated`/`escalatedOn`) already renders via Story 14's ticket-detail/list badges and `EscalateTicketControl` (KAN-2 Story 07), which the frontend does not need to distinguish from a manual escalation.

**Not in scope**: any "trigger scan now" control, any display of the scan's configured interval, or any change to `EscalateTicketControl.tsx`/`escalateTicketAction` (both remain exactly as KAN-2 Story 07 left them — the backend's automatic path is entirely independent of the manual one).

## Context — Read These Files First

1. [14-story-sla-policies-KAN-5.md](14-story-sla-policies-KAN-5.md) Task 4–5 and [15-story-auto-assignment-rules-KAN-5.md](15-story-auto-assignment-rules-KAN-5.md) Task 4 — the exact shared-CRUD-panel shape (`SlaPoliciesPanel`/`AssignmentRulesPanel`) `EscalationRulesPanel`/`EscalationRuleForm` copy, this time with a single nullable-enum field (`priority`) plus one integer field (`overdueMinutes`) — the simplest of the three panels on this page.
2. [lib/constants/ticket.ts](lib/constants/ticket.ts) lines 13–19 — reuse `TICKET_PRIORITIES`/`TICKET_PRIORITY_LABELS` for the nullable priority `<select>`, with the same `""` ↔ `null` wildcard-option convention Story 15's `AssignmentRuleForm` established for its own nullable `priority` field.
3. [app/(pages)/automation/slaPolicyActions.ts](<app/(pages)/automation/slaPolicyActions.ts>) — read in full. `escalationRuleActions.ts` follows its exact create/update/delete shape.
4. [app/(pages)/tickets/[id]/page.tsx](<app/(pages)/tickets/[id]/page.tsx>) lines 96–100 and [components/tickets/EscalateTicketControl.tsx](components/tickets/EscalateTicketControl.tsx) — confirms the existing escalation UI needs no changes; an automatically-escalated ticket renders identically to a manually-escalated one (same `isEscalated`/`escalatedOn` fields, same badge and card from Story 14/KAN-2 Story 07).
5. [components/customers/ConfirmDialog.tsx](components/customers/ConfirmDialog.tsx) — reused unchanged for rule deletion.

## Implementation tasks

### 1 — Types

**Create file: `lib/types/escalationRule.ts`**

```ts
import type { TicketPriority } from "./ticket";

export type EscalationRule = {
  id: string;
  name: string;
  priority: TicketPriority | null;
  overdueMinutes: number;
  isActive: boolean;
  createdOn: string;
  updatedOn: string | null;
};

export type EscalationRuleListItem = Pick<
  EscalationRule,
  "id" | "name" | "priority" | "overdueMinutes" | "isActive"
>;

export type EscalationRuleFormValues = {
  name: string;
  priority: TicketPriority | null;
  overdueMinutes: number;
  isActive: boolean;
};
```

### 2 — API client

**Create file: `lib/api/escalationRule.api.ts`**

```ts
import { apiServerFetch } from "./fetch";
import type { EscalationRuleListItem } from "../types/escalationRule";
import type { PaginatedResult } from "../types/pagination";
import type { TicketPriority } from "../types/ticket";

const ESCALATION_RULES_URL = "/api/escalation-rules";

export const escalationRuleEndpoints = {
  list: (params: { pageNumber?: number; pageSize?: number; priority?: TicketPriority; isActive?: boolean }) =>
    apiServerFetch<PaginatedResult<EscalationRuleListItem>>({
      url: ESCALATION_RULES_URL,
      params: {
        pageNumber: params.pageNumber ?? 1,
        pageSize: params.pageSize ?? 20,
        priority: params.priority,
        isActive: params.isActive,
      },
      cache: "no-store",
    }),
};
```

### 3 — Server actions

**Create file: `app/(pages)/automation/escalationRuleActions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { apiServerFetch } from "@/lib/api/fetch";
import type { EscalationRuleFormValues } from "@/lib/types/escalationRule";
import type { AutomationActionResult } from "./slaPolicyActions";

export async function createEscalationRuleAction(
  values: Omit<EscalationRuleFormValues, "isActive">
): Promise<AutomationActionResult> {
  const result = await apiServerFetch<string>({
    url: "/api/escalation-rules",
    method: "POST",
    body: { name: values.name.trim(), priority: values.priority, overdueMinutes: values.overdueMinutes },
  });

  if (!result.success) return { success: false, error: result.error };

  revalidatePath("/automation");
  return { success: true };
}

export async function updateEscalationRuleAction(
  id: string,
  values: EscalationRuleFormValues
): Promise<AutomationActionResult> {
  const result = await apiServerFetch<void>({
    url: `/api/escalation-rules/${id}`,
    method: "PUT",
    body: {
      name: values.name.trim(),
      priority: values.priority,
      overdueMinutes: values.overdueMinutes,
      isActive: values.isActive,
    },
  });

  if (!result.success) return { success: false, error: result.error };

  revalidatePath("/automation");
  return { success: true };
}

export async function deleteEscalationRuleAction(id: string): Promise<AutomationActionResult> {
  const result = await apiServerFetch<void>({ url: `/api/escalation-rules/${id}`, method: "DELETE" });

  if (!result.success) return { success: false, error: result.error };

  revalidatePath("/automation");
  return { success: true };
}
```

### 4 — Form and panel components

**Create file: `components/automation/EscalationRuleForm.tsx`** (`"use client"`) — same shape as `SlaPolicyForm.tsx`/`AssignmentRuleForm.tsx`. Props:

```ts
export type EscalationRuleFormProps = {
  mode: "create" | "edit";
  initialValues: EscalationRuleFormValues;
  onSubmit: (values: EscalationRuleFormValues) => Promise<AutomationActionResult>;
  onDone: () => void;
};
```

Fields: **الاسم** (`name`, required `<input>`); **الأولوية** (`priority`, wildcard `<select>` — leading `<option value="">أي أولوية</option>` then `TICKET_PRIORITIES`/`TICKET_PRIORITY_LABELS`, `""` ↔ `null`); **فترة السماح بعد الاستحقاق (بالدقائق)** (`overdueMinutes`, `<input type="number" min={0}>`, helper text: "عدد الدقائق بعد موعد الحل المستحق قبل تصعيد التذكرة تلقائيًا"); and — only when `mode === "edit"` — a **نشطة** checkbox.

**Create file: `components/automation/EscalationRulesPanel.tsx`** (`"use client"`) — Props: `{ rules: EscalationRuleListItem[]; hasNextPage: boolean; hasPreviousPage: boolean; page: number; priorityFilter: string; activeFilter: string }`. Same shape as `AssignmentRulesPanel` minus the category filter (two `<select>`s instead of three), writing to `?escPriority=`/`?escActive=`, clearing `?escPage=`.

Renders a `.card space-y-4`:
- Header: `<h2>قواعد التصعيد التلقائي</h2>` + "+ إضافة قاعدة" button.
- Two filter `<select>`s.
- Empty state: "لا توجد قواعد بعد".
- A `<ul className="space-y-3">` of rows showing `name` (bold), a badge row (priority label or "أي أولوية"), `"فترة السماح: ${overdueMinutes} دقيقة"`, and an inactive badge when `!isActive` — plus "تعديل"/"حذف" buttons.
- Prev/Next pagination via `?escPage=`.
- Add/edit modals and `ConfirmDialog`, wired to Task 3's actions.

### 5 — Wire into the `/automation` page

**Edit file: `app/(pages)/automation/page.tsx`** (Stories 14–15) — add `escPage`/`escPriority`/`escActive` to the `searchParams` type, fetch `escalationRuleEndpoints.list({ pageNumber: escPageNumber, priority, isActive })` alongside the two existing list calls, and render `<EscalationRulesPanel ... />` as a third panel below `<AssignmentRulesPanel />`.

## Edge Cases & Failure Modes

- **Two active rules target the same priority, or one priority-specific and one catch-all (`priority: null`) rule are both active** — allowed by the backend; its scan always prefers the priority-specific match over the catch-all for a given ticket (see the backend story). The panel does not warn about or prevent overlapping rules — this is a documented backend behavior, not a frontend validation gap.
- **`overdueMinutes` set to `0`** — valid (`GreaterThanOrEqualTo(0)` server-side): the ticket escalates as soon as it becomes overdue, with no additional grace period.
- **No escalation rule matches an overdue ticket's priority and no catch-all rule is active** — the ticket never auto-escalates (stays overdue indefinitely) — this is intentional (escalation is opt-in per the acceptance criterion), not a bug; the "متأخرة" badge from Story 14 still shows for such a ticket regardless of whether any escalation rule exists, since that badge is a pure client-side computation off `resolutionDueOn`, independent of escalation rules.
- **A ticket is escalated by the automatic scan** — indistinguishable in this frontend from a manual escalation (both set `isEscalated`/`escalatedOn`); `EscalateTicketControl.tsx`'s existing display and the ticket history entry render normally either way, matching the backend's explicit design to reuse the same ticket-level effect.
- **The scan's actual timing** (interval, whether it has run yet) is not observable from this frontend at all — a manual QA smoke test must wait for at least one scan interval (backend-configured, default 5 minutes) to see an automatic escalation take effect; this is a backend operational concern, not something this story's UI surfaces or controls.

## Test Plan

No automated test infrastructure exists in this repository. Manual verification only, per the Verification Steps below.

## Verification Steps

1. **Frontend builds:** `pnpm build` from the repository root.
2. **Lint passes:** `pnpm lint`.
3. **Frontend runs against a live backend:** `pnpm dev`, with `azm-crm-backend` running locally.
4. **Manual smoke test:** on `/automation`, create an escalation rule (no priority — a catch-all — with `overdueMinutes: 0`); confirm it appears in the list; create an SLA-tracked ticket (Story 14) whose `resolutionDueOn` is a minute in the future; wait past that due date and one backend scan interval; refresh `/tickets/[id]` and confirm `isEscalated` is now `true` with a history entry mentioning automatic escalation, without ever using the manual "تصعيد" button; edit the rule to deactivate it and confirm a newly-created overdue ticket no longer auto-escalates; delete the rule.

## Done Criteria

- [ ] `/automation` shows a working Escalation Rules panel (create/edit/delete/filter by priority, active-state).
- [ ] An overdue, SLA-tracked ticket is automatically escalated by the backend scan once an active matching rule's grace period elapses, visible on `/tickets/[id]` identically to a manual escalation.
- [ ] `pnpm build` and `pnpm lint` both succeed with no new errors.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 17.**
