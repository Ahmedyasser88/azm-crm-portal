"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/customers/ConfirmDialog";
import { QuickReplyTemplateForm } from "@/components/dashboard/QuickReplyTemplateForm";
import {
  createQuickReplyTemplateAction,
  updateQuickReplyTemplateAction,
  deleteQuickReplyTemplateAction,
} from "@/app/(pages)/dashboard/quickReplyActions";
import type { QuickReplyTemplateListItem } from "@/lib/types/quickReplyTemplate";

export type QuickReplyTemplatesPanelProps = {
  templates: QuickReplyTemplateListItem[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  page: number;
  initialSearch: string;
};

export function QuickReplyTemplatesPanel({
  templates,
  hasNextPage,
  hasPreviousPage,
  page,
  initialSearch,
}: QuickReplyTemplatesPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(initialSearch);
  const [addOpen, setAddOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<QuickReplyTemplateListItem | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<QuickReplyTemplateListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const trimmed = search.trim();

    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (trimmed) {
        params.set("templatesSearch", trimmed);
      } else {
        params.delete("templatesSearch");
      }
      params.delete("templatesPage");

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    }, 300);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function buildHref(targetPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("templatesPage", String(targetPage));
    return `${pathname}?${params.toString()}`;
  }

  async function handleDeleteConfirm() {
    if (!deletingTemplate) return;
    setIsDeleting(true);
    const result = await deleteQuickReplyTemplateAction(deletingTemplate.id);
    setIsDeleting(false);
    setDeletingTemplate(null);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-default">قوالب الردود السريعة</h2>
        <Button onClick={() => setAddOpen(true)}>+ إضافة قالب</Button>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="ابحث بالعنوان أو النص..."
        className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
      />

      {templates.length === 0 ? (
        <p className="text-sm text-text-secondary text-center py-6">لا توجد قوالب بعد</p>
      ) : (
        <ul className="space-y-3">
          {templates.map((template) => (
            <li key={template.id} className="border-b border-gray-300 last:border-0 pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-text-default">{template.title}</p>
                  <p className="text-sm text-text-secondary line-clamp-2">{template.body}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => setEditingTemplate(template)}>
                    تعديل
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDeletingTemplate(template)}>
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
            <h2 className="text-lg font-semibold text-text-default">إضافة قالب</h2>
            <QuickReplyTemplateForm
              mode="create"
              initialValues={{ title: "", body: "" }}
              onSubmit={createQuickReplyTemplateAction}
              onDone={() => {
                setAddOpen(false);
                router.refresh();
              }}
            />
          </div>
        </div>
      )}

      {editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-black opacity-30 fixed inset-0" onClick={() => setEditingTemplate(null)} />
          <div className="card relative w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-text-default">تعديل القالب</h2>
            <QuickReplyTemplateForm
              mode="edit"
              initialValues={{ title: editingTemplate.title, body: editingTemplate.body }}
              onSubmit={(values) => updateQuickReplyTemplateAction(editingTemplate.id, values)}
              onDone={() => {
                setEditingTemplate(null);
                router.refresh();
              }}
            />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deletingTemplate !== null}
        title="حذف القالب"
        description={`هل أنت متأكد من حذف "${deletingTemplate?.title}"؟`}
        confirmLabel="حذف"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingTemplate(null)}
        isConfirming={isDeleting}
      />
    </div>
  );
}
