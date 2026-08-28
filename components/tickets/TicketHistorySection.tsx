"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TICKET_HISTORY_EVENT_LABELS } from "@/lib/constants/ticketHistory";
import { TICKET_CATEGORY_LABELS, TICKET_PRIORITY_LABELS, TICKET_STATUS_LABELS } from "@/lib/constants/ticket";
import { formatDateTime } from "@/lib/utils/date";
import type { TicketHistoryEntry } from "@/lib/types/ticketHistory";
import type { TicketCategory, TicketPriority, TicketStatus } from "@/lib/types/ticket";

// The backend logs Title/Category/Priority changes under the same "Updated"
// eventType, distinguished only by `description` text ("Title changed.",
// "Category changed.", "Priority changed." — see UpdateTicketCommandHandler
// in azm-crm-backend). Status changes get their own "StatusChanged" eventType.
// oldValue/newValue for Title changes are free text and pass through
// untouched; for the other three they're raw backend enum names (e.g.
// "InProgress") that read better mapped to their Arabic labels.
function formatHistoryValue(entry: TicketHistoryEntry, value: string): string {
  if (entry.description === "Category changed." && value in TICKET_CATEGORY_LABELS) {
    return TICKET_CATEGORY_LABELS[value as TicketCategory];
  }
  if (entry.description === "Priority changed." && value in TICKET_PRIORITY_LABELS) {
    return TICKET_PRIORITY_LABELS[value as TicketPriority];
  }
  if (entry.eventType === "StatusChanged" && value in TICKET_STATUS_LABELS) {
    return TICKET_STATUS_LABELS[value as TicketStatus];
  }
  return value;
}

export type TicketHistorySectionProps = {
  ticketId: string;
  history: TicketHistoryEntry[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  page: number;
};

export function TicketHistorySection({
  history,
  hasNextPage,
  hasPreviousPage,
  page,
}: TicketHistorySectionProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function buildHref(targetPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("historyPage", String(targetPage));
    return `${pathname}?${params.toString()}`;
  }

  return (
    <div className="card space-y-4">
      <h2 className="text-lg font-semibold text-text-default">سجل التذكرة</h2>

      {history.length === 0 ? (
        <p className="text-sm text-text-secondary text-center py-6">لا يوجد سجل بعد</p>
      ) : (
        <ul className="space-y-3">
          {history.map((entry) => (
            <li key={entry.id} className="border-b border-gray-300 last:border-0 pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="inline-block rounded-full bg-primary-100 text-primary text-xs font-medium px-2 py-0.5">
                    {TICKET_HISTORY_EVENT_LABELS[entry.eventType]}
                  </span>
                  <p className="text-sm text-text-default">{entry.description}</p>
                  {entry.oldValue && entry.newValue && (
                    <p className="text-xs text-text-secondary">
                      {formatHistoryValue(entry, entry.oldValue)} ← {formatHistoryValue(entry, entry.newValue)}
                    </p>
                  )}
                </div>
                <p className="text-xs text-text-secondary whitespace-nowrap">
                  {formatDateTime(entry.createdOn)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {(hasPreviousPage || hasNextPage) && (
        <div className="flex justify-end gap-2">
          {hasPreviousPage ? (
            <Link href={buildHref(page - 1)}>
              <Button variant="outline">السابق</Button>
            </Link>
          ) : (
            <Button variant="outline" disabled>
              السابق
            </Button>
          )}
          {hasNextPage ? (
            <Link href={buildHref(page + 1)}>
              <Button variant="outline">التالي</Button>
            </Link>
          ) : (
            <Button variant="outline" disabled>
              التالي
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
