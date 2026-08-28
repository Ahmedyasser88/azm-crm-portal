import type { TicketCategory, TicketPriority, TicketStatus } from "@/lib/types/ticket";

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  General: "عام",
  Technical: "تقني",
  Billing: "الفواتير",
  AccountAccess: "الوصول للحساب",
  FeatureRequest: "طلب ميزة",
  Other: "أخرى",
};
export const TICKET_CATEGORIES = Object.keys(TICKET_CATEGORY_LABELS) as TicketCategory[];

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  Low: "منخفضة",
  Medium: "متوسطة",
  High: "عالية",
  Urgent: "عاجلة",
};
export const TICKET_PRIORITIES = Object.keys(TICKET_PRIORITY_LABELS) as TicketPriority[];

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  New: "جديدة",
  Open: "مفتوحة",
  InProgress: "قيد التنفيذ",
  OnHold: "قيد الانتظار",
  Resolved: "تم الحل",
  Closed: "مغلقة",
  Reopened: "أعيد فتحها",
};
export const TICKET_STATUSES = Object.keys(TICKET_STATUS_LABELS) as TicketStatus[];
