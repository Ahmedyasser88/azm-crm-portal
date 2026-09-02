"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { KnowledgeArticleStepFormValues } from "@/lib/types/knowledgeArticle";
import type { KnowledgeBaseActionResult } from "@/app/(pages)/knowledge-base/actions";

const inputClassName =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20";

export type KnowledgeArticleStepFormProps = {
  mode: "create" | "edit";
  initialValues: KnowledgeArticleStepFormValues;
  onSubmit: (values: KnowledgeArticleStepFormValues) => Promise<KnowledgeBaseActionResult>;
  onDone: () => void;
};

export function KnowledgeArticleStepForm({
  mode,
  initialValues,
  onSubmit,
  onDone,
}: KnowledgeArticleStepFormProps) {
  const [values, setValues] = useState<KnowledgeArticleStepFormValues>(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange<K extends keyof KnowledgeArticleStepFormValues>(
    name: K,
    value: KnowledgeArticleStepFormValues[K]
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
        <label htmlFor="kb-step-number" className="text-sm font-medium text-text-default">
          رقم الخطوة
        </label>
        <input
          id="kb-step-number"
          type="number"
          min={1}
          value={values.stepNumber}
          onChange={(e) => handleChange("stepNumber", Number(e.target.value))}
          className={inputClassName}
          required
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="kb-step-title" className="text-sm font-medium text-text-default">
          العنوان
        </label>
        <input
          id="kb-step-title"
          value={values.title}
          onChange={(e) => handleChange("title", e.target.value)}
          className={inputClassName}
          required
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="kb-step-description" className="text-sm font-medium text-text-default">
          الوصف
        </label>
        <textarea
          id="kb-step-description"
          rows={4}
          value={values.description}
          onChange={(e) => handleChange("description", e.target.value)}
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
