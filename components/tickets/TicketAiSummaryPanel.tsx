"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { generateTicketAiSummaryAction } from "@/app/(pages)/tickets/actions";
import { formatDateTime } from "@/lib/utils/date";

export type TicketAiSummaryPanelProps = {
  ticketId: string;
  aiSummary: string | null;
  aiSummaryGeneratedOn: string | null;
};

export function TicketAiSummaryPanel({ ticketId, aiSummary, aiSummaryGeneratedOn }: TicketAiSummaryPanelProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleGenerate() {
    setError(null);
    setIsSubmitting(true);

    const result = await generateTicketAiSummaryAction(ticketId);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    router.refresh();
  }

  return (
    <div className="card space-y-4">
      <h2 className="text-lg font-semibold text-text-default">ملخص الذكاء الاصطناعي</h2>

      {aiSummary ? (
        <div className="space-y-1">
          <p className="text-sm text-text-default whitespace-pre-wrap">{aiSummary}</p>
          {aiSummaryGeneratedOn && (
            <p className="text-xs text-text-secondary">آخر تحديث: {formatDateTime(aiSummaryGeneratedOn)}</p>
          )}
        </div>
      ) : (
        <p className="text-sm text-text-secondary">لم يتم توليد ملخص بعد.</p>
      )}

      <Button onClick={handleGenerate} disabled={isSubmitting} variant="outline">
        {isSubmitting ? "جارٍ التوليد..." : aiSummary ? "إعادة توليد الملخص" : "توليد الملخص"}
      </Button>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
