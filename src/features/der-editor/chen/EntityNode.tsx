import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { CHEN_COLORS, ENTITY_SIZE, HANDLE_STYLE } from "./shapes";

export interface EntityNodeData {
  name: string;
  /** Entidad debil: doble rectangulo (spec 6.1, 6.3). */
  weak: boolean;
  invalid: boolean;
  [key: string]: unknown;
}

const HANDLE_SIDES = [Position.Top, Position.Right, Position.Bottom, Position.Left];

/** Entidad en notacion Chen: rectangulo (regular) o doble rectangulo (debil). */
function EntityNodeComponent({ data, selected }: NodeProps) {
  const { name, weak, invalid } = data as EntityNodeData;
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
        // El doble rectangulo se logra con un recuadro interior.
        outline: weak ? `1.5px solid ${stroke}` : undefined,
        outlineOffset: weak ? -5 : undefined,
        background: CHEN_COLORS.fill,
        color: CHEN_COLORS.text,
        borderRadius: 3,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "4px 12px",
        fontSize: 13,
        fontWeight: 600,
        textAlign: "center",
        boxShadow: selected ? "0 0 0 3px rgba(23,23,23,0.12)" : "none",
      }}
      title={weak ? "Entidad debil" : "Entidad regular"}
    >
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {name || "Sin nombre"}
      </span>
      {HANDLE_SIDES.map((position) => (
        <Handle key={position} type="source" position={position} id={position} style={HANDLE_STYLE} />
      ))}
    </div>
  );
}

export const EntityNode = memo(EntityNodeComponent);
