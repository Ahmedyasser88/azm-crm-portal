"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AgentPicker } from "@/components/tickets/AgentPicker";
import { assignTicketAction, searchAgentsAction } from "@/app/(pages)/tickets/actions";

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
  const [pickerValue, setPickerValue] = useState("");

  async function handleAssign(userId: string | null) {
    setIsSubmitting(true);
    const result = await assignTicketAction(ticketId, userId);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    setPickerValue("");
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
        <label className="text-sm font-medium text-text-default">إسناد إلى موظف آخر</label>
        <AgentPicker
          value={pickerValue}
          onSearch={searchAgentsAction}
          onSelect={(agentId) => {
            setPickerValue(agentId);
            handleAssign(agentId);
          }}
        />
      </div>
    </div>
  );
}
