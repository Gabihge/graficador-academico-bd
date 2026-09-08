import { Modal } from "./Modal";
import { primaryButton, secondaryButton } from "./buttonStyles";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Modal de confirmacion para acciones irreversibles (eliminar). */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Eliminar",
  destructive = true,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onOpenChange={(next) => (next ? undefined : onCancel())} title={title}>
      <p className="text-sm text-neutral-600">{message}</p>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className={secondaryButton} onClick={onCancel}>
          Cancelar
        </button>
        <button
          type="button"
          className={
            destructive
              ? "inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
              : primaryButton
          }
          onClick={onConfirm}
          autoFocus
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
