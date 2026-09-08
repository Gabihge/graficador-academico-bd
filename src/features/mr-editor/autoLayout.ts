// Layout de grilla deterministico para un RelationalModel. Se usa al persistir
// un MR recien derivado de una transformacion (que no trae layout propio) para
// que abra prolijo en el editor grafico.

import { createViewLayout, setPosition, type ViewLayout } from "@/domain/view";
import type { RelationalModel } from "@/domain/relational";

const COLUMN_GAP = 320;
const ROW_GAP = 260;
const COLUMNS = 3;
const ORIGIN = { x: 80, y: 80 };

export function autoLayoutSchemas(model: RelationalModel): ViewLayout {
  let layout = createViewLayout();
  model.schemas.forEach((schema, index) => {
    layout = setPosition(layout, schema.id, {
      x: ORIGIN.x + (index % COLUMNS) * COLUMN_GAP,
      y: ORIGIN.y + Math.floor(index / COLUMNS) * ROW_GAP,
    });
  });
  return layout;
}
