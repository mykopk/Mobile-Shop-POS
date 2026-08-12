import { Dialog } from "@/components/ui/dialog";

export function DiscardConfirmDialog({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog
      open={open}
      title="Discard unsaved changes?"
      message="You have unsaved changes in this form. Close without saving?"
      confirmLabel="Discard changes"
      cancelLabel="Keep editing"
      destructive
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
