"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CustomerPicker } from "@/components/tickets/CustomerPicker";
import { CHANNELS, CHANNEL_LABELS } from "@/lib/constants/conversation";
import type { ConversationFormValues } from "@/lib/types/conversation";
import type { ConversationActionResult } from "@/app/(pages)/conversations/actions";

const inputClassName =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20";

export type ConversationFormProps = {
  initialValues: ConversationFormValues;
  initialCustomerLabel?: string;
  onSubmit: (values: ConversationFormValues) => Promise<ConversationActionResult | undefined>;
};

export function ConversationForm({ initialValues, initialCustomerLabel, onSubmit }: ConversationFormProps) {
  const [values, setValues] = useState<ConversationFormValues>(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange<K extends keyof ConversationFormValues>(name: K, value: ConversationFormValues[K]) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!values.customerId) {
      setError("يرجى اختيار عميل");
      return;
    }

    setIsSubmitting(true);
    const result = await onSubmit(values);
    setIsSubmitting(false);

    if (result && !result.success) {
      setError(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-text-default">العميل</label>
        <CustomerPicker
          value={values.customerId}
          onSelect={(customerId) => handleChange("customerId", customerId)}
          initialLabel={initialCustomerLabel}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="conversation-channel" className="text-sm font-medium text-text-default">
          القناة
        </label>
        <select
          id="conversation-channel"
          value={values.channel}
          onChange={(e) => handleChange("channel", e.target.value as ConversationFormValues["channel"])}
          className={inputClassName}
        >
          {CHANNELS.map((channel) => (
            <option key={channel} value={channel}>
              {CHANNEL_LABELS[channel]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="conversation-subject" className="text-sm font-medium text-text-default">
          الموضوع
        </label>
        <input
          id="conversation-subject"
          value={values.subject}
          onChange={(e) => handleChange("subject", e.target.value)}
          className={inputClassName}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "جارٍ الحفظ..." : "بدء المحادثة"}
        </Button>
      </div>
    </form>
  );
}
