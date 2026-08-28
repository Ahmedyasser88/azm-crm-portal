import { ConversationForm } from "@/components/conversations/ConversationForm";
import { createConversationAction } from "@/app/(pages)/conversations/actions";
import { customerEndpoints } from "@/lib/api/customer.api";

type NewConversationPageProps = {
  searchParams: Promise<{ customerId?: string }>;
};

export default async function NewConversationPage({ searchParams }: NewConversationPageProps) {
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
      <h1 className="text-2xl font-bold text-text-default">محادثة جديدة</h1>
      <ConversationForm
        initialValues={{
          customerId: customerId ?? "",
          channel: "Email",
          subject: "",
        }}
        initialCustomerLabel={initialCustomerLabel}
        onSubmit={createConversationAction}
      />
    </div>
  );
}
