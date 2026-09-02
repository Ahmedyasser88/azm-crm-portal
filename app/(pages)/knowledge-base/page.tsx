import { knowledgeArticleEndpoints } from "@/lib/api/knowledgeArticle.api";
import { KnowledgeArticlesPanel } from "@/components/knowledge-base/KnowledgeArticlesPanel";
import type { KnowledgeArticleType, KnowledgeArticleStatus } from "@/lib/types/knowledgeArticle";

type KnowledgeBasePageProps = {
  searchParams: Promise<{
    kbPage?: string;
    kbType?: string;
    kbStatus?: string;
    kbCategory?: string;
  }>;
};

export default async function KnowledgeBasePage({ searchParams }: KnowledgeBasePageProps) {
  const { kbPage, kbType, kbStatus, kbCategory } = await searchParams;

  const pageNumber = Number(kbPage) || 1;

  const result = await knowledgeArticleEndpoints.list({
    pageNumber,
    type: kbType ? (kbType as KnowledgeArticleType) : undefined,
    status: kbStatus ? (kbStatus as KnowledgeArticleStatus) : undefined,
    category: kbCategory || undefined,
  });

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-2xl font-bold text-text-default">قاعدة المعرفة</h1>
        <p className="mt-1 text-sm text-text-secondary">
          إدارة الأسئلة الشائعة والمقالات والأدلة الإرشادية
        </p>
      </div>

      <KnowledgeArticlesPanel
        articles={result.success ? result.data.items : []}
        hasNextPage={result.success ? result.data.hasNextPage : false}
        hasPreviousPage={result.success ? result.data.hasPreviousPage : false}
        page={pageNumber}
        typeFilter={kbType ?? ""}
        statusFilter={kbStatus ?? ""}
        categoryFilter={kbCategory ?? ""}
      />
    </div>
  );
}
