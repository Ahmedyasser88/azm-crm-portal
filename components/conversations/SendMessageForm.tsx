"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  listQuickReplyTemplatesAction,
  type ConversationActionResult,
  type QuickReplyOption,
} from "@/app/(pages)/conversations/actions";

export type SendMessageFormProps = {
  onSubmit: (body: string) => Promise<ConversationActionResult>;
};

export function SendMessageForm({ onSubmit }: SendMessageFormProps) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [templateQuery, setTemplateQuery] = useState("");
  const [templates, setTemplates] = useState<QuickReplyOption[]>([]);

  useEffect(() => {
    if (!templatesOpen) return;

    const timeout = setTimeout(async () => {
      const results = await listQuickReplyTemplatesAction(templateQuery);
      setTemplates(results);
    }, 300);

    return () => clearTimeout(timeout);
  }, [templatesOpen, templateQuery]);

  function handleSelectTemplate(template: QuickReplyOption) {
    setBody((current) => (current.trim() ? `${current}\n${template.body}` : template.body));
    setTemplatesOpen(false);
    setTemplateQuery("");
  }

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
      <div className="flex items-center justify-between">
        <label htmlFor="message-body" className="text-sm font-medium text-text-default">
          رد جديد
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setTemplatesOpen((open) => !open)}
            className="text-sm text-primary hover:underline"
          >
            استخدام قالب رد سريع
          </button>

          {templatesOpen && (
            <div className="absolute left-0 z-10 mt-2 w-72 rounded-lg border border-gray-300 bg-white shadow-md">
              <input
                type="text"
                value={templateQuery}
                onChange={(e) => setTemplateQuery(e.target.value)}
                placeholder="ابحث عن قالب..."
                className="w-full rounded-t-lg border-b border-gray-300 px-3 py-2 text-sm outline-none"
                autoFocus
              />
              <ul className="max-h-56 overflow-y-auto">
                {templates.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-text-secondary">لا توجد قوالب</li>
                ) : (
                  templates.map((template) => (
                    <li key={template.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectTemplate(template)}
                        className="w-full text-right px-3 py-2 text-sm hover:bg-muted"
                      >
                        {template.title}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
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
