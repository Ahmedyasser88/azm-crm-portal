import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageThread } from "@/components/conversations/MessageThread";
import { SendMessageForm } from "@/components/conversations/SendMessageForm";
import { LiveChatPanel } from "@/components/conversations/LiveChatPanel";
import { SetBreadcrumbLabel } from "@/components/customers/SetBreadcrumbLabel";
import { conversationEndpoints } from "@/lib/api/conversation.api";
import { customerEndpoints } from "@/lib/api/customer.api";
import { sendMessageAction } from "@/app/(pages)/conversations/actions";
import { CHANNEL_LABELS, CONVERSATION_STATUS_LABELS } from "@/lib/constants/conversation";

type ConversationDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ messagesPage?: string }>;
};

export default async function ConversationDetailPage({ params, searchParams }: ConversationDetailPageProps) {
  const { id } = await params;
  const { messagesPage } = await searchParams;

  const result = await conversationEndpoints.getById(id);

  if (!result.success) {
    if (result.status === 404) notFound();
    throw new Error(result.error);
  }

  const conversation = result.data;

  const customerResult = await customerEndpoints.getById(conversation.customerId);
  const customerLabel = customerResult.success ? customerResult.data.fullName : conversation.customerId;

  // When the caller didn't ask for a specific page, default to the LAST page instead of the
  // oldest once there's more than one page of messages — the backend orders messages
  // oldest-first, and a page-1 default would otherwise land the agent on the start of a long
  // thread instead of its most recent messages. This only ever costs a second fetch for a
  // conversation with more than 100 messages (the default page size), the rare case.
  const requestedMessagesPage = messagesPage ? Number(messagesPage) || 1 : undefined;

  let messagesResult = await conversationEndpoints.messages.list(id, {
    pageNumber: requestedMessagesPage ?? 1,
  });

  if (requestedMessagesPage === undefined && messagesResult.success && messagesResult.data.totalPages > 1) {
    messagesResult = await conversationEndpoints.messages.list(id, {
      pageNumber: messagesResult.data.totalPages,
    });
  }

  const messagesPageNumber = messagesResult.success ? messagesResult.data.pageNumber : (requestedMessagesPage ?? 1);

  return (
    <div className="space-y-6">
      <SetBreadcrumbLabel segment={id} label={conversation.subject ?? CHANNEL_LABELS[conversation.channel]} />
      <div className="card space-y-4">
        <div className="flex gap-2">
          <span className="inline-block rounded-full bg-primary-100 text-primary text-xs font-medium px-2 py-0.5">
            {CHANNEL_LABELS[conversation.channel]}
          </span>
          <span className="inline-block rounded-full bg-primary-100 text-primary text-xs font-medium px-2 py-0.5">
            {CONVERSATION_STATUS_LABELS[conversation.status]}
          </span>
        </div>

        {conversation.subject && (
          <h1 className="text-2xl font-bold text-text-default">{conversation.subject}</h1>
        )}

        <div className="space-y-1">
          <p className="text-xs text-text-secondary">العميل</p>
          <Link href={`/customers/${conversation.customerId}`} className="text-sm text-primary hover:underline">
            {customerLabel}
          </Link>
        </div>
      </div>

      {conversation.channel === "LiveChat" ? (
        // LiveChatPanel owns the full thread display (seeded from the same messages
        // MessageThread would otherwise render) plus live updates and the input — rendering
        // MessageThread as well here would show every message twice.
        <LiveChatPanel
          conversationId={id}
          initialMessages={messagesResult.success ? messagesResult.data.items : []}
        />
      ) : (
        <>
          <MessageThread
            messages={messagesResult.success ? messagesResult.data.items : []}
            hasNextPage={messagesResult.success ? messagesResult.data.hasNextPage : false}
            hasPreviousPage={messagesResult.success ? messagesResult.data.hasPreviousPage : false}
            page={messagesPageNumber}
          />
          <SendMessageForm onSubmit={sendMessageAction.bind(null, id)} />
        </>
      )}
    </div>
  );
}
