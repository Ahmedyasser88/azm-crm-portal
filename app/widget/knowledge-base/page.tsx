import Link from "next/link";
import { Button } from "@/components/ui/button";
import { knowledgeArticleEndpoints } from "@/lib/api/knowledgeArticle.api";
import {
  KNOWLEDGE_ARTICLE_TYPES,
  KNOWLEDGE_ARTICLE_TYPE_LABELS,
} from "@/lib/constants/knowledgeArticle";
import type { KnowledgeArticleType } from "@/lib/types/knowledgeArticle";

type PublicKnowledgeBasePageProps = {
  searchParams: Promise<{ type?: string; category?: string; query?: string }>;
};

export default async function PublicKnowledgeBasePage({ searchParams }: PublicKnowledgeBasePageProps) {
  const { type, category, query } = await searchParams;
  const trimmedQuery = query?.trim();
  const isSearching = Boolean(trimmedQuery);

  const result = isSearching
    ? await knowledgeArticleEndpoints.search({ query: trimmedQuery! })
    : await knowledgeArticleEndpoints.listPublished({
        type: type ? (type as KnowledgeArticleType) : undefined,
        category: category || undefined,
      });

  const items = result.success ? result.data.items : [];

  return (
    <div className="min-h-screen bg-surface p-4">
      <div className="card space-y-4 max-w-2xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-text-default">قاعدة المعرفة</h1>
          <p className="mt-1 text-sm text-text-secondary">
            تصفح الأسئلة الشائعة والمقالات والأدلة الإرشادية لحل المشكلات دون الحاجة لفتح تذكرة
          </p>
        </div>

        <form className="flex gap-2">
          <input
            type="search"
            name="query"
            defaultValue={query ?? ""}
            placeholder="ابحث في قاعدة المعرفة..."
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
          <Button type="submit">بحث</Button>
        </form>

        {isSearching ? (
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-secondary">نتائج البحث عن &quot;{trimmedQuery}&quot;</p>
            <Link href="/widget/knowledge-base" className="text-sm text-primary hover:underline">
              مسح البحث
            </Link>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {KNOWLEDGE_ARTICLE_TYPES.map((t) => (
              <Link
                key={t}
                href={`/widget/knowledge-base?type=${t}`}
                className={
                  type === t
                    ? "inline-block rounded-full bg-primary text-primary-foreground text-xs font-medium px-3 py-1"
                    : "inline-block rounded-full bg-gray-200 text-text-secondary text-xs font-medium px-3 py-1"
                }
              >
                {KNOWLEDGE_ARTICLE_TYPE_LABELS[t]}
              </Link>
            ))}
            {type && (
              <Link href="/widget/knowledge-base" className="text-xs text-primary hover:underline self-center">
                إزالة الفلتر
              </Link>
            )}
          </div>
        )}

        {items.length === 0 ? (
          <p className="text-sm text-text-secondary text-center py-6">
            {isSearching ? "لا توجد نتائج مطابقة" : "لا يوجد محتوى منشور بعد"}
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id} className="border-b border-gray-300 last:border-0 pb-3">
                <Link
                  href={`/widget/knowledge-base/${item.id}`}
                  className="block space-y-1 hover:opacity-80"
                >
                  <p className="text-sm font-medium text-text-default">{item.title}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-block rounded-full bg-primary-100 text-primary text-xs font-medium px-2 py-0.5">
                      {KNOWLEDGE_ARTICLE_TYPE_LABELS[item.type]}
                    </span>
                    {item.category && (
                      <span className="inline-block rounded-full bg-gray-200 text-text-secondary text-xs font-medium px-2 py-0.5">
                        {item.category}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
