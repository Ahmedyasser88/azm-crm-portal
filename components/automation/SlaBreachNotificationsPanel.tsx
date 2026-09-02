"use client";

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SLA_BREACH_TYPES, SLA_BREACH_TYPE_LABELS } from "@/lib/constants/sla";
import { formatDateTime } from "@/lib/utils/date";
import type { SlaBreachNotification } from "@/lib/types/slaBreachNotification";

const selectClassName =
  "rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20";

export type SlaBreachNotificationsPanelProps = {
  notifications: SlaBreachNotification[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  page: number;
  breachTypeFilter: string;
};

export function SlaBreachNotificationsPanel({
  notifications,
  hasNextPage,
  hasPreviousPage,
  page,
  breachTypeFilter,
}: SlaBreachNotificationsPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(name: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }
    params.delete("notifPage");

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  function buildHref(targetPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("notifPage", String(targetPage));
    return `${pathname}?${params.toString()}`;
  }

  return (
    <div className="card space-y-4">
      <h2 className="text-lg font-semibold text-text-default">تنبيهات تجاوز اتفاقية مستوى الخدمة</h2>

      <select
        value={breachTypeFilter}
        onChange={(e) => updateParam("notifBreachType", e.target.value)}
        className={selectClassName}
      >
        <option value="">كل الأنواع</option>
        {SLA_BREACH_TYPES.map((type) => (
          <option key={type} value={type}>
            {SLA_BREACH_TYPE_LABELS[type]}
          </option>
        ))}
      </select>

      {notifications.length === 0 ? (
        <p className="text-sm text-text-secondary text-center py-6">لا توجد تنبيهات بعد</p>
      ) : (
        <ul className="space-y-3">
          {notifications.map((notification) => (
            <li key={notification.id} className="border-b border-gray-300 last:border-0 pb-3 space-y-1.5">
              <div className="flex items-start justify-between gap-4">
                <span className="inline-block rounded-full bg-destructive/10 text-destructive text-xs font-medium px-2 py-0.5">
                  {SLA_BREACH_TYPE_LABELS[notification.breachType]}
                </span>
                <p className="text-xs text-text-secondary whitespace-nowrap">
                  {formatDateTime(notification.createdOn)}
                </p>
              </div>
              <p className="text-sm text-text-default">{notification.message}</p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                <Link href={`/tickets/${notification.ticketId}`} className="text-primary hover:underline">
                  عرض التذكرة
                </Link>
                <span>الموظف: {notification.notifiedUserName ?? "—"}</span>
                <span>{notification.emailSent ? "تم إرسال بريد إلكتروني" : "لم يُرسل بريد إلكتروني"}</span>
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
