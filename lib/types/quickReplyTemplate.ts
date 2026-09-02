export type QuickReplyTemplate = {
  id: string;
  title: string;
  body: string;
  createdOn: string;
  updatedOn: string | null;
};

export type QuickReplyTemplateListItem = Pick<QuickReplyTemplate, "id" | "title" | "body" | "createdOn">;

export type QuickReplyTemplateFormValues = {
  title: string;
  body: string;
};
