import { notFound } from "next/navigation";
import { CustomerForm } from "@/components/customers/CustomerForm";
import { SetBreadcrumbLabel } from "@/components/customers/SetBreadcrumbLabel";
import { updateCustomerAction } from "@/app/(pages)/customers/actions";
import { customerEndpoints } from "@/lib/api/customer.api";
import type { CustomerFormValues } from "@/lib/types/customer";

type EditCustomerPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditCustomerPage({ params }: EditCustomerPageProps) {
  const { id } = await params;
  const result = await customerEndpoints.getById(id);

  if (!result.success) {
    if (result.status === 404) notFound();
    throw new Error(result.error);
  }

  const customer = result.data;

  const initialValues: CustomerFormValues = {
    fullName: customer.fullName,
    companyName: customer.companyName ?? "",
    email: customer.email ?? "",
    phoneNumber: customer.phoneNumber ?? "",
    addressLine1: customer.addressLine1 ?? "",
    addressLine2: customer.addressLine2 ?? "",
    city: customer.city ?? "",
    state: customer.state ?? "",
    postalCode: customer.postalCode ?? "",
    country: customer.country ?? "",
  };

  return (
    <div className="card space-y-6">
      <SetBreadcrumbLabel segment={id} label={customer.fullName} />
      <h1 className="text-2xl font-bold text-text-default">تعديل بيانات العميل</h1>
      <CustomerForm
        mode="edit"
        initialValues={initialValues}
        onSubmit={updateCustomerAction.bind(null, id)}
      />
    </div>
  );
}
