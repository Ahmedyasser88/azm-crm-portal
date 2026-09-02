"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { AgentTaskFormValues } from "@/lib/types/agentTask";
import type { DashboardActionResult } from "@/app/(pages)/dashboard/actions";

const inputClassName =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20";

export type AgentTaskFormProps = {
  mode: "create" | "edit";
  initialValues: AgentTaskFormValues;
  onSubmit: (values: AgentTaskFormValues) => Promise<DashboardActionResult>;
  onDone: () => void;
};

export function AgentTaskForm({ mode, initialValues, onSubmit, onDone }: AgentTaskFormProps) {
  const [values, setValues] = useState<AgentTaskFormValues>(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange<K extends keyof AgentTaskFormValues>(name: K, value: AgentTaskFormValues[K]) {
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
        <label htmlFor="task-title" className="text-sm font-medium text-text-default">
          العنوان
        </label>
        <input
          id="task-title"
          value={values.title}
          onChange={(e) => handleChange("title", e.target.value)}
          className={inputClassName}
          required
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="task-description" className="text-sm font-medium text-text-default">
          الوصف
        </label>
        <textarea
          id="task-description"
          value={values.description}
          onChange={(e) => handleChange("description", e.target.value)}
          className={inputClassName}
          rows={3}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="task-due-on" className="text-sm font-medium text-text-default">
          تاريخ الاستحقاق
        </label>
        <input
          id="task-due-on"
          type="datetime-local"
          value={values.dueOn}
          onChange={(e) => handleChange("dueOn", e.target.value)}
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
          {isSubmitting ? "جارٍ الحفظ..." : mode === "create" ? "إضافة" : "حفظ"}
        </Button>
      </div>
    </form>
  );
}
