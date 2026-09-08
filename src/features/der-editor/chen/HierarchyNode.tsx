import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { HierarchyOverlap, HierarchyPartition } from "@/domain/conceptual";
import { CHEN_COLORS, HANDLE_STYLE, HIERARCHY_SIZE } from "./shapes";

export interface HierarchyNodeData {
  name: string;
  partition: HierarchyPartition;
  overlap: HierarchyOverlap;
  invalid: boolean;
  [key: string]: unknown;
}

const PARTITION_LABEL: Record<HierarchyPartition, string> = {
  total: "total",
  partial: "parcial",
};
const OVERLAP_LABEL: Record<HierarchyOverlap, string> = {
  exclusive: "exclusiva",
  overlapping: "solapada",
};

/**
 * Nodo de jerarquia en notacion Chen: un triangulo con la etiqueta "ISA" y dos
 * rotulos de texto para particion y solapamiento (ejes independientes,
 * distinguibles sin color). La supraentidad se conecta arriba; las
 * subentidades, abajo.
 */
function HierarchyNodeComponent({ data, selected }: NodeProps) {
  const { name, partition, overlap, invalid } = data as HierarchyNodeData;
  const { width, height } = HIERARCHY_SIZE;
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
          points={`${width / 2},3 ${width - 3},${height - 18} 3,${height - 18}`}
          fill={CHEN_COLORS.fill}
          stroke={stroke}
          strokeWidth={selected ? 2 : 1.5}
          strokeDasharray={invalid ? "5 4" : undefined}
        />
        <text
          x={width / 2}
          y={height - 30}
          textAnchor="middle"
          fontSize={11}
          fontWeight={700}
          fill={CHEN_COLORS.text}
        >
          ISA
        </text>
      </svg>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          textAlign: "center",
          fontSize: 9,
          lineHeight: "11px",
          color: CHEN_COLORS.text,
        }}
        title={`Jerarquia "${name || "sin nombre"}" · particion ${PARTITION_LABEL[partition]} · ${OVERLAP_LABEL[overlap]}`}
      >
        {PARTITION_LABEL[partition]} · {OVERLAP_LABEL[overlap]}
      </div>
      <Handle type="source" position={Position.Top} id="top" style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={HANDLE_STYLE} />
    </div>
  );
}

export const HierarchyNode = memo(HierarchyNodeComponent);
