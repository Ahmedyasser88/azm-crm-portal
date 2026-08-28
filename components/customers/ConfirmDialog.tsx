"use client";

import { Button } from "@/components/ui/button";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  isConfirming?: boolean;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
  isConfirming,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bg-black opacity-30 fixed inset-0" onClick={onCancel} />
      <div className="card relative w-full max-w-sm space-y-4">
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold text-text-default">{title}</h2>
          <p className="text-sm text-text-secondary">{description}</p>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isConfirming}>
            إلغاء
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isConfirming}>
            {isConfirming ? "جارٍ التنفيذ..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
