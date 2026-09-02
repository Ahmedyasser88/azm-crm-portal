"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/customers/ConfirmDialog";
import { KnowledgeArticleForm } from "@/components/knowledge-base/KnowledgeArticleForm";
import {
  createKnowledgeArticleAction,
  updateKnowledgeArticleAction,
  deleteKnowledgeArticleAction,
  publishKnowledgeArticleAction,
  unpublishKnowledgeArticleAction,
  getKnowledgeArticleAction,
  type KnowledgeBaseActionResult,
} from "@/app/(pages)/knowledge-base/actions";
import {
  KNOWLEDGE_ARTICLE_TYPES,
  KNOWLEDGE_ARTICLE_TYPE_LABELS,
  KNOWLEDGE_ARTICLE_STATUSES,
  KNOWLEDGE_ARTICLE_STATUS_LABELS,
} from "@/lib/constants/knowledgeArticle";
import type { KnowledgeArticleListItem, KnowledgeArticleFormValues } from "@/lib/types/knowledgeArticle";

const selectClassName =
  "rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20";

export type KnowledgeArticlesPanelProps = {
  articles: KnowledgeArticleListItem[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  page: number;
  typeFilter: string;
  statusFilter: string;
  categoryFilter: string;
};

export function KnowledgeArticlesPanel({
  articles,
  hasNextPage,
  hasPreviousPage,
  page,
  typeFilter,
  statusFilter,
  categoryFilter,
}: KnowledgeArticlesPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [addOpen, setAddOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticleListItem | null>(null);
  const [deletingArticle, setDeletingArticle] = useState<KnowledgeArticleListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [categoryInput, setCategoryInput] = useState(categoryFilter);

  function updateParam(name: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }
    params.delete("kbPage");

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  function buildHref(targetPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("kbPage", String(targetPage));
    return `${pathname}?${params.toString()}`;
  }

  async function handleDeleteConfirm() {
    if (!deletingArticle) return;
    setIsDeleting(true);
    const result = await deleteKnowledgeArticleAction(deletingArticle.id);
    setIsDeleting(false);
    setDeletingArticle(null);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  async function handleToggleStatus(article: KnowledgeArticleListItem) {
    setTogglingId(article.id);
    const result =
      article.status === "Draft"
        ? await publishKnowledgeArticleAction(article.id)
        : await unpublishKnowledgeArticleAction(article.id);
    setTogglingId(null);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-default">قاعدة المعرفة</h2>
        <Button onClick={() => setAddOpen(true)}>+ إضافة محتوى</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={typeFilter}
          onChange={(e) => updateParam("kbType", e.target.value)}
          className={selectClassName}
        >
          <option value="">كل الأنواع</option>
          {KNOWLEDGE_ARTICLE_TYPES.map((type) => (
            <option key={type} value={type}>
              {KNOWLEDGE_ARTICLE_TYPE_LABELS[type]}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => updateParam("kbStatus", e.target.value)}
          className={selectClassName}
        >
          <option value="">كل الحالات</option>
          {KNOWLEDGE_ARTICLE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {KNOWLEDGE_ARTICLE_STATUS_LABELS[status]}
            </option>
          ))}
        </select>

        <input
          value={categoryInput}
          onChange={(e) => setCategoryInput(e.target.value)}
          onBlur={() => updateParam("kbCategory", categoryInput)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              updateParam("kbCategory", categoryInput);
            }
          }}
          placeholder="التصنيف"
          className={selectClassName}
        />
      </div>

      {articles.length === 0 ? (
        <p className="text-sm text-text-secondary text-center py-6">لا يوجد محتوى بعد</p>
      ) : (
        <ul className="space-y-3">
          {articles.map((article) => (
            <li key={article.id} className="border-b border-gray-300 last:border-0 pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <Link
                    href={`/knowledge-base/${article.id}`}
                    className="text-sm font-medium text-text-default hover:underline"
                  >
                    {article.title}
                  </Link>
                  <div className="flex flex-wrap gap-1.5">
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
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={togglingId === article.id}
                    onClick={() => handleToggleStatus(article)}
                  >
                    {togglingId === article.id
                      ? "جارٍ..."
                      : article.status === "Draft"
                        ? "نشر"
                        : "إلغاء النشر"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setEditingArticle(article)}>
                    تعديل
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDeletingArticle(article)}>
                    حذف
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {(hasPreviousPage || hasNextPage) && (
        <div className="flex justify-end gap-2">
          {hasPreviousPage ? (
            <Link href={buildHref(page - 1)}>
              <Button variant="outline">السابق</Button>
            </Link>
          ) : (
            <Button variant="outline" disabled>
              السابق
            </Button>
          )}
          {hasNextPage ? (
            <Link href={buildHref(page + 1)}>
              <Button variant="outline">التالي</Button>
            </Link>
          ) : (
            <Button variant="outline" disabled>
              التالي
            </Button>
          )}
        </div>
      )}

      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-black opacity-30 fixed inset-0" onClick={() => setAddOpen(false)} />
          <div className="card relative w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-text-default">إضافة محتوى</h2>
            <KnowledgeArticleForm
              mode="create"
              initialValues={{ title: "", content: "", type: "Faq", category: "", tags: "" }}
              onSubmit={createKnowledgeArticleAction}
              onDone={() => {
                setAddOpen(false);
                router.refresh();
              }}
            />
          </div>
        </div>
      )}

      {editingArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-black opacity-30 fixed inset-0" onClick={() => setEditingArticle(null)} />
          <div className="card relative w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-text-default">تعديل المحتوى</h2>
            <KnowledgeArticleFormLoader
              articleId={editingArticle.id}
              onSubmit={(values) => updateKnowledgeArticleAction(editingArticle.id, values)}
              onDone={() => {
                setEditingArticle(null);
                router.refresh();
              }}
            />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deletingArticle !== null}
        title="حذف المحتوى"
        description={`هل أنت متأكد من حذف "${deletingArticle?.title}"؟`}
        confirmLabel="حذف"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingArticle(null)}
        isConfirming={isDeleting}
      />
    </div>
  );
}

// The list row only carries KnowledgeArticleListItem (no content/tags), so editing needs the
// full article first. Loads it via getKnowledgeArticleAction (a server action, called directly
// as an async function — no dedicated API route needed) rather than passing the full article
// down from the page, which would require the list endpoint itself to over-fetch every row.
function KnowledgeArticleFormLoader({
  articleId,
  onSubmit,
  onDone,
}: {
  articleId: string;
  onSubmit: (values: KnowledgeArticleFormValues) => Promise<KnowledgeBaseActionResult>;
  onDone: () => void;
}) {
  const [initialValues, setInitialValues] = useState<KnowledgeArticleFormValues | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getKnowledgeArticleAction(articleId).then((article) => {
      if (cancelled) return;
      if (!article) {
        setLoadError(true);
        return;
      }
      setInitialValues({
        title: article.title,
        content: article.content,
        type: article.type,
        category: article.category ?? "",
        tags: article.tags ?? "",
      });
    });
    return () => {
      cancelled = true;
    };
  }, [articleId]);

  if (loadError) {
    return <p className="text-sm text-red-600">تعذّر تحميل المحتوى</p>;
  }

  if (!initialValues) {
    return <p className="text-sm text-text-secondary">جارٍ التحميل...</p>;
  }

  return (
    <KnowledgeArticleForm mode="edit" initialValues={initialValues} onSubmit={onSubmit} onDone={onDone} />
  );
}
