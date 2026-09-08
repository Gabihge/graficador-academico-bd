// Registro de tipos de nodo y arista del editor MR para React Flow. A nivel de
// modulo (nunca dentro de un render) por la regla de rendimiento de
// docs/PERFORMANCE.md.

import type { EdgeTypes, NodeTypes } from "@xyflow/react";
import { SchemaNode } from "./nodes/SchemaNode";
import { ForeignKeyEdge } from "./edges/ForeignKeyEdge";

export const mrNodeTypes: NodeTypes = {
  schema: SchemaNode,
};

export const mrEdgeTypes: EdgeTypes = {
  fk: ForeignKeyEdge,
};
