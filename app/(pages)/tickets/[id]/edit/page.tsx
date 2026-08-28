import { notFound } from "next/navigation";
import { TicketForm } from "@/components/tickets/TicketForm";
import { SetBreadcrumbLabel } from "@/components/customers/SetBreadcrumbLabel";
import { updateTicketAction } from "@/app/(pages)/tickets/actions";
import { ticketEndpoints } from "@/lib/api/ticket.api";
import { customerEndpoints } from "@/lib/api/customer.api";

type EditTicketPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditTicketPage({ params }: EditTicketPageProps) {
  const { id } = await params;
  const result = await ticketEndpoints.getById(id);

  if (!result.success) {
    if (result.status === 404) notFound();
    throw new Error(result.error);
  }

  const ticket = result.data;

  const customerResult = await customerEndpoints.getById(ticket.customerId);
  const customerLabel = customerResult.success ? customerResult.data.fullName : ticket.customerId;

  return (
    <div className="card space-y-6">
      <SetBreadcrumbLabel segment={id} label={ticket.title} />
      <h1 className="text-2xl font-bold text-text-default">تعديل التذكرة</h1>
      <TicketForm
        mode="edit"
        initialValues={{
          customerId: ticket.customerId,
          title: ticket.title,
          description: ticket.description ?? "",
          category: ticket.category,
          priority: ticket.priority,
        }}
        initialCustomerLabel={customerLabel}
        onSubmit={updateTicketAction.bind(null, id)}
      />
    </div>
  );
}
