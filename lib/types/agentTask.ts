export type AgentTask = {
  id: string;
  title: string;
  description: string | null;
  dueOn: string | null;
  isCompleted: boolean;
  completedOn: string | null;
  customerId: string | null;
  ticketId: string | null;
  createdOn: string;
  updatedOn: string | null;
};

export type AgentTaskFormValues = {
  title: string;
  description: string;
  dueOn: string; // "" means no due date; otherwise a `datetime-local` input value
};
