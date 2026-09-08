import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import { MR_COLORS } from "../shapes";

export interface ForeignKeyEdgeData {
  label: string;
  [key: string]: unknown;
}

/** Arista dirigida de una FK: del esquema dueno al esquema referenciado. */
function ForeignKeyEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  data,
  selected,
  style,
}: EdgeProps) {
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });
  const { label } = (data ?? { label: "" }) as ForeignKeyEdgeData;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: selected ? MR_COLORS.selectedStroke : (style?.stroke ?? MR_COLORS.edge),
          strokeWidth: selected ? 2 : (style?.strokeWidth ?? 1.5),
        }}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              background: MR_COLORS.fill,
              border: `1px solid ${MR_COLORS.edge}`,
              borderRadius: 4,
              padding: "0 5px",
              fontSize: 10,
              color: MR_COLORS.text,
              pointerEvents: "none",
              maxWidth: 140,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const ForeignKeyEdge = memo(ForeignKeyEdgeComponent);
