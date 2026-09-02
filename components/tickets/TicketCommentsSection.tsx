"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AddCommentForm } from "@/components/tickets/AddCommentForm";
import { formatDateTime } from "@/lib/utils/date";
import type { TicketComment } from "@/lib/types/ticketComment";

export type TicketCommentsSectionProps = {
  ticketId: string;
  comments: TicketComment[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  page: number;
};

export function TicketCommentsSection({
  ticketId,
  comments,
  hasNextPage,
  hasPreviousPage,
  page,
}: TicketCommentsSectionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  function buildHref(targetPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("commentsPage", String(targetPage));
    return `${pathname}?${params.toString()}`;
  }

  function handleAdded() {
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-default">التعاون الداخلي</h2>
        <Button onClick={() => setOpen(true)}>إضافة تعليق</Button>
      </div>

      {comments.length === 0 ? (
        <p className="text-sm text-text-secondary text-center py-6">
          لا توجد تعليقات بعد — كن أول من يعلّق
        </p>
      ) : (
        // The backend returns comments oldest-first (a collaboration thread reads top-to-bottom
        // like a chat log) — do not sort or reverse this list.
        <ul className="space-y-3">
          {comments.map((comment) => (
            <li key={comment.id} className="border-b border-gray-300 last:border-0 pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-text-default">
                    {comment.createdByName ?? "عضو سابق في الفريق"}
                  </p>
                  <p className="text-sm text-text-default whitespace-pre-wrap">{comment.content}</p>
                </div>
                <p className="text-xs text-text-secondary whitespace-nowrap">
                  {formatDateTime(comment.createdOn)}
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

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-black opacity-30 fixed inset-0" onClick={() => setOpen(false)} />
          <div className="card relative w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-text-default">إضافة تعليق</h2>
            <AddCommentForm ticketId={ticketId} onAdded={handleAdded} />
          </div>
        </div>
      )}
    </div>
  );
}
