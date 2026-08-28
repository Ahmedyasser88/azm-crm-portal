"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MessageBubbleList } from "@/components/conversations/MessageBubbleList";
import type { Message } from "@/lib/types/message";

export type MessageThreadProps = {
  messages: Message[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  page: number;
};

export function MessageThread({ messages, hasNextPage, hasPreviousPage, page }: MessageThreadProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function buildHref(targetPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("messagesPage", String(targetPage));
    return `${pathname}?${params.toString()}`;
  }

  return (
    <div className="card space-y-4">
      <h2 className="text-lg font-semibold text-text-default">الرسائل</h2>

      {/* Messages arrive from the backend already ordered oldest-first — do not re-sort. */}
      <MessageBubbleList messages={messages} />

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
