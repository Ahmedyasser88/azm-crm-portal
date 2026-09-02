"use server";

import { revalidatePath } from "next/cache";
import { apiServerFetch } from "@/lib/api/fetch";
import type { EscalationRuleFormValues } from "@/lib/types/escalationRule";
import type { AutomationActionResult } from "./slaPolicyActions";

export async function createEscalationRuleAction(
  values: Omit<EscalationRuleFormValues, "isActive">
): Promise<AutomationActionResult> {
  const result = await apiServerFetch<string>({
    url: "/api/escalation-rules",
    method: "POST",
    body: { name: values.name.trim(), priority: values.priority, overdueMinutes: values.overdueMinutes },
  });

  if (!result.success) return { success: false, error: result.error };

  revalidatePath("/automation");
  return { success: true };
}

export async function updateEscalationRuleAction(
  id: string,
  values: EscalationRuleFormValues
): Promise<AutomationActionResult> {
  const result = await apiServerFetch<void>({
    url: `/api/escalation-rules/${id}`,
    method: "PUT",
    body: {
      name: values.name.trim(),
      priority: values.priority,
      overdueMinutes: values.overdueMinutes,
      isActive: values.isActive,
    },
  });

  if (!result.success) return { success: false, error: result.error };

  revalidatePath("/automation");
  return { success: true };
}

export async function deleteEscalationRuleAction(id: string): Promise<AutomationActionResult> {
  const result = await apiServerFetch<void>({ url: `/api/escalation-rules/${id}`, method: "DELETE" });

  if (!result.success) return { success: false, error: result.error };

  revalidatePath("/automation");
  return { success: true };
}
