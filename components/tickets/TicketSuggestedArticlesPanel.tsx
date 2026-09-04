import Link from "next/link";
import { KNOWLEDGE_ARTICLE_TYPE_LABELS } from "@/lib/constants/knowledgeArticle";
import type { KnowledgeArticlePublicListItem } from "@/lib/types/knowledgeArticle";

export type TicketSuggestedArticlesPanelProps = {
  articles: KnowledgeArticlePublicListItem[];
};

export function TicketSuggestedArticlesPanel({ articles }: TicketSuggestedArticlesPanelProps) {
  return (
    <div className="card space-y-4">
      <h2 className="text-lg font-semibold text-text-default">حلول مقترحة من قاعدة المعرفة</h2>

      {articles.length === 0 ? (
        <p className="text-sm text-text-secondary">لا توجد حلول مقترحة لهذه التذكرة.</p>
      ) : (
        <ul className="space-y-3">
          {articles.map((article) => (
            <li key={article.id}>
              <Link href={`/knowledge-base/${article.id}`} className="text-sm text-primary hover:underline">
                {article.title}
              </Link>
              <div className="flex gap-2 mt-1">
                <span className="inline-block rounded-full bg-primary-100 text-primary text-xs font-medium px-2 py-0.5">
                  {KNOWLEDGE_ARTICLE_TYPE_LABELS[article.type]}
                </span>
                {article.category && (
                  <span className="inline-block rounded-full bg-primary-100 text-primary text-xs font-medium px-2 py-0.5">
                    {article.category}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
