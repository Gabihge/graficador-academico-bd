import { Tooltip } from "@/components/ui/Tooltip";
import type { ToolDef, ToolId } from "./tools";

// Herramientas del canvas. El conjunto (`tools`) depende del editor activo:
// AppShell pasa DER_TOOLS o MR_TOOLS (ver ./tools). Las variantes se eligen
// despues en el Inspector, no con un boton por subtipo.
export type { ToolId, ToolDef } from "./tools";

interface ToolRailProps {
  tools: ToolDef[];
  activeTool: ToolId;
  onToolChange: (tool: ToolId) => void;
  shiftedRight: boolean;
}

export function ToolRail({ tools, activeTool, onToolChange, shiftedRight }: ToolRailProps) {
  return (
    <div
      className={`pointer-events-auto absolute top-1/2 z-20 flex -translate-y-1/2 flex-col gap-1 rounded-2xl border border-neutral-200/70 bg-white/75 p-1 shadow-sm backdrop-blur-md transition-[left] ${
        shiftedRight ? "left-[19.75rem]" : "left-3"
      }`}
      role="toolbar"
      aria-label="Herramientas de dibujo"
      aria-orientation="vertical"
    >
      {tools.map((tool) => {
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
