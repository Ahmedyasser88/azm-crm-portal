"use server";

import { apiServerFetch } from "@/lib/api/fetch";
import type { Message } from "@/lib/types/message";

export type ChatbotReply = { conversationId: string; customerMessage: Message; botReply: Message };

export type ChatbotActionResult = { success: true; reply: ChatbotReply } | { success: false; error: string };

export async function startAiChatAction(values: {
  name: string;
  email: string;
  body: string;
}): Promise<ChatbotActionResult> {
  const result = await apiServerFetch<ChatbotReply>({
    url: "/api/conversations/chatbot/start",
    method: "POST",
    body: { name: values.name.trim(), email: values.email.trim(), body: values.body.trim() },
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, reply: result.data };
}

export async function sendChatbotMessageAction(
  conversationId: string,
  body: string
): Promise<ChatbotActionResult> {
  const result = await apiServerFetch<ChatbotReply>({
    url: `/api/conversations/chatbot/${conversationId}/messages`,
    method: "POST",
    body: { body: body.trim() },
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, reply: result.data };
}
