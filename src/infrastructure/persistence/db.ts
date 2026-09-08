// Base de datos local (IndexedDB via Dexie). Es el mecanismo de
// autoguardado continuo del Incremento 1. El formato portable `.bdproj`
// (Incremento 9) comparte el mismo modelo de dominio pero es otra cosa:
// aca no hay validacion Zod porque los datos nunca salen del navegador.
//
// Esquema v1 (Incremento 1): solo el espacio de trabajo.
// Esquema v2 (Incremento 2): agrega `derDocuments` con el ConceptualModel y
// el ViewLayout de cada documento DER.
// Esquema v3 (Incremento 4): agrega `mrDocuments` con el RelationalModel
// derivado + su trazabilidad. Todos los upgrades son ADITIVOS: no tocan ni
// migran las tablas previas.

import Dexie, { type Table } from "dexie";
import type { DocumentEntry, Folder, ProjectMeta } from "@/domain/project";
import type { ConceptualModel } from "@/domain/conceptual";
import type { RelationalModel } from "@/domain/relational";
import type { MrDerivation, TransformationTrace } from "@/domain/transformation";
import type { ViewLayout } from "@/domain/view";

/** Ultimo estado de sesion: que proyecto y documento reabrir al iniciar. */
export interface SessionState {
  key: "session";
  lastProjectId: string | null;
  lastDocumentId: string | null;
}

export const SESSION_KEY = "session" as const;

/**
 * Contenido semantico de un documento DER: el modelo conceptual y su layout
 * de canvas, guardados juntos pero como objetos separados (el layout nunca
 * es fuente de verdad). Se indexa por `documentId` (1:1 con `documents`).
 */
export interface DerDocumentRecord {
  documentId: string;
  model: ConceptualModel;
  layout: ViewLayout;
  /** ISO-8601. */
  updatedAt: string;
}

/**
 * Contenido semantico de un documento MR: el modelo relacional y, cuando es
 * derivado de un DER, la metadata de derivacion (spec 10) y la trazabilidad.
 * Se indexa por `documentId` (1:1 con `documents`).
 */
export interface MrDocumentRecord {
  documentId: string;
  model: RelationalModel;
  /** Layout del MR grafico (spec 15.3). Opcional: las filas del Incremento 4 no lo tenian. */
  layout?: ViewLayout;
  derivation?: MrDerivation;
  trace?: TransformationTrace;
  /** ISO-8601. */
  updatedAt: string;
}

export class WorkspaceDatabase extends Dexie {
  projects!: Table<ProjectMeta, string>;
  folders!: Table<Folder, string>;
  documents!: Table<DocumentEntry, string>;
  session!: Table<SessionState, string>;
  derDocuments!: Table<DerDocumentRecord, string>;
  mrDocuments!: Table<MrDocumentRecord, string>;

  constructor(name = "graficador-academico-bd") {
    super(name);
    // Solo se indexan las columnas por las que se consulta. `updatedAt`
    // ordena la lista de proyectos recientes; `projectId` / `parentId`
    // permiten cargar y podar el arbol de un proyecto.
    this.version(1).stores({
      projects: "id, updatedAt",
      folders: "id, projectId, parentId",
      documents: "id, projectId, parentId",
      session: "key",
    });
    this.version(2).stores({
      derDocuments: "documentId",
    });
    this.version(3).stores({
      mrDocuments: "documentId",
    });
  }
}

/** Instancia compartida por toda la app. */
export const db = new WorkspaceDatabase();
