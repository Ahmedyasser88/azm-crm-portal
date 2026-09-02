"use server";

import { revalidatePath } from "next/cache";
import { apiServerFetch } from "@/lib/api/fetch";
import type { QuickReplyTemplateFormValues } from "@/lib/types/quickReplyTemplate";

export type DashboardActionResult = { success: true } | { success: false; error: string };

export async function createQuickReplyTemplateAction(
  values: QuickReplyTemplateFormValues
): Promise<DashboardActionResult> {
  const result = await apiServerFetch<string>({
    url: "/api/quick-reply-templates",
    method: "POST",
    body: { title: values.title.trim(), body: values.body.trim() },
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateQuickReplyTemplateAction(
  id: string,
  values: QuickReplyTemplateFormValues
): Promise<DashboardActionResult> {
  const result = await apiServerFetch<void>({
    url: `/api/quick-reply-templates/${id}`,
    method: "PUT",
    body: { title: values.title.trim(), body: values.body.trim() },
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteQuickReplyTemplateAction(id: string): Promise<DashboardActionResult> {
  const result = await apiServerFetch<void>({ url: `/api/quick-reply-templates/${id}`, method: "DELETE" });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
