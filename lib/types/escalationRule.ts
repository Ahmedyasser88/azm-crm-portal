import type { TicketPriority } from "./ticket";

export type EscalationRule = {
  id: string;
  name: string;
  priority: TicketPriority | null;
  overdueMinutes: number;
  isActive: boolean;
  createdOn: string;
  updatedOn: string | null;
};

export type EscalationRuleListItem = Pick<
  EscalationRule,
  "id" | "name" | "priority" | "overdueMinutes" | "isActive"
>;

export type EscalationRuleFormValues = {
  name: string;
  priority: TicketPriority | null;
  overdueMinutes: number;
  isActive: boolean;
};
