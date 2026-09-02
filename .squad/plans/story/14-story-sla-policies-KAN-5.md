# Story 14 — SLA Policies: Response & Resolution Time Targets (Story: KAN-5)

## Prerequisites

- [10-story-dashboard-core-tickets-customers-KAN-4.md](10-story-dashboard-core-tickets-customers-KAN-4.md) and [12-story-quick-reply-templates-KAN-4.md](12-story-quick-reply-templates-KAN-4.md) completed: this story's `SlaPoliciesPanel`/`SlaPolicyForm` copy the exact team-shared add/edit/delete-modal shape `QuickReplyTemplatesPanel`/`QuickReplyTemplateForm` established (`components/dashboard/QuickReplyTemplatesPanel.tsx`, `components/dashboard/QuickReplyTemplateForm.tsx`, `app/(pages)/dashboard/quickReplyActions.ts`), and this story's new `/automation` page copies the accumulating "stacked `.card` panels fed by one `Promise.all`" shape Story 10 established for `/dashboard` (`app/(pages)/dashboard/page.tsx`).
- [07-story-ticket-status-escalation-KAN-2.md](07-story-ticket-status-escalation-KAN-2.md) completed: this story edits `lib/types/ticket.ts` a second time (that story added `isEscalated`/`escalatedOn`) and `app/(pages)/tickets/[id]/page.tsx`/`app/(pages)/tickets/page.tsx`, both already showing an `isEscalated` badge this story's new "متأخرة" (overdue) badge sits next to.
- **Backend dependency**: the `azm-crm-backend` sibling repo's Story 17 (`SLA Policies: Response & Resolution Time Targets`) is already implemented on the `master`-tracked working tree (verified directly against `src/AzmCrm.API/Controllers/SlaPoliciesController.cs`, `src/AzmCrm.Application/Features/Sla/DTOs/*.cs`, and `src/AzmCrm.Application/Features/Tickets/DTOs/TicketDto.cs`/`TicketListItemDto.cs` in that repo), exposing:
  - `POST /api/sla-policies` with body `{name, priority, responseTimeMinutes, resolutionTimeMinutes}` → `Result<Guid>` (201) / `Result` (400, e.g. an active policy already exists for that priority).
  - `GET /api/sla-policies/{id}` → `Result<SlaPolicyDto>` (200) / 404.
  - `GET /api/sla-policies?pageNumber=&pageSize=&priority=&isActive=` → `Result<PaginatedResult<SlaPolicyListItemDto>>` (200), ordered by priority.
  - `PUT /api/sla-policies/{id}` with body `{name, priority, responseTimeMinutes, resolutionTimeMinutes, isActive}` → `Result` (200) / 400 / 404.
  - `DELETE /api/sla-policies/{id}` → 204 / 404 (soft delete).

  `SlaPolicyDto`: `id, name, priority, responseTimeMinutes, resolutionTimeMinutes, isActive, createdOn, updatedOn`. `SlaPolicyListItemDto`: same minus `createdOn`/`updatedOn`. `priority` is one of `"Low" | "Medium" | "High" | "Urgent"` — the same `TicketPriority` union already used throughout this frontend. Policies are **team-shared** (any authenticated agent can create/edit/delete any policy) — there is no per-agent ownership to model.

  The same backend story also appends four fields to `TicketDto`/`TicketListItemDto`, both already consumed by this frontend: `slaPolicyId: string | null`, `responseDueOn: string | null`, `resolutionDueOn: string | null`, `respondedOn: string | null`. A ticket created with no active policy matching its priority has all four fields `null`.

## Story Goal

Let a support manager define, per ticket priority, how many minutes a ticket may wait for a first response and for full resolution, satisfying KAN-5's **"Set response and resolution time targets"** acceptance criterion, and surface the resulting due dates the backend now stamps onto every ticket.

Outcomes:
1. A new **"الأتمتة وضمان الخدمة" (SLA & Automation)** page at `/automation`, reachable from a new sidebar item, showing an **"سياسات اتفاقية مستوى الخدمة" (SLA Policies)** panel: a filterable list (by priority, active/inactive) with add/edit/delete, following the exact shared-CRUD-panel shape of `QuickReplyTemplatesPanel`.
2. The ticket detail page (`/tickets/[id]`) gains an **"اتفاقية مستوى الخدمة (SLA)"** card showing the response/resolution due dates and the responded-on timestamp when the ticket has an `SlaPolicyId`, and nothing when it doesn't (SLA is opt-in per priority).
3. Both the tickets list (`/tickets`) and the ticket detail page show a **"متأخرة" (Overdue)** badge, computed client-side from `resolutionDueOn`, when a ticket's resolution due date has passed and it is neither resolved/closed nor already escalated — giving agents at-a-glance visibility into breaches even before Story 16's escalation rules or Story 17's alerts exist.

**Not in scope**: creating/editing a ticket's `SlaPolicyId`/due dates directly (the backend only ever sets them once, at ticket creation) — this story is read-only on the ticket side; per-category SLA targets (targets are keyed by priority only, matching the backend); any automatic escalation or notification behavior (Stories 16–17).

## Context — Read These Files First

1. [components/dashboard/QuickReplyTemplatesPanel.tsx](components/dashboard/QuickReplyTemplatesPanel.tsx) — read in full (192 lines). `SlaPoliciesPanel`'s exact shape: header + add button, a `.card space-y-4` wrapper, list rows with edit/delete `<Button variant="outline" size="sm">`, prev/next pagination via `?slaPage=`, add/edit modals (`fixed inset-0` overlay + `card relative w-full max-w-md`), and a `ConfirmDialog` for delete — substituting this panel's priority/active-state filters for that panel's debounced search box (see Task 4).
2. [components/dashboard/QuickReplyTemplateForm.tsx](components/dashboard/QuickReplyTemplateForm.tsx) — read in full (94 lines). `SlaPolicyForm`'s exact shape: `mode: "create" | "edit"`, controlled `values` state, `onSubmit`/`onDone` props, a `role="alert"` error paragraph, submit button text `"جارٍ الحفظ..."` while submitting.
3. [app/(pages)/dashboard/quickReplyActions.ts](app/(pages)/dashboard/quickReplyActions.ts) — read in full (53 lines). The exact `"use server"` create/update/delete action shape (`DashboardActionResult` union, `apiServerFetch` call, `revalidatePath` on success) this story's `slaPolicyActions.ts` follows, revalidating `/automation` instead of `/dashboard`.
4. [components/tickets/TicketForm.tsx](components/tickets/TicketForm.tsx) lines 90–126 — the `<select>` pattern for an enum field (`TICKET_PRIORITIES`/`TICKET_PRIORITY_LABELS` from `lib/constants/ticket.ts`) `SlaPolicyForm`'s priority `<select>` reuses verbatim (same constants, same `inputClassName`).
5. [components/tickets/TicketFilters.tsx](components/tickets/TicketFilters.tsx) — read in full (137 lines). The `<select>`-driven, `?param=`-writing filter pattern (`updateParam`, `selectClassName`) this story's priority/active-state filters on the SLA Policies panel follow, without the debounced search box (the backend query has no `search` parameter for this list).
6. [components/customers/ConfirmDialog.tsx](components/customers/ConfirmDialog.tsx) — read in full (45 lines). Exact delete-confirmation shape reused unchanged.
7. [lib/api/quickReplyTemplate.api.ts](lib/api/quickReplyTemplate.api.ts) and [lib/types/quickReplyTemplate.ts](lib/types/quickReplyTemplate.ts) — read both in full. The exact `apiServerFetch`-based list-endpoint shape and type-file shape (`Template`, `TemplateListItem`, `TemplateFormValues`) `slaPolicy.api.ts`/`slaPolicy.ts` follow.
8. [lib/types/pagination.ts](lib/types/pagination.ts) — read in full (10 lines). `PaginatedResult<T>` this story's list response is typed with.
9. [lib/constants/ticket.ts](lib/constants/ticket.ts) — read in full (30 lines). Reuse `TICKET_PRIORITIES`/`TICKET_PRIORITY_LABELS` (lines 13–19) directly — `SlaPolicy.priority` is the same `TicketPriority` union, no new enum/constant needed.
10. [lib/constants/sidebar.ts](lib/constants/sidebar.ts) — read in full (14 lines). Append one `NavItem` following the existing five-entry shape.
11. [components/layout/Sidebar.tsx](components/layout/Sidebar.tsx) lines 1–24 — the `ICONS: Record<string, LucideIcon>` map keyed by the kebab-case `icon` string on each `NavItem`; this story adds one new lucide-react import and one new map entry.
12. [lib/types/ticket.ts](lib/types/ticket.ts) — read in full (43 lines). `Ticket` (lines 5–19) and `TicketListItem` (lines 21–34, a `Pick<Ticket, ...>`) both need four new fields appended, following the exact precedent of how `isEscalated`/`escalatedOn` were added by Story 07.
13. [app/(pages)/tickets/[id]/page.tsx](<app/(pages)/tickets/[id]/page.tsx>) — read in full (120 lines). The escalation badge (lines 61–65) and `EscalateTicketControl` card (lines 96–100, rendered via `components/tickets/EscalateTicketControl.tsx`) are the exact precedent this story's new SLA card and overdue badge follow.
14. [components/tickets/EscalateTicketControl.tsx](components/tickets/EscalateTicketControl.tsx) — read in full (95 lines). The `.card space-y-4` + `formatDateTime` shape the new read-only SLA card copies (this story's card has no form/button, only status text).
15. [app/(pages)/tickets/page.tsx](<app/(pages)/tickets/page.tsx>) — read in full (165 lines). The `isEscalated` badge cell (lines 125–131) inside the results `<table>` is the exact precedent the new "متأخرة" badge cell sits next to.
16. [lib/utils/date.ts](lib/utils/date.ts) — read in full (10 lines). `formatDateTime(isoString)` this story reuses for `responseDueOn`/`resolutionDueOn`/`respondedOn` display, no new date helper needed beyond the overdue boolean check (`new Date(iso) < new Date()`).

## Implementation tasks

### 1 — Types

**Create file: `lib/types/slaPolicy.ts`**

```ts
import type { TicketPriority } from "./ticket";

export type SlaPolicy = {
  id: string;
  name: string;
  priority: TicketPriority;
  responseTimeMinutes: number;
  resolutionTimeMinutes: number;
  isActive: boolean;
  createdOn: string;
  updatedOn: string | null;
};

export type SlaPolicyListItem = Pick<
  SlaPolicy,
  "id" | "name" | "priority" | "responseTimeMinutes" | "resolutionTimeMinutes" | "isActive"
>;

export type SlaPolicyFormValues = {
  name: string;
  priority: TicketPriority;
  responseTimeMinutes: number;
  resolutionTimeMinutes: number;
  isActive: boolean;
};
```

**Edit file: `lib/types/ticket.ts`** — append four fields to `Ticket` (after `escalatedOn` on line 18) and the same four to the `TicketListItem` `Pick<...>` union (after `"escalatedOn"` on line 33):

```ts
slaPolicyId: string | null;
responseDueOn: string | null;
resolutionDueOn: string | null;
respondedOn: string | null;
```

### 2 — API client

**Create file: `lib/api/slaPolicy.api.ts`**

```ts
import { apiServerFetch } from "./fetch";
import type { SlaPolicyListItem } from "../types/slaPolicy";
import type { PaginatedResult } from "../types/pagination";
import type { TicketPriority } from "../types/ticket";

const SLA_POLICIES_URL = "/api/sla-policies";

export const slaPolicyEndpoints = {
  list: (params: { pageNumber?: number; pageSize?: number; priority?: TicketPriority; isActive?: boolean }) =>
    apiServerFetch<PaginatedResult<SlaPolicyListItem>>({
      url: SLA_POLICIES_URL,
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

**Create file: `app/(pages)/automation/slaPolicyActions.ts`** — same shape as `app/(pages)/dashboard/quickReplyActions.ts`, revalidating `/automation` instead of `/dashboard`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { apiServerFetch } from "@/lib/api/fetch";
import type { SlaPolicyFormValues } from "@/lib/types/slaPolicy";

export type AutomationActionResult = { success: true } | { success: false; error: string };

export async function createSlaPolicyAction(
  values: Omit<SlaPolicyFormValues, "isActive">
): Promise<AutomationActionResult> {
  const result = await apiServerFetch<string>({
    url: "/api/sla-policies",
    method: "POST",
    body: {
      name: values.name.trim(),
      priority: values.priority,
      responseTimeMinutes: values.responseTimeMinutes,
      resolutionTimeMinutes: values.resolutionTimeMinutes,
    },
  });

  if (!result.success) return { success: false, error: result.error };

  revalidatePath("/automation");
  return { success: true };
}

export async function updateSlaPolicyAction(
  id: string,
  values: SlaPolicyFormValues
): Promise<AutomationActionResult> {
  const result = await apiServerFetch<void>({
    url: `/api/sla-policies/${id}`,
    method: "PUT",
    body: {
      name: values.name.trim(),
      priority: values.priority,
      responseTimeMinutes: values.responseTimeMinutes,
      resolutionTimeMinutes: values.resolutionTimeMinutes,
      isActive: values.isActive,
    },
  });

  if (!result.success) return { success: false, error: result.error };

  revalidatePath("/automation");
  return { success: true };
}

export async function deleteSlaPolicyAction(id: string): Promise<AutomationActionResult> {
  const result = await apiServerFetch<void>({ url: `/api/sla-policies/${id}`, method: "DELETE" });

  if (!result.success) return { success: false, error: result.error };

  revalidatePath("/automation");
  return { success: true };
}
```

`AutomationActionResult` is this feature's shared result type — Stories 15 and 16 reuse it from this file (`import type { AutomationActionResult } from "./slaPolicyActions"`) rather than redefining it per resource, since (unlike `QuickReplyTemplatesPanel`'s standalone dashboard panel) all three automation-rule panels share one page and one result shape.

### 4 — Form and panel components

**Create file: `components/automation/SlaPolicyForm.tsx`** (`"use client"`) — same shape as `QuickReplyTemplateForm.tsx`. Props:

```ts
export type SlaPolicyFormProps = {
  mode: "create" | "edit";
  initialValues: SlaPolicyFormValues;
  onSubmit: (values: SlaPolicyFormValues) => Promise<AutomationActionResult>;
  onDone: () => void;
};
```

Fields: **الاسم** (`name`, required `<input>`), **الأولوية** (`priority`, `<select>` over `TICKET_PRIORITIES`/`TICKET_PRIORITY_LABELS`), **وقت الاستجابة (بالدقائق)** (`responseTimeMinutes`, `<input type="number" min={1}>`), **وقت الحل (بالدقائق)** (`resolutionTimeMinutes`, `<input type="number" min={1}>` — no client-side cross-field check against `responseTimeMinutes`; the server's `GreaterThan` validator error surfaces via the shared `role="alert"` paragraph, same convention as every other form in this codebase), and — **only when `mode === "edit"`** — a **نشطة** checkbox bound to `isActive` (create has no `isActive` field, matching `CreateSlaPolicyRequest`'s shape; new policies default active).

**Create file: `components/automation/SlaPoliciesPanel.tsx`** (`"use client"`) — Props: `{ policies: SlaPolicyListItem[]; hasNextPage: boolean; hasPreviousPage: boolean; page: number; priorityFilter: string; activeFilter: string }`. State: `addOpen`, `editingPolicy`, `deletingPolicy`, `isDeleting` (same four as `QuickReplyTemplatesPanel`). Filter controls (no debounced search — this list has none): a priority `<select>` (`""` = "كل الأولويات" + `TICKET_PRIORITIES`) and an active-state `<select>` with three options (`""` = "الكل", `"true"` = "نشطة فقط", `"false"` = "غير نشطة"), each writing to `?slaPriority=`/`?slaActive=` via `updateParam`-style logic (same `URLSearchParams`-preserves-unrelated-params convention as `TicketFilters.tsx`) and clearing `?slaPage=` on change.

Renders a `.card space-y-4`:
- Header row: `<h2>سياسات اتفاقية مستوى الخدمة</h2>` + "+ إضافة سياسة" button.
- The two filter `<select>`s below the header.
- Empty state: "لا توجد سياسات بعد" when `policies.length === 0`.
- A `<ul className="space-y-3">` of rows, each showing `name` (bold), and a badge row: priority (`TICKET_PRIORITY_LABELS[policy.priority]`, same `rounded-full bg-primary-100 text-primary` badge style as ticket badges), `"${policy.responseTimeMinutes} دقيقة استجابة / ${policy.resolutionTimeMinutes} دقيقة حل"`, and an inactive badge (`bg-gray-200 text-text-secondary`, text "غير نشطة") when `!policy.isActive` — plus "تعديل"/"حذف" `<Button variant="outline" size="sm">` actions.
- Prev/Next pagination using `?slaPage=` (preserving `slaPriority`/`slaActive`).
- Add/edit modals (`SlaPolicyForm` inside the same `fixed inset-0` overlay shape) and a `ConfirmDialog` for delete, wired to the three actions from Task 3.

### 5 — The `/automation` page and sidebar entry

**Create file: `app/(pages)/automation/page.tsx`**

```tsx
import { slaPolicyEndpoints } from "@/lib/api/slaPolicy.api";
import { SlaPoliciesPanel } from "@/components/automation/SlaPoliciesPanel";
import type { TicketPriority } from "@/lib/types/ticket";

type AutomationPageProps = {
  searchParams: Promise<{
    slaPage?: string;
    slaPriority?: string;
    slaActive?: string;
  }>;
};

export default async function AutomationPage({ searchParams }: AutomationPageProps) {
  const { slaPage, slaPriority, slaActive } = await searchParams;
  const slaPageNumber = Number(slaPage) || 1;

  const policiesResult = await slaPolicyEndpoints.list({
    pageNumber: slaPageNumber,
    priority: slaPriority ? (slaPriority as TicketPriority) : undefined,
    isActive: slaActive === "true" ? true : slaActive === "false" ? false : undefined,
  });

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-2xl font-bold text-text-default">الأتمتة وضمان الخدمة</h1>
        <p className="mt-1 text-sm text-text-secondary">
          إدارة سياسات اتفاقية مستوى الخدمة وقواعد الإسناد التلقائي والتصعيد
        </p>
      </div>

      <SlaPoliciesPanel
        policies={policiesResult.success ? policiesResult.data.items : []}
        hasNextPage={policiesResult.success ? policiesResult.data.hasNextPage : false}
        hasPreviousPage={policiesResult.success ? policiesResult.data.hasPreviousPage : false}
        page={slaPageNumber}
        priorityFilter={slaPriority ?? ""}
        activeFilter={slaActive ?? ""}
      />
    </div>
  );
}
```

Stories 15–17 each extend this file's `searchParams` type and `<div className="space-y-6">` body with one more fetch + panel, following the exact accumulating pattern `app/(pages)/dashboard/page.tsx` uses across Stories 10–12.

**Edit file: `lib/constants/sidebar.ts`** — append, after the `"التقارير"` entry:

```ts
{ label: "الأتمتة وضمان الخدمة", href: "/automation", icon: "shield-alert" },
```

**Edit file: `components/layout/Sidebar.tsx`** — add `ShieldAlert` to the `lucide-react` import (line 6–14) and one entry to the `ICONS` map (after line 23): `"shield-alert": ShieldAlert,`.

### 6 — Ticket detail and list: SLA card and overdue badge

**Edit file: `app/(pages)/tickets/[id]/page.tsx`** — add, after the `EscalateTicketControl` block (after line 100):

```tsx
{(ticket.responseDueOn || ticket.resolutionDueOn) && (
  <div className="card space-y-2">
    <h2 className="text-lg font-semibold text-text-default">اتفاقية مستوى الخدمة (SLA)</h2>
    {ticket.responseDueOn && (
      <p className="text-sm text-text-default">
        الاستجابة المستحقة: {formatDateTime(ticket.responseDueOn)}
        {ticket.respondedOn && ` — تم الرد في ${formatDateTime(ticket.respondedOn)}`}
      </p>
    )}
    {ticket.resolutionDueOn && (
      <p className="text-sm text-text-default">الحل المستحق: {formatDateTime(ticket.resolutionDueOn)}</p>
    )}
  </div>
)}
```

Add `import { formatDateTime } from "@/lib/utils/date";` to this file's imports (not yet imported here — `EscalateTicketControl` calls it internally). Also add a "متأخرة" badge next to the existing `isEscalated` badge (after line 65), rendered when overdue and not yet escalated:

```tsx
{!ticket.isEscalated &&
  ticket.resolutionDueOn &&
  new Date(ticket.resolutionDueOn) < new Date() &&
  ticket.status !== "Resolved" &&
  ticket.status !== "Closed" && (
    <span className="inline-block rounded-full bg-destructive/10 text-destructive text-xs font-medium px-2 py-0.5">
      متأخرة
    </span>
  )}
```

**Edit file: `app/(pages)/tickets/page.tsx`** — add the same overdue-badge expression inside the `isEscalated` table cell (lines 125–131), next to the existing badge, reading `item.resolutionDueOn`/`item.isEscalated`/`item.status` from `TicketListItem`.

## Edge Cases & Failure Modes

- **A ticket has no active `SlaPolicy` matching its priority** — `ticket.responseDueOn`/`resolutionDueOn`/`respondedOn`/`slaPolicyId` are all `null`; the new SLA card in Task 6 renders nothing (its `{(ticket.responseDueOn || ticket.resolutionDueOn) && ...}` guard), and the overdue badge never shows (its `ticket.resolutionDueOn &&` guard). This matches the backend's "SLA is opt-in per priority" design.
- **Two active `SlaPolicy` rows would exist for the same priority** — rejected server-side (`Result.Failure`, surfaced as a 400 whose message renders via the form's `role="alert"` paragraph, e.g. "An active SLA policy already exists for priority 'High'."); no client-side pre-check is added, matching this codebase's convention of surfacing server validation messages verbatim rather than duplicating business rules in the browser.
- **`resolutionTimeMinutes` not greater than `responseTimeMinutes`** — same as above: rejected server-side, surfaced via the same error paragraph; the number inputs only enforce `min={1}` client-side.
- **The overdue badge and the SLA card are computed from client-rendered `new Date()`** — since `app/(pages)/tickets/[id]/page.tsx` and `app/(pages)/tickets/page.tsx` are React Server Components, `new Date()` evaluates at request/render time on the server, not in the visitor's browser; this can be a few minutes stale under caching, but both pages already fetch with `cache: "no-store"` (`ticketEndpoints.getById`/`list`), so this is a fresh server-side comparison on every request — no client-side clock skew concern.
- **A ticket is overdue but already `isEscalated`** — the "متأخرة" badge's `!ticket.isEscalated` guard suppresses it in favor of the existing "مُصعّدة" badge, avoiding two overlapping destructive-colored badges for the same underlying condition.
- **Deleting an `SlaPolicy` already referenced by existing tickets** — allowed (soft delete); referenced tickets keep their already-stamped `responseDueOn`/`resolutionDueOn` unchanged (the backend's `SlaPolicyId` FK uses `SetNull` only on a hard delete, which never happens here) — the SLA Policies panel simply stops listing the deleted policy.
- **`slaActive`/`slaPriority` interact with future stories' own `?assignPage=`/`?escPage=`/`?notifPage=` params** — all four panels' query params are independently namespaced, following the same `URLSearchParams`-preserves-unrelated-params convention already established by `app/(pages)/dashboard/page.tsx`.

## Test Plan

No automated test infrastructure exists in this repository (no `test` script in `package.json`, per KAN-1 Story 01's original note, still true). Manual verification only, per the Verification Steps below.

## Verification Steps

1. **Frontend builds:** `pnpm build` from the repository root.
2. **Lint passes:** `pnpm lint`.
3. **Frontend runs against a live backend:** `pnpm dev`, with `azm-crm-backend` running locally.
4. **Manual smoke test:** open `/automation` from the new sidebar item; create an SLA policy (`High` priority, 30-minute response, 240-minute resolution); confirm it appears in the list with the correct badges; filter by priority and by active-state and confirm the list narrows correctly; edit it (toggle `isActive` off) and confirm the change persists; create a ticket with `High` priority from `/tickets/new`, open its detail page, confirm the new SLA card shows response/resolution due dates roughly 30/240 minutes after creation; change the ticket's status away from `New` and confirm "تم الرد في ..." appears next to the response due date; delete the policy from `/automation` and confirm it disappears from the list while the already-created ticket's SLA card is unaffected.

## Done Criteria

- [ ] `/automation` exists, reachable from a new sidebar item, showing a working SLA Policies panel (create/edit/delete/filter by priority and active-state).
- [ ] `Ticket`/`TicketListItem` carry the four new SLA fields; the ticket detail page shows an SLA card when they're non-null and nothing when they're null.
- [ ] Both `/tickets` and `/tickets/[id]` show a "متأخرة" badge for an overdue, non-escalated, still-open ticket, and never alongside the "مُصعّدة" badge.
- [ ] `pnpm build` and `pnpm lint` both succeed with no new errors.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 15.**
