import { useCallback, useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type OnSelectionChangeParams,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { validateMr } from "@/features/validation";
import { useMrEditorStore } from "@/state/mrEditorStore";
import type { ToolId } from "@/components/shell/ToolRail";
import { mrEdgeTypes, mrNodeTypes } from "./registry";
import { parseFkEdgeId, toFlowEdges, toFlowNodes } from "./projection";

interface MrCanvasProps {
  activeTool: ToolId;
  onToolConsumed: () => void;
}

/**
 * Editor MR grafico. La fuente de verdad es `mrEditorStore` (RelationalModel +
 * ViewLayout); este componente proyecta ese estado a React Flow y traduce las
 * interacciones de vuelta a operaciones del store.
 */
export function MrCanvas(props: MrCanvasProps) {
  return (
    <ReactFlowProvider>
      <MrCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

function MrCanvasInner({ activeTool, onToolConsumed }: MrCanvasProps) {
  const model = useMrEditorStore((s) => s.model);
  const layout = useMrEditorStore((s) => s.layout);
  const selection = useMrEditorStore((s) => s.selection);
  const status = useMrEditorStore((s) => s.status);

  const addSchema = useMrEditorStore((s) => s.addSchema);
  const addForeignKey = useMrEditorStore((s) => s.addForeignKey);
  const moveNode = useMrEditorStore((s) => s.moveNode);
  const beginInteraction = useMrEditorStore((s) => s.beginInteraction);
  const endInteraction = useMrEditorStore((s) => s.endInteraction);
  const deleteElement = useMrEditorStore((s) => s.deleteElement);
  const select = useMrEditorStore((s) => s.select);

  const { screenToFlowPosition } = useReactFlow();

  const invalidIds = useMemo(() => {
    const ids = new Set<string>();
    for (const issue of validateMr(model)) {
      if (issue.severity === "error") for (const id of issue.elementIds) ids.add(id);
    }
    return ids;
  }, [model]);

  const nodes = useMemo(
    () => toFlowNodes(model, layout, invalidIds, selection?.id ?? null),
    [model, layout, invalidIds, selection],
  );
  const edges = useMemo(() => toFlowEdges(model, invalidIds), [model, invalidIds]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      for (const change of changes) {
        if (change.type === "position" && change.position) {
          moveNode(change.id, change.position);
        } else if (change.type === "remove") {
          deleteElement("schema", change.id);
        }
      }
    },
    [moveNode, deleteElement],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      for (const change of changes) {
        if (change.type !== "remove") continue;
        const fkId = parseFkEdgeId(change.id);
        if (fkId) deleteElement("foreignKey", fkId);
      }
    },
    [deleteElement],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target || connection.source === connection.target) {
        return;
      }
      addForeignKey(connection.source, connection.target);
    },
    [addForeignKey],
  );

  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes, edges: selectedEdges }: OnSelectionChangeParams) => {
      const node = selectedNodes[0];
      if (node) {
        select({ kind: "schema", id: node.id });
        return;
      }
      const edge = selectedEdges[0];
      if (edge) {
        const fkId = parseFkEdgeId(edge.id);
        if (fkId) {
          select({ kind: "foreignKey", id: fkId });
          return;
        }
      }
      select(null);
    },
    [select],
  );

  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (activeTool !== "schema") return;
      addSchema(screenToFlowPosition({ x: event.clientX, y: event.clientY }));
      onToolConsumed();
    },
    [activeTool, screenToFlowPosition, addSchema, onToolConsumed],
  );

  const toolActive = activeTool === "schema";

  return (
    <div className="absolute inset-0" data-testid="mr-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={mrNodeTypes}
        edgeTypes={mrEdgeTypes}
        connectionMode={ConnectionMode.Loose}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        onNodeDragStart={beginInteraction}
        onNodeDragStop={endInteraction}
        onPaneClick={onPaneClick}
        minZoom={0.2}
        maxZoom={2}
        panOnScroll
        selectionOnDrag={!toolActive}
        proOptions={{ hideAttribution: true }}
        style={{ background: "#fafafa", cursor: toolActive ? "crosshair" : undefined }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#d4d4d4" />
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>

      {status === "ready" && model.schemas.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="max-w-xs rounded-lg border border-neutral-200 bg-white/80 px-4 py-3 text-center text-xs text-neutral-500 shadow-sm backdrop-blur-md">
            Elegi la herramienta <span className="font-semibold">Esquema</span> en la barra
            izquierda y hace clic en el lienzo para crear una relacion. O genera este MR desde un
            DER con el boton "Transformar".
          </p>
        </div>
      )}
    </div>
  );
}
