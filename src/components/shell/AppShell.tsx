import { useState } from "react";
import { useWorkspaceStore } from "@/state/workspaceStore";
import { WorkspaceLanding } from "@/features/workspace/WorkspaceLanding";
import { Explorer } from "@/features/workspace/Explorer";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { Header, type EditorMode } from "./Header";
import { ToolRail, type ToolId } from "./ToolRail";
import { Inspector } from "./Inspector";
import { CanvasHost } from "./CanvasHost";
import { AboutDialog } from "./AboutDialog";

/** Punto de entrada del shell: decide que mostrar segun el estado del workspace. */
export function AppShell() {
  const status = useWorkspaceStore((s) => s.status);

  if (status === "loading") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-neutral-50 text-sm text-neutral-400">
        Cargando espacio de trabajo…
      </div>
    );
  }

  if (status === "empty") {
    return <WorkspaceLanding />;
  }

  return <WorkspaceShell />;
}

/**
 * Layout de trabajo: canvas a pantalla completa con el shell flotante
 * encima (header, tool rail, explorer, inspector). Todo el estado de esta
 * funcion es efimero de UI (paneles, herramienta, vista) y vive en React
 * local, no en el store de dominio.
 */
function WorkspaceShell() {
  const [explorerOpen, setExplorerOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolId>("select");
  const [editorMode, setEditorMode] = useState<EditorMode>("der");
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <TooltipProvider>
      <div className="relative h-screen w-screen overflow-hidden bg-neutral-50 text-neutral-800">
        <CanvasHost />

        {/* Capa de chrome: no captura clicks salvo en sus hijos interactivos. */}
        <div className="pointer-events-none absolute inset-0">
          <Header
            editorMode={editorMode}
            onEditorModeChange={setEditorMode}
            explorerOpen={explorerOpen}
            onToggleExplorer={() => setExplorerOpen((open) => !open)}
            inspectorOpen={inspectorOpen}
            onToggleInspector={() => setInspectorOpen((open) => !open)}
            onAbout={() => setAboutOpen(true)}
          />
          <ToolRail
            activeTool={activeTool}
            onToolChange={setActiveTool}
            shiftedRight={explorerOpen}
          />
          {explorerOpen && <Explorer onCollapse={() => setExplorerOpen(false)} />}
          {inspectorOpen && <Inspector onCollapse={() => setInspectorOpen(false)} />}
        </div>

        <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
      </div>
    </TooltipProvider>
  );
}
