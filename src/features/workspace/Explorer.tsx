import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  FilePlus2,
  FolderPlus,
  MoreHorizontal,
  PanelLeftClose,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import {
  buildWorkspaceTree,
  DOCUMENT_KIND_LABELS,
  filterWorkspaceTree,
  type DocumentKind,
  type WorkspaceTreeNode,
} from "@/domain/project";
import { useWorkspaceStore } from "@/state/workspaceStore";
import { Menu } from "@/components/ui/Menu";
import { PromptDialog } from "@/components/ui/PromptDialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ghostIconButton, textInput } from "@/components/ui/buttonStyles";
import { NewDocumentDialog } from "./NewDocumentDialog";

type ExplorerDialog =
  | { type: "new-folder"; parentId: string | null }
  | { type: "new-document"; parentId: string | null }
  | { type: "rename-project"; name: string }
  | { type: "rename"; nodeKind: "folder" | "document"; id: string; name: string }
  | { type: "delete"; nodeKind: "folder" | "document"; id: string; name: string }
  | null;

interface ExplorerProps {
  onCollapse: () => void;
}

/** Panel lateral izquierdo: arbol del proyecto, busqueda y creacion rapida. */
export function Explorer({ onCollapse }: ExplorerProps) {
  const project = useWorkspaceStore((s) => s.project);
  const folders = useWorkspaceStore((s) => s.folders);
  const documents = useWorkspaceStore((s) => s.documents);
  const activeDocumentId = useWorkspaceStore((s) => s.activeDocumentId);

  const setActiveDocument = useWorkspaceStore((s) => s.setActiveDocument);
  const createFolder = useWorkspaceStore((s) => s.createFolder);
  const createDocument = useWorkspaceStore((s) => s.createDocument);
  const renameFolder = useWorkspaceStore((s) => s.renameFolder);
  const renameDocument = useWorkspaceStore((s) => s.renameDocument);
  const duplicateDocument = useWorkspaceStore((s) => s.duplicateDocument);
  const deleteFolder = useWorkspaceStore((s) => s.deleteFolder);
  const deleteDocument = useWorkspaceStore((s) => s.deleteDocument);
  const renameProject = useWorkspaceStore((s) => s.renameProject);

  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<ExplorerDialog>(null);
  const closeDialog = () => setDialog(null);

  const tree = useMemo(
    () => buildWorkspaceTree({ folders, documents }),
    [folders, documents],
  );
  const visibleTree = useMemo(() => filterWorkspaceTree(tree, query), [tree, query]);
  const searching = query.trim().length > 0;

  const toggleFolder = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!project) return null;

  return (
    <aside className="pointer-events-auto absolute top-20 bottom-3 left-3 z-20 flex w-72 flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white/85 shadow-sm backdrop-blur-md">
      <div className="flex items-center gap-1 px-3 py-2.5">
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-neutral-800" title={project.name}>
          {project.name}
        </span>
        <Menu
          trigger={
            <button type="button" className={ghostIconButton} aria-label="Acciones del proyecto">
              <MoreHorizontal size={16} aria-hidden />
            </button>
          }
          items={[
            {
              label: "Renombrar proyecto",
              icon: <Pencil size={14} aria-hidden />,
              onSelect: () => setDialog({ type: "rename-project", name: project.name }),
            },
          ]}
        />
        <button type="button" className={ghostIconButton} aria-label="Ocultar explorador" onClick={onCollapse}>
          <PanelLeftClose size={16} aria-hidden />
        </button>
      </div>

      <div className="px-3 pb-2">
        <div className="relative">
          <Search
            size={14}
            className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-neutral-400"
            aria-hidden
          />
          <input
            className={`${textInput} pl-8`}
            placeholder="Buscar en el proyecto"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Buscar en el proyecto"
          />
        </div>
        <div className="mt-2 flex gap-1">
          <button
            type="button"
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-neutral-200 px-2 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
            onClick={() => setDialog({ type: "new-folder", parentId: null })}
          >
            <FolderPlus size={14} aria-hidden />
            Carpeta
          </button>
          <button
            type="button"
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-neutral-200 px-2 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
            onClick={() => setDialog({ type: "new-document", parentId: null })}
          >
            <FilePlus2 size={14} aria-hidden />
            Documento
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-2">
        {visibleTree.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-neutral-400">
            {searching ? "Sin resultados." : "Proyecto vacio. Crea una carpeta o un documento."}
          </p>
        ) : (
          <ul>
            {visibleTree.map((node) => (
              <TreeNodeView
                key={node.id}
                node={node}
                depth={0}
                expanded={expanded}
                forceExpanded={searching}
                activeDocumentId={activeDocumentId}
                onToggleFolder={toggleFolder}
                onOpenDocument={(id) => void setActiveDocument(id)}
                onDialog={setDialog}
                onDuplicateDocument={(id) => void duplicateDocument(id)}
              />
            ))}
          </ul>
        )}
      </div>

      <PromptDialog
        open={dialog?.type === "new-folder"}
        title="Nueva carpeta"
        label="Nombre de la carpeta"
        confirmLabel="Crear"
        onCancel={closeDialog}
        onConfirm={(name) => {
          if (dialog?.type === "new-folder") void createFolder(dialog.parentId, name);
          closeDialog();
        }}
      />

      <NewDocumentDialog
        open={dialog?.type === "new-document"}
        onCancel={closeDialog}
        onConfirm={(name, kind: DocumentKind) => {
          if (dialog?.type === "new-document") void createDocument(dialog.parentId, name, kind);
          closeDialog();
        }}
      />

      <PromptDialog
        open={dialog?.type === "rename-project"}
        title="Renombrar proyecto"
        label="Nuevo nombre"
        confirmLabel="Guardar"
        initialValue={dialog?.type === "rename-project" ? dialog.name : ""}
        onCancel={closeDialog}
        onConfirm={(name) => {
          void renameProject(project.id, name);
          closeDialog();
        }}
      />

      <PromptDialog
        open={dialog?.type === "rename"}
        title={dialog?.type === "rename" && dialog.nodeKind === "folder" ? "Renombrar carpeta" : "Renombrar documento"}
        label="Nuevo nombre"
        confirmLabel="Guardar"
        initialValue={dialog?.type === "rename" ? dialog.name : ""}
        onCancel={closeDialog}
        onConfirm={(name) => {
          if (dialog?.type === "rename") {
            if (dialog.nodeKind === "folder") void renameFolder(dialog.id, name);
            else void renameDocument(dialog.id, name);
          }
          closeDialog();
        }}
      />

      <ConfirmDialog
        open={dialog?.type === "delete"}
        title={dialog?.type === "delete" && dialog.nodeKind === "folder" ? "Eliminar carpeta" : "Eliminar documento"}
        message={
          dialog?.type === "delete"
            ? dialog.nodeKind === "folder"
              ? `Se eliminara la carpeta "${dialog.name}" y todo su contenido. Esta accion no se puede deshacer.`
              : `Se eliminara el documento "${dialog.name}". Esta accion no se puede deshacer.`
            : ""
        }
        onCancel={closeDialog}
        onConfirm={() => {
          if (dialog?.type === "delete") {
            if (dialog.nodeKind === "folder") void deleteFolder(dialog.id);
            else void deleteDocument(dialog.id);
          }
          closeDialog();
        }}
      />
    </aside>
  );
}

interface TreeNodeViewProps {
  node: WorkspaceTreeNode;
  depth: number;
  expanded: Set<string>;
  forceExpanded: boolean;
  activeDocumentId: string | null;
  onToggleFolder: (id: string) => void;
  onOpenDocument: (id: string) => void;
  onDialog: (dialog: ExplorerDialog) => void;
  onDuplicateDocument: (id: string) => void;
}

function TreeNodeView({
  node,
  depth,
  expanded,
  forceExpanded,
  activeDocumentId,
  onToggleFolder,
  onOpenDocument,
  onDialog,
  onDuplicateDocument,
}: TreeNodeViewProps) {
  const indent = { paddingLeft: `${depth * 14 + 8}px` };

  if (node.kind === "folder") {
    const isOpen = forceExpanded || expanded.has(node.id);
    return (
      <li>
        <div className="group flex items-center gap-1 rounded-md pr-1 hover:bg-neutral-100">
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-1.5 py-1 text-sm text-neutral-700"
            style={indent}
            onClick={() => onToggleFolder(node.id)}
            aria-expanded={isOpen}
          >
            {isOpen ? (
              <ChevronDown size={14} className="shrink-0 text-neutral-400" aria-hidden />
            ) : (
              <ChevronRight size={14} className="shrink-0 text-neutral-400" aria-hidden />
            )}
            <span className="truncate">{node.name}</span>
          </button>
          <Menu
            trigger={
              <button
                type="button"
                className={`${ghostIconButton} opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100`}
                aria-label={`Acciones de ${node.name}`}
              >
                <MoreHorizontal size={14} aria-hidden />
              </button>
            }
            items={[
              {
                label: "Nueva subcarpeta",
                icon: <FolderPlus size={14} aria-hidden />,
                onSelect: () => onDialog({ type: "new-folder", parentId: node.id }),
              },
              {
                label: "Nuevo documento",
                icon: <FilePlus2 size={14} aria-hidden />,
                onSelect: () => onDialog({ type: "new-document", parentId: node.id }),
              },
              {
                label: "Renombrar",
                icon: <Pencil size={14} aria-hidden />,
                onSelect: () => onDialog({ type: "rename", nodeKind: "folder", id: node.id, name: node.name }),
              },
              {
                label: "Eliminar",
                icon: <Trash2 size={14} aria-hidden />,
                destructive: true,
                onSelect: () => onDialog({ type: "delete", nodeKind: "folder", id: node.id, name: node.name }),
              },
            ]}
          />
        </div>
        {isOpen && node.children.length > 0 && (
          <ul>
            {node.children.map((child) => (
              <TreeNodeView
                key={child.id}
                node={child}
                depth={depth + 1}
                expanded={expanded}
                forceExpanded={forceExpanded}
                activeDocumentId={activeDocumentId}
                onToggleFolder={onToggleFolder}
                onOpenDocument={onOpenDocument}
                onDialog={onDialog}
                onDuplicateDocument={onDuplicateDocument}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

  const isActive = node.id === activeDocumentId;
  return (
    <li>
      <div
        className={`group flex items-center gap-1 rounded-md pr-1 ${
          isActive ? "bg-neutral-200/70" : "hover:bg-neutral-100"
        }`}
      >
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-1.5 py-1 text-sm text-neutral-700"
          style={indent}
          onClick={() => onOpenDocument(node.id)}
          aria-current={isActive ? "true" : undefined}
        >
          <span
            className="shrink-0 rounded border border-neutral-300 px-1 text-[10px] font-semibold text-neutral-500"
            aria-hidden
          >
            {DOCUMENT_KIND_LABELS[node.documentKind]}
          </span>
          <span className="truncate">{node.name}</span>
        </button>
        <Menu
          trigger={
            <button
              type="button"
              className={`${ghostIconButton} opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100`}
              aria-label={`Acciones de ${node.name}`}
            >
              <MoreHorizontal size={14} aria-hidden />
            </button>
          }
          items={[
            {
              label: "Renombrar",
              icon: <Pencil size={14} aria-hidden />,
              onSelect: () => onDialog({ type: "rename", nodeKind: "document", id: node.id, name: node.name }),
            },
            {
              label: "Duplicar",
              icon: <Copy size={14} aria-hidden />,
              onSelect: () => onDuplicateDocument(node.id),
            },
            {
              label: "Eliminar",
              icon: <Trash2 size={14} aria-hidden />,
              destructive: true,
              onSelect: () => onDialog({ type: "delete", nodeKind: "document", id: node.id, name: node.name }),
            },
          ]}
        />
      </div>
    </li>
  );
}
