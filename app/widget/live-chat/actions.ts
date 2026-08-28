"use server";

import { apiServerFetch } from "@/lib/api/fetch";

export type StartLiveChatResult = { success: true; conversationId: string } | { success: false; error: string };

export async function startLiveChatAction(values: {
  name: string;
  email: string;
  body: string;
}): Promise<StartLiveChatResult> {
  const result = await apiServerFetch<string>({
    url: "/api/conversations/live-chat/start",
    method: "POST",
    body: { name: values.name.trim(), email: values.email.trim(), body: values.body.trim() },
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, conversationId: result.data };
}
