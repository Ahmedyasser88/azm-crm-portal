import { apiServerFetch } from "./fetch";
import type { EscalationRuleListItem } from "../types/escalationRule";
import type { PaginatedResult } from "../types/pagination";
import type { TicketPriority } from "../types/ticket";

const ESCALATION_RULES_URL = "/api/escalation-rules";

export const escalationRuleEndpoints = {
  list: (params: { pageNumber?: number; pageSize?: number; priority?: TicketPriority; isActive?: boolean }) =>
    apiServerFetch<PaginatedResult<EscalationRuleListItem>>({
      url: ESCALATION_RULES_URL,
      params: {
        pageNumber: params.pageNumber ?? 1,
        pageSize: params.pageSize ?? 20,
        priority: params.priority,
        isActive: params.isActive,
      },
      cache: "no-store",
    }),
};
