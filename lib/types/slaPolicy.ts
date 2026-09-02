import type { TicketPriority } from "./ticket";

export type SlaPolicy = {
  id: string;
  name: string;
  priority: TicketPriority;
  responseTimeMinutes: number;
  resolutionTimeMinutes: number;
  isActive: boolean;
  createdOn: string;
  updatedOn: string | null;
};

export type SlaPolicyListItem = Pick<
  SlaPolicy,
  "id" | "name" | "priority" | "responseTimeMinutes" | "resolutionTimeMinutes" | "isActive"
>;

export type SlaPolicyFormValues = {
  name: string;
  priority: TicketPriority;
  responseTimeMinutes: number;
  resolutionTimeMinutes: number;
  isActive: boolean;
};
