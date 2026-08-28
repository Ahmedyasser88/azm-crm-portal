import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CustomerSearch } from "@/components/customers/CustomerSearch";
import { customerEndpoints } from "@/lib/api/customer.api";
import { formatDateTime } from "@/lib/utils/date";

type CustomersPageProps = {
  searchParams: Promise<{ page?: string; search?: string }>;
};

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const { page, search } = await searchParams;
  const pageNumber = Number(page) || 1;

  const result = await customerEndpoints.list({ pageNumber, search });

  if (!result.success) {
    throw new Error(result.error);
  }

  const { items, hasNextPage, hasPreviousPage } = result.data;

  const buildPageHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("page", String(targetPage));
    return `/customers?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-default">العملاء</h1>
        <Link href="/customers/new">
          <Button>عميل جديد</Button>
        </Link>
      </div>

      <CustomerSearch initialValue={search ?? ""} />

      <div className="card overflow-x-auto">
        {items.length === 0 ? (
          <p className="text-sm text-text-secondary text-center py-8">
            {search ? "لا توجد نتائج مطابقة" : "لا يوجد عملاء بعد"}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-text-secondary border-b border-gray-300">
                <th className="py-2 px-3 font-medium">الاسم الكامل</th>
                <th className="py-2 px-3 font-medium">الشركة</th>
                <th className="py-2 px-3 font-medium">البريد الإلكتروني</th>
                <th className="py-2 px-3 font-medium">الهاتف</th>
                <th className="py-2 px-3 font-medium">تاريخ الإنشاء</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-gray-300 last:border-0 hover:bg-surface"
                >
                  <td className="py-2 px-3">
                    <Link href={`/customers/${item.id}`} className="text-primary hover:underline">
                      {item.fullName}
                    </Link>
                  </td>
                  <td className="py-2 px-3">{item.companyName || "—"}</td>
                  <td className="py-2 px-3">{item.email || "—"}</td>
                  <td className="py-2 px-3">{item.phoneNumber || "—"}</td>
                  <td className="py-2 px-3">{formatDateTime(item.createdOn)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {(hasPreviousPage || hasNextPage) && (
        <div className="flex justify-end gap-2">
          {hasPreviousPage ? (
            <Link href={buildPageHref(pageNumber - 1)}>
              <Button variant="outline">السابق</Button>
            </Link>
          ) : (
            <Button variant="outline" disabled>
              السابق
            </Button>
          )}
          {hasNextPage ? (
            <Link href={buildPageHref(pageNumber + 1)}>
              <Button variant="outline">التالي</Button>
            </Link>
          ) : (
            <Button variant="outline" disabled>
              التالي
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
