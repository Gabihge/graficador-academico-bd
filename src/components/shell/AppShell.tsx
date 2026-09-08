import { useCallback, useEffect, useState } from "react";
import { useWorkspaceStore } from "@/state/workspaceStore";
import { useDerEditorStore } from "@/state/derEditorStore";
import { useMrStore } from "@/state/mrStore";
import {
  findExistingDerivedMr,
  runTransformation,
  type TransformationOutcome,
} from "@/state/transformationController";
import { isDerValid } from "@/features/validation";
import { MrResultModal, RegenerateDialog } from "@/features/transformation";
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

interface RegenState {
  sourceDocumentId: string;
  existingMrDocumentId: string;
  existingMrName: string;
  hasManualChanges: boolean;
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
  const [transformResult, setTransformResult] = useState<TransformationOutcome | null>(null);
  const [regen, setRegen] = useState<RegenState | null>(null);

  const activeDocument = useWorkspaceStore((s) =>
    s.documents.find((doc) => doc.id === s.activeDocumentId),
  );
  const loadDer = useDerEditorStore((s) => s.load);
  const clearDer = useDerEditorStore((s) => s.clear);
  const undo = useDerEditorStore((s) => s.undo);
  const redo = useDerEditorStore((s) => s.redo);
  const derModel = useDerEditorStore((s) => s.model);
  const loadMr = useMrStore((s) => s.load);
  const clearMr = useMrStore((s) => s.clear);

  const isDerDocument =
    activeDocument?.kind === "der" || activeDocument?.kind === "combined";
  const isMrDocument =
    activeDocument?.kind === "mr" || activeDocument?.kind === "combined";

  // Sincroniza el editor DER con el documento activo.
  useEffect(() => {
    if (activeDocument && isDerDocument) void loadDer(activeDocument.id);
    else clearDer();
  }, [activeDocument, isDerDocument, loadDer, clearDer]);

  // Sincroniza el visor de MR (solo lectura) con el documento activo.
  useEffect(() => {
    if (activeDocument && isMrDocument) void loadMr(activeDocument.id);
    else clearMr();
  }, [activeDocument, isMrDocument, loadMr, clearMr]);

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

  // El Inspector aparece al seleccionar un elemento del canvas (spec 11.5).
  useEffect(
    () =>
      useDerEditorStore.subscribe((state, prev) => {
        if (state.selection && !prev.selection) setInspectorOpen(true);
      }),
    [],
  );

  const handleValidate = useCallback(() => {
    setInspectorOpen(true);
    setInspectorTab("validacion");
  }, []);

  const canTransform =
    Boolean(isDerDocument) && derModel.entities.length > 0 && isDerValid(derModel);

  const transform = useCallback(
    async (sourceDocumentId: string, mode: Parameters<typeof runTransformation>[1]) => {
      const outcome = await runTransformation(sourceDocumentId, mode);
      setRegen(null);
      setTransformResult(outcome);
    },
    [],
  );

  const handleTransform = useCallback(async () => {
    const sourceDocumentId = activeDocument?.id;
    if (!sourceDocumentId) return;
    const existing = await findExistingDerivedMr(sourceDocumentId);
    const first = existing[0];
    if (first) {
      const doc = useWorkspaceStore
        .getState()
        .documents.find((d) => d.id === first.documentId);
      setRegen({
        sourceDocumentId,
        existingMrDocumentId: first.documentId,
        existingMrName: doc?.name ?? "MR derivado",
        hasManualChanges: first.derivation?.hasManualChanges ?? false,
      });
      return;
    }
    await transform(sourceDocumentId, { kind: "new" });
  }, [activeDocument, transform]);

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
            canTransform={canTransform}
            onTransform={() => void handleTransform()}
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

        <RegenerateDialog
          open={regen !== null}
          existingMrName={regen?.existingMrName ?? ""}
          hasManualChanges={regen?.hasManualChanges ?? false}
          onCancel={() => setRegen(null)}
          onCreateNew={() => {
            if (regen) void transform(regen.sourceDocumentId, { kind: "new" });
          }}
          onReplace={() => {
            if (regen) {
              void transform(regen.sourceDocumentId, {
                kind: "replace",
                targetDocumentId: regen.existingMrDocumentId,
              });
            }
          }}
        />

        <MrResultModal
          open={transformResult !== null}
          onClose={() => setTransformResult(null)}
          documentName={transformResult?.documentName ?? ""}
          model={transformResult?.relational ?? { schemas: [], notes: [], revision: 0 }}
          trace={transformResult?.trace ?? { entries: [] }}
        />
      </div>
    </TooltipProvider>
  );
}
