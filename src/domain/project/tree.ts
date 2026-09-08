// Proyeccion del arbol de proyecto: convierte las listas planas de carpetas
// y documentos (como se guardan en Dexie) en un arbol anidado ordenado y
// filtrable. Es codigo puro: la UI solo lo consume para renderizar.

import type {
  DocumentEntry,
  Folder,
  ProjectContents,
  WorkspaceTreeNode,
} from "./types";

function compareByName(a: { name: string }, b: { name: string }): number {
  return a.name.localeCompare(b.name, "es", { sensitivity: "base", numeric: true });
}

/**
 * Construye el arbol anidado a partir del contenido plano de un proyecto.
 * Las carpetas se listan antes que los documentos en cada nivel, y ambos
 * grupos quedan ordenados alfabeticamente (locale es, con orden numerico).
 * Carpetas cuyo `parentId` no existe se tratan como raiz para no perder
 * datos ante inconsistencias.
 */
export function buildWorkspaceTree({ folders, documents }: ProjectContents): WorkspaceTreeNode[] {
  const knownFolderIds = new Set(folders.map((f) => f.id));

  const foldersByParent = new Map<string | null, Folder[]>();
  for (const folder of folders) {
    const parentKey =
      folder.parentId !== null && knownFolderIds.has(folder.parentId) ? folder.parentId : null;
    const bucket = foldersByParent.get(parentKey);
    if (bucket) bucket.push(folder);
    else foldersByParent.set(parentKey, [folder]);
  }

  const documentsByParent = new Map<string | null, DocumentEntry[]>();
  for (const doc of documents) {
    const parentKey =
      doc.parentId !== null && knownFolderIds.has(doc.parentId) ? doc.parentId : null;
    const bucket = documentsByParent.get(parentKey);
    if (bucket) bucket.push(doc);
    else documentsByParent.set(parentKey, [doc]);
  }

  const visited = new Set<string>();

  const buildLevel = (parentId: string | null): WorkspaceTreeNode[] => {
    const childFolders = [...(foldersByParent.get(parentId) ?? [])].sort(compareByName);
    const childDocuments = [...(documentsByParent.get(parentId) ?? [])].sort(compareByName);

    const folderNodes: WorkspaceTreeNode[] = [];
    for (const folder of childFolders) {
      if (visited.has(folder.id)) continue;
      visited.add(folder.id);
      folderNodes.push({
        kind: "folder",
        id: folder.id,
        name: folder.name,
        children: buildLevel(folder.id),
      });
    }

    const documentNodes: WorkspaceTreeNode[] = childDocuments.map((doc) => ({
      kind: "document",
      id: doc.id,
      name: doc.name,
      documentKind: doc.kind,
    }));

    return [...folderNodes, ...documentNodes];
  };

  return buildLevel(null);
}

/**
 * Filtra el arbol por nombre (case-insensitive, sin acentos sensibles). Un
 * documento se conserva si su nombre matchea; una carpeta se conserva si
 * matchea ella misma o si contiene descendientes que matchean.
 */
export function filterWorkspaceTree(nodes: WorkspaceTreeNode[], query: string): WorkspaceTreeNode[] {
  const needle = query.trim().toLocaleLowerCase("es");
  if (needle.length === 0) return nodes;

  const walk = (list: WorkspaceTreeNode[]): WorkspaceTreeNode[] => {
    const result: WorkspaceTreeNode[] = [];
    for (const node of list) {
      const selfMatches = node.name.toLocaleLowerCase("es").includes(needle);
      if (node.kind === "document") {
        if (selfMatches) result.push(node);
        continue;
      }
      const matchingChildren = walk(node.children);
      if (selfMatches || matchingChildren.length > 0) {
        result.push({ ...node, children: selfMatches ? node.children : matchingChildren });
      }
    }
    return result;
  };

  return walk(nodes);
}

/** Aplana el arbol a la lista de ids de documento en orden de aparicion. */
export function collectDocumentIds(nodes: WorkspaceTreeNode[]): string[] {
  const ids: string[] = [];
  const walk = (list: WorkspaceTreeNode[]): void => {
    for (const node of list) {
      if (node.kind === "document") ids.push(node.id);
      else walk(node.children);
    }
  };
  walk(nodes);
  return ids;
}
