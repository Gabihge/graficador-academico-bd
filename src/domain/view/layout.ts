// ViewLayout: posiciones de los nodos en el canvas. Vive SEPARADO del
// ConceptualModel a proposito (docs/ARCHITECTURE.md): mover un nodo no toca
// la semantica del DER, y el modelo se puede renderizar con cualquier
// layout (o con ninguno). Codigo puro, sin React ni React Flow.

/** Posicion de un nodo en coordenadas del canvas. */
export interface NodePosition {
  x: number;
  y: number;
}

/** Posiciones indexadas por id de elemento del dominio (entidad, relacion, atributo). */
export interface ViewLayout {
  positions: Record<string, NodePosition>;
}

export function createViewLayout(): ViewLayout {
  return { positions: {} };
}

export function setPosition(
  layout: ViewLayout,
  elementId: string,
  position: NodePosition,
): ViewLayout {
  return {
    positions: { ...layout.positions, [elementId]: position },
  };
}

export function getPosition(
  layout: ViewLayout,
  elementId: string,
): NodePosition | undefined {
  return layout.positions[elementId];
}

/**
 * Descarta las posiciones de elementos que ya no existen en el modelo, para
 * que el layout no acumule entradas muertas tras eliminar nodos.
 */
export function prunePositions(layout: ViewLayout, liveIds: Set<string>): ViewLayout {
  const positions: Record<string, NodePosition> = {};
  for (const [id, position] of Object.entries(layout.positions)) {
    if (liveIds.has(id)) positions[id] = position;
  }
  return { positions };
}
