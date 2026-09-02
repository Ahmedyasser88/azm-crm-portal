import { apiServerFetch } from "./fetch";
import type {
  KnowledgeArticle,
  KnowledgeArticleListItem,
  KnowledgeArticleType,
  KnowledgeArticleStatus,
  KnowledgeArticleStepFormValues,
  KnowledgeArticlePublicListItem,
  KnowledgeArticlePublic,
} from "../types/knowledgeArticle";
import type { PaginatedResult } from "../types/pagination";

const KNOWLEDGE_ARTICLES_URL = "/api/knowledge-articles";

export const knowledgeArticleEndpoints = {
  list: (params: {
    pageNumber?: number;
    pageSize?: number;
    type?: KnowledgeArticleType;
    status?: KnowledgeArticleStatus;
    category?: string;
  }) =>
    apiServerFetch<PaginatedResult<KnowledgeArticleListItem>>({
      url: KNOWLEDGE_ARTICLES_URL,
      params: {
        pageNumber: params.pageNumber ?? 1,
        pageSize: params.pageSize ?? 20,
        type: params.type,
        status: params.status,
        category: params.category,
      },
      cache: "no-store",
    }),

  getById: (id: string) =>
    apiServerFetch<KnowledgeArticle>({ url: `${KNOWLEDGE_ARTICLES_URL}/${id}`, cache: "no-store" }),

  publish: (id: string) =>
    apiServerFetch<void>({ url: `${KNOWLEDGE_ARTICLES_URL}/${id}/publish`, method: "POST" }),

  unpublish: (id: string) =>
    apiServerFetch<void>({ url: `${KNOWLEDGE_ARTICLES_URL}/${id}/unpublish`, method: "POST" }),

  listPublished: (params: {
    pageNumber?: number;
    pageSize?: number;
    type?: KnowledgeArticleType;
    category?: string;
  }) =>
    apiServerFetch<PaginatedResult<KnowledgeArticlePublicListItem>>({
      url: `${KNOWLEDGE_ARTICLES_URL}/published`,
      params: {
        pageNumber: params.pageNumber ?? 1,
        pageSize: params.pageSize ?? 20,
        type: params.type,
        category: params.category,
      },
      cache: "no-store",
    }),

  getPublishedById: (id: string) =>
    apiServerFetch<KnowledgeArticlePublic>({
      url: `${KNOWLEDGE_ARTICLES_URL}/published/${id}`,
      cache: "no-store",
    }),

  search: (params: { query: string; pageNumber?: number; pageSize?: number }) =>
    apiServerFetch<PaginatedResult<KnowledgeArticlePublicListItem>>({
      url: `${KNOWLEDGE_ARTICLES_URL}/search`,
      params: {
        query: params.query,
        pageNumber: params.pageNumber ?? 1,
        pageSize: params.pageSize ?? 20,
      },
      cache: "no-store",
    }),

  addStep: (articleId: string, values: KnowledgeArticleStepFormValues) =>
    apiServerFetch<string>({
      url: `${KNOWLEDGE_ARTICLES_URL}/${articleId}/steps`,
      method: "POST",
      body: values,
    }),

  updateStep: (articleId: string, stepId: string, values: KnowledgeArticleStepFormValues) =>
    apiServerFetch<void>({
      url: `${KNOWLEDGE_ARTICLES_URL}/${articleId}/steps/${stepId}`,
      method: "PUT",
      body: values,
    }),

  deleteStep: (articleId: string, stepId: string) =>
    apiServerFetch<void>({
      url: `${KNOWLEDGE_ARTICLES_URL}/${articleId}/steps/${stepId}`,
      method: "DELETE",
    }),
};
