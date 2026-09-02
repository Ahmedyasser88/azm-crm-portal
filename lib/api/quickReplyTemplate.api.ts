import { apiServerFetch } from "./fetch";
import type { QuickReplyTemplateListItem } from "../types/quickReplyTemplate";
import type { PaginatedResult } from "../types/pagination";

const QUICK_REPLY_TEMPLATES_URL = "/api/quick-reply-templates";

export const quickReplyTemplateEndpoints = {
  list: (params: { pageNumber?: number; pageSize?: number; search?: string }) =>
    apiServerFetch<PaginatedResult<QuickReplyTemplateListItem>>({
      url: QUICK_REPLY_TEMPLATES_URL,
      params: {
        pageNumber: params.pageNumber ?? 1,
        pageSize: params.pageSize ?? 20,
        search: params.search,
      },
      cache: "no-store",
    }),
};
