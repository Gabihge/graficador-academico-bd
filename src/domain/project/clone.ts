// Clonado puro de un proyecto completo: dado el contenido plano de un
// proyecto origen, produce metadatos nuevos y un contenido con IDs
// remapeados, preservando la jerarquia carpeta/documento. Sin persistencia.

import { createProject } from "./factories";
import type { DocumentEntry, Folder, ProjectContents, ProjectMeta } from "./types";

export interface ClonedProject {
  project: ProjectMeta;
  contents: ProjectContents;
}

/**
 * Duplica un proyecto. Cada carpeta y documento recibe un id nuevo; los
 * `parentId` se reescriben con el mapa de ids viejo -> nuevo para que el
 * arbol quede identico en forma. El nombre por defecto agrega "(copia)".
 */
export function cloneProject(
  source: ProjectMeta,
  contents: ProjectContents,
  name?: string,
): ClonedProject {
  const project = createProject(name ?? `${source.name} (copia)`);

  const folderIdMap = new Map<string, string>();
  for (const folder of contents.folders) {
    folderIdMap.set(folder.id, crypto.randomUUID());
  }

  const remapParent = (parentId: string | null): string | null =>
    parentId === null ? null : (folderIdMap.get(parentId) ?? null);

  const folders: Folder[] = contents.folders.map((folder) => ({
    ...folder,
    id: folderIdMap.get(folder.id) as string,
    projectId: project.id,
    parentId: remapParent(folder.parentId),
  }));

  const documents: DocumentEntry[] = contents.documents.map((doc) => ({
    ...doc,
    id: crypto.randomUUID(),
    projectId: project.id,
    parentId: remapParent(doc.parentId),
  }));

  return { project, contents: { folders, documents } };
}
