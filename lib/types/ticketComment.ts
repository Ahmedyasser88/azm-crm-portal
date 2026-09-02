export type TicketComment = {
  id: string;
  ticketId: string;
  content: string;
  createdBy: string;
  createdByName: string | null;
  createdOn: string;
};

export type AddCommentFormValues = {
  content: string;
};
