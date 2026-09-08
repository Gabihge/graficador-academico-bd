// Repositorio del contenido semantico de un documento DER: unica puerta de
// entrada a la tabla `derDocuments` de Dexie. Traduce entre el dominio
// (ConceptualModel + ViewLayout) y la fila persistida. Sin reglas de
// producto: solo lectura y escritura.

import type { ConceptualModel } from "@/domain/conceptual";
import type { ViewLayout } from "@/domain/view";
import { db, type DerDocumentRecord } from "./db";

export async function loadDerDocument(
  documentId: string,
): Promise<DerDocumentRecord | undefined> {
  return db.derDocuments.get(documentId);
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
