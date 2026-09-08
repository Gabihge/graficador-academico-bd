import { useCallback, useEffect, useState } from "react";
import { useWorkspaceStore } from "@/state/workspaceStore";
import { useDerEditorStore } from "@/state/derEditorStore";
import { WorkspaceLanding } from "@/features/workspace/WorkspaceLanding";
import { Explorer } from "@/features/workspace/Explorer";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { Header, type EditorMode } from "./Header";
import { ToolRail, type ToolId } from "./ToolRail";
import { Inspector, type InspectorTab } from "./Inspector";
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
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("propiedades");
  const [activeTool, setActiveTool] = useState<ToolId>("select");
  const [editorMode, setEditorMode] = useState<EditorMode>("der");
  const [aboutOpen, setAboutOpen] = useState(false);

  const activeDocument = useWorkspaceStore((s) =>
    s.documents.find((doc) => doc.id === s.activeDocumentId),
  );
  const loadDer = useDerEditorStore((s) => s.load);
  const clearDer = useDerEditorStore((s) => s.clear);
  const undo = useDerEditorStore((s) => s.undo);
  const redo = useDerEditorStore((s) => s.redo);

  // Sincroniza el editor DER con el documento activo. El contenido semantico
  // vive en su propio store + Dexie; aca solo se dispara la carga/descarga.
  const isDerDocument =
    activeDocument?.kind === "der" || activeDocument?.kind === "combined";
  useEffect(() => {
    if (activeDocument && isDerDocument) {
      void loadDer(activeDocument.id);
    } else {
      clearDer();
    }
  }, [activeDocument, isDerDocument, loadDer, clearDer]);

  // Atajos de undo/redo del editor DER.
  useEffect(() => {
    if (!isDerDocument) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if ((key === "z" && event.shiftKey) || key === "y") {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isDerDocument, undo, redo]);

  const handleValidate = useCallback(() => {
    setInspectorOpen(true);
    setInspectorTab("validacion");
  }, []);

  return (
    <TooltipProvider>
      <div className="relative h-screen w-screen overflow-hidden bg-neutral-50 text-neutral-800">
        <CanvasHost
          editorMode={editorMode}
          activeTool={activeTool}
          onToolConsumed={() => setActiveTool("select")}
        />

        {/* Capa de chrome: no captura clicks salvo en sus hijos interactivos. */}
        <div className="pointer-events-none absolute inset-0">
          <Header
            editorMode={editorMode}
            onEditorModeChange={setEditorMode}
            explorerOpen={explorerOpen}
            onToggleExplorer={() => setExplorerOpen((open) => !open)}
            inspectorOpen={inspectorOpen}
            onToggleInspector={() => setInspectorOpen((open) => !open)}
            derEditorActive={Boolean(isDerDocument)}
            onValidate={handleValidate}
            onAbout={() => setAboutOpen(true)}
          />
          <ToolRail
            activeTool={activeTool}
            onToolChange={setActiveTool}
            shiftedRight={explorerOpen}
          />
          {explorerOpen && <Explorer onCollapse={() => setExplorerOpen(false)} />}
          {inspectorOpen && (
            <Inspector
              tab={inspectorTab}
              onTabChange={setInspectorTab}
              derEditorActive={Boolean(isDerDocument)}
              onCollapse={() => setInspectorOpen(false)}
            />
          )}
        </div>

        <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
      </div>
    </TooltipProvider>
  );
}
