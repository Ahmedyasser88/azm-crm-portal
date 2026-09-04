"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { getSuggestedTicketReplyAction } from "@/app/(pages)/tickets/actions";

const textareaClassName =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20";

export type TicketSuggestedReplyPanelProps = {
  ticketId: string;
};

export function TicketSuggestedReplyPanel({ ticketId }: TicketSuggestedReplyPanelProps) {
  const [reply, setReply] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleSuggest() {
    setError(null);
    setIsLoading(true);

    const result = await getSuggestedTicketReplyAction(ticketId);
    setIsLoading(false);

    if (!result.success) {
      setReply(null);
      setError(result.error);
      return;
    }

    setReply(result.reply);
  }

  async function handleCopy() {
    if (!reply) return;

    try {
      await navigator.clipboard.writeText(reply);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      textareaRef.current?.select();
    }
  }

  return (
    <div className="card space-y-4">
      <h2 className="text-lg font-semibold text-text-default">الرد المقترح</h2>

      <Button onClick={handleSuggest} disabled={isLoading} variant="outline">
        {isLoading ? "جارٍ الاقتراح..." : reply ? "إعادة الاقتراح" : "اقتراح رد"}
      </Button>

      {reply && (
        <div className="space-y-2">
          <textarea ref={textareaRef} readOnly rows={5} value={reply} className={textareaClassName} />
          <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
            {copied ? "تم النسخ" : "نسخ"}
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
