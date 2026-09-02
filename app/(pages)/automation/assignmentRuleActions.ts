"use server";

import { revalidatePath } from "next/cache";
import { apiServerFetch } from "@/lib/api/fetch";
import { identityEndpoints } from "@/lib/api/identity.api";
import type { AssignmentRuleFormValues } from "@/lib/types/assignmentRule";
import type { AutomationActionResult } from "./slaPolicyActions";
import type { AgentSearchResult } from "@/components/tickets/AgentPicker";

export async function searchAgentsAction(query: string): Promise<AgentSearchResult[]> {
  const result = await identityEndpoints.searchAgents({ search: query.trim() || undefined, pageSize: 10 });
  if (!result.success) return [];

  return result.data.map((agent) => ({
    id: agent.id,
    label: agent.email ? `${agent.fullName} — ${agent.email}` : agent.fullName,
  }));
}

export async function createAssignmentRuleAction(
  values: Omit<AssignmentRuleFormValues, "isActive">
): Promise<AutomationActionResult> {
  const result = await apiServerFetch<string>({
    url: "/api/assignment-rules",
    method: "POST",
    body: {
      name: values.name.trim(),
      category: values.category,
      priority: values.priority,
      assignedToUserId: values.assignedToUserId.trim(),
      evaluationOrder: values.evaluationOrder,
    },
  });

  if (!result.success) return { success: false, error: result.error };

  revalidatePath("/automation");
  return { success: true };
}

export async function updateAssignmentRuleAction(
  id: string,
  values: AssignmentRuleFormValues
): Promise<AutomationActionResult> {
  const result = await apiServerFetch<void>({
    url: `/api/assignment-rules/${id}`,
    method: "PUT",
    body: {
      name: values.name.trim(),
      category: values.category,
      priority: values.priority,
      assignedToUserId: values.assignedToUserId.trim(),
      evaluationOrder: values.evaluationOrder,
      isActive: values.isActive,
    },
  });

  if (!result.success) return { success: false, error: result.error };

  revalidatePath("/automation");
  return { success: true };
}

export async function deleteAssignmentRuleAction(id: string): Promise<AutomationActionResult> {
  const result = await apiServerFetch<void>({ url: `/api/assignment-rules/${id}`, method: "DELETE" });

  if (!result.success) return { success: false, error: result.error };

  revalidatePath("/automation");
  return { success: true };
}
