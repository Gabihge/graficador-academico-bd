import { useMemo } from "react";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import type { ConceptualElementKind } from "@/domain/conceptual";
import { useDerEditorStore } from "@/state/derEditorStore";
import {
  SEVERITY_LABELS,
  validateStructure,
  type Severity,
  type ValidationIssue,
} from "@/features/validation";

interface ValidationTabProps {
  /** Lleva el foco al elemento afectado y vuelve a la pestana Propiedades. */
  onNavigateToElement: () => void;
}

const SEVERITY_ICON: Record<Severity, typeof Info> = {
  error: CircleAlert,
  warning: TriangleAlert,
  info: Info,
};

/**
 * Pestana "Validacion": integridad ESTRUCTURAL del modelo (no reglas de
 * catedra). Se recalcula sola con cada cambio; el boton "Validar" del header
 * solo trae el foco hasta aca.
 */
export function ValidationTab({ onNavigateToElement }: ValidationTabProps) {
  const model = useDerEditorStore((s) => s.model);
  const select = useDerEditorStore((s) => s.select);

  const issues = useMemo(() => validateStructure(model), [model]);
  const counts = useMemo(() => summarize(issues), [issues]);

  if (issues.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
        <CircleCheck size={22} className="text-emerald-500" aria-hidden />
        <p className="text-xs text-neutral-500">Sin problemas estructurales.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 py-3">
      <p className="mb-2 text-xs text-neutral-500">
        {counts.error} error{counts.error === 1 ? "" : "es"} · {counts.warning} advertencia
        {counts.warning === 1 ? "" : "s"} · {counts.info} info
      </p>
      <ul className="space-y-1.5">
        {issues.map((issue) => (
          <IssueRow
            key={issue.id}
            issue={issue}
            onSelect={() => {
              if (issue.targetId && issue.targetKind !== "model") {
                select({ kind: issue.targetKind as ConceptualElementKind, id: issue.targetId });
                onNavigateToElement();
              }
            }}
          />
        ))}
      </ul>
    </div>
  );
}

function IssueRow({ issue, onSelect }: { issue: ValidationIssue; onSelect: () => void }) {
  const Icon = SEVERITY_ICON[issue.severity];
  const clickable = Boolean(issue.targetId) && issue.targetKind !== "model";
  const tone =
    issue.severity === "error"
      ? "text-red-600"
      : issue.severity === "warning"
        ? "text-amber-600"
        : "text-neutral-500";

  return (
    <li>
      <button
        type="button"
        disabled={!clickable}
        onClick={onSelect}
        className={`flex w-full items-start gap-2 rounded-md border border-neutral-200 p-2 text-left text-xs ${
          clickable ? "hover:bg-neutral-50" : "cursor-default"
        }`}
      >
        <Icon size={14} className={`mt-0.5 shrink-0 ${tone}`} aria-hidden />
        <span className="min-w-0">
          <span className={`font-semibold ${tone}`}>{SEVERITY_LABELS[issue.severity]}</span>
          <span className="mt-0.5 block text-neutral-600">{issue.message}</span>
        </span>
      </button>
    </li>
  );
}

function summarize(issues: ValidationIssue[]): Record<Severity, number> {
  const counts: Record<Severity, number> = { error: 0, warning: 0, info: 0 };
  for (const issue of issues) counts[issue.severity] += 1;
  return counts;
}
