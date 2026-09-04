import { apiServerFetch } from "./fetch";
import type { Ticket, TicketListItem, TicketCategory, TicketPriority, TicketStatus } from "../types/ticket";
import type { TicketHistoryEntry } from "../types/ticketHistory";
import type { TicketComment } from "../types/ticketComment";
import type { KnowledgeArticlePublicListItem } from "../types/knowledgeArticle";
import type { PaginatedResult } from "../types/pagination";

const TICKETS_URL = "/api/tickets";

export const ticketEndpoints = {
  list: (params: {
    pageNumber?: number;
    pageSize?: number;
    customerId?: string;
    status?: TicketStatus;
    category?: TicketCategory;
    priority?: TicketPriority;
    search?: string;
    assignedToUserId?: string;
    isEscalated?: boolean;
  }) =>
    apiServerFetch<PaginatedResult<TicketListItem>>({
      url: TICKETS_URL,
      params: {
        pageNumber: params.pageNumber ?? 1,
        pageSize: params.pageSize ?? 20,
        customerId: params.customerId,
        status: params.status,
        category: params.category,
        priority: params.priority,
        search: params.search,
        assignedToUserId: params.assignedToUserId,
        isEscalated: params.isEscalated,
      },
      cache: "no-store",
    }),
  getById: (id: string) =>
    apiServerFetch<Ticket>({ url: `${TICKETS_URL}/${id}`, cache: "no-store" }),
  history: {
    list: (ticketId: string, params: { pageNumber?: number; pageSize?: number } = {}) =>
      apiServerFetch<PaginatedResult<TicketHistoryEntry>>({
        url: `${TICKETS_URL}/${ticketId}/history`,
        params: { pageNumber: params.pageNumber ?? 1, pageSize: params.pageSize ?? 20 },
        cache: "no-store",
      }),
  },
  comments: {
    list: (ticketId: string, params: { pageNumber?: number; pageSize?: number } = {}) =>
      apiServerFetch<PaginatedResult<TicketComment>>({
        url: `${TICKETS_URL}/${ticketId}/comments`,
        params: { pageNumber: params.pageNumber ?? 1, pageSize: params.pageSize ?? 20 },
        cache: "no-store",
      }),
  },
  suggestedArticles: (ticketId: string, maxResults = 5) =>
    apiServerFetch<KnowledgeArticlePublicListItem[]>({
      url: `${TICKETS_URL}/${ticketId}/suggested-articles`,
      params: { maxResults },
      cache: "no-store",
    }),
};
