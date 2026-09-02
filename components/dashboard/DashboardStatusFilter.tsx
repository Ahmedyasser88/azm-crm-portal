"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { TICKET_STATUSES, TICKET_STATUS_LABELS } from "@/lib/constants/ticket";

const selectClassName =
  "rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20";

export type DashboardStatusFilterProps = {
  initialStatus: string;
};

export function DashboardStatusFilter({ initialStatus }: DashboardStatusFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(name: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }
    params.delete("page");

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <select
      value={initialStatus}
      onChange={(e) => updateParam("status", e.target.value)}
      className={selectClassName}
    >
      <option value="">كل الحالات</option>
      {TICKET_STATUSES.map((status) => (
        <option key={status} value={status}>
          {TICKET_STATUS_LABELS[status]}
        </option>
      ))}
    </select>
  );
}
