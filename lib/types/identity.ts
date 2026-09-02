export type CurrentUser = {
  userId: string;
  fullName: string;
  username: string;
  email: string;
  mobileNumber: string;
  roles: string[];
};

export type AgentSummary = {
  id: string;
  fullName: string;
  email: string | null;
};
