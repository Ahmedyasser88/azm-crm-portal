export type MessageDirection = "Inbound" | "Outbound";

export type Message = {
  id: string;
  conversationId: string;
  direction: MessageDirection;
  body: string;
  createdBy: string;
  createdOn: string;
};
