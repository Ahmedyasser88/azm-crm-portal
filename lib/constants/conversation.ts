import type { CommunicationChannel, ConversationStatus } from "@/lib/types/conversation";

export const CHANNEL_LABELS: Record<CommunicationChannel, string> = {
  Email: "بريد إلكتروني",
  WhatsApp: "واتساب",
  LiveChat: "محادثة مباشرة",
  Sms: "رسالة نصية",
  WebForm: "نموذج الموقع",
};
export const CHANNELS = Object.keys(CHANNEL_LABELS) as CommunicationChannel[];

export const CONVERSATION_STATUS_LABELS: Record<ConversationStatus, string> = {
  Open: "مفتوحة",
  Closed: "مغلقة",
};
export const CONVERSATION_STATUSES = Object.keys(CONVERSATION_STATUS_LABELS) as ConversationStatus[];
