import { Background, BackgroundVariant, Controls, ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// node/edge types se definen fuera del render (regla de performance de
// docs/PERFORMANCE.md). En el Incremento 1 el canvas esta montado pero
// vacio: sin nodos editables. Los tipos reales llegan con el editor DER.
const nodeTypes = {};
const edgeTypes = {};
const EMPTY: never[] = [];

/**
 * Canvas de React Flow a pantalla completa, detras del shell flotante. Solo
 * pan/zoom: todavia no se pueden crear ni editar elementos.
 */
export function CanvasHost() {
  return (
    <div className="absolute inset-0" data-testid="canvas-host">
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
    </div>
  );
}
