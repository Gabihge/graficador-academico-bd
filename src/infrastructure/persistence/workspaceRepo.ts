// Repositorio del espacio de trabajo: unica puerta de entrada a Dexie para
// la capa de estado. Traduce entre operaciones de dominio y tablas. No
// contiene reglas de producto (esas viven en src/state), solo lectura y
// escritura consistentes.

import type {
  DocumentEntry,
  Folder,
  ProjectContents,
  ProjectMeta,
} from "@/domain/project";
import { db, SESSION_KEY, type SessionState } from "./db";

const EMPTY_SESSION: SessionState = {
  key: SESSION_KEY,
  lastProjectId: null,
  lastDocumentId: null,
};

/** Proyectos ordenados por ultima modificacion (mas reciente primero). */
export async function listProjects(): Promise<ProjectMeta[]> {
  const projects = await db.projects.orderBy("updatedAt").toArray();
  return projects.reverse();
}

export async function getProject(id: string): Promise<ProjectMeta | undefined> {
  return db.projects.get(id);
}

export async function putProject(project: ProjectMeta): Promise<void> {
  await db.projects.put(project);
}

/** Marca el proyecto como modificado ahora (mueve su posicion en "recientes"). */
export async function touchProject(projectId: string): Promise<void> {
  await db.projects.update(projectId, { updatedAt: new Date().toISOString() });
}

export async function loadProjectContents(projectId: string): Promise<ProjectContents> {
  const [folders, documents] = await Promise.all([
    db.folders.where("projectId").equals(projectId).toArray(),
    db.documents.where("projectId").equals(projectId).toArray(),
  ]);
  return { folders, documents };
}

export async function putFolder(folder: Folder): Promise<void> {
  await db.transaction("rw", db.folders, db.projects, async () => {
    await db.folders.put(folder);
    await touchProject(folder.projectId);
  });
}

export async function putDocument(document: DocumentEntry): Promise<void> {
  await db.transaction("rw", db.documents, db.projects, async () => {
    await db.documents.put(document);
    await touchProject(document.projectId);
  });
}

export async function renameFolder(id: string, name: string): Promise<void> {
  await db.transaction("rw", db.folders, db.projects, async () => {
    const folder = await db.folders.get(id);
    if (!folder) return;
    await db.folders.update(id, { name });
    await touchProject(folder.projectId);
  });
}

export async function renameDocument(id: string, name: string): Promise<void> {
  await db.transaction("rw", db.documents, db.projects, async () => {
    const document = await db.documents.get(id);
    if (!document) return;
    await db.documents.update(id, { name, updatedAt: new Date().toISOString() });
    await touchProject(document.projectId);
  });
}

const CONTENT_TABLES = [db.folders, db.documents, db.projects, db.derDocuments, db.mrDocuments] as const;

/** Elimina una carpeta y, en cascada, sus subcarpetas y documentos. */
export async function deleteFolderCascade(projectId: string, folderId: string): Promise<void> {
  await db.transaction("rw", ...CONTENT_TABLES, async () => {
    const folders = await db.folders.where("projectId").equals(projectId).toArray();

    const childrenByParent = new Map<string | null, Folder[]>();
    for (const folder of folders) {
      const bucket = childrenByParent.get(folder.parentId);
      if (bucket) bucket.push(folder);
      else childrenByParent.set(folder.parentId, [folder]);
    }

    const toRemove: string[] = [];
    const stack = [folderId];
    while (stack.length > 0) {
      const current = stack.pop() as string;
      toRemove.push(current);
      for (const child of childrenByParent.get(current) ?? []) stack.push(child.id);
    }

    // Contenido DER/MR de los documentos que se van a borrar: se limpia aca
    // para no dejar filas huerfanas.
    const removedDocIds = (await db.documents
      .where("parentId")
      .anyOf(toRemove)
      .primaryKeys()) as string[];
    await db.derDocuments.bulkDelete(removedDocIds);
    await db.mrDocuments.bulkDelete(removedDocIds);
    await db.documents.where("parentId").anyOf(toRemove).delete();
    await db.folders.bulkDelete(toRemove);
    await touchProject(projectId);
  });
}

export async function deleteDocument(id: string): Promise<void> {
  await db.transaction("rw", db.documents, db.projects, db.derDocuments, db.mrDocuments, async () => {
    const document = await db.documents.get(id);
    if (!document) return;
    await db.documents.delete(id);
    await db.derDocuments.delete(id);
    await db.mrDocuments.delete(id);
    await touchProject(document.projectId);
  });
}

/** Borra el proyecto entero (metadatos + carpetas + documentos + contenido DER/MR). */
export async function deleteProjectCascade(projectId: string): Promise<void> {
  await db.transaction("rw", ...CONTENT_TABLES, async () => {
    const removedDocIds = (await db.documents
      .where("projectId")
      .equals(projectId)
      .primaryKeys()) as string[];
    await db.derDocuments.bulkDelete(removedDocIds);
    await db.mrDocuments.bulkDelete(removedDocIds);
    await db.folders.where("projectId").equals(projectId).delete();
    await db.documents.where("projectId").equals(projectId).delete();
    await db.projects.delete(projectId);
  });
}

/** Inserta un proyecto completo de una sola vez (usado al duplicar). */
export async function insertProjectWithContents(
  project: ProjectMeta,
  contents: ProjectContents,
): Promise<void> {
  await db.transaction("rw", db.projects, db.folders, db.documents, async () => {
    await db.projects.put(project);
    if (contents.folders.length > 0) await db.folders.bulkPut(contents.folders);
    if (contents.documents.length > 0) await db.documents.bulkPut(contents.documents);
  });
}

export async function readSession(): Promise<SessionState> {
  const stored = await db.session.get(SESSION_KEY);
  return stored ?? { ...EMPTY_SESSION };
}

export async function writeSession(
  patch: Partial<Omit<SessionState, "key">>,
): Promise<void> {
  const current = await readSession();
  await db.session.put({ ...current, ...patch, key: SESSION_KEY });
}
