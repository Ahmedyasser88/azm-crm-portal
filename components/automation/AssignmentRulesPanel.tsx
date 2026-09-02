"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/customers/ConfirmDialog";
import { AssignmentRuleForm } from "@/components/automation/AssignmentRuleForm";
import {
  createAssignmentRuleAction,
  updateAssignmentRuleAction,
  deleteAssignmentRuleAction,
} from "@/app/(pages)/automation/assignmentRuleActions";
import { TICKET_CATEGORIES, TICKET_CATEGORY_LABELS, TICKET_PRIORITIES, TICKET_PRIORITY_LABELS } from "@/lib/constants/ticket";
import type { AssignmentRuleListItem } from "@/lib/types/assignmentRule";

const selectClassName =
  "rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20";

export type AssignmentRulesPanelProps = {
  rules: AssignmentRuleListItem[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  page: number;
  categoryFilter: string;
  priorityFilter: string;
  activeFilter: string;
};

export function AssignmentRulesPanel({
  rules,
  hasNextPage,
  hasPreviousPage,
  page,
  categoryFilter,
  priorityFilter,
  activeFilter,
}: AssignmentRulesPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [addOpen, setAddOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AssignmentRuleListItem | null>(null);
  const [deletingRule, setDeletingRule] = useState<AssignmentRuleListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function updateParam(name: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }
    params.delete("assignPage");

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  function buildHref(targetPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("assignPage", String(targetPage));
    return `${pathname}?${params.toString()}`;
  }

  async function handleDeleteConfirm() {
    if (!deletingRule) return;
    setIsDeleting(true);
    const result = await deleteAssignmentRuleAction(deletingRule.id);
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
        <h2 className="text-lg font-semibold text-text-default">قواعد الإسناد التلقائي</h2>
        <Button onClick={() => setAddOpen(true)}>+ إضافة قاعدة</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={categoryFilter}
          onChange={(e) => updateParam("assignCategory", e.target.value)}
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
          value={priorityFilter}
          onChange={(e) => updateParam("assignPriority", e.target.value)}
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
          onChange={(e) => updateParam("assignActive", e.target.value)}
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
                  <p className="text-sm font-medium text-text-default">
                    {rule.name} <span className="text-text-secondary font-normal">(ترتيب {rule.evaluationOrder})</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-block rounded-full bg-primary-100 text-primary text-xs font-medium px-2 py-0.5">
                      {rule.category ? TICKET_CATEGORY_LABELS[rule.category] : "أي فئة"}
                    </span>
                    <span className="inline-block rounded-full bg-primary-100 text-primary text-xs font-medium px-2 py-0.5">
                      {rule.priority ? TICKET_PRIORITY_LABELS[rule.priority] : "أي أولوية"}
                    </span>
                    {!rule.isActive && (
                      <span className="inline-block rounded-full bg-gray-200 text-text-secondary text-xs font-medium px-2 py-0.5">
                        غير نشطة
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary">
                    تُسند إلى: {rule.assignedToUserName ?? rule.assignedToUserId}
                  </p>
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
            <AssignmentRuleForm
              mode="create"
              initialValues={{
                name: "",
                category: null,
                priority: null,
                assignedToUserId: "",
                evaluationOrder: 0,
                isActive: true,
              }}
              onSubmit={createAssignmentRuleAction}
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
            <AssignmentRuleForm
              mode="edit"
              initialValues={{
                name: editingRule.name,
                category: editingRule.category,
                priority: editingRule.priority,
                assignedToUserId: editingRule.assignedToUserId,
                evaluationOrder: editingRule.evaluationOrder,
                isActive: editingRule.isActive,
              }}
              initialAssignedToUserLabel={editingRule.assignedToUserName ?? undefined}
              onSubmit={(values) => updateAssignmentRuleAction(editingRule.id, values)}
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
