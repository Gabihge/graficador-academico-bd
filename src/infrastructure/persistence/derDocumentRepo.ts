// Repositorio del contenido semantico de un documento DER: unica puerta de
// entrada a la tabla `derDocuments` de Dexie. Traduce entre el dominio
// (ConceptualModel + ViewLayout) y la fila persistida. Sin reglas de
// producto: solo lectura y escritura.

import { migrateConceptualModel, type ConceptualModel } from "@/domain/conceptual";
import type { ViewLayout } from "@/domain/view";
import { db, type DerDocumentRecord } from "./db";

/**
 * Lee el contenido DER de un documento. El `model` se normaliza a la forma
 * canonica actual (ver src/domain/conceptual/migrate): asi una fila guardada
 * por un incremento anterior se puede abrir sin migracion de esquema Dexie.
 */
export async function loadDerDocument(
  documentId: string,
): Promise<DerDocumentRecord | undefined> {
  const record = await db.derDocuments.get(documentId);
  if (!record) return undefined;
  return { ...record, model: migrateConceptualModel(record.model) };
}

export async function saveDerDocument(
  documentId: string,
  model: ConceptualModel,
  layout: ViewLayout,
): Promise<void> {
  const record: DerDocumentRecord = {
    documentId,
    model,
    layout,
    updatedAt: new Date().toISOString(),
  };
  await db.derDocuments.put(record);
}

export async function deleteDerDocument(documentId: string): Promise<void> {
  await db.derDocuments.delete(documentId);
}

export async function deleteDerDocuments(documentIds: string[]): Promise<void> {
  if (documentIds.length === 0) return;
  await db.derDocuments.bulkDelete(documentIds);
}
