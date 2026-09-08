// Conjuntos de herramientas de la tool rail segun el editor activo. Separado de
// ToolRail.tsx para no romper el fast-refresh del componente.

import type { LucideIcon } from "lucide-react";
import { Circle, Diamond, MousePointer2, Square, StickyNote, Table2, Triangle } from "lucide-react";

export type ToolId =
  | "select"
  | "entity"
  | "relationship"
  | "attribute"
  | "hierarchy"
  | "note"
  | "schema";

export interface ToolDef {
  id: ToolId;
  label: string;
  icon: LucideIcon;
}

// DER (spec 11.3): "select", "entity", "relationship", "attribute", "hierarchy"
// dibujan de verdad; "note" sigue INERTE (las notas son del Incremento 8).
export const DER_TOOLS: ToolDef[] = [
  { id: "select", label: "Seleccionar", icon: MousePointer2 },
  { id: "entity", label: "Entidad", icon: Square },
  { id: "relationship", label: "Relacion", icon: Diamond },
  { id: "attribute", label: "Atributo", icon: Circle },
  { id: "hierarchy", label: "Jerarquia", icon: Triangle },
  { id: "note", label: "Nota", icon: StickyNote },
];

// MR: solo "select" y "schema" (crear una relacion). El resto se edita en el
// Inspector; las FK se crean arrastrando entre tablas.
export const MR_TOOLS: ToolDef[] = [
  { id: "select", label: "Seleccionar", icon: MousePointer2 },
  { id: "schema", label: "Esquema", icon: Table2 },
];
