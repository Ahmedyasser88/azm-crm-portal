import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TicketFilters } from "@/components/tickets/TicketFilters";
import { ticketEndpoints } from "@/lib/api/ticket.api";
import { getCurrentUser } from "@/lib/api/identity.api";
import { TICKET_CATEGORY_LABELS, TICKET_PRIORITY_LABELS, TICKET_STATUS_LABELS } from "@/lib/constants/ticket";
import { formatDateTime } from "@/lib/utils/date";
import type { TicketCategory, TicketPriority, TicketStatus } from "@/lib/types/ticket";

type TicketsPageProps = {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
    category?: string;
    priority?: string;
    customerId?: string;
    assignedToUserId?: string;
    isEscalated?: string;
  }>;
};

export default async function TicketsPage({ searchParams }: TicketsPageProps) {
  const { page, search, status, category, priority, customerId, assignedToUserId, isEscalated } =
    await searchParams;
  const pageNumber = Number(page) || 1;

  const currentUser = await getCurrentUser();
  const resolvedAssignedToUserId =
    assignedToUserId === "me" ? (currentUser?.userId ?? undefined) : assignedToUserId;

  const result = await ticketEndpoints.list({
    pageNumber,
    search,
    status: status as TicketStatus | undefined,
    category: category as TicketCategory | undefined,
    priority: priority as TicketPriority | undefined,
    customerId,
    assignedToUserId: resolvedAssignedToUserId,
    isEscalated: isEscalated === "true" ? true : undefined,
  });

  if (!result.success) {
    throw new Error(result.error);
  }

  const { items, hasNextPage, hasPreviousPage } = result.data;

  const buildPageHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (category) params.set("category", category);
    if (priority) params.set("priority", priority);
    if (customerId) params.set("customerId", customerId);
    if (assignedToUserId) params.set("assignedToUserId", assignedToUserId);
    if (isEscalated) params.set("isEscalated", isEscalated);
    params.set("page", String(targetPage));
    return `/tickets?${params.toString()}`;
  };

  const newTicketHref = customerId ? `/tickets/new?customerId=${customerId}` : "/tickets/new";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-default">التذاكر</h1>
        <Link href={newTicketHref}>
          <Button>تذكرة جديدة</Button>
        </Link>
      </div>

      <TicketFilters
        initialSearch={search ?? ""}
        initialStatus={status ?? ""}
        initialCategory={category ?? ""}
        initialPriority={priority ?? ""}
        initialAssignedToUserId={assignedToUserId ?? ""}
        initialIsEscalated={isEscalated ?? ""}
      />

      <div className="card overflow-x-auto">
        {items.length === 0 ? (
          <p className="text-sm text-text-secondary text-center py-8">
            {search || status || category || priority || customerId || assignedToUserId || isEscalated
              ? "لا توجد نتائج مطابقة"
              : "لا توجد تذاكر بعد"}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-text-secondary border-b border-gray-300">
                <th className="py-2 px-3 font-medium">العنوان</th>
                <th className="py-2 px-3 font-medium">العميل</th>
                <th className="py-2 px-3 font-medium">الفئة</th>
                <th className="py-2 px-3 font-medium">الأولوية</th>
                <th className="py-2 px-3 font-medium">الحالة</th>
                <th className="py-2 px-3 font-medium">التصعيد</th>
                <th className="py-2 px-3 font-medium">المسندة إلى</th>
                <th className="py-2 px-3 font-medium">تاريخ الإنشاء</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-gray-300 last:border-0 hover:bg-surface"
                >
                  <td className="py-2 px-3">
                    <Link href={`/tickets/${item.id}`} className="text-primary hover:underline">
                      {item.title}
                    </Link>
                  </td>
                  <td className="py-2 px-3">
                    <Link
                      href={`/customers/${item.customerId}`}
                      className="text-primary hover:underline"
                    >
                      {item.customerId}
                    </Link>
                  </td>
                  <td className="py-2 px-3">{TICKET_CATEGORY_LABELS[item.category]}</td>
                  <td className="py-2 px-3">{TICKET_PRIORITY_LABELS[item.priority]}</td>
                  <td className="py-2 px-3">{TICKET_STATUS_LABELS[item.status]}</td>
                  <td className="py-2 px-3">
                    {item.isEscalated && (
                      <span className="inline-block rounded-full bg-destructive/10 text-destructive text-xs font-medium px-2 py-0.5">
                        مُصعّدة
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3">{item.assignedToUserName ?? "—"}</td>
                  <td className="py-2 px-3">{formatDateTime(item.createdOn)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {(hasPreviousPage || hasNextPage) && (
        <div className="flex justify-end gap-2">
          {hasPreviousPage ? (
            <Link href={buildPageHref(pageNumber - 1)}>
              <Button variant="outline">السابق</Button>
            </Link>
          ) : (
            <Button variant="outline" disabled>
              السابق
            </Button>
          )}
          {hasNextPage ? (
            <Link href={buildPageHref(pageNumber + 1)}>
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
