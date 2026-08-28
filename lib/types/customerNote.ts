export type CustomerNote = {
  id: string;
  customerId: string;
  content: string;
  createdBy: string;
  createdOn: string;
};

export type AddNoteFormValues = {
  content: string;
};
