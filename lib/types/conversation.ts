export type CommunicationChannel = "Email" | "WhatsApp" | "LiveChat" | "Sms" | "WebForm";
export type ConversationStatus = "Open" | "Closed";

export type Conversation = {
  id: string;
  customerId: string;
  channel: CommunicationChannel;
  subject: string | null;
  status: ConversationStatus;
  createdOn: string;
  updatedOn: string | null;
};

export type ConversationListItem = Pick<
  Conversation,
  "id" | "customerId" | "channel" | "subject" | "status" | "createdOn"
>;

export type ConversationFormValues = {
  customerId: string;
  channel: CommunicationChannel;
  subject: string;
};
