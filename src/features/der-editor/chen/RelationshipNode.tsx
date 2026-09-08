import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { RelationshipDegree } from "@/domain/conceptual";
import { CHEN_COLORS, HANDLE_STYLE, RELATIONSHIP_SIZE } from "./shapes";

export interface RelationshipNodeData {
  name: string;
  /** Relacion identificadora de una entidad debil: doble rombo (spec 6.3). */
  identifying: boolean;
  degree: RelationshipDegree;
  invalid: boolean;
  [key: string]: unknown;
}

const HANDLE_SIDES = [Position.Top, Position.Right, Position.Bottom, Position.Left];

const DEGREE_LABEL: Record<RelationshipDegree, string> = {
  1: "unaria",
  2: "binaria",
  3: "ternaria",
};

/** Relacion en notacion Chen: rombo (o doble rombo si es identificadora). */
function RelationshipNodeComponent({ data, selected }: NodeProps) {
  const { name, identifying, degree, invalid } = data as RelationshipNodeData;
  const { width, height } = RELATIONSHIP_SIZE;
  const stroke = selected
    ? CHEN_COLORS.selectedStroke
    : invalid
      ? CHEN_COLORS.invalidStroke
      : CHEN_COLORS.stroke;
  const strokeWidth = selected ? 2 : 1.5;
  const inset = 6;

  return (
    <div style={{ width, height, position: "relative" }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: "absolute", inset: 0, overflow: "visible" }}
      >
        <polygon
          points={diamond(width, height, 2)}
          fill={CHEN_COLORS.fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={invalid ? "5 4" : undefined}
        />
        {identifying && (
          <polygon
            points={diamond(width, height, 2 + inset)}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        )}
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 16px",
          textAlign: "center",
          color: CHEN_COLORS.text,
        }}
        title={`Relacion ${DEGREE_LABEL[degree]}${identifying ? " · identificadora" : ""}`}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "100%",
          }}
        >
          {name || "Sin nombre"}
        </span>
        <span style={{ fontSize: 9, opacity: 0.65 }}>{DEGREE_LABEL[degree]}</span>
      </div>
      {HANDLE_SIDES.map((position) => (
        <Handle key={position} type="source" position={position} id={position} style={HANDLE_STYLE} />
      ))}
    </div>
  );
}

function diamond(width: number, height: number, pad: number): string {
  return [
    `${width / 2},${pad}`,
    `${width - pad},${height / 2}`,
    `${width / 2},${height - pad}`,
    `${pad},${height / 2}`,
  ].join(" ");
}

export const RelationshipNode = memo(RelationshipNodeComponent);
