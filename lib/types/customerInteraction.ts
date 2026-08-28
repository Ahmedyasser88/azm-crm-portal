export type InteractionType = "Call" | "Email" | "Meeting" | "WhatsApp" | "Sms" | "Other";

export type CustomerInteraction = {
  id: string;
  customerId: string;
  type: InteractionType;
  subject: string;
  description: string | null;
  occurredOn: string;
  createdOn: string;
};

export type LogInteractionFormValues = {
  type: InteractionType;
  subject: string;
  description: string;
  occurredOn: string; // datetime-local input value, e.g. "2026-08-27T10:00"
};
