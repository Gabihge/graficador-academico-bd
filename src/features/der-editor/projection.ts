// Proyeccion pura del ConceptualModel + ViewLayout a nodos y aristas de
// React Flow. El modelo semantico entra, la representacion Chen sale. No muta
// nada y no depende de React: se puede testear sin montar el canvas.

import type { Edge, Node } from "@xyflow/react";
import type { ConceptualAttribute, ConceptualModel } from "@/domain/conceptual";
import type { ViewLayout } from "@/domain/view";
import { CHEN_COLORS } from "./chen/shapes";

const FALLBACK_STEP = 190;

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

interface ProjectionContext {
  model: ConceptualModel;
  layout: ViewLayout;
  invalidIds: ReadonlySet<string>;
  selectedId: string | null;
  fallback: { next: number };
}

/** Nodos Chen: entidades, relaciones, jerarquias y un ovalo por cada atributo/componente. */
export function toFlowNodes(
  model: ConceptualModel,
  layout: ViewLayout,
  invalidIds: ReadonlySet<string>,
  selectedId: string | null,
): Node[] {
  const ctx: ProjectionContext = {
    model,
    layout,
    invalidIds,
    selectedId,
    fallback: { next: 0 },
  };
  const nodes: Node[] = [];

  for (const entity of model.entities) {
    nodes.push({
      id: entity.id,
      type: "entity",
      position: positionFor(layout, entity.id, ctx.fallback.next++),
      selected: entity.id === selectedId,
      data: {
        name: entity.name,
        weak: entity.kind === "weak",
        invalid: invalidIds.has(entity.id),
      },
    });
    pushAttributeNodes(entity.attributes, ctx, nodes);
  }

  for (const relationship of model.relationships) {
    nodes.push({
      id: relationship.id,
      type: "relationship",
      position: positionFor(layout, relationship.id, ctx.fallback.next++),
      selected: relationship.id === selectedId,
      data: {
        name: relationship.name,
        identifying: relationship.identifying === true,
        degree: relationship.degree,
        invalid: invalidIds.has(relationship.id),
      },
    });
    pushAttributeNodes(relationship.attributes, ctx, nodes);
  }

  for (const hierarchy of model.hierarchies) {
    nodes.push({
      id: hierarchy.id,
      type: "hierarchy",
      position: positionFor(layout, hierarchy.id, ctx.fallback.next++),
      selected: hierarchy.id === selectedId,
      data: {
        name: hierarchy.name,
        partition: hierarchy.partition,
        overlap: hierarchy.overlap,
        invalid: invalidIds.has(hierarchy.id),
      },
    });
  }

  return nodes;
}

function pushAttributeNodes(
  attributes: ConceptualAttribute[],
  ctx: ProjectionContext,
  nodes: Node[],
): void {
  for (const attribute of attributes) {
    nodes.push({
      id: attribute.id,
      type: "attribute",
      position: positionFor(ctx.layout, attribute.id, ctx.fallback.next++),
      selected: attribute.id === ctx.selectedId,
      data: {
        name: attribute.name,
        attrKind: attribute.kind,
        isIdentifier: attribute.isIdentifier,
        isDiscriminator: attribute.isDiscriminator === true,
        invalid: ctx.invalidIds.has(attribute.id),
      },
    });
    if (attribute.components) pushAttributeNodes(attribute.components, ctx, nodes);
  }
}

// --- ids de aristas -------------------------------------------------

export function participationEdgeId(relationshipId: string, participantId: string): string {
  return `part:${relationshipId}:${participantId}`;
}

export function parseParticipationEdgeId(
  edgeId: string,
): { relationshipId: string; participantId: string } | null {
  const parts = edgeId.split(":");
  if (parts.length !== 3 || parts[0] !== "part") return null;
  return { relationshipId: parts[1]!, participantId: parts[2]! };
}

export function parseHierarchyEdgeId(
  edgeId: string,
): { hierarchyId: string; role: "super" | "sub"; entityId: string } | null {
  const parts = edgeId.split(":");
  if (parts.length !== 3) return null;
  if (parts[0] === "hsup") return { hierarchyId: parts[1]!, role: "super", entityId: parts[2]! };
  if (parts[0] === "hsub") return { hierarchyId: parts[1]!, role: "sub", entityId: parts[2]! };
  return null;
}

// --- aristas -------------------------------------------------------

export function toFlowEdges(
  model: ConceptualModel,
  invalidIds: ReadonlySet<string>,
): Edge[] {
  const edges: Edge[] = [];

  for (const relationship of model.relationships) {
    for (const participant of relationship.participants) {
      edges.push({
        id: participationEdgeId(relationship.id, participant.id),
        source: relationship.id,
        sourceHandle: "bottom",
        target: participant.entityId,
        targetHandle: "top",
        type: "participation",
        data: {
          cardinality: participant.cardinality,
          participation: participant.participation,
          role: participant.role ?? null,
          identifying: relationship.identifying === true,
        },
        deletable: true,
        selectable: true,
      });
    }
    pushOwnershipEdges(relationship.attributes, relationship.id, invalidIds, edges);
  }

  for (const entity of model.entities) {
    pushOwnershipEdges(entity.attributes, entity.id, invalidIds, edges);
  }

  for (const hierarchy of model.hierarchies) {
    if (hierarchy.superEntityId) {
      edges.push({
        id: `hsup:${hierarchy.id}:${hierarchy.superEntityId}`,
        source: hierarchy.id,
        sourceHandle: "top",
        target: hierarchy.superEntityId,
        targetHandle: "bottom",
        type: "straight",
        deletable: true,
        selectable: true,
        style: { stroke: CHEN_COLORS.edge, strokeWidth: 1.6 },
      });
    }
    for (const subId of hierarchy.subEntityIds) {
      edges.push({
        id: `hsub:${hierarchy.id}:${subId}`,
        source: hierarchy.id,
        sourceHandle: "bottom",
        target: subId,
        targetHandle: "top",
        type: "straight",
        deletable: true,
        selectable: true,
        style: { stroke: CHEN_COLORS.edge, strokeWidth: 1.6 },
      });
    }
  }

  return edges;
}

function pushOwnershipEdges(
  attributes: ConceptualAttribute[],
  ownerId: string,
  invalidIds: ReadonlySet<string>,
  edges: Edge[],
): void {
  for (const attribute of attributes) {
    edges.push(ownershipEdge(attribute.id, ownerId, invalidIds.has(attribute.id)));
    if (attribute.components) {
      pushOwnershipEdges(attribute.components, attribute.id, invalidIds, edges);
    }
  }
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
