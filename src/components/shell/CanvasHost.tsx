import { Background, BackgroundVariant, Controls, ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useWorkspaceStore } from "@/state/workspaceStore";
import { useMrStore } from "@/state/mrStore";
import { DerCanvas } from "@/features/der-editor";
import { MrReadonlyView } from "@/features/transformation";
import type { EditorMode } from "./Header";
import type { ToolId } from "./ToolRail";

// node/edge types se definen fuera del render (regla de performance de
// docs/PERFORMANCE.md).
const nodeTypes = {};
const edgeTypes = {};
const EMPTY: never[] = [];

interface CanvasHostProps {
  editorMode: EditorMode;
  activeTool: ToolId;
  onToolConsumed: () => void;
}

/**
 * Elige que mostrar en el area principal segun el documento activo y la vista:
 * - documento DER (o combinado) en vista DER -> editor Chen;
 * - documento MR (o combinado en vista MR) -> visor de MR de SOLO LECTURA
 *   (la edicion del MR grafico llega en el Incremento 5);
 * - sin documento -> lienzo vacio con pan/zoom.
 */
export function CanvasHost({ editorMode, activeTool, onToolConsumed }: CanvasHostProps) {
  const activeDocument = useWorkspaceStore((s) =>
    s.documents.find((doc) => doc.id === s.activeDocumentId),
  );

  const showDerEditor =
    editorMode === "der" &&
    (activeDocument?.kind === "der" || activeDocument?.kind === "combined");
  const showMrViewer =
    !showDerEditor &&
    (activeDocument?.kind === "mr" ||
      (activeDocument?.kind === "combined" && editorMode === "mr"));

  return (
    <div className="absolute inset-0" data-testid="canvas-host">
      {showDerEditor ? (
        <DerCanvas activeTool={activeTool} onToolConsumed={onToolConsumed} />
      ) : showMrViewer ? (
        <MrViewerPane />
      ) : (
        <EmptyCanvas />
      )}
    </div>
  );
}

/** Panel de solo lectura con el MR derivado del documento activo. */
function MrViewerPane() {
  const status = useMrStore((s) => s.status);
  const model = useMrStore((s) => s.model);
  const trace = useMrStore((s) => s.trace);

  return (
    <div className="absolute inset-0 overflow-y-auto bg-neutral-50 px-6 pt-24 pb-10">
      <div className="mx-auto max-w-2xl">
        {status === "ready" ? (
          <>
            <p className="mb-3 text-xs text-neutral-400">
              MR derivado (solo lectura). La edicion del MR grafico llega en el proximo incremento.
            </p>
            <MrReadonlyView model={model} trace={trace} />
          </>
        ) : (
          <p className="rounded-lg border border-dashed border-neutral-200 bg-white/70 px-4 py-6 text-center text-xs text-neutral-400">
            Este documento MR todavia no tiene contenido. Genera el MR desde un documento DER con el
            boton "Transformar".
          </p>
        )}
      </div>
    </div>
  );
}

/** Lienzo React Flow vacio: fondo para vistas que todavia no tienen editor. */
function EmptyCanvas() {
  return (
    <ReactFlow
      nodes={EMPTY}
      edges={EMPTY}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      minZoom={0.2}
      maxZoom={2}
      panOnScroll
      selectionOnDrag
      proOptions={{ hideAttribution: true }}
      style={{ background: "#fafafa" }}
    >
      <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#d4d4d4" />
      <Controls showInteractive={false} position="bottom-right" />
    </ReactFlow>
  );
}
