export type TicketHistoryEventType = "Created" | "Updated" | "Assigned" | "Unassigned" | "StatusChanged" | "Escalated";

export type TicketHistoryEntry = {
  id: string;
  ticketId: string;
  eventType: TicketHistoryEventType;
  description: string;
  oldValue: string | null;
  newValue: string | null;
  createdBy: string;
  createdOn: string;
};
