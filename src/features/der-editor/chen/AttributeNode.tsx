import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { AttributeKind } from "@/domain/conceptual";
import { ATTRIBUTE_SIZE, CHEN_COLORS, HANDLE_STYLE } from "./shapes";

export interface AttributeNodeData {
  name: string;
  attrKind: AttributeKind;
  isIdentifier: boolean;
  isDiscriminator: boolean;
  invalid: boolean;
  [key: string]: unknown;
}

const KIND_TITLE: Record<AttributeKind, string> = {
  simple: "Atributo simple",
  composite: "Atributo compuesto (agrupador de componentes)",
  multivalued: "Atributo multivaluado (doble ovalo)",
  derived: "Atributo derivado / calculado (linea punteada)",
};

/**
 * Atributo en notacion Chen: ovalo conectado por una linea a su dueno.
 * - identificador -> subrayado;
 * - discriminante de entidad debil -> subrayado punteado;
 * - multivaluado -> doble ovalo;
 * - derivado -> borde punteado;
 * - compuesto -> ovalo agrupador (sus componentes son nodos aparte).
 * Todo esto es representacion: la verdad vive en el modelo de dominio.
 */
function AttributeNodeComponent({ data, selected }: NodeProps) {
  const { name, attrKind, isIdentifier, isDiscriminator, invalid } = data as AttributeNodeData;
  const stroke = selected
    ? CHEN_COLORS.selectedStroke
    : invalid
      ? CHEN_COLORS.invalidStroke
      : CHEN_COLORS.stroke;
  const borderStyle = attrKind === "derived" || invalid ? "dashed" : "solid";
  const underline = isIdentifier ? "underline solid" : isDiscriminator ? "underline dashed" : "none";

  return (
    <div
      style={{
        width: ATTRIBUTE_SIZE.width,
        height: ATTRIBUTE_SIZE.height,
        border: `${selected ? 2 : 1.5}px ${borderStyle} ${stroke}`,
        outline: attrKind === "multivalued" ? `1.5px solid ${stroke}` : undefined,
        outlineOffset: attrKind === "multivalued" ? -5 : undefined,
        background: CHEN_COLORS.fill,
        color: CHEN_COLORS.text,
        borderRadius: ATTRIBUTE_SIZE.height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "4px 14px",
        fontSize: 12,
        textAlign: "center",
      }}
      title={
        KIND_TITLE[attrKind] +
        (isIdentifier ? " · identificador" : isDiscriminator ? " · discriminante" : "")
      }
    >
      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          textDecoration: underline,
          textUnderlineOffset: 3,
          fontWeight: isIdentifier || isDiscriminator ? 600 : 400,
        }}
      >
        {name || "sin nombre"}
      </span>
      {/* "link" -> linea hacia el dueno; "bottom" -> punto de anclaje de componentes. */}
      <Handle type="source" position={Position.Top} id="link" style={{ ...HANDLE_STYLE, width: 6, height: 6 }} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ ...HANDLE_STYLE, width: 6, height: 6 }} />
    </div>
  );
}

export const AttributeNode = memo(AttributeNodeComponent);
