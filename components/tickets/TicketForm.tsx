"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CustomerPicker } from "@/components/tickets/CustomerPicker";
import { TICKET_CATEGORIES, TICKET_CATEGORY_LABELS, TICKET_PRIORITIES, TICKET_PRIORITY_LABELS } from "@/lib/constants/ticket";
import type { TicketFormValues } from "@/lib/types/ticket";
import type { TicketActionResult } from "@/app/(pages)/tickets/actions";

const inputClassName =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20";

export type TicketFormProps = {
  mode: "create" | "edit";
  initialValues: TicketFormValues;
  initialCustomerLabel?: string;
  onSubmit: (values: TicketFormValues) => Promise<TicketActionResult | undefined>;
};

export function TicketForm({ mode, initialValues, initialCustomerLabel, onSubmit }: TicketFormProps) {
  const [values, setValues] = useState<TicketFormValues>(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange<K extends keyof TicketFormValues>(name: K, value: TicketFormValues[K]) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "create" && !values.customerId) {
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
        {mode === "create" ? (
          <CustomerPicker
            value={values.customerId}
            onSelect={(customerId) => handleChange("customerId", customerId)}
            initialLabel={initialCustomerLabel}
          />
        ) : (
          <p className="text-sm text-text-default rounded-lg border border-gray-300 bg-surface px-3 py-2">
            {initialCustomerLabel ?? values.customerId}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="ticket-title" className="text-sm font-medium text-text-default">
          العنوان
        </label>
        <input
          id="ticket-title"
          value={values.title}
          onChange={(e) => handleChange("title", e.target.value)}
          className={inputClassName}
          required
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="ticket-description" className="text-sm font-medium text-text-default">
          الوصف
        </label>
        <textarea
          id="ticket-description"
          value={values.description}
          onChange={(e) => handleChange("description", e.target.value)}
          className={inputClassName}
          rows={4}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="ticket-category" className="text-sm font-medium text-text-default">
            الفئة
          </label>
          <select
            id="ticket-category"
            value={values.category}
            onChange={(e) => handleChange("category", e.target.value as TicketFormValues["category"])}
            className={inputClassName}
          >
            {mode === "create" && <option value="Auto">تصنيف تلقائي (الذكاء الاصطناعي)</option>}
            {TICKET_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {TICKET_CATEGORY_LABELS[category]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="ticket-priority" className="text-sm font-medium text-text-default">
            الأولوية
          </label>
          <select
            id="ticket-priority"
            value={values.priority}
            onChange={(e) => handleChange("priority", e.target.value as TicketFormValues["priority"])}
            className={inputClassName}
          >
            {TICKET_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {TICKET_PRIORITY_LABELS[priority]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "جارٍ الحفظ..." : mode === "create" ? "إنشاء التذكرة" : "حفظ"}
        </Button>
      </div>
    </form>
  );
}
