// Proyeccion pura del RelationalModel + ViewLayout a nodos y aristas de React
// Flow. Sin React: testeable sin montar el canvas.

import { MarkerType, type Edge, type Node } from "@xyflow/react";
import {
  attributeRole,
  type RelationalModel,
  type AttributeRole,
} from "@/domain/relational";
import type { ViewLayout } from "@/domain/view";
import { MR_COLORS } from "./shapes";

const FALLBACK_STEP = 260;

function positionFor(layout: ViewLayout, id: string, index: number) {
  return (
    layout.positions[id] ?? {
      x: 80 + (index % 3) * FALLBACK_STEP,
      y: 80 + Math.floor(index / 3) * FALLBACK_STEP,
    }
  );
}

export interface SchemaNodeAttribute {
  id: string;
  name: string;
  role: AttributeRole;
}

export function toFlowNodes(
  model: RelationalModel,
  layout: ViewLayout,
  invalidIds: ReadonlySet<string>,
  selectedId: string | null,
): Node[] {
  return model.schemas.map((schema, index) => ({
    id: schema.id,
    type: "schema",
    position: positionFor(layout, schema.id, index),
    selected: schema.id === selectedId,
    data: {
      name: schema.name,
      invalid: invalidIds.has(schema.id),
      attributes: schema.attributes.map(
        (attribute): SchemaNodeAttribute => ({
          id: attribute.id,
          name: attribute.name,
          role: attributeRole(schema, attribute.id),
        }),
      ),
    },
  }));
}

export function foreignKeyEdgeId(foreignKeyId: string): string {
  return `fk:${foreignKeyId}`;
}

export function parseFkEdgeId(edgeId: string): string | null {
  return edgeId.startsWith("fk:") ? edgeId.slice(3) : null;
}

export function toFlowEdges(
  model: RelationalModel,
  invalidIds: ReadonlySet<string>,
): Edge[] {
  const edges: Edge[] = [];
  for (const schema of model.schemas) {
    const nameById = new Map(schema.attributes.map((a) => [a.id, a.name]));
    for (const fk of schema.foreignKeys) {
      const invalid = invalidIds.has(fk.id);
      const localCols = fk.localAttributeIds
        .map((id) => nameById.get(id) ?? "?")
        .join(", ");
      edges.push({
        id: foreignKeyEdgeId(fk.id),
        source: schema.id,
        sourceHandle: "right",
        target: fk.targetRelationId,
        targetHandle: "left",
        type: "fk",
        data: { label: localCols || "(sin columnas)" },
        deletable: true,
        selectable: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: {
          stroke: invalid ? MR_COLORS.invalidStroke : MR_COLORS.edge,
          strokeWidth: 1.5,
        },
      });
    }
  }
  return edges;
}
