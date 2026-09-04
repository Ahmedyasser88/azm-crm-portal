import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TicketHistorySection } from "@/components/tickets/TicketHistorySection";
import { TicketCommentsSection } from "@/components/tickets/TicketCommentsSection";
import { AssignTicketControl } from "@/components/tickets/AssignTicketControl";
import { ChangeStatusControl } from "@/components/tickets/ChangeStatusControl";
import { EscalateTicketControl } from "@/components/tickets/EscalateTicketControl";
import { TicketAiSummaryPanel } from "@/components/tickets/TicketAiSummaryPanel";
import { TicketSuggestedReplyPanel } from "@/components/tickets/TicketSuggestedReplyPanel";
import { TicketSuggestedArticlesPanel } from "@/components/tickets/TicketSuggestedArticlesPanel";
import { SetBreadcrumbLabel } from "@/components/customers/SetBreadcrumbLabel";
import { ticketEndpoints } from "@/lib/api/ticket.api";
import { customerEndpoints } from "@/lib/api/customer.api";
import { getCurrentUser } from "@/lib/api/identity.api";
import { TICKET_CATEGORY_LABELS, TICKET_PRIORITY_LABELS, TICKET_STATUS_LABELS } from "@/lib/constants/ticket";
import { formatDateTime } from "@/lib/utils/date";

type TicketDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ historyPage?: string; commentsPage?: string }>;
};

export default async function TicketDetailPage({ params, searchParams }: TicketDetailPageProps) {
  const { id } = await params;
  const { historyPage, commentsPage } = await searchParams;

  const result = await ticketEndpoints.getById(id);

  if (!result.success) {
    if (result.status === 404) notFound();
    throw new Error(result.error);
  }

  const ticket = result.data;

  const customerResult = await customerEndpoints.getById(ticket.customerId);
  const customerLabel = customerResult.success ? customerResult.data.fullName : ticket.customerId;

  const historyPageNumber = Number(historyPage) || 1;
  const historyResult = await ticketEndpoints.history.list(id, { pageNumber: historyPageNumber });

  const commentsPageNumber = Number(commentsPage) || 1;
  const commentsResult = await ticketEndpoints.comments.list(id, { pageNumber: commentsPageNumber });

  const suggestedArticlesResult = await ticketEndpoints.suggestedArticles(id);

  const currentUser = await getCurrentUser();

  return (
    <div className="space-y-6">
      <SetBreadcrumbLabel segment={id} label={ticket.title} />
      <div className="card space-y-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-text-default">{ticket.title}</h1>
            <div className="flex gap-2">
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
              {!ticket.isEscalated &&
                ticket.resolutionDueOn &&
                new Date(ticket.resolutionDueOn) < new Date() &&
                ticket.status !== "Resolved" &&
                ticket.status !== "Closed" && (
                  <span className="inline-block rounded-full bg-destructive/10 text-destructive text-xs font-medium px-2 py-0.5">
                    متأخرة
                  </span>
                )}
            </div>
          </div>
          <Link href={`/tickets/${id}/edit`}>
            <Button variant="outline">تعديل</Button>
          </Link>
        </div>

        {ticket.description && (
          <p className="text-sm text-text-default whitespace-pre-wrap">{ticket.description}</p>
        )}

        <div className="space-y-1">
          <p className="text-xs text-text-secondary">العميل</p>
          <Link href={`/customers/${ticket.customerId}`} className="text-sm text-primary hover:underline">
            {customerLabel}
          </Link>
        </div>
      </div>

      {currentUser && (
        <AssignTicketControl
          ticketId={id}
          assignedToUserId={ticket.assignedToUserId}
          assignedToUserName={ticket.assignedToUserName}
          currentUserId={currentUser.userId}
          currentUserName={currentUser.fullName}
        />
      )}

      <ChangeStatusControl ticketId={id} status={ticket.status} />
      <EscalateTicketControl
        ticketId={id}
        isEscalated={ticket.isEscalated}
        escalatedOn={ticket.escalatedOn}
      />

      <TicketAiSummaryPanel
        ticketId={id}
        aiSummary={ticket.aiSummary}
        aiSummaryGeneratedOn={ticket.aiSummaryGeneratedOn}
      />
      <TicketSuggestedReplyPanel ticketId={id} />
      <TicketSuggestedArticlesPanel
        articles={suggestedArticlesResult.success ? suggestedArticlesResult.data : []}
      />

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

      <TicketHistorySection
        ticketId={id}
        history={historyResult.success ? historyResult.data.items : []}
        hasNextPage={historyResult.success ? historyResult.data.hasNextPage : false}
        hasPreviousPage={historyResult.success ? historyResult.data.hasPreviousPage : false}
        page={historyPageNumber}
      />

      <TicketCommentsSection
        ticketId={id}
        comments={commentsResult.success ? commentsResult.data.items : []}
        hasNextPage={commentsResult.success ? commentsResult.data.hasNextPage : false}
        hasPreviousPage={commentsResult.success ? commentsResult.data.hasPreviousPage : false}
        page={commentsPageNumber}
      />
    </div>
  );
}
