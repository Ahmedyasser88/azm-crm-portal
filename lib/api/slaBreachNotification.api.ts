import { apiServerFetch } from "./fetch";
import type { SlaBreachNotification, SlaBreachType } from "../types/slaBreachNotification";
import type { PaginatedResult } from "../types/pagination";

const SLA_BREACH_NOTIFICATIONS_URL = "/api/sla-breach-notifications";

export const slaBreachNotificationEndpoints = {
  list: (params: { pageNumber?: number; pageSize?: number; breachType?: SlaBreachType }) =>
    apiServerFetch<PaginatedResult<SlaBreachNotification>>({
      url: SLA_BREACH_NOTIFICATIONS_URL,
      params: {
        pageNumber: params.pageNumber ?? 1,
        pageSize: params.pageSize ?? 20,
        breachType: params.breachType,
      },
      cache: "no-store",
    }),
};
