import { beforeEach, describe, it, expect } from "vitest";
import { db } from "@/infrastructure/persistence/db";
import { useWorkspaceStore } from "@/state/workspaceStore";
import {
  flushDerEditorPersistence,
  useDerEditorStore,
} from "@/state/derEditorStore";
import { isDerValid, validateDer } from "@/features/validation";

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

describe("editor DER: construir un DER academicamente valido y recuperarlo", () => {
  it("entidad debil + jerarquia por el store, persistidas y recargadas sin perder validez", async () => {
    await useWorkspaceStore.getState().init();
    await useWorkspaceStore.getState().createProject("Bases de Datos 3636");
    const doc = await useWorkspaceStore.getState().createDocument(null, "DER avanzado", "der");

    const der = useDerEditorStore.getState();
    await der.load(doc.id);
    expect(useDerEditorStore.getState().status).toBe("ready");

    // Entidad fuerte con identificador.
    const edificioId = der.addEntity({ x: 0, y: 0 });
    der.renameElement("entity", edificioId, "Edificio");
    const codigoId = der.addAttributeTo("entity", edificioId)!;
    der.setAttributeIdentifier(codigoId, true);

    // Entidad debil con discriminante.
    const deptoId = der.addEntity({ x: 300, y: 0 });
    der.renameElement("entity", deptoId, "Departamento");
    der.setEntityKind(deptoId, "weak");
    const nroId = der.addAttributeTo("entity", deptoId)!;
    der.setAttributeDiscriminator(nroId, true);

    // Relacion identificadora binaria.
    const relId = der.addRelationship({ x: 150, y: 150 });
    der.renameElement("relationship", relId, "Contiene");
    der.setRelationshipIdentifying(relId, true);
    der.connect(relId, deptoId);
    der.connect(relId, edificioId);
    const [weakPart, strongPart] = useDerEditorStore.getState().model.relationships[0]!.participants;
    der.setParticipantParticipation(relId, weakPart!.id, "total");
    der.setParticipantCardinality(relId, weakPart!.id, "N");
    der.setParticipantCardinality(relId, strongPart!.id, "1");

    // Jerarquia total-exclusiva con dos subentidades.
    const superId = der.addEntity({ x: 0, y: 400 });
    der.renameElement("entity", superId, "Vehiculo");
    der.setAttributeIdentifier(der.addAttributeTo("entity", superId)!, true);
    const autoId = der.addEntity({ x: 200, y: 400 });
    const motoId = der.addEntity({ x: 400, y: 400 });
    const hierId = der.addHierarchy({ x: 200, y: 550 });
    der.connectHierarchy(hierId, superId);
    der.connectHierarchy(hierId, autoId);
    der.connectHierarchy(hierId, motoId);
    der.setHierarchyPartition(hierId, "total");
    der.setHierarchyOverlap(hierId, "exclusive");

    const model = useDerEditorStore.getState().model;
    expect(model.entities).toHaveLength(5);
    expect(model.hierarchies[0]?.subEntityIds).toHaveLength(2);
    expect(model.relationships[0]?.identifying).toBe(true);
    expect(
      validateDer(model).filter((i) => i.severity === "error"),
      "esperaba DER academicamente valido",
    ).toEqual([]);
    expect(model.revision).toBeGreaterThan(0);

    // Recarga contra el mismo IndexedDB.
    await flushDerEditorPersistence();
    useDerEditorStore.getState().clear();
    await useDerEditorStore.getState().load(doc.id);

    const reloaded = useDerEditorStore.getState().model;
    expect(reloaded.entities.find((e) => e.id === deptoId)?.kind).toBe("weak");
    expect(reloaded.hierarchies[0]?.partition).toBe("total");
    expect(reloaded.relationships[0]?.participants).toHaveLength(2);
    expect(isDerValid(reloaded)).toBe(true);
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

  it("migra una fila con la forma del Incremento 2 al abrirla", async () => {
    await db.derDocuments.put({
      documentId: "legacy-doc",
      model: {
        entities: [{ id: "e1", name: "Cliente", attributes: [] }],
        relationships: [
          {
            id: "r1",
            name: "R",
            ends: [{ entityId: "e1", cardinality: "N", participation: "partial" }],
            attributes: [],
          },
        ],
      },
      layout: { positions: {} },
      updatedAt: new Date().toISOString(),
    } as never);

    await useDerEditorStore.getState().load("legacy-doc");
    const model = useDerEditorStore.getState().model;
    expect(model.entities[0]?.kind).toBe("regular");
    expect(model.relationships[0]?.participants[0]?.entityId).toBe("e1");
    expect(model.hierarchies).toEqual([]);
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
