"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/customers/ConfirmDialog";
import { KnowledgeArticleStepForm } from "@/components/knowledge-base/KnowledgeArticleStepForm";
import {
  addKnowledgeArticleStepAction,
  updateKnowledgeArticleStepAction,
  deleteKnowledgeArticleStepAction,
} from "@/app/(pages)/knowledge-base/actions";
import type { KnowledgeArticleStep } from "@/lib/types/knowledgeArticle";

export type KnowledgeArticleStepsSectionProps = {
  articleId: string;
  steps: KnowledgeArticleStep[];
};

export function KnowledgeArticleStepsSection({ articleId, steps }: KnowledgeArticleStepsSectionProps) {
  const router = useRouter();

  const [addOpen, setAddOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<KnowledgeArticleStep | null>(null);
  const [deletingStep, setDeletingStep] = useState<KnowledgeArticleStep | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDeleteConfirm() {
    if (!deletingStep) return;
    setIsDeleting(true);
    const result = await deleteKnowledgeArticleStepAction(articleId, deletingStep.id);
    setIsDeleting(false);
    setDeletingStep(null);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-default">الخطوات</h2>
        <Button onClick={() => setAddOpen(true)}>+ إضافة خطوة</Button>
      </div>

      {steps.length === 0 ? (
        <p className="text-sm text-text-secondary text-center py-6">لا توجد خطوات بعد</p>
      ) : (
        <ol className="space-y-3 list-decimal list-inside">
          {steps.map((step) => (
            <li key={step.id} className="border-b border-gray-300 last:border-0 pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-text-default">
                    <span className="text-text-secondary">#{step.stepNumber}</span> {step.title}
                  </p>
                  <p className="text-sm text-text-default whitespace-pre-wrap">{step.description}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => setEditingStep(step)}>
                    تعديل
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDeletingStep(step)}>
                    حذف
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-black opacity-30 fixed inset-0" onClick={() => setAddOpen(false)} />
          <div className="card relative w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-text-default">إضافة خطوة</h2>
            <KnowledgeArticleStepForm
              mode="create"
              initialValues={{ stepNumber: steps.length + 1, title: "", description: "" }}
              onSubmit={(values) => addKnowledgeArticleStepAction(articleId, values)}
              onDone={() => {
                setAddOpen(false);
                router.refresh();
              }}
            />
          </div>
        </div>
      )}

      {editingStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-black opacity-30 fixed inset-0" onClick={() => setEditingStep(null)} />
          <div className="card relative w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-text-default">تعديل الخطوة</h2>
            <KnowledgeArticleStepForm
              mode="edit"
              initialValues={{
                stepNumber: editingStep.stepNumber,
                title: editingStep.title,
                description: editingStep.description,
              }}
              onSubmit={(values) => updateKnowledgeArticleStepAction(articleId, editingStep.id, values)}
              onDone={() => {
                setEditingStep(null);
                router.refresh();
              }}
            />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deletingStep !== null}
        title="حذف الخطوة"
        description={`هل أنت متأكد من حذف الخطوة "${deletingStep?.title}"؟`}
        confirmLabel="حذف"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingStep(null)}
        isConfirming={isDeleting}
      />
    </div>
  );
}
