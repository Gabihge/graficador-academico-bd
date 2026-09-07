import { useState } from "react";
import { Copy, FilePlus2, FolderOpen, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useWorkspaceStore } from "@/state/workspaceStore";
import { Menu } from "@/components/ui/Menu";
import { PromptDialog } from "@/components/ui/PromptDialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ghostIconButton, primaryButton } from "@/components/ui/buttonStyles";

type LandingDialog =
  | { type: "create" }
  | { type: "rename"; id: string; name: string }
  | { type: "delete"; id: string; name: string }
  | null;

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" });

/**
 * Pantalla de bienvenida (estado `empty`): crear un proyecto o reabrir uno
 * reciente. Sin canvas ni paneles todavia.
 */
export function WorkspaceLanding() {
  const projects = useWorkspaceStore((s) => s.projects);
  const createProject = useWorkspaceStore((s) => s.createProject);
  const openProject = useWorkspaceStore((s) => s.openProject);
  const renameProject = useWorkspaceStore((s) => s.renameProject);
  const duplicateProject = useWorkspaceStore((s) => s.duplicateProject);
  const deleteProject = useWorkspaceStore((s) => s.deleteProject);

  const [dialog, setDialog] = useState<LandingDialog>(null);
  const closeDialog = () => setDialog(null);

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-neutral-50 px-4 py-10 text-neutral-800">
      <div className="w-full max-w-lg">
        <header className="text-center">
          <p className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">UNLaM · Bases de Datos</p>
          <h1 className="mt-2 text-2xl font-semibold">Graficador Academico de Bases de Datos</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Herramienta academica no oficial. No afiliada ni mantenida por UNLaM.
          </p>
        </header>

        <div className="mt-8 flex justify-center">
          <button type="button" className={primaryButton} onClick={() => setDialog({ type: "create" })}>
            <FilePlus2 size={16} aria-hidden />
            Crear proyecto
          </button>
        </div>

        <section className="mt-10">
          <h2 className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
            Proyectos recientes
          </h2>
          {projects.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-neutral-200 p-6 text-center text-sm text-neutral-400">
              Todavia no hay proyectos.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-neutral-100 overflow-hidden rounded-lg border border-neutral-200 bg-white">
              {projects.map((project) => (
                <li key={project.id} className="flex items-center gap-2 px-3 py-2.5">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    onClick={() => void openProject(project.id)}
                  >
                    <FolderOpen size={18} className="shrink-0 text-neutral-400" aria-hidden />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-neutral-800">
                        {project.name}
                      </span>
                      <span className="block text-xs text-neutral-400">
                        Modificado {dateFormatter.format(new Date(project.updatedAt))}
                      </span>
                    </span>
                  </button>
                  <Menu
                    trigger={
                      <button type="button" className={ghostIconButton} aria-label={`Acciones de ${project.name}`}>
                        <MoreHorizontal size={16} aria-hidden />
                      </button>
                    }
                    items={[
                      {
                        label: "Renombrar",
                        icon: <Pencil size={14} aria-hidden />,
                        onSelect: () => setDialog({ type: "rename", id: project.id, name: project.name }),
                      },
                      {
                        label: "Duplicar",
                        icon: <Copy size={14} aria-hidden />,
                        onSelect: () => void duplicateProject(project.id),
                      },
                      {
                        label: "Eliminar",
                        icon: <Trash2 size={14} aria-hidden />,
                        destructive: true,
                        onSelect: () => setDialog({ type: "delete", id: project.id, name: project.name }),
                      },
                    ]}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <PromptDialog
        open={dialog?.type === "create"}
        title="Crear proyecto"
        label="Nombre del proyecto"
        confirmLabel="Crear"
        onCancel={closeDialog}
        onConfirm={(name) => {
          void createProject(name);
          closeDialog();
        }}
      />

      <PromptDialog
        open={dialog?.type === "rename"}
        title="Renombrar proyecto"
        label="Nuevo nombre"
        confirmLabel="Guardar"
        initialValue={dialog?.type === "rename" ? dialog.name : ""}
        onCancel={closeDialog}
        onConfirm={(name) => {
          if (dialog?.type === "rename") void renameProject(dialog.id, name);
          closeDialog();
        }}
      />

      <ConfirmDialog
        open={dialog?.type === "delete"}
        title="Eliminar proyecto"
        message={
          dialog?.type === "delete"
            ? `Se eliminara "${dialog.name}" y todo su contenido. Esta accion no se puede deshacer.`
            : ""
        }
        onCancel={closeDialog}
        onConfirm={() => {
          if (dialog?.type === "delete") void deleteProject(dialog.id);
          closeDialog();
        }}
      />
    </div>
  );
}
