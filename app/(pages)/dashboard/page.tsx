import Link from "next/link";
import { Button } from "@/components/ui/button";
import { dashboardEndpoints } from "@/lib/api/dashboard.api";
import { agentTaskEndpoints } from "@/lib/api/agentTask.api";
import { quickReplyTemplateEndpoints } from "@/lib/api/quickReplyTemplate.api";
import { DashboardStatusFilter } from "@/components/dashboard/DashboardStatusFilter";
import { AgentTasksPanel } from "@/components/dashboard/AgentTasksPanel";
import { QuickReplyTemplatesPanel } from "@/components/dashboard/QuickReplyTemplatesPanel";
import { TICKET_CATEGORY_LABELS, TICKET_PRIORITY_LABELS, TICKET_STATUS_LABELS } from "@/lib/constants/ticket";
import { formatDateTime } from "@/lib/utils/date";
import type { TicketStatus } from "@/lib/types/ticket";

type DashboardPageProps = {
  searchParams: Promise<{
    page?: string;
    status?: string;
    tasksPage?: string;
    isCompleted?: string;
    templatesPage?: string;
    templatesSearch?: string;
  }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { page, status, tasksPage, isCompleted, templatesPage, templatesSearch } = await searchParams;
  const pageNumber = Number(page) || 1;
  const statusFilter = status ? (status as TicketStatus) : undefined;
  const tasksPageNumber = Number(tasksPage) || 1;
  const showCompleted = isCompleted === "true";
  const templatesPageNumber = Number(templatesPage) || 1;

  const [summaryResult, ticketsResult, tasksResult, templatesResult] = await Promise.all([
    dashboardEndpoints.summary(),
    dashboardEndpoints.myTickets({ pageNumber, status: statusFilter }),
    agentTaskEndpoints.list({
      pageNumber: tasksPageNumber,
      isCompleted: showCompleted ? undefined : false,
    }),
    quickReplyTemplateEndpoints.list({ pageNumber: templatesPageNumber, search: templatesSearch }),
  ]);

  const summary = summaryResult.success ? summaryResult.data : null;
  const tickets = ticketsResult.success ? ticketsResult.data.items : [];
  const hasNextPage = ticketsResult.success ? ticketsResult.data.hasNextPage : false;
  const hasPreviousPage = ticketsResult.success ? ticketsResult.data.hasPreviousPage : false;

  function buildHref(targetPage: number) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    params.set("page", String(targetPage));
    return `/dashboard?${params.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-2xl font-bold text-text-default">لوحة التحكم</h1>
        <p className="mt-1 text-sm text-text-secondary">نظرة عامة على تذاكرك ومهامك</p>
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="card space-y-1">
            <p className="text-xs text-text-secondary">الإجمالي</p>
            <p className="text-2xl font-bold text-text-default">{summary.totalAssigned}</p>
          </div>
          <div className="card space-y-1">
            <p className="text-xs text-text-secondary">جديدة</p>
            <p className="text-2xl font-bold text-text-default">{summary.new}</p>
          </div>
          <div className="card space-y-1">
            <p className="text-xs text-text-secondary">قيد التنفيذ</p>
            <p className="text-2xl font-bold text-text-default">{summary.inProgress}</p>
          </div>
          <div className="card space-y-1">
            <p className="text-xs text-text-secondary">مُصعّدة</p>
            <p className="text-2xl font-bold text-destructive">{summary.escalatedCount}</p>
          </div>
        </div>
      )}

      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-default">تذاكري</h2>
          <DashboardStatusFilter initialStatus={status ?? ""} />
        </div>

        {tickets.length === 0 ? (
          <p className="text-sm text-text-secondary text-center py-6">لا توجد تذاكر مُسندة إليك</p>
        ) : (
          <ul className="space-y-3">
            {tickets.map((ticket) => (
              <li key={ticket.id} className="border-b border-gray-300 last:border-0 pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <Link
                      href={`/tickets/${ticket.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {ticket.title}
                    </Link>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="inline-block rounded-full bg-primary-100 text-primary text-xs font-medium px-2 py-0.5">
                        {TICKET_CATEGORY_LABELS[ticket.category]}
                      </span>
                      <span className="inline-block rounded-full bg-primary-100 text-primary text-xs font-medium px-2 py-0.5">
                        {TICKET_PRIORITY_LABELS[ticket.priority]}
                      </span>
                      <span className="inline-block rounded-full bg-primary-100 text-primary text-xs font-medium px-2 py-0.5">
                        {TICKET_STATUS_LABELS[ticket.status]}
                      </span>
                      {ticket.isEscalated && (
                        <span className="inline-block rounded-full bg-destructive/10 text-destructive text-xs font-medium px-2 py-0.5">
                          مُصعّدة
                        </span>
                      )}
                    </div>
                    {ticket.customer ? (
                      <Link
                        href={`/customers/${ticket.customer.id}`}
                        className="block text-xs text-text-secondary hover:underline"
                      >
                        {ticket.customer.companyName
                          ? `${ticket.customer.fullName} — ${ticket.customer.companyName}`
                          : ticket.customer.fullName}
                      </Link>
                    ) : (
                      <p className="text-xs text-text-secondary">بيانات العميل غير متاحة</p>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary whitespace-nowrap">
                    {formatDateTime(ticket.createdOn)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {(hasPreviousPage || hasNextPage) && (
          <div className="flex justify-end gap-2">
            {hasPreviousPage ? (
              <Link href={buildHref(pageNumber - 1)}>
                <Button variant="outline">السابق</Button>
              </Link>
            ) : (
              <Button variant="outline" disabled>
                السابق
              </Button>
            )}
            {hasNextPage ? (
              <Link href={buildHref(pageNumber + 1)}>
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

      <AgentTasksPanel
        tasks={tasksResult.success ? tasksResult.data.items : []}
        hasNextPage={tasksResult.success ? tasksResult.data.hasNextPage : false}
        hasPreviousPage={tasksResult.success ? tasksResult.data.hasPreviousPage : false}
        page={tasksPageNumber}
        showCompleted={showCompleted}
      />

      <QuickReplyTemplatesPanel
        templates={templatesResult.success ? templatesResult.data.items : []}
        hasNextPage={templatesResult.success ? templatesResult.data.hasNextPage : false}
        hasPreviousPage={templatesResult.success ? templatesResult.data.hasPreviousPage : false}
        page={templatesPageNumber}
        initialSearch={templatesSearch ?? ""}
      />
    </div>
  );
}
