"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { assignTicketAction } from "@/app/(pages)/tickets/actions";

export type AssignTicketControlProps = {
  ticketId: string;
  assignedToUserId: string | null;
  assignedToUserName: string | null;
  currentUserId: string;
  currentUserName: string;
};

export function AssignTicketControl({
  ticketId,
  assignedToUserId,
  assignedToUserName,
  currentUserId,
}: AssignTicketControlProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rawAgentId, setRawAgentId] = useState("");

  async function handleAssign(userId: string | null) {
    setIsSubmitting(true);
    const result = await assignTicketAction(ticketId, userId);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    setRawAgentId("");
    router.refresh();
  }

  return (
    <div className="card space-y-4">
      <h2 className="text-lg font-semibold text-text-default">الإسناد</h2>

      <p className="text-sm text-text-default">
        {assignedToUserId ? (
          <>
            مسندة إلى <span className="font-semibold">{assignedToUserName ?? assignedToUserId}</span>
          </>
        ) : (
          "غير مسندة"
        )}
      </p>

      <div className="flex flex-wrap gap-2">
        {assignedToUserId !== currentUserId && (
          <Button onClick={() => handleAssign(currentUserId)} disabled={isSubmitting}>
            أسند إليّ
          </Button>
        )}
        {assignedToUserId && (
          <Button variant="outline" onClick={() => handleAssign(null)} disabled={isSubmitting}>
            إلغاء الإسناد
          </Button>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="raw-agent-id" className="text-sm font-medium text-text-default">
          معرّف الموظف
        </label>
        <div className="flex gap-2">
          <input
            id="raw-agent-id"
            value={rawAgentId}
            onChange={(e) => setRawAgentId(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
          <Button
            variant="outline"
            disabled={isSubmitting || !rawAgentId.trim()}
            onClick={() => handleAssign(rawAgentId.trim())}
          >
            إسناد
          </Button>
        </div>
      </div>
    </div>
  );
}
