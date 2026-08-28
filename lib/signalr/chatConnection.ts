import * as signalR from "@microsoft/signalr";

const HUB_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/hubs/chat`;

export function createChatConnection(accessTokenFactory?: () => Promise<string>): signalR.HubConnection {
  return new signalR.HubConnectionBuilder()
    .withUrl(HUB_URL, accessTokenFactory ? { accessTokenFactory } : {})
    .withAutomaticReconnect()
    .build();
}

export async function fetchAgentAccessToken(): Promise<string> {
  const response = await fetch("/api/chat-token");
  // A stale/expired auth cookie makes proxy.ts's guard redirect this request to the /login
  // page's HTML instead of returning JSON — guard against that rather than letting `.json()`
  // throw an opaque parse error.
  if (!response.ok) throw new Error("تعذر الحصول على رمز الوصول");
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) throw new Error("تعذر الحصول على رمز الوصول");
  const { token } = (await response.json()) as { token: string };
  return token;
}
