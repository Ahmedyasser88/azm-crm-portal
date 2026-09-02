"use server";

import { revalidatePath } from "next/cache";
import { apiServerFetch } from "@/lib/api/fetch";
import type { SlaPolicyFormValues } from "@/lib/types/slaPolicy";

export type AutomationActionResult = { success: true } | { success: false; error: string };

export async function createSlaPolicyAction(
  values: Omit<SlaPolicyFormValues, "isActive">
): Promise<AutomationActionResult> {
  const result = await apiServerFetch<string>({
    url: "/api/sla-policies",
    method: "POST",
    body: {
      name: values.name.trim(),
      priority: values.priority,
      responseTimeMinutes: values.responseTimeMinutes,
      resolutionTimeMinutes: values.resolutionTimeMinutes,
    },
  });

  if (!result.success) return { success: false, error: result.error };

  revalidatePath("/automation");
  return { success: true };
}

export async function updateSlaPolicyAction(
  id: string,
  values: SlaPolicyFormValues
): Promise<AutomationActionResult> {
  const result = await apiServerFetch<void>({
    url: `/api/sla-policies/${id}`,
    method: "PUT",
    body: {
      name: values.name.trim(),
      priority: values.priority,
      responseTimeMinutes: values.responseTimeMinutes,
      resolutionTimeMinutes: values.resolutionTimeMinutes,
      isActive: values.isActive,
    },
  });

  if (!result.success) return { success: false, error: result.error };

  revalidatePath("/automation");
  return { success: true };
}

export async function deleteSlaPolicyAction(id: string): Promise<AutomationActionResult> {
  const result = await apiServerFetch<void>({ url: `/api/sla-policies/${id}`, method: "DELETE" });

  if (!result.success) return { success: false, error: result.error };

  revalidatePath("/automation");
  return { success: true };
}
