import { apiServerFetch } from "./fetch";
import type { SlaPolicyListItem } from "../types/slaPolicy";
import type { PaginatedResult } from "../types/pagination";
import type { TicketPriority } from "../types/ticket";

const SLA_POLICIES_URL = "/api/sla-policies";

export const slaPolicyEndpoints = {
  list: (params: { pageNumber?: number; pageSize?: number; priority?: TicketPriority; isActive?: boolean }) =>
    apiServerFetch<PaginatedResult<SlaPolicyListItem>>({
      url: SLA_POLICIES_URL,
      params: {
        pageNumber: params.pageNumber ?? 1,
        pageSize: params.pageSize ?? 20,
        priority: params.priority,
        isActive: params.isActive,
      },
      cache: "no-store",
    }),
};
