import type { TicketHistoryEventType } from "@/lib/types/ticketHistory";

export const TICKET_HISTORY_EVENT_LABELS: Record<TicketHistoryEventType, string> = {
  Created: "إنشاء",
  Updated: "تحديث",
  Assigned: "إسناد",
  Unassigned: "إلغاء الإسناد",
  StatusChanged: "تغيير الحالة",
  Escalated: "تصعيد",
};
