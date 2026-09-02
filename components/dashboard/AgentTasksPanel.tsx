"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/customers/ConfirmDialog";
import { AgentTaskForm } from "@/components/dashboard/AgentTaskForm";
import {
  createAgentTaskAction,
  updateAgentTaskAction,
  setAgentTaskCompletionAction,
  deleteAgentTaskAction,
} from "@/app/(pages)/dashboard/actions";
import { formatDateTime } from "@/lib/utils/date";
import type { AgentTask } from "@/lib/types/agentTask";

export type AgentTasksPanelProps = {
  tasks: AgentTask[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  page: number;
  showCompleted: boolean;
};

export function AgentTasksPanel({
  tasks,
  hasNextPage,
  hasPreviousPage,
  page,
  showCompleted,
}: AgentTasksPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [addOpen, setAddOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<AgentTask | null>(null);
  const [deletingTask, setDeletingTask] = useState<AgentTask | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function buildHref(targetPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tasksPage", String(targetPage));
    return `${pathname}?${params.toString()}`;
  }

  function toggleShowCompleted() {
    const params = new URLSearchParams(searchParams.toString());
    if (showCompleted) {
      params.delete("isCompleted");
    } else {
      params.set("isCompleted", "true");
    }
    params.delete("tasksPage");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  async function handleToggleCompletion(task: AgentTask) {
    setTogglingId(task.id);
    const result = await setAgentTaskCompletionAction(task.id, !task.isCompleted);
    setTogglingId(null);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  async function handleDeleteConfirm() {
    if (!deletingTask) return;
    setIsDeleting(true);
    const result = await deleteAgentTaskAction(deletingTask.id);
    setIsDeleting(false);
    setDeletingTask(null);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-default">المهام والتذكيرات</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleShowCompleted}
            className={
              showCompleted
                ? "rounded-lg bg-primary text-white px-3 py-2 text-sm font-medium"
                : "rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-text-default"
            }
          >
            إظهار المكتملة
          </button>
          <Button onClick={() => setAddOpen(true)}>+ إضافة مهمة</Button>
        </div>
      </div>

      {tasks.length === 0 ? (
        <p className="text-sm text-text-secondary text-center py-6">لا توجد مهام</p>
      ) : (
        <ul className="space-y-3">
          {tasks.map((task) => (
            <li key={task.id} className="border-b border-gray-300 last:border-0 pb-3">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={task.isCompleted}
                  disabled={togglingId === task.id}
                  onChange={() => handleToggleCompletion(task)}
                  className="mt-1"
                />
                <div className="flex-1 space-y-1">
                  <p
                    className={
                      task.isCompleted
                        ? "text-sm line-through text-text-secondary"
                        : "text-sm font-medium text-text-default"
                    }
                  >
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-sm text-text-secondary whitespace-pre-wrap">{task.description}</p>
                  )}
                  {task.dueOn && (
                    <p className="text-xs text-text-secondary">{formatDateTime(task.dueOn)}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingTask(task)}>
                    تعديل
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDeletingTask(task)}>
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
            <h2 className="text-lg font-semibold text-text-default">إضافة مهمة</h2>
            <AgentTaskForm
              mode="create"
              initialValues={{ title: "", description: "", dueOn: "" }}
              onSubmit={createAgentTaskAction}
              onDone={() => {
                setAddOpen(false);
                router.refresh();
              }}
            />
          </div>
        </div>
      )}

      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-black opacity-30 fixed inset-0" onClick={() => setEditingTask(null)} />
          <div className="card relative w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-text-default">تعديل المهمة</h2>
            <AgentTaskForm
              mode="edit"
              initialValues={{
                title: editingTask.title,
                description: editingTask.description ?? "",
                dueOn: editingTask.dueOn ? editingTask.dueOn.slice(0, 16) : "",
              }}
              onSubmit={(values) => updateAgentTaskAction(editingTask.id, values)}
              onDone={() => {
                setEditingTask(null);
                router.refresh();
              }}
            />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deletingTask !== null}
        title="حذف المهمة"
        description={`هل أنت متأكد من حذف "${deletingTask?.title}"؟`}
        confirmLabel="حذف"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingTask(null)}
        isConfirming={isDeleting}
      />
    </div>
  );
}
