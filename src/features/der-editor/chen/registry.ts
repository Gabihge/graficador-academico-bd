// Registro de tipos de nodo y arista de la notacion Chen para React Flow.
// Definido a nivel de modulo (nunca dentro de un render) por la regla de
// rendimiento de docs/PERFORMANCE.md.

import type { EdgeTypes, NodeTypes } from "@xyflow/react";
import { EntityNode } from "./EntityNode";
import { RelationshipNode } from "./RelationshipNode";
import { AttributeNode } from "./AttributeNode";
import { ParticipationEdge } from "./ParticipationEdge";

export const chenNodeTypes: NodeTypes = {
  entity: EntityNode,
  relationship: RelationshipNode,
  attribute: AttributeNode,
};

export const chenEdgeTypes: EdgeTypes = {
  participation: ParticipationEdge,
};
