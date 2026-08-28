"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/customers/ConfirmDialog";
import { deleteCustomerAction } from "@/app/(pages)/customers/actions";

export type DeleteCustomerButtonProps = {
  id: string;
  customerName: string;
  redirectAfterDelete?: boolean;
};

export function DeleteCustomerButton({
  id,
  customerName,
  redirectAfterDelete,
}: DeleteCustomerButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleConfirm() {
    setIsDeleting(true);
    const result = await deleteCustomerAction(id);
    setIsDeleting(false);
    setOpen(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    if (redirectAfterDelete) {
      router.push("/customers");
    } else {
      router.refresh();
    }
  }

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        حذف
      </Button>
      <ConfirmDialog
        open={open}
        title="حذف العميل"
        description={`هل أنت متأكد من حذف "${customerName}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmLabel="حذف"
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
        isConfirming={isDeleting}
      />
    </>
  );
}
