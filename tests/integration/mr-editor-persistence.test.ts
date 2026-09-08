import { beforeEach, describe, it, expect } from "vitest";
import { db } from "@/infrastructure/persistence/db";
import * as mrRepo from "@/infrastructure/persistence/mrDocumentRepo";
import { useWorkspaceStore } from "@/state/workspaceStore";
import { flushDerEditorPersistence, useDerEditorStore } from "@/state/derEditorStore";
import { flushMrEditorPersistence, useMrEditorStore } from "@/state/mrEditorStore";
import { runTransformation } from "@/state/transformationController";
import { isMrValid } from "@/features/validation";

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
  useMrEditorStore.getState().clear();
});

describe("editor MR grafico: editar de punta a punta (gate Incremento 5)", () => {
  it("crea esquemas con PK, una FK compuesta y un layout; persiste y recupera", async () => {
    await useWorkspaceStore.getState().init();
    await useWorkspaceStore.getState().createProject("Bases de Datos 3636");
    const doc = await useWorkspaceStore.getState().createDocument(null, "MR cursada", "mr");

    const mr = useMrEditorStore.getState();
    await mr.load(doc.id);
    expect(useMrEditorStore.getState().status).toBe("ready");

    // Curso(anio, division) con PK compuesta.
    const cursoId = mr.addSchema({ x: 0, y: 0 });
    mr.renameSchema(cursoId, "Curso");
    const anioId = mr.addAttributeTo(cursoId)!;
    mr.renameAttribute(anioId, "anio");
    mr.setAttributePk(cursoId, anioId, true);
    const divId = mr.addAttributeTo(cursoId)!;
    mr.renameAttribute(divId, "division");
    mr.setAttributePk(cursoId, divId, true);

    // Inscripcion con FK compuesta hacia Curso.
    const inscId = mr.addSchema({ x: 320, y: 0 });
    mr.renameSchema(inscId, "Inscripcion");
    const legajoId = mr.addAttributeTo(inscId)!;
    mr.renameAttribute(legajoId, "legajo");
    mr.setAttributePk(inscId, legajoId, true);

    const fkId = mr.addForeignKey(inscId, cursoId)!;
    // addForeignKey ya dejo columnas anio/division -> se confirman por nombre
    const insc = useMrEditorStore.getState().model.schemas.find((s) => s.id === inscId)!;
    const fkLocalNames = insc.foreignKeys[0]!.localAttributeIds.map(
      (id) => insc.attributes.find((a) => a.id === id)?.name,
    );
    expect(fkLocalNames).toEqual(["anio", "division"]);
    expect(fkId).toBeTruthy();

    // Mover una tabla.
    mr.beginInteraction();
    mr.moveNode(cursoId, { x: 40, y: 200 });
    mr.endInteraction();

    const model = useMrEditorStore.getState().model;
    expect(model.schemas).toHaveLength(2);
    expect(isMrValid(model)).toBe(true);
    expect(model.revision).toBeGreaterThan(0);

    // Cierre total del editor y recarga contra el mismo IndexedDB.
    await flushMrEditorPersistence();
    useMrEditorStore.getState().clear();
    await useMrEditorStore.getState().load(doc.id);

    const reloaded = useMrEditorStore.getState();
    expect(reloaded.model.schemas.map((s) => s.name).sort()).toEqual(["Curso", "Inscripcion"]);
    const reCurso = reloaded.model.schemas.find((s) => s.name === "Curso")!;
    expect(reCurso.primaryKey).toHaveLength(2);
    const reInsc = reloaded.model.schemas.find((s) => s.name === "Inscripcion")!;
    expect(reInsc.foreignKeys[0]?.localAttributeIds).toHaveLength(2);
    expect(reloaded.layout.positions[cursoId]).toEqual({ x: 40, y: 200 });
    expect(isMrValid(reloaded.model)).toBe(true);
  });

  it("editar un MR derivado marca hasManualChanges y se persiste", async () => {
    await useWorkspaceStore.getState().init();
    await useWorkspaceStore.getState().createProject("P");
    const derDoc = await useWorkspaceStore.getState().createDocument(null, "DER", "der");

    // DER N:N valido.
    const der = useDerEditorStore.getState();
    await der.load(derDoc.id);
    const a = der.addEntity({ x: 0, y: 0 });
    der.renameElement("entity", a, "Alumno");
    der.setAttributeIdentifier(der.addAttributeTo("entity", a)!, true);
    const b = der.addEntity({ x: 300, y: 0 });
    der.renameElement("entity", b, "Materia");
    der.setAttributeIdentifier(der.addAttributeTo("entity", b)!, true);
    const rel = der.addRelationship({ x: 150, y: 150 });
    der.renameElement("relationship", rel, "Cursa");
    der.connect(rel, a);
    der.connect(rel, b);
    const parts = useDerEditorStore.getState().model.relationships[0]!.participants;
    der.setParticipantCardinality(rel, parts[0]!.id, "N");
    der.setParticipantCardinality(rel, parts[1]!.id, "N");
    await flushDerEditorPersistence();

    const outcome = await runTransformation(derDoc.id, { kind: "new" });
    let record = await mrRepo.loadMrDocument(outcome.documentId);
    expect(record?.derivation?.hasManualChanges).toBe(false);

    // Abrir el MR derivado en el editor y renombrar un esquema.
    await useMrEditorStore.getState().load(outcome.documentId);
    const schemaId = useMrEditorStore.getState().model.schemas[0]!.id;
    useMrEditorStore.getState().renameSchema(schemaId, "AlumnoRenombrado");
    await flushMrEditorPersistence();

    record = await mrRepo.loadMrDocument(outcome.documentId);
    expect(record?.derivation?.hasManualChanges).toBe(true);
    expect(useMrEditorStore.getState().derivation?.hasManualChanges).toBe(true);
  });
});

describe("editor MR: undo / redo", () => {
  it("deshace y rehace la creacion de un esquema", async () => {
    await useMrEditorStore.getState().load("doc-mr-undo");
    const mr = useMrEditorStore.getState();
    mr.addSchema({ x: 0, y: 0 });
    expect(useMrEditorStore.getState().model.schemas).toHaveLength(1);
    useMrEditorStore.getState().undo();
    expect(useMrEditorStore.getState().model.schemas).toHaveLength(0);
    useMrEditorStore.getState().redo();
    expect(useMrEditorStore.getState().model.schemas).toHaveLength(1);
  });
});
