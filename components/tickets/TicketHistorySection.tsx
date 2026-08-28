"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TICKET_HISTORY_EVENT_LABELS } from "@/lib/constants/ticketHistory";
import { formatDateTime } from "@/lib/utils/date";
import type { TicketHistoryEntry } from "@/lib/types/ticketHistory";

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
                      {entry.oldValue} ← {entry.newValue}
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
