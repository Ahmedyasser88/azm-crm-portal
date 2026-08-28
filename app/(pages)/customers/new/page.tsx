import { CustomerForm } from "@/components/customers/CustomerForm";
import { createCustomerAction } from "@/app/(pages)/customers/actions";

export default function NewCustomerPage() {
  return (
    <div className="card space-y-6">
      <h1 className="text-2xl font-bold text-text-default">عميل جديد</h1>
      <CustomerForm mode="create" onSubmit={createCustomerAction} />
    </div>
  );
}
