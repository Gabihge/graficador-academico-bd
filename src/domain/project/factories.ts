// Fabricas puras de objetos de dominio del espacio de trabajo. Cada funcion
// devuelve un objeto nuevo y serializable a JSON; no toca persistencia ni
// estado global. Los IDs se generan con crypto.randomUUID() (ver
// docs/ARCHITECTURE.md).

import type { DocumentEntry, DocumentKind, Folder, ProjectMeta } from "./types";

const FALLBACK_PROJECT_NAME = "Proyecto sin titulo";
const FALLBACK_FOLDER_NAME = "Carpeta sin titulo";
const FALLBACK_DOCUMENT_NAME = "Documento sin titulo";

function nowIso(): string {
  return new Date().toISOString();
}

function newId(): string {
  return crypto.randomUUID();
}

/**
 * Normaliza un nombre ingresado por el usuario: recorta espacios y aplica
 * un fallback si queda vacio, para que el arbol nunca tenga entradas sin
 * nombre visible.
 */
export function normalizeName(raw: string, fallback: string): string {
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

export function createProject(name: string): ProjectMeta {
  const ts = nowIso();
  return {
    id: newId(),
    name: normalizeName(name, FALLBACK_PROJECT_NAME),
    createdAt: ts,
    updatedAt: ts,
  };
}

export function createFolder(projectId: string, parentId: string | null, name: string): Folder {
  return {
    id: newId(),
    projectId,
    parentId,
    name: normalizeName(name, FALLBACK_FOLDER_NAME),
    createdAt: nowIso(),
  };
}

export function createDocument(
  projectId: string,
  parentId: string | null,
  name: string,
  kind: DocumentKind,
): DocumentEntry {
  const ts = nowIso();
  return {
    id: newId(),
    projectId,
    parentId,
    name: normalizeName(name, FALLBACK_DOCUMENT_NAME),
    kind,
    createdAt: ts,
    updatedAt: ts,
  };
}

/**
 * Copia un documento como una entrada nueva (id y timestamps frescos). No
 * copia modelos semanticos todavia porque en el Incremento 1 el documento
 * aun no los tiene.
 */
export function duplicateDocument(source: DocumentEntry, name?: string): DocumentEntry {
  const ts = nowIso();
  return {
    ...source,
    id: newId(),
    name: name ?? `${source.name} (copia)`,
    createdAt: ts,
    updatedAt: ts,
  };
}
