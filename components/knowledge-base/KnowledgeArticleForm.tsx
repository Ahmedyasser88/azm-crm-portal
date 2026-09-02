"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { KNOWLEDGE_ARTICLE_TYPES, KNOWLEDGE_ARTICLE_TYPE_LABELS } from "@/lib/constants/knowledgeArticle";
import type { KnowledgeArticleFormValues } from "@/lib/types/knowledgeArticle";
import type { KnowledgeBaseActionResult } from "@/app/(pages)/knowledge-base/actions";

const inputClassName =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20";

export type KnowledgeArticleFormProps = {
  mode: "create" | "edit";
  initialValues: KnowledgeArticleFormValues;
  onSubmit: (values: KnowledgeArticleFormValues) => Promise<KnowledgeBaseActionResult>;
  onDone: () => void;
};

export function KnowledgeArticleForm({ mode, initialValues, onSubmit, onDone }: KnowledgeArticleFormProps) {
  const [values, setValues] = useState<KnowledgeArticleFormValues>(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange<K extends keyof KnowledgeArticleFormValues>(
    name: K,
    value: KnowledgeArticleFormValues[K]
  ) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await onSubmit(values);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="kb-article-title" className="text-sm font-medium text-text-default">
          العنوان
        </label>
        <input
          id="kb-article-title"
          value={values.title}
          onChange={(e) => handleChange("title", e.target.value)}
          className={inputClassName}
          required
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="kb-article-type" className="text-sm font-medium text-text-default">
          النوع
        </label>
        <select
          id="kb-article-type"
          value={values.type}
          onChange={(e) => handleChange("type", e.target.value as KnowledgeArticleFormValues["type"])}
          className={inputClassName}
        >
          {KNOWLEDGE_ARTICLE_TYPES.map((type) => (
            <option key={type} value={type}>
              {KNOWLEDGE_ARTICLE_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="kb-article-category" className="text-sm font-medium text-text-default">
            التصنيف
          </label>
          <input
            id="kb-article-category"
            value={values.category}
            onChange={(e) => handleChange("category", e.target.value)}
            className={inputClassName}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="kb-article-tags" className="text-sm font-medium text-text-default">
            الوسوم
          </label>
          <input
            id="kb-article-tags"
            value={values.tags}
            onChange={(e) => handleChange("tags", e.target.value)}
            placeholder="مفصولة بفواصل"
            className={inputClassName}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="kb-article-content" className="text-sm font-medium text-text-default">
          المحتوى
        </label>
        <textarea
          id="kb-article-content"
          rows={6}
          value={values.content}
          onChange={(e) => handleChange("content", e.target.value)}
          className={inputClassName}
          required
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "جارٍ الحفظ..." : mode === "create" ? "إضافة" : "حفظ"}
        </Button>
      </div>
    </form>
  );
}
