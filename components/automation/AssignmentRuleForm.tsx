"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AgentPicker } from "@/components/tickets/AgentPicker";
import { TICKET_CATEGORIES, TICKET_CATEGORY_LABELS, TICKET_PRIORITIES, TICKET_PRIORITY_LABELS } from "@/lib/constants/ticket";
import { searchAgentsAction } from "@/app/(pages)/automation/assignmentRuleActions";
import type { AssignmentRuleFormValues } from "@/lib/types/assignmentRule";
import type { AutomationActionResult } from "@/app/(pages)/automation/slaPolicyActions";

const inputClassName =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20";

export type AssignmentRuleFormProps = {
  mode: "create" | "edit";
  initialValues: AssignmentRuleFormValues;
  initialAssignedToUserLabel?: string;
  onSubmit: (values: AssignmentRuleFormValues) => Promise<AutomationActionResult>;
  onDone: () => void;
};

export function AssignmentRuleForm({
  mode,
  initialValues,
  initialAssignedToUserLabel,
  onSubmit,
  onDone,
}: AssignmentRuleFormProps) {
  const [values, setValues] = useState<AssignmentRuleFormValues>(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange<K extends keyof AssignmentRuleFormValues>(
    name: K,
    value: AssignmentRuleFormValues[K]
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
        <label htmlFor="assignment-rule-name" className="text-sm font-medium text-text-default">
          الاسم
        </label>
        <input
          id="assignment-rule-name"
          value={values.name}
          onChange={(e) => handleChange("name", e.target.value)}
          className={inputClassName}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="assignment-rule-category" className="text-sm font-medium text-text-default">
            الفئة
          </label>
          <select
            id="assignment-rule-category"
            value={values.category ?? ""}
            onChange={(e) =>
              handleChange("category", (e.target.value || null) as AssignmentRuleFormValues["category"])
            }
            className={inputClassName}
          >
            <option value="">أي فئة</option>
            {TICKET_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {TICKET_CATEGORY_LABELS[category]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="assignment-rule-priority" className="text-sm font-medium text-text-default">
            الأولوية
          </label>
          <select
            id="assignment-rule-priority"
            value={values.priority ?? ""}
            onChange={(e) =>
              handleChange("priority", (e.target.value || null) as AssignmentRuleFormValues["priority"])
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
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-text-default">الموظف المسؤول</label>
        <AgentPicker
          value={values.assignedToUserId}
          initialLabel={initialAssignedToUserLabel}
          onSearch={searchAgentsAction}
          onSelect={(agentId) => handleChange("assignedToUserId", agentId)}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="assignment-rule-order" className="text-sm font-medium text-text-default">
          ترتيب التقييم
        </label>
        <input
          id="assignment-rule-order"
          type="number"
          min={0}
          value={values.evaluationOrder}
          onChange={(e) => handleChange("evaluationOrder", Number(e.target.value))}
          className={inputClassName}
          required
        />
        <p className="text-xs text-text-secondary">
          القاعدة ذات الرقم الأصغر تُطبَّق أولاً عند تطابق أكثر من قاعدة
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
