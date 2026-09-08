import { Background, BackgroundVariant, Controls, ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useWorkspaceStore } from "@/state/workspaceStore";
import { DerCanvas } from "@/features/der-editor";
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
 * Elige que canvas mostrar segun el documento activo y la vista (DER / MR):
 * - documento DER (o combinado) en vista DER -> editor Chen del Incremento 2;
 * - cualquier otro caso (MR, sin documento) -> lienzo vacio con solo pan/zoom
 *   (el editor MR llega en el Incremento 5).
 */
export function CanvasHost({ editorMode, activeTool, onToolConsumed }: CanvasHostProps) {
  const activeDocument = useWorkspaceStore((s) =>
    s.documents.find((doc) => doc.id === s.activeDocumentId),
  );

  const showDerEditor =
    editorMode === "der" &&
    (activeDocument?.kind === "der" || activeDocument?.kind === "combined");

  return (
    <div className="absolute inset-0" data-testid="canvas-host">
      {showDerEditor ? (
        <DerCanvas activeTool={activeTool} onToolConsumed={onToolConsumed} />
      ) : (
        <EmptyCanvas />
      )}
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
