"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { TICKET_CATEGORIES, TICKET_CATEGORY_LABELS, TICKET_PRIORITIES, TICKET_PRIORITY_LABELS, TICKET_STATUSES, TICKET_STATUS_LABELS } from "@/lib/constants/ticket";

const selectClassName =
  "rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20";

export function TicketFilters({
  initialSearch,
  initialStatus,
  initialCategory,
  initialPriority,
  initialAssignedToUserId,
  initialIsEscalated,
}: {
  initialSearch: string;
  initialStatus: string;
  initialCategory: string;
  initialPriority: string;
  initialAssignedToUserId: string;
  initialIsEscalated: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);

  useEffect(() => {
    const trimmed = search.trim();

    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (trimmed) {
        params.set("search", trimmed);
      } else {
        params.delete("search");
      }
      params.delete("page");

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    }, 300);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

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
    <div className="flex flex-wrap gap-3">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="ابحث بالعنوان أو الوصف..."
        className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
      />

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

      <select
        value={initialCategory}
        onChange={(e) => updateParam("category", e.target.value)}
        className={selectClassName}
      >
        <option value="">كل الفئات</option>
        {TICKET_CATEGORIES.map((category) => (
          <option key={category} value={category}>
            {TICKET_CATEGORY_LABELS[category]}
          </option>
        ))}
      </select>

      <select
        value={initialPriority}
        onChange={(e) => updateParam("priority", e.target.value)}
        className={selectClassName}
      >
        <option value="">كل الأولويات</option>
        {TICKET_PRIORITIES.map((priority) => (
          <option key={priority} value={priority}>
            {TICKET_PRIORITY_LABELS[priority]}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => updateParam("assignedToUserId", initialAssignedToUserId === "me" ? "" : "me")}
        className={
          initialAssignedToUserId === "me"
            ? "rounded-lg bg-primary text-white px-3 py-2 text-sm font-medium"
            : "rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-text-default"
        }
      >
        تذاكري
      </button>

      <button
        type="button"
        onClick={() => updateParam("isEscalated", initialIsEscalated === "true" ? "" : "true")}
        className={
          initialIsEscalated === "true"
            ? "rounded-lg bg-primary text-white px-3 py-2 text-sm font-medium"
            : "rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-text-default"
        }
      >
        المُصعّدة فقط
      </button>
    </div>
  );
}
