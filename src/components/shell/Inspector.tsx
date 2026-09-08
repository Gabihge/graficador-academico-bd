import * as Tabs from "@radix-ui/react-tabs";
import { MousePointerClick, PanelRightClose } from "lucide-react";
import { PropertiesTab, ValidationTab } from "@/features/der-editor";
import { ghostIconButton } from "@/components/ui/buttonStyles";

export type InspectorTab = "propiedades" | "validacion";

interface InspectorProps {
  tab: InspectorTab;
  onTabChange: (tab: InspectorTab) => void;
  /** Hay un documento DER activo: muestra las pestanas del editor. */
  derEditorActive: boolean;
  onCollapse: () => void;
}

/**
 * Panel lateral derecho contextual. Con un documento DER activo muestra dos
 * pestanas: "Propiedades" (edicion del elemento seleccionado) y "Validacion"
 * (integridad estructural del modelo). Sin editor DER, queda vacio (el editor
 * MR llega en el Incremento 5).
 */
export function Inspector({ tab, onTabChange, derEditorActive, onCollapse }: InspectorProps) {
  return (
    <aside className="pointer-events-auto absolute top-20 right-3 bottom-3 z-20 flex w-72 flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white/85 shadow-sm backdrop-blur-md">
      <div className="flex items-center justify-between px-3 py-2.5">
        <span className="text-sm font-semibold text-neutral-800">Inspector</span>
        <button
          type="button"
          className={ghostIconButton}
          aria-label="Ocultar inspector"
          onClick={onCollapse}
        >
          <PanelRightClose size={16} aria-hidden />
        </button>
      </div>

      {derEditorActive ? (
        <Tabs.Root
          value={tab}
          onValueChange={(value) => onTabChange(value as InspectorTab)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <Tabs.List
            className="mx-3 mb-1 grid grid-cols-2 gap-1 rounded-lg border border-neutral-200 bg-white/60 p-0.5 text-xs font-medium"
            aria-label="Vistas del inspector"
          >
            <Tabs.Trigger
              value="propiedades"
              className="rounded-md px-2 py-1 text-neutral-500 transition-colors data-[state=active]:bg-neutral-800 data-[state=active]:text-white"
            >
              Propiedades
            </Tabs.Trigger>
            <Tabs.Trigger
              value="validacion"
              className="rounded-md px-2 py-1 text-neutral-500 transition-colors data-[state=active]:bg-neutral-800 data-[state=active]:text-white"
            >
              Validacion
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="propiedades" className="flex min-h-0 flex-1 flex-col">
            <PropertiesTab />
          </Tabs.Content>
          <Tabs.Content value="validacion" className="flex min-h-0 flex-1 flex-col">
            <ValidationTab onNavigateToElement={() => onTabChange("propiedades")} />
          </Tabs.Content>
        </Tabs.Root>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <MousePointerClick size={22} className="text-neutral-300" aria-hidden />
          <p className="text-xs text-neutral-400">
            Abri un documento DER para editar entidades, relaciones y atributos.
          </p>
        </div>
      )}
    </aside>
  );
}
