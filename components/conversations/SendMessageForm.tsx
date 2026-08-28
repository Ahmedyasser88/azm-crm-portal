"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ConversationActionResult } from "@/app/(pages)/conversations/actions";

export type SendMessageFormProps = {
  onSubmit: (body: string) => Promise<ConversationActionResult>;
};

export function SendMessageForm({ onSubmit }: SendMessageFormProps) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!body.trim()) {
      setError("يرجى كتابة رسالة");
      return;
    }

    setIsSubmitting(true);
    const result = await onSubmit(body);
    setIsSubmitting(false);

    if (result.success) {
      setBody("");
    } else {
      setError(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-3">
      <label htmlFor="message-body" className="text-sm font-medium text-text-default">
        رد جديد
      </label>
      <textarea
        id="message-body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
      />

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "جارٍ الإرسال..." : "إرسال"}
        </Button>
      </div>
    </form>
  );
}
