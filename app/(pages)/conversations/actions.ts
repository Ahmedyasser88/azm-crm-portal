"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiServerFetch } from "@/lib/api/fetch";
import type { ConversationFormValues } from "@/lib/types/conversation";

export type ConversationActionResult = { success: true } | { success: false; error: string };

export async function createConversationAction(
  values: ConversationFormValues
): Promise<ConversationActionResult | undefined> {
  const result = await apiServerFetch<string>({
    url: "/api/conversations",
    method: "POST",
    body: {
      customerId: values.customerId,
      channel: values.channel,
      subject: values.subject.trim() || null,
    },
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/conversations");
  redirect(`/conversations/${result.data}`);
}

export async function sendMessageAction(
  conversationId: string,
  body: string
): Promise<ConversationActionResult> {
  const result = await apiServerFetch<string>({
    url: `/api/conversations/${conversationId}/messages`,
    method: "POST",
    body: { body: body.trim() },
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  // No redirect — this is a "mutate and stay on the current page" action, the same shape as
  // assignTicketAction/changeTicketStatusAction/escalateTicketAction, not a "create and
  // navigate elsewhere" one like createConversationAction above. revalidatePath alone causes
  // Next.js to re-render this route's Server Components with the new message included.
  revalidatePath(`/conversations/${conversationId}`);
  return { success: true };
}
