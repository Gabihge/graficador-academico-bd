import type { LucideIcon } from "lucide-react";
import { Circle, Diamond, MousePointer2, Square, StickyNote, Triangle } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";

// Herramientas de la notacion Chen (spec 11.3). Desde el Incremento 3 dibujan
// de verdad "select", "entity", "relationship", "attribute" y "hierarchy".
// "note" sigue presente pero INERTE (las notas son del Incremento 8). Las
// variantes (entidad debil, tipo de atributo, etc.) se eligen despues en el
// Inspector, no con un boton por subtipo. Ver docs/DECISIONS.md.
export type ToolId = "select" | "entity" | "relationship" | "attribute" | "hierarchy" | "note";

const TOOLS: { id: ToolId; label: string; icon: LucideIcon }[] = [
  { id: "select", label: "Seleccionar", icon: MousePointer2 },
  { id: "entity", label: "Entidad", icon: Square },
  { id: "relationship", label: "Relacion", icon: Diamond },
  { id: "attribute", label: "Atributo", icon: Circle },
  { id: "hierarchy", label: "Jerarquia", icon: Triangle },
  { id: "note", label: "Nota", icon: StickyNote },
];

interface ToolRailProps {
  activeTool: ToolId;
  onToolChange: (tool: ToolId) => void;
  shiftedRight: boolean;
}

export function ToolRail({ activeTool, onToolChange, shiftedRight }: ToolRailProps) {
  return (
    <div
      className={`pointer-events-auto absolute top-1/2 z-20 flex -translate-y-1/2 flex-col gap-1 rounded-2xl border border-neutral-200/70 bg-white/75 p-1 shadow-sm backdrop-blur-md transition-[left] ${
        shiftedRight ? "left-[19.75rem]" : "left-3"
      }`}
      role="toolbar"
      aria-label="Herramientas de dibujo"
      aria-orientation="vertical"
    >
      {TOOLS.map((tool) => {
        const Icon = tool.icon;
        const isActive = tool.id === activeTool;
        return (
          <Tooltip key={tool.id} label={tool.label}>
            <button
              type="button"
              aria-pressed={isActive}
              aria-label={tool.label}
              onClick={() => onToolChange(tool.id)}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-xl transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-800 ${
                isActive
                  ? "bg-neutral-800 text-white"
                  : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
              }`}
            >
              <Icon size={17} aria-hidden />
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}
