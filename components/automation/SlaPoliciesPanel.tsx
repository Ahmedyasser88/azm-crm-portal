"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/customers/ConfirmDialog";
import { SlaPolicyForm } from "@/components/automation/SlaPolicyForm";
import {
  createSlaPolicyAction,
  updateSlaPolicyAction,
  deleteSlaPolicyAction,
} from "@/app/(pages)/automation/slaPolicyActions";
import { TICKET_PRIORITIES, TICKET_PRIORITY_LABELS } from "@/lib/constants/ticket";
import type { SlaPolicyListItem } from "@/lib/types/slaPolicy";

const selectClassName =
  "rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20";

export type SlaPoliciesPanelProps = {
  policies: SlaPolicyListItem[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  page: number;
  priorityFilter: string;
  activeFilter: string;
};

export function SlaPoliciesPanel({
  policies,
  hasNextPage,
  hasPreviousPage,
  page,
  priorityFilter,
  activeFilter,
}: SlaPoliciesPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [addOpen, setAddOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<SlaPolicyListItem | null>(null);
  const [deletingPolicy, setDeletingPolicy] = useState<SlaPolicyListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function updateParam(name: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }
    params.delete("slaPage");

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  function buildHref(targetPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("slaPage", String(targetPage));
    return `${pathname}?${params.toString()}`;
  }

  async function handleDeleteConfirm() {
    if (!deletingPolicy) return;
    setIsDeleting(true);
    const result = await deleteSlaPolicyAction(deletingPolicy.id);
    setIsDeleting(false);
    setDeletingPolicy(null);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-default">سياسات اتفاقية مستوى الخدمة</h2>
        <Button onClick={() => setAddOpen(true)}>+ إضافة سياسة</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={priorityFilter}
          onChange={(e) => updateParam("slaPriority", e.target.value)}
          className={selectClassName}
        >
          <option value="">كل الأولويات</option>
          {TICKET_PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {TICKET_PRIORITY_LABELS[priority]}
            </option>
          ))}
        </select>

        <select
          value={activeFilter}
          onChange={(e) => updateParam("slaActive", e.target.value)}
          className={selectClassName}
        >
          <option value="">الكل</option>
          <option value="true">نشطة فقط</option>
          <option value="false">غير نشطة</option>
        </select>
      </div>

      {policies.length === 0 ? (
        <p className="text-sm text-text-secondary text-center py-6">لا توجد سياسات بعد</p>
      ) : (
        <ul className="space-y-3">
          {policies.map((policy) => (
            <li key={policy.id} className="border-b border-gray-300 last:border-0 pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-text-default">{policy.name}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-block rounded-full bg-primary-100 text-primary text-xs font-medium px-2 py-0.5">
                      {TICKET_PRIORITY_LABELS[policy.priority]}
                    </span>
                    <span className="inline-block rounded-full bg-primary-100 text-primary text-xs font-medium px-2 py-0.5">
                      {policy.responseTimeMinutes} دقيقة استجابة / {policy.resolutionTimeMinutes} دقيقة حل
                    </span>
                    {!policy.isActive && (
                      <span className="inline-block rounded-full bg-gray-200 text-text-secondary text-xs font-medium px-2 py-0.5">
                        غير نشطة
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => setEditingPolicy(policy)}>
                    تعديل
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDeletingPolicy(policy)}>
                    حذف
                  </Button>
                </div>
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

      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-black opacity-30 fixed inset-0" onClick={() => setAddOpen(false)} />
          <div className="card relative w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-text-default">إضافة سياسة</h2>
            <SlaPolicyForm
              mode="create"
              initialValues={{
                name: "",
                priority: "Low",
                responseTimeMinutes: 30,
                resolutionTimeMinutes: 240,
                isActive: true,
              }}
              onSubmit={createSlaPolicyAction}
              onDone={() => {
                setAddOpen(false);
                router.refresh();
              }}
            />
          </div>
        </div>
      )}

      {editingPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-black opacity-30 fixed inset-0" onClick={() => setEditingPolicy(null)} />
          <div className="card relative w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-text-default">تعديل السياسة</h2>
            <SlaPolicyForm
              mode="edit"
              initialValues={{
                name: editingPolicy.name,
                priority: editingPolicy.priority,
                responseTimeMinutes: editingPolicy.responseTimeMinutes,
                resolutionTimeMinutes: editingPolicy.resolutionTimeMinutes,
                isActive: editingPolicy.isActive,
              }}
              onSubmit={(values) => updateSlaPolicyAction(editingPolicy.id, values)}
              onDone={() => {
                setEditingPolicy(null);
                router.refresh();
              }}
            />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deletingPolicy !== null}
        title="حذف السياسة"
        description={`هل أنت متأكد من حذف "${deletingPolicy?.name}"؟`}
        confirmLabel="حذف"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingPolicy(null)}
        isConfirming={isDeleting}
      />
    </div>
  );
}
