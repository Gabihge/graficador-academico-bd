import { useId, useState } from "react";
import { Modal } from "./Modal";
import { primaryButton, secondaryButton, textInput } from "./buttonStyles";

interface PromptDialogProps {
  open: boolean;
  title: string;
  description?: string;
  label: string;
  initialValue?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: (value: string) => void;
}

/**
 * Modal con un unico campo de texto. Se usa para crear/renombrar proyectos
 * y carpetas. Bloquea el envio si el campo queda vacio.
 */
export function PromptDialog({
  open,
  title,
  description,
  label,
  initialValue = "",
  confirmLabel = "Aceptar",
  onCancel,
  onConfirm,
}: PromptDialogProps) {
  const inputId = useId();
  const [value, setValue] = useState(initialValue);
  const [wasOpen, setWasOpen] = useState(open);

  // Reinicia el campo cada vez que el modal pasa de cerrado a abierto.
  // Ajuste de estado durante el render (patron recomendado por React en
  // lugar de un efecto que llama a setState).
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setValue(initialValue);
  }

  const trimmed = value.trim();

  return (
    <Modal open={open} onOpenChange={(next) => (next ? undefined : onCancel())} title={title} description={description}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (trimmed.length === 0) return;
          onConfirm(trimmed);
        }}
      >
        <label htmlFor={inputId} className="mb-1 block text-xs font-medium text-neutral-600">
          {label}
        </label>
        <input
          id={inputId}
          className={textInput}
          value={value}
          autoFocus
          onChange={(event) => setValue(event.target.value)}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className={secondaryButton} onClick={onCancel}>
            Cancelar
          </button>
          <button type="submit" className={primaryButton} disabled={trimmed.length === 0}>
            {confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
