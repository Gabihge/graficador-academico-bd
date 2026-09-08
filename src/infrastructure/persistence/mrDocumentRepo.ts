// Repositorio del contenido semantico de un documento MR: unica puerta de
// entrada a la tabla `mrDocuments` de Dexie. Desde el Incremento 5 el MR es
// editable (`mrEditorStore`); un MR derivado ademas guarda su `derivation` y
// su `trace`.

import { createRelationalModel, type RelationalModel } from "@/domain/relational";
import type { MrDerivation, TransformationTrace } from "@/domain/transformation";
import { createViewLayout, type ViewLayout } from "@/domain/view";
import { db, type MrDocumentRecord } from "./db";

/** Fila de MR ya normalizada: `layout` garantizado (las filas del Inc. 4 no lo tenian). */
export interface LoadedMrDocument {
  documentId: string;
  model: RelationalModel;
  layout: ViewLayout;
  derivation?: MrDerivation;
  trace?: TransformationTrace;
  updatedAt: string;
}

export async function loadMrDocument(
  documentId: string,
): Promise<LoadedMrDocument | undefined> {
  const record = await db.mrDocuments.get(documentId);
  if (!record) return undefined;
  return {
    documentId: record.documentId,
    model: record.model ?? createRelationalModel(),
    layout: record.layout ?? createViewLayout(),
    derivation: record.derivation,
    trace: record.trace,
    updatedAt: record.updatedAt,
  };
}

export interface SaveMrDocumentInput {
  documentId: string;
  model: RelationalModel;
  layout: ViewLayout;
  derivation?: MrDerivation;
  trace?: TransformationTrace;
}

export async function saveMrDocument(input: SaveMrDocumentInput): Promise<void> {
  const record: MrDocumentRecord = {
    documentId: input.documentId,
    model: input.model,
    layout: input.layout,
    derivation: input.derivation,
    trace: input.trace,
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
