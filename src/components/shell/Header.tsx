import {
  ArrowRightLeft,
  Download,
  Info,
  MoreHorizontal,
  PanelLeft,
  PanelRight,
  Redo2,
  ShieldCheck,
  Undo2,
} from "lucide-react";
import { DOCUMENT_KIND_LABELS } from "@/domain/project";
import { useWorkspaceStore } from "@/state/workspaceStore";
import { Menu } from "@/components/ui/Menu";
import { Tooltip } from "@/components/ui/Tooltip";
import { ghostIconButton } from "@/components/ui/buttonStyles";

export type EditorMode = "der" | "mr";

interface HeaderProps {
  editorMode: EditorMode;
  onEditorModeChange: (mode: EditorMode) => void;
  explorerOpen: boolean;
  onToggleExplorer: () => void;
  inspectorOpen: boolean;
  onToggleInspector: () => void;
  /** Estado de deshacer/rehacer/validar del editor activo (DER o MR). */
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  canValidate: boolean;
  onValidate: () => void;
  /** El DER activo es academicamente valido: habilita transformar. */
  canTransform: boolean;
  onTransform: () => void;
  onAbout: () => void;
}

/**
 * Header flotante translucido. Izquierda: identidad + proyecto/documento +
 * estado de guardado. Centro: selector DER / MR. Derecha: acciones del
 * layout final (undo/redo/validar/transformar/exportar todavia sin
 * funcion en este incremento, ver docs/DECISIONS.md) y menu "...".
 */
export function Header({
  editorMode,
  onEditorModeChange,
  explorerOpen,
  onToggleExplorer,
  inspectorOpen,
  onToggleInspector,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  canValidate,
  onValidate,
  canTransform,
  onTransform,
  onAbout,
}: HeaderProps) {
  const project = useWorkspaceStore((s) => s.project);
  const saveState = useWorkspaceStore((s) => s.saveState);
  const activeDocument = useWorkspaceStore((s) =>
    s.documents.find((doc) => doc.id === s.activeDocumentId),
  );
  const closeProject = useWorkspaceStore((s) => s.closeProject);

  return (
    <header className="pointer-events-auto absolute inset-x-3 top-3 z-30 flex h-14 items-center justify-between gap-3 rounded-2xl border border-neutral-200/70 bg-white/75 px-3 shadow-sm backdrop-blur-md">
      <div className="flex min-w-0 items-center gap-2">
        <Tooltip label={explorerOpen ? "Ocultar explorador" : "Mostrar explorador"}>
          <button type="button" className={ghostIconButton} onClick={onToggleExplorer} aria-pressed={explorerOpen}>
            <PanelLeft size={16} aria-hidden />
            <span className="sr-only">Explorador</span>
          </button>
        </Tooltip>
        <span className="hidden text-xs font-semibold tracking-wide text-neutral-400 sm:inline">UNLaM</span>
        <span className="mx-1 hidden h-5 w-px bg-neutral-200 sm:block" aria-hidden />
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-sm font-semibold text-neutral-800">
            {project?.name ?? "Sin proyecto"}
          </span>
          <span className="truncate text-xs text-neutral-400">
            {activeDocument
              ? `${activeDocument.name} · ${DOCUMENT_KIND_LABELS[activeDocument.kind]}`
              : "Ningun documento abierto"}
          </span>
        </div>
        <span
          className="ml-2 hidden items-center gap-1.5 text-xs text-neutral-400 md:flex"
          aria-live="polite"
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${saveState === "saving" ? "bg-amber-500" : "bg-emerald-500"}`}
            aria-hidden
          />
          {saveState === "saving" ? "Guardando…" : "Guardado"}
        </span>
      </div>

      <div
        className="flex shrink-0 items-center rounded-lg border border-neutral-200 bg-white/60 p-0.5 text-xs font-medium"
        role="group"
        aria-label="Vista del documento"
      >
        {(["der", "mr"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={editorMode === mode}
            onClick={() => onEditorModeChange(mode)}
            className={`rounded-md px-2.5 py-1 transition-colors ${
              editorMode === mode ? "bg-neutral-800 text-white" : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {DOCUMENT_KIND_LABELS[mode]}
          </button>
        ))}
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <Tooltip label="Deshacer" side="bottom">
          <button
            type="button"
            className={ghostIconButton}
            disabled={!canUndo}
            aria-label="Deshacer"
            onClick={onUndo}
          >
            <Undo2 size={16} aria-hidden />
          </button>
        </Tooltip>
        <Tooltip label="Rehacer" side="bottom">
          <button
            type="button"
            className={ghostIconButton}
            disabled={!canRedo}
            aria-label="Rehacer"
            onClick={onRedo}
          >
            <Redo2 size={16} aria-hidden />
          </button>
        </Tooltip>
        <span className="mx-1 h-5 w-px bg-neutral-200" aria-hidden />
        <Tooltip label="Validar" side="bottom">
          <button
            type="button"
            className={ghostIconButton}
            disabled={!canValidate}
            aria-label="Validar"
            onClick={onValidate}
          >
            <ShieldCheck size={16} aria-hidden />
          </button>
        </Tooltip>
        <Tooltip
          label={
            canTransform
              ? "Transformar DER a MR"
              : "Transformar DER a MR (requiere un DER academicamente valido)"
          }
          side="bottom"
        >
          <button
            type="button"
            className={ghostIconButton}
            disabled={!canTransform}
            aria-label="Transformar"
            onClick={onTransform}
          >
            <ArrowRightLeft size={16} aria-hidden />
          </button>
        </Tooltip>
        <Tooltip label="Exportar (proximo incremento)" side="bottom">
          <button type="button" className={ghostIconButton} disabled aria-label="Exportar">
            <Download size={16} aria-hidden />
          </button>
        </Tooltip>
        <span className="mx-1 h-5 w-px bg-neutral-200" aria-hidden />
        <Tooltip label={inspectorOpen ? "Ocultar inspector" : "Mostrar inspector"} side="bottom">
          <button
            type="button"
            className={ghostIconButton}
            onClick={onToggleInspector}
            aria-pressed={inspectorOpen}
            aria-label="Inspector"
          >
            <PanelRight size={16} aria-hidden />
          </button>
        </Tooltip>
        <Menu
          trigger={
            <button type="button" className={ghostIconButton} aria-label="Mas opciones">
              <MoreHorizontal size={16} aria-hidden />
            </button>
          }
          items={[
            { label: "Acerca de", icon: <Info size={14} aria-hidden />, onSelect: onAbout },
            { label: "Cerrar proyecto", onSelect: () => void closeProject() },
          ]}
        />
      </div>
    </header>
  );
}
