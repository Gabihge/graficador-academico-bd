// Repositorio del contenido semantico de un documento MR: unica puerta de
// entrada a la tabla `mrDocuments` de Dexie. En el Incremento 4 el MR solo se
// produce por transformacion automatica y es de solo lectura.

import type { RelationalModel } from "@/domain/relational";
import type { MrDerivation, TransformationTrace } from "@/domain/transformation";
import { db, type MrDocumentRecord } from "./db";

export async function loadMrDocument(
  documentId: string,
): Promise<MrDocumentRecord | undefined> {
  return db.mrDocuments.get(documentId);
}

export async function saveMrDocument(
  documentId: string,
  model: RelationalModel,
  derivation?: MrDerivation,
  trace?: TransformationTrace,
): Promise<void> {
  const record: MrDocumentRecord = {
    documentId,
    model,
    derivation,
    trace,
    updatedAt: new Date().toISOString(),
  };
  await db.mrDocuments.put(record);
}

export async function deleteMrDocument(documentId: string): Promise<void> {
  await db.mrDocuments.delete(documentId);
}

export async function deleteMrDocuments(documentIds: string[]): Promise<void> {
  if (documentIds.length === 0) return;
  await db.mrDocuments.bulkDelete(documentIds);
}

/**
 * Documentos MR derivados de un DER dado. Se filtra en memoria porque
 * `derivation.generatedFromDocumentId` no esta indexado (la relacion 1:N
 * DER -> MR derivados es poco frecuente).
 */
export async function findDerivedMrFor(
  sourceDocumentId: string,
): Promise<MrDocumentRecord[]> {
  const all = await db.mrDocuments.toArray();
  return all.filter(
    (record) => record.derivation?.generatedFromDocumentId === sourceDocumentId,
  );
}
