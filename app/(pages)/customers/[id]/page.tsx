import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DeleteCustomerButton } from "@/components/customers/DeleteCustomerButton";
import { InteractionHistorySection } from "@/components/customers/InteractionHistorySection";
import { NoteHistorySection } from "@/components/customers/NoteHistorySection";
import { AttachmentsSection } from "@/components/customers/AttachmentsSection";
import { SetBreadcrumbLabel } from "@/components/customers/SetBreadcrumbLabel";
import { customerEndpoints } from "@/lib/api/customer.api";

type CustomerDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    interactionsPage?: string;
    notesPage?: string;
    attachmentsPage?: string;
  }>;
};

const CONTACT_FIELDS: Array<{ label: string; key: "email" | "phoneNumber" | "addressLine1" | "addressLine2" | "city" | "state" | "postalCode" | "country" }> = [
  { label: "البريد الإلكتروني", key: "email" },
  { label: "رقم الهاتف", key: "phoneNumber" },
  { label: "العنوان", key: "addressLine1" },
  { label: "العنوان (تكملة)", key: "addressLine2" },
  { label: "المدينة", key: "city" },
  { label: "المنطقة", key: "state" },
  { label: "الرمز البريدي", key: "postalCode" },
  { label: "الدولة", key: "country" },
];

export default async function CustomerDetailPage({ params, searchParams }: CustomerDetailPageProps) {
  const { id } = await params;
  const { interactionsPage, notesPage, attachmentsPage } = await searchParams;

  const result = await customerEndpoints.getById(id);

  if (!result.success) {
    if (result.status === 404) notFound();
    throw new Error(result.error);
  }

  const customer = result.data;

  const interactionsPageNumber = Number(interactionsPage) || 1;
  const interactionsResult = await customerEndpoints.interactions.list(id, {
    pageNumber: interactionsPageNumber,
  });

  const notesPageNumber = Number(notesPage) || 1;
  const notesResult = await customerEndpoints.notes.list(id, { pageNumber: notesPageNumber });

  const attachmentsPageNumber = Number(attachmentsPage) || 1;
  const attachmentsResult = await customerEndpoints.attachments.list(id, {
    pageNumber: attachmentsPageNumber,
  });

  return (
    <div className="space-y-6">
      <SetBreadcrumbLabel segment={id} label={customer.fullName} />
      <div className="card space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-default">{customer.fullName}</h1>
            {customer.companyName && (
              <p className="text-sm text-text-secondary mt-1">{customer.companyName}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Link href={`/customers/${id}/edit`}>
              <Button variant="outline">تعديل</Button>
            </Link>
            <DeleteCustomerButton id={id} customerName={customer.fullName} redirectAfterDelete />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CONTACT_FIELDS.map(({ label, key }) => (
            <div key={key} className="space-y-1">
              <p className="text-xs text-text-secondary">{label}</p>
              <p className="text-sm text-text-default">{customer[key] || "—"}</p>
            </div>
          ))}
        </div>
      </div>

      <InteractionHistorySection
        customerId={id}
        interactions={interactionsResult.success ? interactionsResult.data.items : []}
        hasNextPage={interactionsResult.success ? interactionsResult.data.hasNextPage : false}
        hasPreviousPage={interactionsResult.success ? interactionsResult.data.hasPreviousPage : false}
        page={interactionsPageNumber}
      />

      <NoteHistorySection
        customerId={id}
        notes={notesResult.success ? notesResult.data.items : []}
        hasNextPage={notesResult.success ? notesResult.data.hasNextPage : false}
        hasPreviousPage={notesResult.success ? notesResult.data.hasPreviousPage : false}
        page={notesPageNumber}
      />

      <AttachmentsSection
        customerId={id}
        attachments={attachmentsResult.success ? attachmentsResult.data.items : []}
        hasNextPage={attachmentsResult.success ? attachmentsResult.data.hasNextPage : false}
        hasPreviousPage={attachmentsResult.success ? attachmentsResult.data.hasPreviousPage : false}
        page={attachmentsPageNumber}
      />
    </div>
  );
}
