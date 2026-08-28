"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { INTERACTION_TYPE_LABELS, INTERACTION_TYPES } from "@/lib/constants/customerInteraction";
import { logInteractionAction } from "@/app/(pages)/customers/actions";
import type { LogInteractionFormValues } from "@/lib/types/customerInteraction";

const inputClassName =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20";

function nowForDatetimeLocal() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16);
}

function emptyValues(): LogInteractionFormValues {
  return {
    type: "Call",
    subject: "",
    description: "",
    occurredOn: nowForDatetimeLocal(),
  };
}

export type LogInteractionFormProps = {
  customerId: string;
  onLogged: () => void;
};

export function LogInteractionForm({ customerId, onLogged }: LogInteractionFormProps) {
  const [values, setValues] = useState<LogInteractionFormValues>(emptyValues);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange<K extends keyof LogInteractionFormValues>(
    name: K,
    value: LogInteractionFormValues[K]
  ) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await logInteractionAction(customerId, values);
    setIsSubmitting(false);

    if (result && !result.success) {
      setError(result.error);
      return;
    }

    setValues(emptyValues());
    onLogged();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="interaction-type" className="text-sm font-medium text-text-default">
          النوع
        </label>
        <select
          id="interaction-type"
          value={values.type}
          onChange={(e) => handleChange("type", e.target.value as LogInteractionFormValues["type"])}
          className={inputClassName}
        >
          {INTERACTION_TYPES.map((type) => (
            <option key={type} value={type}>
              {INTERACTION_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="interaction-subject" className="text-sm font-medium text-text-default">
          الموضوع
        </label>
        <input
          id="interaction-subject"
          value={values.subject}
          onChange={(e) => handleChange("subject", e.target.value)}
          className={inputClassName}
          required
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="interaction-description" className="text-sm font-medium text-text-default">
          الوصف
        </label>
        <textarea
          id="interaction-description"
          value={values.description}
          onChange={(e) => handleChange("description", e.target.value)}
          className={inputClassName}
          rows={3}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="interaction-occurred-on" className="text-sm font-medium text-text-default">
          تاريخ ووقت التفاعل
        </label>
        <input
          id="interaction-occurred-on"
          type="datetime-local"
          value={values.occurredOn}
          onChange={(e) => handleChange("occurredOn", e.target.value)}
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
          {isSubmitting ? "جارٍ الحفظ..." : "إضافة"}
        </Button>
      </div>
    </form>
  );
}
