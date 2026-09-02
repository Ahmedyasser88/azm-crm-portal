import Link from "next/link";
import { notFound } from "next/navigation";
import { knowledgeArticleEndpoints } from "@/lib/api/knowledgeArticle.api";
import { KNOWLEDGE_ARTICLE_TYPE_LABELS } from "@/lib/constants/knowledgeArticle";
import { formatDateTime } from "@/lib/utils/date";

type PublicKnowledgeArticlePageProps = {
  params: Promise<{ id: string }>;
};

export default async function PublicKnowledgeArticlePage({ params }: PublicKnowledgeArticlePageProps) {
  const { id } = await params;

  const result = await knowledgeArticleEndpoints.getPublishedById(id);

  if (!result.success) {
    if (result.status === 404) notFound();
    throw new Error(result.error);
  }

  const article = result.data;

  return (
    <div className="min-h-screen bg-surface p-4">
      <div className="card space-y-4 max-w-2xl mx-auto">
        <Link href="/widget/knowledge-base" className="text-sm text-primary hover:underline">
          العودة إلى قاعدة المعرفة
        </Link>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-text-default">{article.title}</h1>
          <div className="flex flex-wrap gap-1.5">
            <span className="inline-block rounded-full bg-primary-100 text-primary text-xs font-medium px-2 py-0.5">
              {KNOWLEDGE_ARTICLE_TYPE_LABELS[article.type]}
            </span>
            {article.category && (
              <span className="inline-block rounded-full bg-gray-200 text-text-secondary text-xs font-medium px-2 py-0.5">
                {article.category}
              </span>
            )}
          </div>
        </div>

        <p className="text-sm text-text-default whitespace-pre-wrap">{article.content}</p>

        {article.tags && (
          <div className="space-y-1">
            <p className="text-xs text-text-secondary">الوسوم</p>
            <p className="text-sm text-text-default">{article.tags}</p>
          </div>
        )}

        {article.steps.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-text-default">الخطوات</h2>
            <ol className="space-y-3 list-decimal list-inside">
              {article.steps.map((step) => (
                <li key={step.id} className="border-b border-gray-300 last:border-0 pb-3">
                  <p className="text-sm font-medium text-text-default">
                    <span className="text-text-secondary">#{step.stepNumber}</span> {step.title}
                  </p>
                  <p className="text-sm text-text-default whitespace-pre-wrap">{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        )}

        {article.publishedOn && (
          <p className="text-xs text-text-secondary">نُشر في {formatDateTime(article.publishedOn)}</p>
        )}
      </div>
    </div>
  );
}
