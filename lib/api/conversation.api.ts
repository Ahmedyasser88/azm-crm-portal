import { apiServerFetch } from "./fetch";
import type { Conversation, ConversationListItem, CommunicationChannel, ConversationStatus } from "../types/conversation";
import type { Message } from "../types/message";
import type { PaginatedResult } from "../types/pagination";

const CONVERSATIONS_URL = "/api/conversations";

export const conversationEndpoints = {
  list: (params: {
    pageNumber?: number;
    pageSize?: number;
    customerId?: string;
    channel?: CommunicationChannel;
    status?: ConversationStatus;
  }) =>
    apiServerFetch<PaginatedResult<ConversationListItem>>({
      url: CONVERSATIONS_URL,
      params: {
        pageNumber: params.pageNumber ?? 1,
        pageSize: params.pageSize ?? 20,
        customerId: params.customerId,
        channel: params.channel,
        status: params.status,
      },
      cache: "no-store",
    }),
  getById: (id: string) =>
    apiServerFetch<Conversation>({ url: `${CONVERSATIONS_URL}/${id}`, cache: "no-store" }),
  messages: {
    // pageSize defaults to 100 (the backend's validated maximum) so a typical conversation's
    // entire thread loads on one page, in the correct oldest-first order, without landing on
    // the oldest page of a long thread by default.
    list: (conversationId: string, params: { pageNumber?: number; pageSize?: number } = {}) =>
      apiServerFetch<PaginatedResult<Message>>({
        url: `${CONVERSATIONS_URL}/${conversationId}/messages`,
        params: { pageNumber: params.pageNumber ?? 1, pageSize: params.pageSize ?? 100 },
        cache: "no-store",
      }),
  },
};
