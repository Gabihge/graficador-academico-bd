// Constantes de la notacion Chen. Aisladas a proposito: una notacion
// alternativa (Crow's Foot, Incremento 10) sera un modulo hermano que no toca
// ni el dominio ni el RuleProfile academico (docs/ARCHITECTURE.md).

export const ENTITY_SIZE = { width: 132, height: 56 } as const;
export const RELATIONSHIP_SIZE = { width: 128, height: 88 } as const;
export const ATTRIBUTE_SIZE = { width: 118, height: 44 } as const;
export const HIERARCHY_SIZE = { width: 96, height: 74 } as const;

/** Paleta neutra. El color nunca es el unico indicador de un estado. */
export const CHEN_COLORS = {
  stroke: "#404040",
  fill: "#ffffff",
  selectedStroke: "#171717",
  invalidStroke: "#b91c1c",
  edge: "#525252",
  text: "#171717",
} as const;

/** Estilo comun de los handles de conexion. */
export const HANDLE_STYLE = { width: 7, height: 7, background: CHEN_COLORS.stroke } as const;
