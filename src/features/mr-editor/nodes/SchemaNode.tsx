import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { AttributeRole } from "@/domain/relational";
import { MR_COLORS, MR_HANDLE_STYLE, SCHEMA_WIDTH } from "../shapes";
import type { SchemaNodeAttribute } from "../projection";

export interface SchemaNodeData {
  name: string;
  invalid: boolean;
  attributes: SchemaNodeAttribute[];
  [key: string]: unknown;
}

const HANDLE_SIDES = [Position.Top, Position.Right, Position.Bottom, Position.Left];

const ROLE_LABEL: Record<AttributeRole, string> = {
  pk: "PK",
  fk: "FK",
  "pk+fk": "PK+FK",
  plain: "",
};

/**
 * Un esquema de relacion como tabla: encabezado con el nombre y una fila por
 * atributo. PK subrayado, FK negrita, PK+FK ambas; el rol tambien se rotula en
 * texto para no depender solo del formato.
 */
function SchemaNodeComponent({ data, selected }: NodeProps) {
  const { name, invalid, attributes } = data as SchemaNodeData;
  const stroke = selected
    ? MR_COLORS.selectedStroke
    : invalid
      ? MR_COLORS.invalidStroke
      : MR_COLORS.stroke;

  return (
    <div
      style={{
        width: SCHEMA_WIDTH,
        border: `${selected ? 2 : 1.5}px ${invalid ? "dashed" : "solid"} ${stroke}`,
        borderRadius: 4,
        background: MR_COLORS.fill,
        color: MR_COLORS.text,
        fontSize: 12,
        overflow: "hidden",
        boxShadow: selected ? "0 0 0 3px rgba(23,23,23,0.12)" : "none",
      }}
      title={invalid ? "Esta relacion tiene problemas de validacion" : undefined}
    >
      <div
        style={{
          background: MR_COLORS.headerFill,
          borderBottom: `1px solid ${MR_COLORS.stroke}`,
          padding: "5px 10px",
          fontWeight: 700,
          textAlign: "center",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {name || "Sin nombre"}
      </div>
      {attributes.length === 0 ? (
        <div style={{ padding: "6px 10px", color: MR_COLORS.subtle, fontStyle: "italic" }}>
          sin atributos
        </div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {attributes.map((attribute) => (
            <li
              key={attribute.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 6,
                padding: "3px 10px",
                borderTop: `1px solid ${MR_COLORS.headerFill}`,
              }}
            >
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  textDecoration:
                    attribute.role === "pk" || attribute.role === "pk+fk" ? "underline" : "none",
                  textUnderlineOffset: 2,
                  fontWeight:
                    attribute.role === "fk" || attribute.role === "pk+fk" ? 700 : 400,
                }}
              >
                {attribute.name || "sin nombre"}
              </span>
              {attribute.role !== "plain" && (
                <span style={{ fontSize: 9, color: MR_COLORS.subtle, flexShrink: 0 }}>
                  {ROLE_LABEL[attribute.role]}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {HANDLE_SIDES.map((position) => (
        <Handle
          key={position}
          type="source"
          position={position}
          id={position}
          style={MR_HANDLE_STYLE}
        />
      ))}
    </div>
  );
}

export const SchemaNode = memo(SchemaNodeComponent);
