"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TICKET_PRIORITIES, TICKET_PRIORITY_LABELS } from "@/lib/constants/ticket";
import type { SlaPolicyFormValues } from "@/lib/types/slaPolicy";
import type { AutomationActionResult } from "@/app/(pages)/automation/slaPolicyActions";

const inputClassName =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20";

export type SlaPolicyFormProps = {
  mode: "create" | "edit";
  initialValues: SlaPolicyFormValues;
  onSubmit: (values: SlaPolicyFormValues) => Promise<AutomationActionResult>;
  onDone: () => void;
};

export function SlaPolicyForm({ mode, initialValues, onSubmit, onDone }: SlaPolicyFormProps) {
  const [values, setValues] = useState<SlaPolicyFormValues>(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange<K extends keyof SlaPolicyFormValues>(name: K, value: SlaPolicyFormValues[K]) {
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
        <label htmlFor="sla-policy-name" className="text-sm font-medium text-text-default">
          الاسم
        </label>
        <input
          id="sla-policy-name"
          value={values.name}
          onChange={(e) => handleChange("name", e.target.value)}
          className={inputClassName}
          required
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="sla-policy-priority" className="text-sm font-medium text-text-default">
          الأولوية
        </label>
        <select
          id="sla-policy-priority"
          value={values.priority}
          onChange={(e) => handleChange("priority", e.target.value as SlaPolicyFormValues["priority"])}
          className={inputClassName}
        >
          {TICKET_PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {TICKET_PRIORITY_LABELS[priority]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="sla-policy-response" className="text-sm font-medium text-text-default">
            وقت الاستجابة (بالدقائق)
          </label>
          <input
            id="sla-policy-response"
            type="number"
            min={1}
            value={values.responseTimeMinutes}
            onChange={(e) => handleChange("responseTimeMinutes", Number(e.target.value))}
            className={inputClassName}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="sla-policy-resolution" className="text-sm font-medium text-text-default">
            وقت الحل (بالدقائق)
          </label>
          <input
            id="sla-policy-resolution"
            type="number"
            min={1}
            value={values.resolutionTimeMinutes}
            onChange={(e) => handleChange("resolutionTimeMinutes", Number(e.target.value))}
            className={inputClassName}
            required
          />
        </div>
      </div>

      {mode === "edit" && (
        <label className="flex items-center gap-2 text-sm font-medium text-text-default">
          <input
            type="checkbox"
            checked={values.isActive}
            onChange={(e) => handleChange("isActive", e.target.checked)}
          />
          نشطة
        </label>
      )}

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
