import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { CHEN_COLORS, RELATIONSHIP_SIZE } from "./shapes";

export interface RelationshipNodeData {
  name: string;
  invalid: boolean;
  [key: string]: unknown;
}

const HANDLE_SIDES = [Position.Top, Position.Right, Position.Bottom, Position.Left];

/** Relacion en notacion Chen: rombo con el nombre centrado. */
function RelationshipNodeComponent({ data, selected }: NodeProps) {
  const { name, invalid } = data as RelationshipNodeData;
  const { width, height } = RELATIONSHIP_SIZE;
  const stroke = selected
    ? CHEN_COLORS.selectedStroke
    : invalid
      ? CHEN_COLORS.invalidStroke
      : CHEN_COLORS.stroke;

  return (
    <div style={{ width, height, position: "relative" }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: "absolute", inset: 0, overflow: "visible" }}
      >
        <polygon
          points={`${width / 2},2 ${width - 2},${height / 2} ${width / 2},${height - 2} 2,${height / 2}`}
          fill={CHEN_COLORS.fill}
          stroke={stroke}
          strokeWidth={selected ? 2 : 1.5}
          strokeDasharray={invalid ? "5 4" : undefined}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 14px",
          fontSize: 12,
          fontWeight: 600,
          textAlign: "center",
          color: CHEN_COLORS.text,
        }}
        title={invalid ? "Esta relacion tiene problemas de validacion" : undefined}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {name || "Sin nombre"}
        </span>
      </div>
      {HANDLE_SIDES.map((position) => (
        <Handle
          key={position}
          type="source"
          position={position}
          id={position}
          style={{ width: 7, height: 7, background: CHEN_COLORS.stroke }}
        />
      ))}
    </div>
  );
}

export const RelationshipNode = memo(RelationshipNodeComponent);
