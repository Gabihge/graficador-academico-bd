import { useMemo } from "react";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { useMrEditorStore } from "@/state/mrEditorStore";
import {
  MR_SEVERITY_LABELS,
  mrElementKindOf,
  validateMr,
  type MrIssue,
  type Severity,
} from "@/features/validation";

interface MrValidationTabProps {
  onNavigateToElement: () => void;
}

const ICON: Record<Severity, typeof Info> = {
  error: CircleAlert,
  warning: TriangleAlert,
  info: Info,
};

/**
 * Pestana "Validacion" del editor MR: integridad ESTRUCTURAL del modelo
 * relacional (no convenciones de catedra). Se recalcula con cada cambio.
 */
export function MrValidationTab({ onNavigateToElement }: MrValidationTabProps) {
  const model = useMrEditorStore((s) => s.model);
  const select = useMrEditorStore((s) => s.select);

  const issues = useMemo(() => validateMr(model), [model]);

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
      <ul className="space-y-1.5">
        {issues.map((issue) => (
          <IssueRow
            key={issue.id}
            issue={issue}
            onSelect={() => {
              const id = issue.elementIds[0];
              if (!id) return;
              const kind = mrElementKindOf(model, id);
              if (kind) {
                select({ kind, id });
                onNavigateToElement();
              }
            }}
          />
        ))}
      </ul>
    </div>
  );
}

function IssueRow({ issue, onSelect }: { issue: MrIssue; onSelect: () => void }) {
  const Icon = ICON[issue.severity];
  const clickable = issue.elementIds.length > 0;
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
          <span className={`font-semibold ${tone}`}>{MR_SEVERITY_LABELS[issue.severity]}</span>
          <span className="mt-0.5 block text-neutral-600">{issue.message}</span>
        </span>
      </button>
    </li>
  );
}
