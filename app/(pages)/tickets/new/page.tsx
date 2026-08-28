import { TicketForm } from "@/components/tickets/TicketForm";
import { createTicketAction } from "@/app/(pages)/tickets/actions";
import { customerEndpoints } from "@/lib/api/customer.api";

type NewTicketPageProps = {
  searchParams: Promise<{ customerId?: string }>;
};

export default async function NewTicketPage({ searchParams }: NewTicketPageProps) {
  const { customerId } = await searchParams;

  let initialCustomerLabel: string | undefined;
  if (customerId) {
    const result = await customerEndpoints.getById(customerId);
    if (result.success) {
      initialCustomerLabel = result.data.companyName
        ? `${result.data.fullName} — ${result.data.companyName}`
        : result.data.fullName;
    }
  }

  return (
    <div className="card space-y-6">
      <h1 className="text-2xl font-bold text-text-default">تذكرة جديدة</h1>
      <TicketForm
        mode="create"
        initialValues={{
          customerId: customerId ?? "",
          title: "",
          description: "",
          category: "General",
          priority: "Medium",
        }}
        initialCustomerLabel={initialCustomerLabel}
        onSubmit={createTicketAction}
      />
    </div>
  );
}
