"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { addTicketCommentAction } from "@/app/(pages)/tickets/actions";
import type { AddCommentFormValues } from "@/lib/types/ticketComment";

const textareaClassName =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20";

export type AddCommentFormProps = {
  ticketId: string;
  onAdded: () => void;
};

export function AddCommentForm({ ticketId, onAdded }: AddCommentFormProps) {
  const [values, setValues] = useState<AddCommentFormValues>({ content: "" });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await addTicketCommentAction(ticketId, values);
    setIsSubmitting(false);

    if (result && !result.success) {
      setError(result.error);
      return;
    }

    setValues({ content: "" });
    onAdded();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="comment-content" className="text-sm font-medium text-text-default">
          تعليق
        </label>
        <textarea
          id="comment-content"
          value={values.content}
          onChange={(e) => setValues({ content: e.target.value })}
          className={textareaClassName}
          rows={3}
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
          {isSubmitting ? "جارٍ الحفظ..." : "إضافة"}
        </Button>
      </div>
    </form>
  );
}
