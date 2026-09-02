export type SlaBreachType = "ResponseOverdue" | "ResolutionOverdue";

export type SlaBreachNotification = {
  id: string;
  ticketId: string;
  breachType: SlaBreachType;
  notifiedUserId: string | null;
  notifiedUserName: string | null;
  message: string;
  emailSent: boolean;
  createdOn: string;
};
