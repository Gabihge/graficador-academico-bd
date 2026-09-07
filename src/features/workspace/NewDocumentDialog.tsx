import { useId, useState } from "react";
import { DOCUMENT_KINDS, DOCUMENT_KIND_LABELS, type DocumentKind } from "@/domain/project";
import { Modal } from "@/components/ui/Modal";
import { primaryButton, secondaryButton, textInput } from "@/components/ui/buttonStyles";

interface NewDocumentDialogProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: (name: string, kind: DocumentKind) => void;
}

const KIND_HINTS: Record<DocumentKind, string> = {
  der: "Diagrama de entidad-relacion.",
  mr: "Modelo relacional (tablas).",
  combined: "DER y su MR derivado en un mismo documento.",
};

/** Modal de creacion de documento: nombre + tipo (DER / MR / combinado). */
export function NewDocumentDialog({ open, onCancel, onConfirm }: NewDocumentDialogProps) {
  const nameId = useId();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<DocumentKind>("der");
  const [wasOpen, setWasOpen] = useState(open);

  // Reinicia el formulario al abrir (ajuste de estado en render, no efecto).
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName("");
      setKind("der");
    }
  }

  const trimmed = name.trim();

  return (
    <Modal
      open={open}
      onOpenChange={(next) => (next ? undefined : onCancel())}
      title="Nuevo documento"
      description="Elegi un nombre y el tipo de modelo."
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (trimmed.length === 0) return;
          onConfirm(trimmed, kind);
        }}
      >
        <label htmlFor={nameId} className="mb-1 block text-xs font-medium text-neutral-600">
          Nombre
        </label>
        <input
          id={nameId}
          className={textInput}
          value={name}
          autoFocus
          onChange={(event) => setName(event.target.value)}
        />

        <fieldset className="mt-4">
          <legend className="mb-1.5 text-xs font-medium text-neutral-600">Tipo</legend>
          <div className="space-y-1.5">
            {DOCUMENT_KINDS.map((option) => (
              <label
                key={option}
                className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-neutral-200 p-2.5 has-[:checked]:border-neutral-500 has-[:checked]:bg-neutral-50"
              >
                <input
                  type="radio"
                  name="document-kind"
                  value={option}
                  checked={kind === option}
                  onChange={() => setKind(option)}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-sm font-medium text-neutral-800">
                    {DOCUMENT_KIND_LABELS[option]}
                  </span>
                  <span className="block text-xs text-neutral-500">{KIND_HINTS[option]}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className={secondaryButton} onClick={onCancel}>
            Cancelar
          </button>
          <button type="submit" className={primaryButton} disabled={trimmed.length === 0}>
            Crear documento
          </button>
        </div>
      </form>
    </Modal>
  );
}
