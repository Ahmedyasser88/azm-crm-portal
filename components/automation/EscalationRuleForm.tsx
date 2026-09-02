"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TICKET_PRIORITIES, TICKET_PRIORITY_LABELS } from "@/lib/constants/ticket";
import type { EscalationRuleFormValues } from "@/lib/types/escalationRule";
import type { AutomationActionResult } from "@/app/(pages)/automation/slaPolicyActions";

const inputClassName =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20";

export type EscalationRuleFormProps = {
  mode: "create" | "edit";
  initialValues: EscalationRuleFormValues;
  onSubmit: (values: EscalationRuleFormValues) => Promise<AutomationActionResult>;
  onDone: () => void;
};

export function EscalationRuleForm({ mode, initialValues, onSubmit, onDone }: EscalationRuleFormProps) {
  const [values, setValues] = useState<EscalationRuleFormValues>(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange<K extends keyof EscalationRuleFormValues>(
    name: K,
    value: EscalationRuleFormValues[K]
  ) {
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
        <label htmlFor="escalation-rule-name" className="text-sm font-medium text-text-default">
          الاسم
        </label>
        <input
          id="escalation-rule-name"
          value={values.name}
          onChange={(e) => handleChange("name", e.target.value)}
          className={inputClassName}
          required
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="escalation-rule-priority" className="text-sm font-medium text-text-default">
          الأولوية
        </label>
        <select
          id="escalation-rule-priority"
          value={values.priority ?? ""}
          onChange={(e) =>
            handleChange("priority", (e.target.value || null) as EscalationRuleFormValues["priority"])
          }
          className={inputClassName}
        >
          <option value="">أي أولوية</option>
          {TICKET_PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {TICKET_PRIORITY_LABELS[priority]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="escalation-rule-overdue" className="text-sm font-medium text-text-default">
          فترة السماح بعد الاستحقاق (بالدقائق)
        </label>
        <input
          id="escalation-rule-overdue"
          type="number"
          min={0}
          value={values.overdueMinutes}
          onChange={(e) => handleChange("overdueMinutes", Number(e.target.value))}
          className={inputClassName}
          required
        />
        <p className="text-xs text-text-secondary">
          عدد الدقائق بعد موعد الحل المستحق قبل تصعيد التذكرة تلقائيًا
        </p>
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
