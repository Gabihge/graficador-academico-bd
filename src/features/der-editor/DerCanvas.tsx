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
import { validateStructure } from "@/features/validation";
import { useDerEditorStore } from "@/state/derEditorStore";
import type { ConceptualElementKind } from "@/domain/conceptual";
import type { ToolId } from "@/components/shell/ToolRail";
import { chenEdgeTypes, chenNodeTypes } from "./chen/registry";
import { parseParticipationEdgeId, toFlowEdges, toFlowNodes } from "./projection";

interface DerCanvasProps {
  /** Herramienta activa de la tool rail (estado efimero de UI del shell). */
  activeTool: ToolId;
  /** Se llama tras crear un elemento, para volver a la herramienta "select". */
  onToolConsumed: () => void;
}

/**
 * Editor DER en notacion Chen. La fuente de verdad es `derEditorStore`
 * (ConceptualModel + ViewLayout); este componente solo proyecta ese estado a
 * React Flow y traduce las interacciones de vuelta a operaciones del store.
 */
export function DerCanvas(props: DerCanvasProps) {
  return (
    <ReactFlowProvider>
      <DerCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

function nodeKind(type: string | undefined): ConceptualElementKind | null {
  if (type === "entity" || type === "relationship" || type === "attribute") return type;
  return null;
}

function DerCanvasInner({ activeTool, onToolConsumed }: DerCanvasProps) {
  const model = useDerEditorStore((s) => s.model);
  const layout = useDerEditorStore((s) => s.layout);
  const selection = useDerEditorStore((s) => s.selection);
  const status = useDerEditorStore((s) => s.status);

  const addEntity = useDerEditorStore((s) => s.addEntity);
  const addRelationship = useDerEditorStore((s) => s.addRelationship);
  const addAttributeTo = useDerEditorStore((s) => s.addAttributeTo);
  const connect = useDerEditorStore((s) => s.connect);
  const disconnect = useDerEditorStore((s) => s.disconnect);
  const moveNode = useDerEditorStore((s) => s.moveNode);
  const beginInteraction = useDerEditorStore((s) => s.beginInteraction);
  const endInteraction = useDerEditorStore((s) => s.endInteraction);
  const deleteElement = useDerEditorStore((s) => s.deleteElement);
  const select = useDerEditorStore((s) => s.select);

  const { screenToFlowPosition } = useReactFlow();

  const invalidIds = useMemo(() => {
    const ids = new Set<string>();
    for (const issue of validateStructure(model)) {
      if (issue.severity === "error" && issue.targetId) ids.add(issue.targetId);
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
          const kind = nodeKind(nodes.find((n) => n.id === change.id)?.type);
          if (kind) deleteElement(kind, change.id);
        }
      }
    },
    [nodes, moveNode, deleteElement],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      for (const change of changes) {
        if (change.type !== "remove") continue;
        const parsed = parseParticipationEdgeId(change.id);
        if (parsed) disconnect(parsed.relationshipId, parsed.entityId);
      }
    },
    [disconnect],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const sourceKind = nodeKind(nodes.find((n) => n.id === connection.source)?.type);
      const targetKind = nodeKind(nodes.find((n) => n.id === connection.target)?.type);
      if (sourceKind === "relationship" && targetKind === "entity") {
        connect(connection.source, connection.target);
      } else if (sourceKind === "entity" && targetKind === "relationship") {
        connect(connection.target, connection.source);
      }
    },
    [nodes, connect],
  );

  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes, edges: selectedEdges }: OnSelectionChangeParams) => {
      const node = selectedNodes[0];
      if (node) {
        const kind = nodeKind(node.type);
        if (kind) {
          select({ kind, id: node.id });
          return;
        }
      }
      const edge = selectedEdges[0];
      if (edge) {
        const parsed = parseParticipationEdgeId(edge.id);
        if (parsed) {
          select({ kind: "relationship", id: parsed.relationshipId });
          return;
        }
      }
      select(null);
    },
    [select],
  );

  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (activeTool !== "entity" && activeTool !== "relationship") return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      if (activeTool === "entity") addEntity(position);
      else addRelationship(position);
      onToolConsumed();
    },
    [activeTool, screenToFlowPosition, addEntity, addRelationship, onToolConsumed],
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: { id: string; type?: string }) => {
      if (activeTool !== "attribute") return;
      if (node.type === "entity" || node.type === "relationship") {
        addAttributeTo(node.type, node.id);
        onToolConsumed();
      }
    },
    [activeTool, addAttributeTo, onToolConsumed],
  );

  const toolActive = activeTool === "entity" || activeTool === "relationship";
  const isEmpty = model.entities.length === 0 && model.relationships.length === 0;

  return (
    <div className="absolute inset-0" data-testid="der-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={chenNodeTypes}
        edgeTypes={chenEdgeTypes}
        connectionMode={ConnectionMode.Loose}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        onNodeDragStart={beginInteraction}
        onNodeDragStop={endInteraction}
        onPaneClick={onPaneClick}
        onNodeClick={onNodeClick}
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

      {status === "ready" && isEmpty && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="max-w-xs rounded-lg border border-neutral-200 bg-white/80 px-4 py-3 text-center text-xs text-neutral-500 shadow-sm backdrop-blur-md">
            Elegi la herramienta <span className="font-semibold">Entidad</span> en la barra
            izquierda y hace clic en el lienzo para empezar el DER.
          </p>
        </div>
      )}
    </div>
  );
}
