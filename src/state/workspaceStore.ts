// Estado persistente de dominio del espacio de trabajo (Incremento 1).
// Zustand orquesta las operaciones: aplica una fabrica pura del dominio y
// delega la escritura al repositorio Dexie. El estado efimero de UI (que
// panel esta abierto, herramienta activa, etc.) NO vive aca: vive en React
// state local dentro del shell (ver docs/ARCHITECTURE.md).

import { create } from "zustand";
import {
  cloneProject,
  createDocument as makeDocument,
  createFolder as makeFolder,
  createProject as makeProject,
  duplicateDocument as makeDocumentCopy,
  type DocumentEntry,
  type DocumentKind,
  type Folder,
  type ProjectMeta,
} from "@/domain/project";
import * as repo from "@/infrastructure/persistence/workspaceRepo";

/**
 * - `loading`: todavia no se leyo IndexedDB.
 * - `empty`: no hay proyecto abierto (se muestra la pantalla de bienvenida).
 * - `ready`: hay un proyecto abierto (se muestra el shell completo).
 */
export type WorkspaceStatus = "loading" | "empty" | "ready";

/** Indicador de autoguardado del header. */
export type SaveState = "saved" | "saving";

interface WorkspaceState {
  status: WorkspaceStatus;
  saveState: SaveState;
  /** Proyectos recientes, mas reciente primero. */
  projects: ProjectMeta[];
  project: ProjectMeta | null;
  folders: Folder[];
  documents: DocumentEntry[];
  activeDocumentId: string | null;

  /** Lee IndexedDB y reabre el ultimo proyecto/documento de la sesion previa. */
  init: () => Promise<void>;

  /**
   * Refleja el estado de autoguardado en el indicador del header. Lo usa el
   * editor DER (src/state/derEditorStore), que persiste su propio contenido
   * fuera de este store pero comparte el mismo indicador visual.
   */
  setSaveState: (saveState: SaveState) => void;

  createProject: (name: string) => Promise<void>;
  openProject: (id: string) => Promise<void>;
  closeProject: () => Promise<void>;
  renameProject: (id: string, name: string) => Promise<void>;
  duplicateProject: (id: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  createFolder: (parentId: string | null, name: string) => Promise<void>;
  createDocument: (
    parentId: string | null,
    name: string,
    kind: DocumentKind,
  ) => Promise<DocumentEntry>;
  renameFolder: (id: string, name: string) => Promise<void>;
  renameDocument: (id: string, name: string) => Promise<void>;
  duplicateDocument: (id: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;

  setActiveDocument: (id: string | null) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => {
  /** Envuelve una escritura mostrando "Guardando..." mientras corre. */
  async function withSave<T>(operation: () => Promise<T>): Promise<T> {
    set({ saveState: "saving" });
    try {
      return await operation();
    } finally {
      set({ saveState: "saved" });
    }
  }

  /** Recarga metadatos + contenido del proyecto abierto desde Dexie. */
  async function refreshOpenProject(projectId: string): Promise<void> {
    const [projects, project, contents] = await Promise.all([
      repo.listProjects(),
      repo.getProject(projectId),
      repo.loadProjectContents(projectId),
    ]);
    if (!project) {
      set({ status: "empty", project: null, folders: [], documents: [], activeDocumentId: null, projects });
      return;
    }
    const { activeDocumentId } = get();
    const stillExists = contents.documents.some((doc) => doc.id === activeDocumentId);
    set({
      projects,
      project,
      folders: contents.folders,
      documents: contents.documents,
      activeDocumentId: stillExists ? activeDocumentId : null,
    });
  }

  return {
    status: "loading",
    saveState: "saved",
    projects: [],
    project: null,
    folders: [],
    documents: [],
    activeDocumentId: null,

    init: async () => {
      const [projects, session] = await Promise.all([repo.listProjects(), repo.readSession()]);

      if (!session.lastProjectId) {
        set({ status: "empty", projects, project: null, folders: [], documents: [], activeDocumentId: null });
        return;
      }

      const project = await repo.getProject(session.lastProjectId);
      if (!project) {
        await repo.writeSession({ lastProjectId: null, lastDocumentId: null });
        set({ status: "empty", projects, project: null, folders: [], documents: [], activeDocumentId: null });
        return;
      }

      const contents = await repo.loadProjectContents(project.id);
      const activeDocumentId = contents.documents.some((doc) => doc.id === session.lastDocumentId)
        ? session.lastDocumentId
        : null;

      set({
        status: "ready",
        projects,
        project,
        folders: contents.folders,
        documents: contents.documents,
        activeDocumentId,
      });
    },

    createProject: async (name) => {
      const project = makeProject(name);
      await withSave(async () => {
        await repo.putProject(project);
        await repo.writeSession({ lastProjectId: project.id, lastDocumentId: null });
      });
      const projects = await repo.listProjects();
      set({
        status: "ready",
        projects,
        project,
        folders: [],
        documents: [],
        activeDocumentId: null,
      });
    },

    openProject: async (id) => {
      const project = await repo.getProject(id);
      if (!project) return;
      const contents = await repo.loadProjectContents(id);
      await repo.writeSession({ lastProjectId: id, lastDocumentId: null });
      const projects = await repo.listProjects();
      set({
        status: "ready",
        projects,
        project,
        folders: contents.folders,
        documents: contents.documents,
        activeDocumentId: null,
      });
    },

    closeProject: async () => {
      await repo.writeSession({ lastProjectId: null, lastDocumentId: null });
      const projects = await repo.listProjects();
      set({
        status: "empty",
        projects,
        project: null,
        folders: [],
        documents: [],
        activeDocumentId: null,
      });
    },

    renameProject: async (id, name) => {
      const existing = await repo.getProject(id);
      if (!existing) return;
      const updated: ProjectMeta = { ...existing, name: name.trim() || existing.name, updatedAt: new Date().toISOString() };
      await withSave(() => repo.putProject(updated));
      const projects = await repo.listProjects();
      const current = get().project;
      set({ projects, project: current?.id === id ? updated : current });
    },

    duplicateProject: async (id) => {
      const source = await repo.getProject(id);
      if (!source) return;
      const contents = await repo.loadProjectContents(id);
      const { project, contents: cloned } = cloneProject(source, contents);
      await withSave(() => repo.insertProjectWithContents(project, cloned));
      const projects = await repo.listProjects();
      set({ projects });
    },

    deleteProject: async (id) => {
      await withSave(() => repo.deleteProjectCascade(id));
      const wasOpen = get().project?.id === id;
      if (wasOpen) {
        await repo.writeSession({ lastProjectId: null, lastDocumentId: null });
      }
      const projects = await repo.listProjects();
      if (wasOpen) {
        set({
          status: "empty",
          projects,
          project: null,
          folders: [],
          documents: [],
          activeDocumentId: null,
        });
      } else {
        set({ projects });
      }
    },

    createFolder: async (parentId, name) => {
      const project = get().project;
      if (!project) return;
      const folder = makeFolder(project.id, parentId, name);
      await withSave(() => repo.putFolder(folder));
      await refreshOpenProject(project.id);
    },

    createDocument: async (parentId, name, kind) => {
      const project = get().project;
      if (!project) throw new Error("No hay un proyecto abierto");
      const document = makeDocument(project.id, parentId, name, kind);
      await withSave(async () => {
        await repo.putDocument(document);
        await repo.writeSession({ lastDocumentId: document.id });
      });
      await refreshOpenProject(project.id);
      set({ activeDocumentId: document.id });
      return document;
    },

    renameFolder: async (id, name) => {
      const project = get().project;
      if (!project) return;
      await withSave(() => repo.renameFolder(id, name.trim()));
      await refreshOpenProject(project.id);
    },

    renameDocument: async (id, name) => {
      const project = get().project;
      if (!project) return;
      await withSave(() => repo.renameDocument(id, name.trim()));
      await refreshOpenProject(project.id);
    },

    duplicateDocument: async (id) => {
      const project = get().project;
      if (!project) return;
      const source = get().documents.find((doc) => doc.id === id);
      if (!source) return;
      const copy = makeDocumentCopy(source);
      await withSave(() => repo.putDocument(copy));
      await refreshOpenProject(project.id);
    },

    deleteFolder: async (id) => {
      const project = get().project;
      if (!project) return;
      await withSave(() => repo.deleteFolderCascade(project.id, id));
      await refreshOpenProject(project.id);
    },

    deleteDocument: async (id) => {
      const project = get().project;
      if (!project) return;
      await withSave(() => repo.deleteDocument(id));
      if (get().activeDocumentId === id) {
        await repo.writeSession({ lastDocumentId: null });
        set({ activeDocumentId: null });
      }
      await refreshOpenProject(project.id);
    },

    setActiveDocument: async (id) => {
      set({ activeDocumentId: id });
      await repo.writeSession({ lastDocumentId: id });
    },

    setSaveState: (saveState) => set({ saveState }),
  };
});

// El arbol anidado se deriva con useMemo dentro del Explorer a partir de
// `folders` y `documents` (referencias estables del store). No exponer un
// selector que construya el arbol en cada llamada: useSyncExternalStore
// entraria en un bucle de re-render al detectar una snapshot distinta.
