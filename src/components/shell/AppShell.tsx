import { useCallback, useEffect, useState } from "react";
import { useWorkspaceStore } from "@/state/workspaceStore";
import { useDerEditorStore } from "@/state/derEditorStore";
import { useMrEditorStore } from "@/state/mrEditorStore";
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
import { ToolRail } from "./ToolRail";
import { DER_TOOLS, MR_TOOLS, type ToolId } from "./tools";
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

type ActiveEditor = "der" | "mr" | null;

/**
 * Layout de trabajo: canvas a pantalla completa con el shell flotante encima.
 * Todo el estado de esta funcion es efimero de UI (paneles, herramienta,
 * vista) y vive en React local, no en el store de dominio.
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
  const derModel = useDerEditorStore((s) => s.model);
  const derUndo = useDerEditorStore((s) => s.undo);
  const derRedo = useDerEditorStore((s) => s.redo);
  const derCanUndo = useDerEditorStore((s) => s.past.length > 0);
  const derCanRedo = useDerEditorStore((s) => s.future.length > 0);

  const loadMr = useMrEditorStore((s) => s.load);
  const clearMr = useMrEditorStore((s) => s.clear);
  const mrUndo = useMrEditorStore((s) => s.undo);
  const mrRedo = useMrEditorStore((s) => s.redo);
  const mrCanUndo = useMrEditorStore((s) => s.past.length > 0);
  const mrCanRedo = useMrEditorStore((s) => s.future.length > 0);

  const isDerDocument =
    activeDocument?.kind === "der" || activeDocument?.kind === "combined";
  const isMrDocument =
    activeDocument?.kind === "mr" || activeDocument?.kind === "combined";

  const activeEditor: ActiveEditor = !activeDocument
    ? null
    : activeDocument.kind === "der"
      ? "der"
      : activeDocument.kind === "mr"
        ? "mr"
        : editorMode; // combinado: sigue la vista DER/MR

  // Sincroniza cada editor con el documento activo.
  useEffect(() => {
    if (activeDocument && isDerDocument) void loadDer(activeDocument.id);
    else clearDer();
  }, [activeDocument, isDerDocument, loadDer, clearDer]);

  useEffect(() => {
    if (activeDocument && isMrDocument) void loadMr(activeDocument.id);
    else clearMr();
  }, [activeDocument, isMrDocument, loadMr, clearMr]);

  const tools = activeEditor === "mr" ? MR_TOOLS : DER_TOOLS;
  // Si la herramienta activa no pertenece al editor actual (p. ej. quedo
  // "schema" al pasar a un DER), se comporta como "select" hasta que el
  // usuario elija otra.
  const effectiveTool: ToolId = tools.some((t) => t.id === activeTool) ? activeTool : "select";

  const undo = activeEditor === "mr" ? mrUndo : derUndo;
  const redo = activeEditor === "mr" ? mrRedo : derRedo;
  const canUndo = activeEditor === "mr" ? mrCanUndo : activeEditor === "der" ? derCanUndo : false;
  const canRedo = activeEditor === "mr" ? mrCanRedo : activeEditor === "der" ? derCanRedo : false;

  // Atajos de undo/redo del editor activo.
  useEffect(() => {
    if (!activeEditor) return;
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
  }, [activeEditor, undo, redo]);

  // El Inspector aparece al seleccionar un elemento en cualquiera de los dos
  // editores (spec 11.5). Suscripcion al store externo, no un setState sincrono.
  useEffect(() => {
    const open = (state: { selection: unknown }, prev: { selection: unknown }) => {
      if (state.selection && !prev.selection) setInspectorOpen(true);
    };
    const offDer = useDerEditorStore.subscribe(open);
    const offMr = useMrEditorStore.subscribe(open);
    return () => {
      offDer();
      offMr();
    };
  }, []);

  const handleValidate = useCallback(() => {
    setInspectorOpen(true);
    setInspectorTab("validacion");
  }, []);

  const canTransform =
    activeEditor === "der" && derModel.entities.length > 0 && isDerValid(derModel);

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
          activeTool={effectiveTool}
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
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
            canValidate={activeEditor !== null}
            onValidate={handleValidate}
            canTransform={canTransform}
            onTransform={() => void handleTransform()}
            onAbout={() => setAboutOpen(true)}
          />
          <ToolRail
            tools={tools}
            activeTool={effectiveTool}
            onToolChange={setActiveTool}
            shiftedRight={explorerOpen}
          />
          {explorerOpen && <Explorer onCollapse={() => setExplorerOpen(false)} />}
          {inspectorOpen && (
            <Inspector
              tab={inspectorTab}
              onTabChange={setInspectorTab}
              editor={activeEditor}
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
