import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { ATTRIBUTE_SIZE, CHEN_COLORS } from "./shapes";

export interface AttributeNodeData {
  name: string;
  isIdentifier: boolean;
  invalid: boolean;
  [key: string]: unknown;
}

/**
 * Atributo en notacion Chen: ovalo conectado por una linea a su dueno. El
 * identificador se dibuja subrayado, pero esa es solo la representacion: la
 * verdad (`isIdentifier`) vive en el modelo de dominio.
 */
function AttributeNodeComponent({ data, selected }: NodeProps) {
  const { name, isIdentifier, invalid } = data as AttributeNodeData;
  const stroke = selected
    ? CHEN_COLORS.selectedStroke
    : invalid
      ? CHEN_COLORS.invalidStroke
      : CHEN_COLORS.stroke;

  return (
    <div
      style={{
        width: ATTRIBUTE_SIZE.width,
        height: ATTRIBUTE_SIZE.height,
        border: `${selected ? 2 : 1.5}px ${invalid ? "dashed" : "solid"} ${stroke}`,
        background: CHEN_COLORS.fill,
        color: CHEN_COLORS.text,
        borderRadius: ATTRIBUTE_SIZE.height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "4px 12px",
        fontSize: 12,
        textAlign: "center",
      }}
      title={
        isIdentifier
          ? "Atributo identificador (integra la clave de la entidad)"
          : undefined
      }
    >
      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          textDecoration: isIdentifier ? "underline" : "none",
          textUnderlineOffset: 3,
          fontWeight: isIdentifier ? 600 : 400,
        }}
      >
        {name || "sin nombre"}
      </span>
      {/* Un solo punto de conexion: la linea hacia el dueno. */}
      <Handle
        type="source"
        position={Position.Top}
        id="link"
        style={{ width: 6, height: 6, background: CHEN_COLORS.stroke }}
      />
    </div>
  );
}

export const AttributeNode = memo(AttributeNodeComponent);
