import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ConversationFilters } from "@/components/conversations/ConversationFilters";
import { conversationEndpoints } from "@/lib/api/conversation.api";
import { CHANNEL_LABELS, CONVERSATION_STATUS_LABELS } from "@/lib/constants/conversation";
import { formatDateTime } from "@/lib/utils/date";
import type { CommunicationChannel, ConversationStatus } from "@/lib/types/conversation";

type ConversationsPageProps = {
  searchParams: Promise<{
    page?: string;
    channel?: string;
    status?: string;
    customerId?: string;
  }>;
};

export default async function ConversationsPage({ searchParams }: ConversationsPageProps) {
  const { page, channel, status, customerId } = await searchParams;
  const pageNumber = Number(page) || 1;

  const result = await conversationEndpoints.list({
    pageNumber,
    channel: channel as CommunicationChannel | undefined,
    status: status as ConversationStatus | undefined,
    customerId,
  });

  if (!result.success) {
    throw new Error(result.error);
  }

  const { items, hasNextPage, hasPreviousPage } = result.data;

  const buildPageHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (channel) params.set("channel", channel);
    if (status) params.set("status", status);
    if (customerId) params.set("customerId", customerId);
    params.set("page", String(targetPage));
    return `/conversations?${params.toString()}`;
  };

  const newConversationHref = customerId ? `/conversations/new?customerId=${customerId}` : "/conversations/new";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-default">المحادثات</h1>
        <Link href={newConversationHref}>
          <Button>محادثة جديدة</Button>
        </Link>
      </div>

      <ConversationFilters initialChannel={channel ?? ""} initialStatus={status ?? ""} />

      <div className="card overflow-x-auto">
        {items.length === 0 ? (
          <p className="text-sm text-text-secondary text-center py-8">
            {channel || status || customerId ? "لا توجد نتائج مطابقة" : "لا توجد محادثات بعد"}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-text-secondary border-b border-gray-300">
                <th className="py-2 px-3 font-medium">القناة</th>
                <th className="py-2 px-3 font-medium">العميل</th>
                <th className="py-2 px-3 font-medium">الموضوع</th>
                <th className="py-2 px-3 font-medium">الحالة</th>
                <th className="py-2 px-3 font-medium">تاريخ الإنشاء</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-gray-300 last:border-0 hover:bg-surface">
                  <td className="py-2 px-3">
                    <Link href={`/conversations/${item.id}`} className="text-primary hover:underline">
                      <span className="inline-block rounded-full bg-primary-100 text-primary text-xs font-medium px-2 py-0.5">
                        {CHANNEL_LABELS[item.channel]}
                      </span>
                    </Link>
                  </td>
                  <td className="py-2 px-3">
                    <Link href={`/customers/${item.customerId}`} className="text-primary hover:underline">
                      {item.customerId}
                    </Link>
                  </td>
                  <td className="py-2 px-3">{item.subject ?? "—"}</td>
                  <td className="py-2 px-3">{CONVERSATION_STATUS_LABELS[item.status]}</td>
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
