"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { uploadAttachmentAction } from "@/app/(pages)/customers/actions";

export type UploadAttachmentFormProps = {
  customerId: string;
  onUploaded: () => void;
};

export function UploadAttachmentForm({ customerId, onUploaded }: UploadAttachmentFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const result = await uploadAttachmentAction(customerId, formData);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    form.reset();
    onUploaded();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="attachment-file" className="text-sm font-medium text-text-default">
          الملف
        </label>
        <input
          id="attachment-file"
          name="file"
          type="file"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
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
          {isSubmitting ? "جارٍ الرفع..." : "رفع"}
        </Button>
      </div>
    </form>
  );
}
