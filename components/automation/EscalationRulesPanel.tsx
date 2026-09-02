"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/customers/ConfirmDialog";
import { EscalationRuleForm } from "@/components/automation/EscalationRuleForm";
import {
  createEscalationRuleAction,
  updateEscalationRuleAction,
  deleteEscalationRuleAction,
} from "@/app/(pages)/automation/escalationRuleActions";
import { TICKET_PRIORITIES, TICKET_PRIORITY_LABELS } from "@/lib/constants/ticket";
import type { EscalationRuleListItem } from "@/lib/types/escalationRule";

const selectClassName =
  "rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20";

export type EscalationRulesPanelProps = {
  rules: EscalationRuleListItem[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  page: number;
  priorityFilter: string;
  activeFilter: string;
};

export function EscalationRulesPanel({
  rules,
  hasNextPage,
  hasPreviousPage,
  page,
  priorityFilter,
  activeFilter,
}: EscalationRulesPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [addOpen, setAddOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<EscalationRuleListItem | null>(null);
  const [deletingRule, setDeletingRule] = useState<EscalationRuleListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function updateParam(name: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }
    params.delete("escPage");

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  function buildHref(targetPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("escPage", String(targetPage));
    return `${pathname}?${params.toString()}`;
  }

  async function handleDeleteConfirm() {
    if (!deletingRule) return;
    setIsDeleting(true);
    const result = await deleteEscalationRuleAction(deletingRule.id);
    setIsDeleting(false);
    setDeletingRule(null);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-default">قواعد التصعيد التلقائي</h2>
        <Button onClick={() => setAddOpen(true)}>+ إضافة قاعدة</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={priorityFilter}
          onChange={(e) => updateParam("escPriority", e.target.value)}
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
          onChange={(e) => updateParam("escActive", e.target.value)}
          className={selectClassName}
        >
          <option value="">الكل</option>
          <option value="true">نشطة فقط</option>
          <option value="false">غير نشطة</option>
        </select>
      </div>

      {rules.length === 0 ? (
        <p className="text-sm text-text-secondary text-center py-6">لا توجد قواعد بعد</p>
      ) : (
        <ul className="space-y-3">
          {rules.map((rule) => (
            <li key={rule.id} className="border-b border-gray-300 last:border-0 pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-text-default">{rule.name}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-block rounded-full bg-primary-100 text-primary text-xs font-medium px-2 py-0.5">
                      {rule.priority ? TICKET_PRIORITY_LABELS[rule.priority] : "أي أولوية"}
                    </span>
                    <span className="inline-block rounded-full bg-primary-100 text-primary text-xs font-medium px-2 py-0.5">
                      فترة السماح: {rule.overdueMinutes} دقيقة
                    </span>
                    {!rule.isActive && (
                      <span className="inline-block rounded-full bg-gray-200 text-text-secondary text-xs font-medium px-2 py-0.5">
                        غير نشطة
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => setEditingRule(rule)}>
                    تعديل
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDeletingRule(rule)}>
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
            <h2 className="text-lg font-semibold text-text-default">إضافة قاعدة</h2>
            <EscalationRuleForm
              mode="create"
              initialValues={{ name: "", priority: null, overdueMinutes: 0, isActive: true }}
              onSubmit={createEscalationRuleAction}
              onDone={() => {
                setAddOpen(false);
                router.refresh();
              }}
            />
          </div>
        </div>
      )}

      {editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-black opacity-30 fixed inset-0" onClick={() => setEditingRule(null)} />
          <div className="card relative w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-text-default">تعديل القاعدة</h2>
            <EscalationRuleForm
              mode="edit"
              initialValues={{
                name: editingRule.name,
                priority: editingRule.priority,
                overdueMinutes: editingRule.overdueMinutes,
                isActive: editingRule.isActive,
              }}
              onSubmit={(values) => updateEscalationRuleAction(editingRule.id, values)}
              onDone={() => {
                setEditingRule(null);
                router.refresh();
              }}
            />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deletingRule !== null}
        title="حذف القاعدة"
        description={`هل أنت متأكد من حذف "${deletingRule?.name}"؟`}
        confirmLabel="حذف"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingRule(null)}
        isConfirming={isDeleting}
      />
    </div>
  );
}
