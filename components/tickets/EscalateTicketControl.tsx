"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { escalateTicketAction } from "@/app/(pages)/tickets/actions";
import { formatDateTime } from "@/lib/utils/date";

export type EscalateTicketControlProps = {
  ticketId: string;
  isEscalated: boolean;
  escalatedOn: string | null;
};

export function EscalateTicketControl({ ticketId, isEscalated, escalatedOn }: EscalateTicketControlProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await escalateTicketAction(ticketId, reason);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setReason("");
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="card space-y-4">
      <h2 className="text-lg font-semibold text-text-default">التصعيد</h2>

      <p className="text-sm text-text-default">
        {isEscalated
          ? escalatedOn
            ? `مُصعّدة منذ ${formatDateTime(escalatedOn)}`
            : "مُصعّدة"
          : "غير مُصعّدة"}
      </p>

      <Button variant="destructive" onClick={() => setOpen(true)}>
        تصعيد
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-black opacity-30 fixed inset-0" onClick={() => setOpen(false)} />
          <div className="card relative w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold text-text-default">تصعيد التذكرة</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="escalate-reason" className="text-sm font-medium text-text-default">
                  السبب
                </label>
                <textarea
                  id="escalate-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {error && (
                <p role="alert" className="text-sm text-red-600">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                  إلغاء
                </Button>
                <Button type="submit" variant="destructive" disabled={isSubmitting}>
                  {isSubmitting ? "جارٍ التصعيد..." : "تصعيد"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
