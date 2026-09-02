import { apiServerFetch } from "./fetch";
import type { DashboardTicket, DashboardSummary } from "../types/dashboard";
import type { TicketStatus } from "../types/ticket";
import type { PaginatedResult } from "../types/pagination";

const DASHBOARD_URL = "/api/dashboard";

export const dashboardEndpoints = {
  myTickets: (params: { pageNumber?: number; pageSize?: number; status?: TicketStatus }) =>
    apiServerFetch<PaginatedResult<DashboardTicket>>({
      url: `${DASHBOARD_URL}/tickets`,
      params: {
        pageNumber: params.pageNumber ?? 1,
        pageSize: params.pageSize ?? 20,
        status: params.status,
      },
      cache: "no-store",
    }),
  summary: () =>
    apiServerFetch<DashboardSummary>({ url: `${DASHBOARD_URL}/summary`, cache: "no-store" }),
};
