# Story 17 — Trigger Alerts & Notifications for SLA Breaches (Story: KAN-5)

## Prerequisites

- [14-story-sla-policies-KAN-5.md](14-story-sla-policies-KAN-5.md), [15-story-auto-assignment-rules-KAN-5.md](15-story-auto-assignment-rules-KAN-5.md), and [16-story-escalation-rules-KAN-5.md](16-story-escalation-rules-KAN-5.md) completed: this story **edits** `app/(pages)/automation/page.tsx` a fourth and final time to append the last panel, reusing `AutomationActionResult`'s sibling conventions (this panel is read-only, so it needs no server actions of its own).
- **Backend dependency**: the `azm-crm-backend` sibling repo's Story 20 (`Trigger Alerts & Notifications for SLA Breaches`) is already implemented on the working tree (verified against `src/AzmCrm.API/Controllers/SlaBreachNotificationsController.cs` and `src/AzmCrm.Application/Features/Sla/DTOs/SlaBreachNotificationDto.cs` in that repo), exposing:
  - `GET /api/sla-breach-notifications/{id}` → `Result<SlaBreachNotificationDto>` (200) / 404.
  - `GET /api/sla-breach-notifications?pageNumber=&pageSize=&ticketId=&notifiedUserId=&breachType=` → `Result<PaginatedResult<SlaBreachNotificationDto>>` (200), newest first.

  `SlaBreachNotificationDto`: `id, ticketId, breachType, notifiedUserId, notifiedUserName, message, emailSent, createdOn`. `breachType` is one of `"ResponseOverdue" | "ResolutionOverdue"`. Notifications are **system-generated only** — there are no create/update/delete endpoints; the same backend scan that powers Story 16's automatic escalation (`ScanSlaBreachesCommandHandler`, on its existing timer) now also raises a `ResponseOverdue` notification (once per ticket, the first time `ResponseDueOn` passes with no `RespondedOn`) and a `ResolutionOverdue` notification alongside every automatic escalation it performs, best-effort emailing the assigned agent for each.

## Story Goal

Give agents and managers visibility into every SLA breach the system has detected — whether a ticket wasn't responded to in time or was auto-escalated for missing its resolution deadline — satisfying KAN-5's **"Trigger alerts and notifications for SLA breaches"** acceptance criterion. The actual alerting (email) is entirely backend-driven (Story 20 there); this story's only frontend surface is a read-only breach history.

Outcome: the `/automation` page gains a fourth panel, **"تنبيهات تجاوز اتفاقية مستوى الخدمة" (SLA Breach Notifications)**, listing every breach newest-first with its type, the affected ticket (linked), the notified agent, and whether an email was sent, filterable by breach type.

**Not in scope**: any in-app/real-time push notification (e.g. a bell icon or toast when a breach occurs) — the backend's own scope note limits this story to email plus a queryable REST list, so this frontend adds only the list; a "mark as read/acknowledged" action (no such endpoint exists); filtering by ticket id or notified user from this panel's UI (the query parameters exist on the backend, but this story only wires the breach-type filter — a manager reviewing the global feed does not need to pre-filter by a specific ticket or agent id they'd have to already know; linking from a specific ticket into its own breach history is a reasonable follow-up, not built here).

## Context — Read These Files First

1. [14-story-sla-policies-KAN-5.md](14-story-sla-policies-KAN-5.md) Task 4–5 — the exact panel shape (`.card space-y-4`, header + filter row, `<ul>` of rows, prev/next pagination via a namespaced query param) `SlaBreachNotificationsPanel` follows, minus any add/edit/delete affordance or modal (this panel is read-only — no `SlaBreachNotificationForm` exists).
2. [app/(pages)/tickets/page.tsx](<app/(pages)/tickets/page.tsx>) lines 109–113 — the `<Link href={\`/tickets/${id}\`}>` pattern this panel's per-notification ticket link reuses.
3. [lib/utils/date.ts](lib/utils/date.ts) — `formatDateTime` reused for `createdOn`.
4. [lib/types/pagination.ts](lib/types/pagination.ts) — `PaginatedResult<T>` this list is typed with.
5. [components/tickets/TicketFilters.tsx](components/tickets/TicketFilters.tsx) — the single-`<select>`-filter-writing-to-a-query-param pattern (`updateParam`), used here for one filter (`breachType`) instead of that file's five.

## Implementation tasks

### 1 — Types

**Create file: `lib/types/slaBreachNotification.ts`**

```ts
export type SlaBreachType = "ResponseOverdue" | "ResolutionOverdue";

export type SlaBreachNotification = {
  id: string;
  ticketId: string;
  breachType: SlaBreachType;
  notifiedUserId: string | null;
  notifiedUserName: string | null;
  message: string;
  emailSent: boolean;
  createdOn: string;
};
```

### 2 — Constants

**Create file: `lib/constants/sla.ts`**

```ts
import type { SlaBreachType } from "@/lib/types/slaBreachNotification";

export const SLA_BREACH_TYPE_LABELS: Record<SlaBreachType, string> = {
  ResponseOverdue: "تجاوز وقت الاستجابة",
  ResolutionOverdue: "تجاوز وقت الحل",
};
export const SLA_BREACH_TYPES = Object.keys(SLA_BREACH_TYPE_LABELS) as SlaBreachType[];
```

### 3 — API client

**Create file: `lib/api/slaBreachNotification.api.ts`**

```ts
import { apiServerFetch } from "./fetch";
import type { SlaBreachNotification, SlaBreachType } from "../types/slaBreachNotification";
import type { PaginatedResult } from "../types/pagination";

const SLA_BREACH_NOTIFICATIONS_URL = "/api/sla-breach-notifications";

export const slaBreachNotificationEndpoints = {
  list: (params: { pageNumber?: number; pageSize?: number; breachType?: SlaBreachType }) =>
    apiServerFetch<PaginatedResult<SlaBreachNotification>>({
      url: SLA_BREACH_NOTIFICATIONS_URL,
      params: {
        pageNumber: params.pageNumber ?? 1,
        pageSize: params.pageSize ?? 20,
        breachType: params.breachType,
      },
      cache: "no-store",
    }),
};
```

### 4 — Panel component

**Create file: `components/automation/SlaBreachNotificationsPanel.tsx`** (`"use client"`) — Props: `{ notifications: SlaBreachNotification[]; hasNextPage: boolean; hasPreviousPage: boolean; page: number; breachTypeFilter: string }`. No add/edit/delete state — only the pagination/filter query-param wiring (`updateParam`-style, writing to `?notifBreachType=`, clearing `?notifPage=`).

Renders a `.card space-y-4`:
- Header: `<h2>تنبيهات تجاوز اتفاقية مستوى الخدمة</h2>` (no add button — system-generated only).
- One filter `<select>` over `SLA_BREACH_TYPES`/`SLA_BREACH_TYPE_LABELS` with a leading `""` = "كل الأنواع" option.
- Empty state: "لا توجد تنبيهات بعد" when `notifications.length === 0`.
- A `<ul className="space-y-3">` of rows, each showing: a breach-type badge (`SLA_BREACH_TYPE_LABELS[n.breachType]`, `rounded-full bg-destructive/10 text-destructive text-xs font-medium px-2 py-0.5` — destructive-colored, since every row here is by definition a breach), `n.message`, a `<Link href={\`/tickets/${n.ticketId}\`}>عرض التذكرة</Link>`, `"الموظف: ${n.notifiedUserName ?? "—"}"`, an email-sent indicator (`"تم إرسال بريد إلكتروني"` in `text-text-secondary` when `emailSent`, `"لم يُرسل بريد إلكتروني"` when not), and `formatDateTime(n.createdOn)`.
- Prev/Next pagination via `?notifPage=`.

### 5 — Wire into the `/automation` page

**Edit file: `app/(pages)/automation/page.tsx`** (Stories 14–16) — add `notifPage`/`notifBreachType` to the `searchParams` type, fetch `slaBreachNotificationEndpoints.list({ pageNumber: notifPageNumber, breachType })` alongside the three existing list calls, and render `<SlaBreachNotificationsPanel ... />` as the fourth and final panel below `<EscalationRulesPanel />`.

## Edge Cases & Failure Modes

- **A notification's `notifiedUserId` is `null`** (the breached ticket had no `assignedToUserId` at scan time) — `notifiedUserName` is also `null`; the panel renders `"الموظف: —"` and the row still displays (visible for dashboard/manager awareness even with no agent to notify), matching the backend's explicit design to still persist the notification row in this case.
- **`emailSent: false`** (the assigned agent's email failed to send, or there was no assigned agent to email) — the row still displays with the "لم يُرسل بريد إلكتروني" indicator; this is the entire point of the durable notification row per the backend story (visible even when the email channel failed).
- **The same ticket appears multiple times in the feed** — expected: a `ResponseOverdue` notification (created once) and a `ResolutionOverdue` notification (created once, alongside its automatic escalation) are two independent rows for the same `ticketId`; the panel does not deduplicate or group by ticket.
- **`?notifBreachType=` set to a value outside `SlaBreachType`** (e.g. a hand-edited URL) — the backend's `[FromQuery] SlaBreachType? breachType` model-binds an unrecognized string as a 400 from `apiServerFetch`, which the page already handles by falling back to an empty list (same `result.success ? result.data.items : []` guard used by every other panel on this page).
- **`?notifPage=`/`?notifBreachType=` interact with the other three panels' own params** — all four panels' query params are independently namespaced, completing the same convention established across Stories 14–16.

## Test Plan

No automated test infrastructure exists in this repository. Manual verification only, per the Verification Steps below.

## Verification Steps

1. **Frontend builds:** `pnpm build` from the repository root.
2. **Lint passes:** `pnpm lint`.
3. **Frontend runs against a live backend:** `pnpm dev`, with `azm-crm-backend` running locally and a working `Smtp` configuration (or a local SMTP catcher such as MailHog) in `appsettings.Development.json`.
4. **Manual smoke test:** create an SLA-tracked, assigned ticket (Stories 14–15) whose `responseDueOn` is a minute in the future; wait past it and one backend scan interval; refresh `/automation` and confirm a `ResponseOverdue` row appears in the SLA Breach Notifications panel linking to that ticket, with the email-sent indicator matching whether the SMTP send actually succeeded; filter the panel by breach type and confirm the list narrows; separately trigger an automatic resolution escalation (as in Story 16's smoke test) and confirm a second, `ResolutionOverdue` row appears for that ticket.

## Done Criteria

- [ ] `/automation` shows a read-only SLA Breach Notifications panel (list + breach-type filter + pagination), newest-first, linking each row to its ticket.
- [ ] A response-time breach produces exactly one `ResponseOverdue` row (never duplicated across scan ticks); an automatic resolution escalation produces exactly one `ResolutionOverdue` row alongside it.
- [ ] `pnpm build` and `pnpm lint` both succeed with no new errors.

This completes KAN-5's four acceptance criteria across Stories 14–17: SLA targets (14), auto-assignment (15), escalation rules (16), and breach alerts/notifications (17, this story).
