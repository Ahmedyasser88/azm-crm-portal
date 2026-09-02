import type { TicketCategory, TicketPriority } from "./ticket";

export type AssignmentRule = {
  id: string;
  name: string;
  category: TicketCategory | null;
  priority: TicketPriority | null;
  assignedToUserId: string;
  assignedToUserName: string | null;
  evaluationOrder: number;
  isActive: boolean;
  createdOn: string;
  updatedOn: string | null;
};

export type AssignmentRuleListItem = Pick<
  AssignmentRule,
  | "id"
  | "name"
  | "category"
  | "priority"
  | "assignedToUserId"
  | "assignedToUserName"
  | "evaluationOrder"
  | "isActive"
>;

export type AssignmentRuleFormValues = {
  name: string;
  category: TicketCategory | null;
  priority: TicketPriority | null;
  assignedToUserId: string;
  evaluationOrder: number;
  isActive: boolean;
};
