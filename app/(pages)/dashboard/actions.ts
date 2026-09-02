"use server";

import { revalidatePath } from "next/cache";
import { apiServerFetch } from "@/lib/api/fetch";
import type { AgentTaskFormValues } from "@/lib/types/agentTask";

export type DashboardActionResult = { success: true } | { success: false; error: string };

function dueOnToIso(dueOn: string): string | null {
  return dueOn.trim() ? new Date(dueOn).toISOString() : null;
}

export async function createAgentTaskAction(
  values: AgentTaskFormValues
): Promise<DashboardActionResult> {
  const result = await apiServerFetch<string>({
    url: "/api/agent-tasks",
    method: "POST",
    body: {
      title: values.title.trim(),
      description: values.description.trim() || null,
      dueOn: dueOnToIso(values.dueOn),
      customerId: null,
      ticketId: null,
    },
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateAgentTaskAction(
  id: string,
  values: AgentTaskFormValues
): Promise<DashboardActionResult> {
  const result = await apiServerFetch<void>({
    url: `/api/agent-tasks/${id}`,
    method: "PUT",
    body: {
      title: values.title.trim(),
      description: values.description.trim() || null,
      dueOn: dueOnToIso(values.dueOn),
    },
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function setAgentTaskCompletionAction(
  id: string,
  isCompleted: boolean
): Promise<DashboardActionResult> {
  const result = await apiServerFetch<void>({
    url: `/api/agent-tasks/${id}/completion`,
    method: "PUT",
    body: { isCompleted },
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteAgentTaskAction(id: string): Promise<DashboardActionResult> {
  const result = await apiServerFetch<void>({ url: `/api/agent-tasks/${id}`, method: "DELETE" });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
