"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogInteractionForm } from "@/components/customers/LogInteractionForm";
import { INTERACTION_TYPE_LABELS } from "@/lib/constants/customerInteraction";
import { formatDateTime } from "@/lib/utils/date";
import type { CustomerInteraction } from "@/lib/types/customerInteraction";

export type InteractionHistorySectionProps = {
  customerId: string;
  interactions: CustomerInteraction[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  page: number;
};

export function InteractionHistorySection({
  customerId,
  interactions,
  hasNextPage,
  hasPreviousPage,
  page,
}: InteractionHistorySectionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  function buildHref(targetPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("interactionsPage", String(targetPage));
    return `${pathname}?${params.toString()}`;
  }

  function handleLogged() {
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-default">سجل التفاعلات</h2>
        <Button onClick={() => setOpen(true)}>إضافة تفاعل</Button>
      </div>

      {interactions.length === 0 ? (
        <p className="text-sm text-text-secondary text-center py-6">لا يوجد تفاعلات مسجلة بعد</p>
      ) : (
        <ul className="space-y-3">
          {interactions.map((interaction) => (
            <li key={interaction.id} className="border-b border-gray-300 last:border-0 pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="inline-block rounded-full bg-primary-100 text-primary text-xs font-medium px-2 py-0.5">
                    {INTERACTION_TYPE_LABELS[interaction.type]}
                  </span>
                  <p className="text-sm font-semibold text-text-default">{interaction.subject}</p>
                  {interaction.description && (
                    <p className="text-sm text-text-secondary whitespace-pre-wrap">
                      {interaction.description}
                    </p>
                  )}
                </div>
                <p className="text-xs text-text-secondary whitespace-nowrap">
                  {formatDateTime(interaction.occurredOn)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {(hasPreviousPage || hasNextPage) && (
        <div className="flex justify-end gap-2">
          {hasPreviousPage ? (
            <Link href={buildHref(page - 1)}>
              <Button variant="outline">السابق</Button>
            </Link>
          ) : (
            <Button variant="outline" disabled>
              السابق
            </Button>
          )}
          {hasNextPage ? (
            <Link href={buildHref(page + 1)}>
              <Button variant="outline">التالي</Button>
            </Link>
          ) : (
            <Button variant="outline" disabled>
              التالي
            </Button>
          )}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-black opacity-30 fixed inset-0" onClick={() => setOpen(false)} />
          <div className="card relative w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-text-default">إضافة تفاعل</h2>
            <LogInteractionForm customerId={customerId} onLogged={handleLogged} />
          </div>
        </div>
      )}
    </div>
  );
}
