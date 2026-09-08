import { beforeEach, describe, it, expect } from "vitest";
import { db } from "@/infrastructure/persistence/db";
import * as mrRepo from "@/infrastructure/persistence/mrDocumentRepo";
import { useWorkspaceStore } from "@/state/workspaceStore";
import { flushDerEditorPersistence, useDerEditorStore } from "@/state/derEditorStore";
import { runTransformation } from "@/state/transformationController";

async function clearDatabase() {
  await Promise.all([
    db.projects.clear(),
    db.folders.clear(),
    db.documents.clear(),
    db.session.clear(),
    db.derDocuments.clear(),
    db.mrDocuments.clear(),
  ]);
}

beforeEach(async () => {
  await clearDatabase();
  useWorkspaceStore.setState({
    status: "loading",
    saveState: "saved",
    projects: [],
    project: null,
    folders: [],
    documents: [],
    activeDocumentId: null,
  });
  useDerEditorStore.getState().clear();
});

/** Construye un DER N:N valido en el store del editor DER. */
async function buildValidNnDer(documentId: string) {
  const der = useDerEditorStore.getState();
  await der.load(documentId);
  const alumno = der.addEntity({ x: 0, y: 0 });
  der.renameElement("entity", alumno, "Alumno");
  der.setAttributeIdentifier(der.addAttributeTo("entity", alumno)!, true);
  const materia = der.addEntity({ x: 300, y: 0 });
  der.renameElement("entity", materia, "Materia");
  der.setAttributeIdentifier(der.addAttributeTo("entity", materia)!, true);
  const rel = der.addRelationship({ x: 150, y: 150 });
  der.renameElement("relationship", rel, "Cursa");
  der.connect(rel, alumno);
  der.connect(rel, materia);
  const parts = useDerEditorStore.getState().model.relationships[0]!.participants;
  der.setParticipantCardinality(rel, parts[0]!.id, "N");
  der.setParticipantCardinality(rel, parts[1]!.id, "N");
  await flushDerEditorPersistence();
}

describe("transformacion DER -> MR: persistencia (Incremento 4)", () => {
  it("crea un documento MR nuevo con el RelationalModel persistido y su derivacion", async () => {
    await useWorkspaceStore.getState().init();
    await useWorkspaceStore.getState().createProject("Bases de Datos 3636");
    const derDoc = await useWorkspaceStore.getState().createDocument(null, "DER cursada", "der");
    await buildValidNnDer(derDoc.id);

    const outcome = await runTransformation(derDoc.id, { kind: "new" });

    // El documento MR aparece en el arbol.
    const docs = useWorkspaceStore.getState().documents;
    const mrDoc = docs.find((d) => d.id === outcome.documentId);
    expect(mrDoc?.kind).toBe("mr");
    expect(mrDoc?.name).toBe("DER cursada - MR");

    // El contenido MR quedo persistido, con la trazabilidad y la derivacion.
    const record = await mrRepo.loadMrDocument(outcome.documentId);
    expect(record?.model.schemas.map((s) => s.name).sort()).toEqual([
      "Alumno",
      "Cursa",
      "Materia",
    ]);
    expect(record?.derivation?.generatedFromDocumentId).toBe(derDoc.id);
    expect(record?.derivation?.isDerived).toBe(true);
    expect((record?.trace?.entries.length ?? 0)).toBeGreaterThan(0);
  });

  it("reemplazar sube generatedFromRevision y no crea otro documento", async () => {
    await useWorkspaceStore.getState().init();
    await useWorkspaceStore.getState().createProject("P");
    const derDoc = await useWorkspaceStore.getState().createDocument(null, "DER", "der");
    await buildValidNnDer(derDoc.id);

    const first = await runTransformation(derDoc.id, { kind: "new" });
    const revBefore = (await mrRepo.loadMrDocument(first.documentId))!.derivation!
      .generatedFromRevision;

    // Un cambio en el DER sube su revision.
    useDerEditorStore.getState().addEntity({ x: 500, y: 0 });
    await flushDerEditorPersistence();

    const docsBefore = useWorkspaceStore.getState().documents.length;
    await runTransformation(derDoc.id, { kind: "replace", targetDocumentId: first.documentId });
    const docsAfter = useWorkspaceStore.getState().documents.length;

    expect(docsAfter).toBe(docsBefore);
    const revAfter = (await mrRepo.loadMrDocument(first.documentId))!.derivation!
      .generatedFromRevision;
    expect(revAfter).toBeGreaterThan(revBefore);

    const derived = await mrRepo.findDerivedMrFor(derDoc.id);
    expect(derived).toHaveLength(1);
  });

  it("borrar el proyecto purga el contenido MR", async () => {
    await useWorkspaceStore.getState().init();
    await useWorkspaceStore.getState().createProject("P");
    const projectId = useWorkspaceStore.getState().project!.id;
    const derDoc = await useWorkspaceStore.getState().createDocument(null, "DER", "der");
    await buildValidNnDer(derDoc.id);
    const outcome = await runTransformation(derDoc.id, { kind: "new" });
    expect(await mrRepo.loadMrDocument(outcome.documentId)).toBeTruthy();

    await useWorkspaceStore.getState().deleteProject(projectId);
    expect(await mrRepo.loadMrDocument(outcome.documentId)).toBeUndefined();
    expect(await db.mrDocuments.count()).toBe(0);
  });
});
