import { MousePointerClick, PanelRightClose } from "lucide-react";
import { ghostIconButton } from "@/components/ui/buttonStyles";

interface InspectorProps {
  onCollapse: () => void;
}

/**
 * Panel lateral derecho contextual. En el Incremento 1 esta vacio: no hay
 * elementos seleccionables todavia. La edicion de propiedades (con tabs
 * Propiedades / Validacion / Estilo) llega con el editor DER.
 */
export function Inspector({ onCollapse }: InspectorProps) {
  return (
    <aside className="pointer-events-auto absolute top-20 right-3 bottom-3 z-20 flex w-72 flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white/85 shadow-sm backdrop-blur-md">
      <div className="flex items-center justify-between px-3 py-2.5">
        <span className="text-sm font-semibold text-neutral-800">Inspector</span>
        <button type="button" className={ghostIconButton} aria-label="Ocultar inspector" onClick={onCollapse}>
          <PanelRightClose size={16} aria-hidden />
        </button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
        <MousePointerClick size={22} className="text-neutral-300" aria-hidden />
        <p className="text-xs text-neutral-400">
          Selecciona un elemento del canvas para ver y editar sus propiedades.
        </p>
      </div>
    </aside>
  );
}
