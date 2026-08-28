"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TICKET_STATUSES, TICKET_STATUS_LABELS } from "@/lib/constants/ticket";
import { changeTicketStatusAction } from "@/app/(pages)/tickets/actions";
import type { TicketStatus } from "@/lib/types/ticket";

export type ChangeStatusControlProps = {
  ticketId: string;
  status: TicketStatus;
};

export function ChangeStatusControl({ ticketId, status }: ChangeStatusControlProps) {
  const router = useRouter();
  const [value, setValue] = useState<TicketStatus>(status);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleChange(newStatus: TicketStatus) {
    setValue(newStatus);
    setIsSubmitting(true);

    const result = await changeTicketStatusAction(ticketId, newStatus);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      setValue(status);
      return;
    }

    router.refresh();
  }

  return (
    <div className="card space-y-4">
      <h2 className="text-lg font-semibold text-text-default">الحالة</h2>
      <select
        value={value}
        onChange={(e) => handleChange(e.target.value as TicketStatus)}
        disabled={isSubmitting}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
      >
        {TICKET_STATUSES.map((s) => (
          <option key={s} value={s}>
            {TICKET_STATUS_LABELS[s]}
          </option>
        ))}
      </select>
      {isSubmitting && <p className="text-xs text-text-secondary">جارٍ التحديث...</p>}
    </div>
  );
}
