// Proyeccion pura del ConceptualModel + ViewLayout a nodos y aristas de
// React Flow. Es la contraparte del renderer: el modelo semantico entra,
// la representacion Chen sale. No muta nada y no depende de React, asi que
// se puede testear sin montar el canvas.

import type { Edge, Node } from "@xyflow/react";
import type { ConceptualModel } from "@/domain/conceptual";
import type { ViewLayout } from "@/domain/view";
import { CHEN_COLORS } from "./chen/shapes";

const FALLBACK_STEP = 180;

function positionFor(
  layout: ViewLayout,
  id: string,
  fallbackIndex: number,
): { x: number; y: number } {
  return (
    layout.positions[id] ?? {
      x: 80 + (fallbackIndex % 4) * FALLBACK_STEP,
      y: 80 + Math.floor(fallbackIndex / 4) * FALLBACK_STEP,
    }
  );
}

/** Nodos Chen: una entidad, una relacion y un ovalo por cada atributo. */
export function toFlowNodes(
  model: ConceptualModel,
  layout: ViewLayout,
  invalidIds: ReadonlySet<string>,
  selectedId: string | null,
): Node[] {
  const nodes: Node[] = [];
  let fallback = 0;

  for (const entity of model.entities) {
    nodes.push({
      id: entity.id,
      type: "entity",
      position: positionFor(layout, entity.id, fallback++),
      selected: entity.id === selectedId,
      data: { name: entity.name, invalid: invalidIds.has(entity.id) },
    });
    for (const attribute of entity.attributes) {
      nodes.push({
        id: attribute.id,
        type: "attribute",
        position: positionFor(layout, attribute.id, fallback++),
        selected: attribute.id === selectedId,
        data: {
          name: attribute.name,
          isIdentifier: attribute.isIdentifier,
          invalid: invalidIds.has(attribute.id),
        },
      });
    }
  }

  for (const relationship of model.relationships) {
    nodes.push({
      id: relationship.id,
      type: "relationship",
      position: positionFor(layout, relationship.id, fallback++),
      selected: relationship.id === selectedId,
      data: { name: relationship.name, invalid: invalidIds.has(relationship.id) },
    });
    for (const attribute of relationship.attributes) {
      nodes.push({
        id: attribute.id,
        type: "attribute",
        position: positionFor(layout, attribute.id, fallback++),
        selected: attribute.id === selectedId,
        data: {
          name: attribute.name,
          isIdentifier: attribute.isIdentifier,
          invalid: invalidIds.has(attribute.id),
        },
      });
    }
  }

  return nodes;
}

/** Id de la arista de participacion entre una relacion y una entidad. */
export function participationEdgeId(relationshipId: string, entityId: string): string {
  return `part:${relationshipId}:${entityId}`;
}

/** Descompone el id de una arista de participacion, o null si no lo es. */
export function parseParticipationEdgeId(
  edgeId: string,
): { relationshipId: string; entityId: string } | null {
  const parts = edgeId.split(":");
  if (parts.length !== 3 || parts[0] !== "part") return null;
  return { relationshipId: parts[1]!, entityId: parts[2]! };
}

/**
 * Aristas: participacion (relacion -> entidad, editable/eliminable) y
 * pertenencia de atributo (atributo -> dueno, fija).
 */
export function toFlowEdges(
  model: ConceptualModel,
  invalidIds: ReadonlySet<string>,
): Edge[] {
  const edges: Edge[] = [];

  for (const relationship of model.relationships) {
    for (const end of relationship.ends) {
      edges.push({
        id: participationEdgeId(relationship.id, end.entityId),
        source: relationship.id,
        sourceHandle: "bottom",
        target: end.entityId,
        targetHandle: "top",
        type: "participation",
        data: { cardinality: end.cardinality, participation: end.participation },
        deletable: true,
        selectable: true,
      });
    }
    for (const attribute of relationship.attributes) {
      edges.push(ownershipEdge(attribute.id, relationship.id, invalidIds.has(attribute.id)));
    }
  }

  for (const entity of model.entities) {
    for (const attribute of entity.attributes) {
      edges.push(ownershipEdge(attribute.id, entity.id, invalidIds.has(attribute.id)));
    }
  }

  return edges;
}

function ownershipEdge(attributeId: string, ownerId: string, invalid: boolean): Edge {
  return {
    id: `own:${attributeId}`,
    source: attributeId,
    sourceHandle: "link",
    target: ownerId,
    targetHandle: "bottom",
    type: "straight",
    deletable: false,
    selectable: false,
    focusable: false,
    style: {
      stroke: invalid ? CHEN_COLORS.invalidStroke : CHEN_COLORS.edge,
      strokeWidth: 1.2,
    },
  };
}
