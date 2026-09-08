// Constantes de la notacion Chen. Aisladas aca a proposito: una notacion
// alternativa (Crow's Foot, Incremento 10) sera un modulo hermano que no
// toca ni el dominio ni el RuleProfile academico (docs/ARCHITECTURE.md).

export const ENTITY_SIZE = { width: 132, height: 56 } as const;
export const RELATIONSHIP_SIZE = { width: 120, height: 84 } as const;
export const ATTRIBUTE_SIZE = { width: 116, height: 44 } as const;

/** Paleta neutra. El color nunca es el unico indicador de un estado. */
export const CHEN_COLORS = {
  stroke: "#404040",
  fill: "#ffffff",
  selectedStroke: "#171717",
  invalidStroke: "#b91c1c",
  edge: "#525252",
  text: "#171717",
} as const;
