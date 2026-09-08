import { beforeEach, describe, it, expect } from "vitest";
import { db } from "@/infrastructure/persistence/db";
import { useWorkspaceStore } from "@/state/workspaceStore";
import {
  flushDerEditorPersistence,
  useDerEditorStore,
} from "@/state/derEditorStore";
import { isStructurallyValid } from "@/features/validation";

async function clearDatabase() {
  await Promise.all([
    db.projects.clear(),
    db.folders.clear(),
    db.documents.clear(),
    db.session.clear(),
    db.derDocuments.clear(),
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

describe("editor DER: dibujar y validar un DER binario de punta a punta (gate Incremento 2)", () => {
  it("construye un DER binario valido, lo persiste y lo recupera tras recargar", async () => {
    // Documento DER real en el espacio de trabajo.
    await useWorkspaceStore.getState().init();
    await useWorkspaceStore.getState().createProject("Bases de Datos 3636");
    const doc = await useWorkspaceStore.getState().createDocument(null, "DER sucursales", "der");

    const der = useDerEditorStore.getState();
    await der.load(doc.id);
    expect(useDerEditorStore.getState().status).toBe("ready");

    // Dos entidades, cada una con un identificador.
    const clienteId = der.addEntity({ x: 0, y: 0 });
    const sucursalId = der.addEntity({ x: 300, y: 0 });
    const dniId = der.addAttributeTo("entity", clienteId)!;
    der.setAttributeIdentifier(dniId, true);
    const codigoId = der.addAttributeTo("entity", sucursalId)!;
    der.setAttributeIdentifier(codigoId, true);

    // Relacion binaria que conecta ambas entidades.
    const relId = der.addRelationship({ x: 150, y: 150 });
    der.connect(relId, clienteId);
    der.connect(relId, sucursalId);
    der.setEndCardinality(relId, clienteId, "1");
    der.setEndParticipation(relId, clienteId, "total");
    der.setEndCardinality(relId, sucursalId, "N");

    const model = useDerEditorStore.getState().model;
    expect(model.entities).toHaveLength(2);
    expect(model.relationships[0]?.ends).toHaveLength(2);
    expect(isStructurallyValid(model)).toBe(true);

    // Cierre total del editor y recarga contra el mismo IndexedDB.
    await flushDerEditorPersistence();
    useDerEditorStore.getState().clear();
    await useDerEditorStore.getState().load(doc.id);

    const reloaded = useDerEditorStore.getState();
    expect(reloaded.model.entities.map((e) => e.name).sort()).toEqual(["Entidad", "Entidad"]);
    expect(reloaded.model.entities.flatMap((e) => e.attributes).filter((a) => a.isIdentifier)).toHaveLength(2);
    expect(reloaded.model.relationships[0]?.ends).toHaveLength(2);
    const clienteEnd = reloaded.model.relationships[0]?.ends.find((e) => e.entityId === clienteId);
    expect(clienteEnd).toMatchObject({ cardinality: "1", participation: "total" });
    // El layout tambien persiste (posiciones de los nodos).
    expect(reloaded.layout.positions[clienteId]).toEqual({ x: 0, y: 0 });
    expect(isStructurallyValid(reloaded.model)).toBe(true);
  });

  it("elimina el contenido DER cuando se borra el documento", async () => {
    await useWorkspaceStore.getState().init();
    await useWorkspaceStore.getState().createProject("P");
    const doc = await useWorkspaceStore.getState().createDocument(null, "DER", "der");

    await useDerEditorStore.getState().load(doc.id);
    useDerEditorStore.getState().addEntity({ x: 0, y: 0 });
    await flushDerEditorPersistence();
    expect(await db.derDocuments.get(doc.id)).toBeTruthy();

    await useWorkspaceStore.getState().deleteDocument(doc.id);
    expect(await db.derDocuments.get(doc.id)).toBeUndefined();
  });
});

describe("editor DER: undo / redo", () => {
  it("deshace y rehace la creacion de una entidad", async () => {
    await useDerEditorStore.getState().load("doc-undo");
    const der = useDerEditorStore.getState();

    der.addEntity({ x: 10, y: 10 });
    expect(useDerEditorStore.getState().model.entities).toHaveLength(1);

    useDerEditorStore.getState().undo();
    expect(useDerEditorStore.getState().model.entities).toHaveLength(0);

    useDerEditorStore.getState().redo();
    expect(useDerEditorStore.getState().model.entities).toHaveLength(1);
  });

  it("deshace un movimiento de nodo restaurando su posicion", async () => {
    await useDerEditorStore.getState().load("doc-move");
    const der = useDerEditorStore.getState();
    const id = der.addEntity({ x: 0, y: 0 });

    der.beginInteraction();
    der.moveNode(id, { x: 240, y: 120 });
    der.endInteraction();
    expect(useDerEditorStore.getState().layout.positions[id]).toEqual({ x: 240, y: 120 });

    useDerEditorStore.getState().undo();
    expect(useDerEditorStore.getState().layout.positions[id]).toEqual({ x: 0, y: 0 });
  });
});
