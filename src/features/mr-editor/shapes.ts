// Constantes visuales del editor MR grafico. Notacion de tablas: un rectangulo
// por relacion con una fila por atributo. PK subrayado, FK negrita (spec:
// presentacion academica del MR), pero el rol tambien se rotula en texto para
// no depender solo del formato (.claude/rules/ui.md).

export const SCHEMA_WIDTH = 200;
export const SCHEMA_HEADER_HEIGHT = 30;
export const SCHEMA_ROW_HEIGHT = 24;

export const MR_COLORS = {
  stroke: "#404040",
  fill: "#ffffff",
  headerFill: "#f5f5f5",
  selectedStroke: "#171717",
  invalidStroke: "#b91c1c",
  edge: "#525252",
  text: "#171717",
  subtle: "#737373",
} as const;

export const MR_HANDLE_STYLE = {
  width: 7,
  height: 7,
  background: MR_COLORS.stroke,
} as const;
