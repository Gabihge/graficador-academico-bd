import { memo } from "react";
import { EdgeLabelRenderer, getStraightPath, type EdgeProps } from "@xyflow/react";
import type { CardinalityBound, Participation } from "@/domain/conceptual";
import { CHEN_COLORS } from "./shapes";

export interface ParticipationEdgeData {
  cardinality: CardinalityBound;
  participation: Participation;
  role: string | null;
  identifying: boolean;
  [key: string]: unknown;
}

/**
 * Arista relacion (source) -> entidad (target) en notacion Chen. La etiqueta,
 * del lado de la entidad, muestra el rol (si hay), la cardinalidad y la
 * participacion en texto (distinguible SIN color, .claude/rules/ui.md).
 *
 * Linea doble cuando:
 * - la participacion es total; o
 * - la relacion es identificadora (doble linea hacia la entidad debil, spec 6.3).
 */
function ParticipationEdgeComponent({
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  selected,
}: EdgeProps) {
  const { cardinality, participation, role, identifying } = (data ?? {
    cardinality: "N",
    participation: "partial",
    role: null,
    identifying: false,
  }) as ParticipationEdgeData;

  const [path] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  const isTotal = participation === "total";
  const doubleLine = isTotal || identifying;
  const color = selected ? CHEN_COLORS.selectedStroke : CHEN_COLORS.edge;

  const labelX = sourceX + (targetX - sourceX) * 0.78;
  const labelY = sourceY + (targetY - sourceY) * 0.78;

  return (
    <>
      {doubleLine ? (
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
            maxWidth: 110,
          }}
          title={
            (identifying ? "Relacion identificadora · " : "") +
            (isTotal ? "participacion total" : "participacion parcial")
          }
        >
          {role && (
            <span
              style={{
                display: "block",
                fontSize: 9,
                fontStyle: "italic",
                opacity: 0.75,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {role}
            </span>
          )}
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
