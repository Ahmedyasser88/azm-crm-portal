import Link from "next/link";
import { notFound } from "next/navigation";
import { knowledgeArticleEndpoints } from "@/lib/api/knowledgeArticle.api";
import { KnowledgeArticleStepsSection } from "@/components/knowledge-base/KnowledgeArticleStepsSection";
import { SetBreadcrumbLabel } from "@/components/customers/SetBreadcrumbLabel";
import {
  KNOWLEDGE_ARTICLE_TYPE_LABELS,
  KNOWLEDGE_ARTICLE_STATUS_LABELS,
} from "@/lib/constants/knowledgeArticle";

type KnowledgeArticleDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function KnowledgeArticleDetailPage({ params }: KnowledgeArticleDetailPageProps) {
  const { id } = await params;

  const result = await knowledgeArticleEndpoints.getById(id);

  if (!result.success) {
    if (result.status === 404) notFound();
    throw new Error(result.error);
  }

  const article = result.data;

  return (
    <div className="space-y-6">
      <SetBreadcrumbLabel segment={id} label={article.title} />
      <div className="card space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-text-default">{article.title}</h1>
            <div className="flex gap-2">
              <span className="inline-block rounded-full bg-primary-100 text-primary text-xs font-medium px-2 py-0.5">
                {KNOWLEDGE_ARTICLE_TYPE_LABELS[article.type]}
              </span>
              <span
                className={
                  article.status === "Published"
                    ? "inline-block rounded-full bg-primary-100 text-primary text-xs font-medium px-2 py-0.5"
                    : "inline-block rounded-full bg-gray-200 text-text-secondary text-xs font-medium px-2 py-0.5"
                }
              >
                {KNOWLEDGE_ARTICLE_STATUS_LABELS[article.status]}
              </span>
              {article.category && (
                <span className="inline-block rounded-full bg-gray-200 text-text-secondary text-xs font-medium px-2 py-0.5">
                  {article.category}
                </span>
              )}
            </div>
          </div>
          <Link href="/knowledge-base" className="text-sm text-primary hover:underline">
            العودة إلى القائمة
          </Link>
        </div>

        <p className="text-sm text-text-default whitespace-pre-wrap">{article.content}</p>

        {article.tags && (
          <div className="space-y-1">
            <p className="text-xs text-text-secondary">الوسوم</p>
            <p className="text-sm text-text-default">{article.tags}</p>
          </div>
        )}
      </div>

      <KnowledgeArticleStepsSection articleId={id} steps={article.steps} />
    </div>
  );
}
