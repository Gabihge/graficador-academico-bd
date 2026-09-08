// Base de datos local (IndexedDB via Dexie). Es el mecanismo de
// autoguardado continuo del Incremento 1. El formato portable `.bdproj`
// (Incremento 9) comparte el mismo modelo de dominio pero es otra cosa:
// aca no hay validacion Zod porque los datos nunca salen del navegador.
//
// Esquema v1 (Incremento 1): solo el espacio de trabajo. Los modelos
// semanticos, layouts y preferencias se agregan como versiones nuevas de
// Dexie en incrementos posteriores, sin romper datos existentes.

import Dexie, { type Table } from "dexie";
import type { DocumentEntry, Folder, ProjectMeta } from "@/domain/project";

/** Ultimo estado de sesion: que proyecto y documento reabrir al iniciar. */
export interface SessionState {
  key: "session";
  lastProjectId: string | null;
  lastDocumentId: string | null;
}

export const SESSION_KEY = "session" as const;

export class WorkspaceDatabase extends Dexie {
  projects!: Table<ProjectMeta, string>;
  folders!: Table<Folder, string>;
  documents!: Table<DocumentEntry, string>;
  session!: Table<SessionState, string>;

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
  }
}

/** Instancia compartida por toda la app. */
export const db = new WorkspaceDatabase();
