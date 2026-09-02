import type { KnowledgeArticleType, KnowledgeArticleStatus } from "@/lib/types/knowledgeArticle";

export const KNOWLEDGE_ARTICLE_TYPE_LABELS: Record<KnowledgeArticleType, string> = {
  Faq: "سؤال شائع",
  Article: "مقال",
  Guide: "دليل إرشادي",
};
export const KNOWLEDGE_ARTICLE_TYPES = Object.keys(KNOWLEDGE_ARTICLE_TYPE_LABELS) as KnowledgeArticleType[];

export const KNOWLEDGE_ARTICLE_STATUS_LABELS: Record<KnowledgeArticleStatus, string> = {
  Draft: "مسودة",
  Published: "منشور",
};
export const KNOWLEDGE_ARTICLE_STATUSES = Object.keys(
  KNOWLEDGE_ARTICLE_STATUS_LABELS
) as KnowledgeArticleStatus[];
