export type KnowledgeArticleType = "Faq" | "Article" | "Guide";
export type KnowledgeArticleStatus = "Draft" | "Published";

export type KnowledgeArticleStep = {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
};

export type KnowledgeArticle = {
  id: string;
  title: string;
  content: string;
  type: KnowledgeArticleType;
  status: KnowledgeArticleStatus;
  category: string | null;
  tags: string | null;
  publishedOn: string | null;
  publishedBy: string | null;
  createdOn: string;
  updatedOn: string | null;
  steps: KnowledgeArticleStep[];
};

export type KnowledgeArticleListItem = Pick<
  KnowledgeArticle,
  "id" | "title" | "type" | "status" | "category" | "createdOn"
>;

export type KnowledgeArticleFormValues = {
  title: string;
  content: string;
  type: KnowledgeArticleType;
  category: string;
  tags: string;
};

export type KnowledgeArticleStepFormValues = {
  stepNumber: number;
  title: string;
  description: string;
};

export type KnowledgeArticlePublicListItem = Pick<
  KnowledgeArticle,
  "id" | "title" | "type" | "category" | "publishedOn"
>;

export type KnowledgeArticlePublic = Pick<
  KnowledgeArticle,
  "id" | "title" | "content" | "type" | "category" | "tags" | "publishedOn" | "steps"
>;
