import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}

/**
 * Envoltorio minimo sobre Radix Dialog con la estetica de la app (panel
 * claro, esquinas redondeadas, overlay translucido con blur). Accesible por
 * defecto: foco atrapado, cierre con Escape, titulo anunciado.
 */
export function Modal({ open, onOpenChange, title, description, children }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-neutral-900/25 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[26rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-neutral-200 bg-white p-5 shadow-2xl focus:outline-none"
        >
          <Dialog.Title className="text-sm font-semibold text-neutral-800">{title}</Dialog.Title>
          {description ? (
            <Dialog.Description className="mt-1 text-xs text-neutral-500">
              {description}
            </Dialog.Description>
          ) : (
            <Dialog.Description className="sr-only">{title}</Dialog.Description>
          )}
          <div className="mt-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
