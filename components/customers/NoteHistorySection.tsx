"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AddNoteForm } from "@/components/customers/AddNoteForm";
import { formatDateTime } from "@/lib/utils/date";
import type { CustomerNote } from "@/lib/types/customerNote";

export type NoteHistorySectionProps = {
  customerId: string;
  notes: CustomerNote[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  page: number;
};

export function NoteHistorySection({
  customerId,
  notes,
  hasNextPage,
  hasPreviousPage,
  page,
}: NoteHistorySectionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  function buildHref(targetPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("notesPage", String(targetPage));
    return `${pathname}?${params.toString()}`;
  }

  function handleAdded() {
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-default">الملاحظات</h2>
        <Button onClick={() => setOpen(true)}>إضافة ملاحظة</Button>
      </div>

      {notes.length === 0 ? (
        <p className="text-sm text-text-secondary text-center py-6">لا توجد ملاحظات بعد</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li key={note.id} className="border-b border-gray-300 last:border-0 pb-3">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm text-text-default whitespace-pre-wrap">{note.content}</p>
                <p className="text-xs text-text-secondary whitespace-nowrap">
                  {formatDateTime(note.createdOn)}
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
            <h2 className="text-lg font-semibold text-text-default">إضافة ملاحظة</h2>
            <AddNoteForm customerId={customerId} onAdded={handleAdded} />
          </div>
        </div>
      )}
    </div>
  );
}
