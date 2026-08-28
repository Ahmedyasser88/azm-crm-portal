import type { InteractionType } from "@/lib/types/customerInteraction";

export const INTERACTION_TYPE_LABELS: Record<InteractionType, string> = {
  Call: "مكالمة",
  Email: "بريد إلكتروني",
  Meeting: "اجتماع",
  WhatsApp: "واتساب",
  Sms: "رسالة نصية",
  Other: "أخرى",
};

export const INTERACTION_TYPES = Object.keys(INTERACTION_TYPE_LABELS) as InteractionType[];
