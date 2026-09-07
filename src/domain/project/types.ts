// Modelo semantico del espacio de trabajo (Incremento 1). Es codigo de
// dominio puro: sin React, sin Dexie, sin nada visual. Describe QUE es un
// proyecto, una carpeta y un documento, no como se dibujan ni como se
// guardan. La persistencia (src/infrastructure/persistence) y la UI
// consumen estos tipos, nunca al reves.

/**
 * Tipo de documento del arbol de proyecto. Un documento "combined" contiene
 * tanto un DER como su MR derivado. Los modelos semanticos concretos
 * (ConceptualModel / RelationalModel) llegan en incrementos posteriores;
 * en el Incremento 1 un documento es solo una entrada nombrada del arbol.
 */
export type DocumentKind = "der" | "mr" | "combined";

export const DOCUMENT_KINDS: readonly DocumentKind[] = ["der", "mr", "combined"];

/** Etiqueta legible para cada tipo de documento (es-AR). */
export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  der: "DER",
  mr: "MR",
  combined: "DER + MR",
};

/** Metadatos de un proyecto. El contenido (carpetas y documentos) se guarda aparte. */
export interface ProjectMeta {
  id: string;
  name: string;
  /** ISO-8601. */
  createdAt: string;
  /** ISO-8601. Se actualiza ante cualquier cambio dentro del proyecto. */
  updatedAt: string;
}

/** Carpeta del arbol de proyecto. `parentId === null` significa raiz. */
export interface Folder {
  id: string;
  projectId: string;
  parentId: string | null;
  name: string;
  createdAt: string;
}

/** Documento del arbol de proyecto. `parentId === null` significa raiz. */
export interface DocumentEntry {
  id: string;
  projectId: string;
  parentId: string | null;
  name: string;
  kind: DocumentKind;
  createdAt: string;
  updatedAt: string;
}

/** Contenido completo de un proyecto: su arbol plano de carpetas y documentos. */
export interface ProjectContents {
  folders: Folder[];
  documents: DocumentEntry[];
}

/** Nodo de arbol ya anidado, listo para render. Proyeccion de `ProjectContents`. */
export type WorkspaceTreeNode = WorkspaceTreeFolder | WorkspaceTreeDocument;

export interface WorkspaceTreeFolder {
  kind: "folder";
  id: string;
  name: string;
  children: WorkspaceTreeNode[];
}

export interface WorkspaceTreeDocument {
  kind: "document";
  id: string;
  name: string;
  documentKind: DocumentKind;
}
