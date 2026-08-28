export type Customer = {
  id: string;
  fullName: string;
  companyName: string | null;
  email: string | null;
  phoneNumber: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  createdOn: string;
  updatedOn: string | null;
};

export type CustomerListItem = Pick<
  Customer,
  "id" | "fullName" | "companyName" | "email" | "phoneNumber" | "createdOn"
>;

export type CustomerFormValues = {
  fullName: string;
  companyName: string;
  email: string;
  phoneNumber: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};
