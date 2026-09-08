import { Modal } from "@/components/ui/Modal";
import { primaryButton, secondaryButton } from "@/components/ui/buttonStyles";

interface RegenerateDialogProps {
  open: boolean;
  /** Nombre del MR derivado existente que se reemplazaria. */
  existingMrName: string;
  hasManualChanges: boolean;
  onCancel: () => void;
  onCreateNew: () => void;
  onReplace: () => void;
}

/**
 * Spec 10: al re-transformar un DER que ya tiene un MR derivado, nunca
 * sobrescribir en silencio. Se ofrecen tres caminos.
 */
export function RegenerateDialog({
  open,
  existingMrName,
  hasManualChanges,
  onCancel,
  onCreateNew,
  onReplace,
}: RegenerateDialogProps) {
  return (
    <Modal
      open={open}
      onOpenChange={(next) => (next ? undefined : onCancel())}
      title="Regenerar el MR"
    >
      <p className="text-sm text-neutral-600">
        Este DER ya tiene un MR derivado (<span className="font-medium">{existingMrName}</span>).
      </p>
      {hasManualChanges && (
        <p className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-2 py-2 text-xs text-amber-700">
          Atencion: ese MR tiene cambios hechos a mano. Si lo reemplazas, esos cambios se pierden.
        </p>
      )}
      <div className="mt-4 flex flex-col gap-2">
        <button type="button" className={primaryButton} onClick={onCreateNew}>
          Crear un MR nuevo
        </button>
        <button
          type="button"
          className={`${secondaryButton} text-red-600`}
          onClick={onReplace}
        >
          Reemplazar el MR derivado
        </button>
        <button type="button" className={secondaryButton} onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </Modal>
  );
}
