"use server";

import { revalidatePath } from "next/cache";
import { apiServerFetch } from "@/lib/api/fetch";
import { knowledgeArticleEndpoints } from "@/lib/api/knowledgeArticle.api";
import type {
  KnowledgeArticle,
  KnowledgeArticleFormValues,
  KnowledgeArticleStepFormValues,
} from "@/lib/types/knowledgeArticle";

export type KnowledgeBaseActionResult = { success: true } | { success: false; error: string };

// Used by the edit modal: KnowledgeArticleListItem (the list row's shape) omits `content`/`tags`,
// so the modal fetches the full article on open rather than the list endpoint carrying fields
// only the edit form needs.
export async function getKnowledgeArticleAction(id: string): Promise<KnowledgeArticle | null> {
  const result = await knowledgeArticleEndpoints.getById(id);
  return result.success ? result.data : null;
}

function toRequestBody(values: KnowledgeArticleFormValues) {
  return {
    title: values.title.trim(),
    content: values.content.trim(),
    type: values.type,
    category: values.category.trim() || null,
    tags: values.tags.trim() || null,
  };
}

export async function createKnowledgeArticleAction(
  values: KnowledgeArticleFormValues
): Promise<KnowledgeBaseActionResult> {
  const result = await apiServerFetch<string>({
    url: "/api/knowledge-articles",
    method: "POST",
    body: toRequestBody(values),
  });

  if (!result.success) return { success: false, error: result.error };

  revalidatePath("/knowledge-base");
  return { success: true };
}

export async function updateKnowledgeArticleAction(
  id: string,
  values: KnowledgeArticleFormValues
): Promise<KnowledgeBaseActionResult> {
  const result = await apiServerFetch<void>({
    url: `/api/knowledge-articles/${id}`,
    method: "PUT",
    body: toRequestBody(values),
  });

  if (!result.success) return { success: false, error: result.error };

  revalidatePath("/knowledge-base");
  revalidatePath(`/knowledge-base/${id}`);
  return { success: true };
}

export async function deleteKnowledgeArticleAction(id: string): Promise<KnowledgeBaseActionResult> {
  const result = await apiServerFetch<void>({ url: `/api/knowledge-articles/${id}`, method: "DELETE" });

  if (!result.success) return { success: false, error: result.error };

  revalidatePath("/knowledge-base");
  return { success: true };
}

export async function publishKnowledgeArticleAction(id: string): Promise<KnowledgeBaseActionResult> {
  const result = await knowledgeArticleEndpoints.publish(id);

  if (!result.success) return { success: false, error: result.error };

  revalidatePath("/knowledge-base");
  revalidatePath(`/knowledge-base/${id}`);
  return { success: true };
}

export async function unpublishKnowledgeArticleAction(id: string): Promise<KnowledgeBaseActionResult> {
  const result = await knowledgeArticleEndpoints.unpublish(id);

  if (!result.success) return { success: false, error: result.error };

  revalidatePath("/knowledge-base");
  revalidatePath(`/knowledge-base/${id}`);
  return { success: true };
}

export async function addKnowledgeArticleStepAction(
  articleId: string,
  values: KnowledgeArticleStepFormValues
): Promise<KnowledgeBaseActionResult> {
  const result = await knowledgeArticleEndpoints.addStep(articleId, values);

  if (!result.success) return { success: false, error: result.error };

  revalidatePath(`/knowledge-base/${articleId}`);
  return { success: true };
}

export async function updateKnowledgeArticleStepAction(
  articleId: string,
  stepId: string,
  values: KnowledgeArticleStepFormValues
): Promise<KnowledgeBaseActionResult> {
  const result = await knowledgeArticleEndpoints.updateStep(articleId, stepId, values);

  if (!result.success) return { success: false, error: result.error };

  revalidatePath(`/knowledge-base/${articleId}`);
  return { success: true };
}

export async function deleteKnowledgeArticleStepAction(
  articleId: string,
  stepId: string
): Promise<KnowledgeBaseActionResult> {
  const result = await knowledgeArticleEndpoints.deleteStep(articleId, stepId);

  if (!result.success) return { success: false, error: result.error };

  revalidatePath(`/knowledge-base/${articleId}`);
  return { success: true };
}
