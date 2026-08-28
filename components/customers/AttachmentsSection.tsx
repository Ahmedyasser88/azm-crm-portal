"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { UploadAttachmentForm } from "@/components/customers/UploadAttachmentForm";
import { formatDateTime } from "@/lib/utils/date";
import type { CustomerAttachment } from "@/lib/types/customerAttachment";

export type AttachmentsSectionProps = {
  customerId: string;
  attachments: CustomerAttachment[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  page: number;
};

function formatFileSize(bytes: number) {
  // Below ~100 bytes, "(bytes / 1024).toFixed(1)" rounds to "0.0 كيلوبايت",
  // which reads as an empty/broken file even though it isn't — show the exact
  // byte count instead for anything under 1 KB.
  if (bytes < 1024) {
    return `${bytes} بايت`;
  }
  if (bytes < 1_048_576) {
    return `${(bytes / 1024).toFixed(1)} كيلوبايت`;
  }
  return `${(bytes / 1_048_576).toFixed(1)} ميغابايت`;
}

export function AttachmentsSection({
  customerId,
  attachments,
  hasNextPage,
  hasPreviousPage,
  page,
}: AttachmentsSectionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  function buildHref(targetPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("attachmentsPage", String(targetPage));
    return `${pathname}?${params.toString()}`;
  }

  function handleUploaded() {
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-default">المرفقات</h2>
        <Button onClick={() => setOpen(true)}>إضافة مرفق</Button>
      </div>

      {attachments.length === 0 ? (
        <p className="text-sm text-text-secondary text-center py-6">لا توجد مرفقات بعد</p>
      ) : (
        <ul className="space-y-3">
          {attachments.map((attachment) => (
            <li
              key={attachment.id}
              className="flex items-center justify-between gap-4 border-b border-gray-300 last:border-0 pb-3"
            >
              <div className="space-y-1">
                <p className="text-sm font-semibold text-text-default">{attachment.fileName}</p>
                <p className="text-xs text-text-secondary">
                  {formatFileSize(attachment.fileSizeBytes)} · {formatDateTime(attachment.createdOn)}
                </p>
              </div>
              <a
                href={`/api/customers/${customerId}/attachments/${attachment.id}/download`}
                className="text-primary hover:underline text-sm shrink-0"
              >
                تنزيل
              </a>
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
            <h2 className="text-lg font-semibold text-text-default">إضافة مرفق</h2>
            <UploadAttachmentForm customerId={customerId} onUploaded={handleUploaded} />
          </div>
        </div>
      )}
    </div>
  );
}
