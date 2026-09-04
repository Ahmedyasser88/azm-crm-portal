export type TicketCategory = "General" | "Technical" | "Billing" | "AccountAccess" | "FeatureRequest" | "Other";
export type TicketPriority = "Low" | "Medium" | "High" | "Urgent";
export type TicketStatus = "New" | "Open" | "InProgress" | "OnHold" | "Resolved" | "Closed" | "Reopened";

export type Ticket = {
  id: string;
  customerId: string;
  title: string;
  description: string | null;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdOn: string;
  updatedOn: string | null;
  assignedToUserId: string | null;
  assignedToUserName: string | null;
  isEscalated: boolean;
  escalatedOn: string | null;
  slaPolicyId: string | null;
  responseDueOn: string | null;
  resolutionDueOn: string | null;
  respondedOn: string | null;
  aiSummary: string | null;
  aiSummaryGeneratedOn: string | null;
};

export type TicketListItem = Pick<
  Ticket,
  | "id"
  | "customerId"
  | "title"
  | "category"
  | "priority"
  | "status"
  | "createdOn"
  | "assignedToUserId"
  | "assignedToUserName"
  | "isEscalated"
  | "escalatedOn"
  | "slaPolicyId"
  | "responseDueOn"
  | "resolutionDueOn"
  | "respondedOn"
>;

export type TicketFormValues = {
  customerId: string;
  title: string;
  description: string;
  // "Auto" is a frontend-only sentinel (never sent as-is to the backend) meaning "let the AI
  // categorizer decide" — see createTicketAction, which omits `category` from the request body
  // when this value is chosen.
  category: TicketCategory | "Auto";
  priority: TicketPriority;
};
