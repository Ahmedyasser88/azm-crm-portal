import { apiServerFetch } from "./fetch";
import type { AssignmentRuleListItem } from "../types/assignmentRule";
import type { PaginatedResult } from "../types/pagination";
import type { TicketCategory, TicketPriority } from "../types/ticket";

const ASSIGNMENT_RULES_URL = "/api/assignment-rules";

export const assignmentRuleEndpoints = {
  list: (params: {
    pageNumber?: number;
    pageSize?: number;
    category?: TicketCategory;
    priority?: TicketPriority;
    isActive?: boolean;
  }) =>
    apiServerFetch<PaginatedResult<AssignmentRuleListItem>>({
      url: ASSIGNMENT_RULES_URL,
      params: {
        pageNumber: params.pageNumber ?? 1,
        pageSize: params.pageSize ?? 20,
        category: params.category,
        priority: params.priority,
        isActive: params.isActive,
      },
      cache: "no-store",
    }),
};
