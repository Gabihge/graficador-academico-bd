import { memo } from "react";
import {
  EdgeLabelRenderer,
  getStraightPath,
  type EdgeProps,
} from "@xyflow/react";
import type { CardinalityBound, Participation } from "@/domain/conceptual";
import { CHEN_COLORS } from "./shapes";

export interface ParticipationEdgeData {
  cardinality: CardinalityBound;
  participation: Participation;
  [key: string]: unknown;
}

/**
 * Arista entidad-relacion en notacion Chen. Construida siempre como
 * relacion (source) -> entidad (target), asi la etiqueta de cardinalidad
 * queda del lado de la entidad.
 *
 * Participacion (distinguible SIN color, .claude/rules/ui.md):
 * - total   -> linea doble (dos trazos paralelos)
 * - parcial -> linea simple
 */
function ParticipationEdgeComponent({
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  selected,
}: EdgeProps) {
  const { cardinality, participation } = (data ?? {
    cardinality: "N",
    participation: "partial",
  }) as ParticipationEdgeData;

  const [path] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  const isTotal = participation === "total";
  const color = selected ? CHEN_COLORS.selectedStroke : CHEN_COLORS.edge;

  // Etiqueta cerca de la entidad (extremo target).
  const labelX = sourceX + (targetX - sourceX) * 0.8;
  const labelY = sourceY + (targetY - sourceY) * 0.8;

  return (
    <>
      {isTotal ? (
        <>
          <path d={path} fill="none" stroke={color} strokeWidth={4} />
          <path d={path} fill="none" stroke={CHEN_COLORS.fill} strokeWidth={1.4} />
        </>
      ) : (
        <path d={path} fill="none" stroke={color} strokeWidth={1.6} />
      )}
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            background: CHEN_COLORS.fill,
            border: `1px solid ${CHEN_COLORS.edge}`,
            borderRadius: 4,
            padding: "1px 5px",
            fontSize: 11,
            lineHeight: "13px",
            color: CHEN_COLORS.text,
            textAlign: "center",
            pointerEvents: "none",
          }}
          title={
            isTotal ? "Participacion total (linea doble)" : "Participacion parcial (linea simple)"
          }
        >
          <span style={{ fontWeight: 700 }}>{cardinality}</span>
          <span style={{ display: "block", fontSize: 9, opacity: 0.7 }}>
            {isTotal ? "total" : "parcial"}
          </span>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const ParticipationEdge = memo(ParticipationEdgeComponent);
