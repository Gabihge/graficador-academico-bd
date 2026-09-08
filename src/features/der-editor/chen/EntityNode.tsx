import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { CHEN_COLORS, ENTITY_SIZE } from "./shapes";

export interface EntityNodeData {
  name: string;
  invalid: boolean;
  [key: string]: unknown;
}

const HANDLE_SIDES = [Position.Top, Position.Right, Position.Bottom, Position.Left];

/** Entidad regular en notacion Chen: rectangulo con el nombre centrado. */
function EntityNodeComponent({ data, selected }: NodeProps) {
  const { name, invalid } = data as EntityNodeData;
  const stroke = selected
    ? CHEN_COLORS.selectedStroke
    : invalid
      ? CHEN_COLORS.invalidStroke
      : CHEN_COLORS.stroke;

  return (
    <div
      style={{
        width: ENTITY_SIZE.width,
        height: ENTITY_SIZE.height,
        border: `${selected ? 2 : 1.5}px ${invalid ? "dashed" : "solid"} ${stroke}`,
        background: CHEN_COLORS.fill,
        color: CHEN_COLORS.text,
        borderRadius: 3,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "4px 10px",
        fontSize: 13,
        fontWeight: 600,
        textAlign: "center",
        boxShadow: selected ? "0 0 0 3px rgba(23,23,23,0.12)" : "none",
      }}
      title={invalid ? "Esta entidad tiene problemas de validacion" : undefined}
    >
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {name || "Sin nombre"}
      </span>
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

export const EntityNode = memo(EntityNodeComponent);
