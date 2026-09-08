import * as Dialog from "@radix-ui/react-dialog";
import type { RelationalModel } from "@/domain/relational";
import type { TransformationTrace } from "@/domain/transformation";
import { secondaryButton } from "@/components/ui/buttonStyles";
import { MrReadonlyView } from "./MrReadonlyView";

interface MrResultModalProps {
  open: boolean;
  onClose: () => void;
  documentName: string;
  model: RelationalModel;
  trace: TransformationTrace;
}

/** Modal de solo lectura con el resultado de la transformacion DER -> MR. */
export function MrResultModal({
  open,
  onClose,
  documentName,
  model,
  trace,
}: MrResultModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-neutral-900/25 backdrop-blur-sm" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100vh-4rem)] w-[42rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-neutral-200 bg-white shadow-2xl focus:outline-none">
          <div className="border-b border-neutral-100 p-5 pb-3">
            <Dialog.Title className="text-sm font-semibold text-neutral-800">
              MR derivado (automatico)
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-xs text-neutral-500">
              {documentName} · generado por transformacion determinista desde el DER. Solo lectura
              (la edicion del MR llega en el proximo incremento).
            </Dialog.Description>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <MrReadonlyView model={model} trace={trace} />
          </div>
          <div className="flex justify-end border-t border-neutral-100 p-4">
            <button type="button" className={secondaryButton} onClick={onClose}>
              Cerrar
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
