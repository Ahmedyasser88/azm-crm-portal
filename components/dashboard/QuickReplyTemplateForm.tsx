"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { QuickReplyTemplateFormValues } from "@/lib/types/quickReplyTemplate";
import type { DashboardActionResult } from "@/app/(pages)/dashboard/quickReplyActions";

const inputClassName =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20";

export type QuickReplyTemplateFormProps = {
  mode: "create" | "edit";
  initialValues: QuickReplyTemplateFormValues;
  onSubmit: (values: QuickReplyTemplateFormValues) => Promise<DashboardActionResult>;
  onDone: () => void;
};

export function QuickReplyTemplateForm({
  mode,
  initialValues,
  onSubmit,
  onDone,
}: QuickReplyTemplateFormProps) {
  const [values, setValues] = useState<QuickReplyTemplateFormValues>(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange<K extends keyof QuickReplyTemplateFormValues>(
    name: K,
    value: QuickReplyTemplateFormValues[K]
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
        <label htmlFor="template-title" className="text-sm font-medium text-text-default">
          العنوان
        </label>
        <input
          id="template-title"
          value={values.title}
          onChange={(e) => handleChange("title", e.target.value)}
          className={inputClassName}
          required
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="template-body" className="text-sm font-medium text-text-default">
          النص
        </label>
        <textarea
          id="template-body"
          value={values.body}
          onChange={(e) => handleChange("body", e.target.value)}
          className={inputClassName}
          rows={4}
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
