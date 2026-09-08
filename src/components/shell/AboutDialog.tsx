import { Modal } from "@/components/ui/Modal";
import { secondaryButton } from "@/components/ui/buttonStyles";

interface AboutDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AboutDialog({ open, onClose }: AboutDialogProps) {
  return (
    <Modal
      open={open}
      onOpenChange={(next) => (next ? undefined : onClose())}
      title="Graficador Academico de Bases de Datos"
    >
      <div className="space-y-2 text-sm text-neutral-600">
        <p>
          Herramienta para modelar diagramas de entidad-relacion (DER) y modelos relacionales (MR) de
          la materia Bases de Datos (3636), Ingenieria en Informatica, UNLaM.
        </p>
        <p className="font-medium text-neutral-700">
          Herramienta academica no oficial. No afiliada ni mantenida por UNLaM.
        </p>
        <p className="text-xs text-neutral-400">
          Local-first: los datos se guardan solo en este dispositivo. Sin backend ni telemetria.
        </p>
      </div>
      <div className="mt-4 flex justify-end">
        <button type="button" className={secondaryButton} onClick={onClose}>
          Cerrar
        </button>
      </div>
    </Modal>
  );
}
