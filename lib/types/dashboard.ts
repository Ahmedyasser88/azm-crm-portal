import type { TicketCategory, TicketPriority, TicketStatus } from "./ticket";

export type CustomerSummary = {
  id: string;
  fullName: string;
  companyName: string | null;
  email: string | null;
  phoneNumber: string | null;
};

export type DashboardTicket = {
  id: string;
  title: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdOn: string;
  isEscalated: boolean;
  escalatedOn: string | null;
  resolutionDueOn: string | null;
  customer: CustomerSummary | null;
};

export type DashboardSummary = {
  totalAssigned: number;
  new: number;
  open: number;
  inProgress: number;
  onHold: number;
  resolved: number;
  closed: number;
  reopened: number;
  escalatedCount: number;
};
