// Orquesta la transformacion DER -> MR (Incremento 4): corre el motor sobre el
// modelo del `derEditorStore`, persiste el MR derivado y devuelve el resultado
// para el modal. Vive en la capa de estado porque coordina varios stores y
// repos.
//
// Regeneracion segura (spec 10): nunca sobrescribe en silencio. El llamador
// (AppShell) decide el modo tras consultar `findDerivedMrFor`.

import { unlamProfile } from "@/academic";
import { unlamTransformConventions } from "@/academic";
import type { RelationalModel } from "@/domain/relational";
import type { MrDerivation, TransformationTrace } from "@/domain/transformation";
import { transformDerToMr } from "@/features/transformation";
import * as mrRepo from "@/infrastructure/persistence/mrDocumentRepo";
import { useDerEditorStore } from "./derEditorStore";
import { useWorkspaceStore } from "./workspaceStore";
import { useMrStore } from "./mrStore";

export type TransformMode =
  | { kind: "new" }
  | { kind: "replace"; targetDocumentId: string };

export interface TransformationOutcome {
  documentId: string;
  documentName: string;
  relational: RelationalModel;
  trace: TransformationTrace;
  derivation: MrDerivation;
}

/**
 * Corre la transformacion del DER activo y persiste el MR:
 * - `new`: crea un documento `mr` nuevo en la misma carpeta que el DER;
 * - `replace`: sobrescribe el MR derivado indicado (sube `generatedFromRevision`).
 */
export async function runTransformation(
  sourceDocumentId: string,
  mode: TransformMode,
): Promise<TransformationOutcome> {
  const der = useDerEditorStore.getState();
  const workspace = useWorkspaceStore.getState();

  const sourceDoc = workspace.documents.find((doc) => doc.id === sourceDocumentId);
  if (!sourceDoc) throw new Error("El documento DER de origen no existe");

  const { relational, trace, derivation } = transformDerToMr(der.model, {
    conventions: unlamTransformConventions,
    ruleProfileId: unlamProfile.id,
    ruleProfileVersion: unlamProfile.version,
    sourceDocumentId,
    sourceRevision: der.model.revision,
  });

  if (mode.kind === "new") {
    const created = await workspace.createDocument(
      sourceDoc.parentId,
      `${sourceDoc.name} - MR`,
      "mr",
    );
    await mrRepo.saveMrDocument(created.id, relational, derivation, trace);
    // `createDocument` deja el nuevo documento activo; volvemos al DER de
    // origen para no interrumpir el trabajo (el MR queda en el arbol y se
    // muestra en el modal). Asi tambien la regeneracion (spec 10) es
    // alcanzable de inmediato desde el mismo DER.
    await workspace.setActiveDocument(sourceDocumentId);
    return {
      documentId: created.id,
      documentName: created.name,
      relational,
      trace,
      derivation,
    };
  }

  // replace
  const existing = await mrRepo.loadMrDocument(mode.targetDocumentId);
  const merged: MrDerivation = {
    ...derivation,
    hasManualChanges: existing?.derivation?.hasManualChanges ?? false,
  };
  await mrRepo.saveMrDocument(mode.targetDocumentId, relational, merged, trace);
  if (useMrStore.getState().documentId === mode.targetDocumentId) {
    await useMrStore.getState().load(mode.targetDocumentId);
  }
  const targetDoc = workspace.documents.find((doc) => doc.id === mode.targetDocumentId);
  return {
    documentId: mode.targetDocumentId,
    documentName: targetDoc?.name ?? "MR derivado",
    relational,
    trace,
    derivation: merged,
  };
}

/** Documentos MR ya derivados del DER indicado (para el flujo de regeneracion). */
export function findExistingDerivedMr(sourceDocumentId: string) {
  return mrRepo.findDerivedMrFor(sourceDocumentId);
}
