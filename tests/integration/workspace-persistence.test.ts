import { beforeEach, describe, it, expect } from "vitest";
import { db } from "@/infrastructure/persistence/db";
import { useWorkspaceStore } from "@/state/workspaceStore";

/** Estado inicial "en blanco", como al abrir la app por primera vez. */
function resetStoreState() {
  useWorkspaceStore.setState({
    status: "loading",
    saveState: "saved",
    projects: [],
    project: null,
    folders: [],
    documents: [],
    activeDocumentId: null,
  });
}

async function clearDatabase() {
  await Promise.all([
    db.projects.clear(),
    db.folders.clear(),
    db.documents.clear(),
    db.session.clear(),
  ]);
}

beforeEach(async () => {
  await clearDatabase();
  resetStoreState();
});

describe("persistencia del espacio de trabajo (Dexie)", () => {
  it("arranca en estado 'empty' cuando no hay nada guardado", async () => {
    await useWorkspaceStore.getState().init();
    expect(useWorkspaceStore.getState().status).toBe("empty");
    expect(useWorkspaceStore.getState().projects).toHaveLength(0);
  });

  it("conserva el proyecto y el documento DER tras cerrar y reabrir la app", async () => {
    await useWorkspaceStore.getState().init();

    await useWorkspaceStore.getState().createProject("Bases de Datos 3636");
    expect(useWorkspaceStore.getState().status).toBe("ready");
    const projectId = useWorkspaceStore.getState().project?.id;
    expect(projectId).toBeTruthy();

    const doc = await useWorkspaceStore.getState().createDocument(null, "DER inicial", "der");
    expect(useWorkspaceStore.getState().documents).toHaveLength(1);
    expect(useWorkspaceStore.getState().activeDocumentId).toBe(doc.id);

    // Simular cierre total de la app y arranque limpio contra el mismo IndexedDB.
    resetStoreState();
    await useWorkspaceStore.getState().init();

    const reopened = useWorkspaceStore.getState();
    expect(reopened.status).toBe("ready");
    expect(reopened.project?.id).toBe(projectId);
    expect(reopened.project?.name).toBe("Bases de Datos 3636");
    expect(reopened.documents).toHaveLength(1);
    expect(reopened.documents[0]?.name).toBe("DER inicial");
    expect(reopened.documents[0]?.kind).toBe("der");
    expect(reopened.activeDocumentId).toBe(doc.id);
  });

  it("renombra un documento y lo persiste", async () => {
    await useWorkspaceStore.getState().init();
    await useWorkspaceStore.getState().createProject("P");
    const doc = await useWorkspaceStore.getState().createDocument(null, "Viejo", "mr");

    await useWorkspaceStore.getState().renameDocument(doc.id, "Nuevo");

    resetStoreState();
    await useWorkspaceStore.getState().init();
    expect(useWorkspaceStore.getState().documents[0]?.name).toBe("Nuevo");
  });

  it("elimina una carpeta en cascada con sus documentos", async () => {
    await useWorkspaceStore.getState().init();
    await useWorkspaceStore.getState().createProject("P");
    await useWorkspaceStore.getState().createFolder(null, "Practica");

    const folderId = useWorkspaceStore.getState().folders[0]?.id;
    if (!folderId) throw new Error("esperaba una carpeta");
    await useWorkspaceStore.getState().createDocument(folderId, "Dentro", "der");
    expect(useWorkspaceStore.getState().documents).toHaveLength(1);

    await useWorkspaceStore.getState().deleteFolder(folderId);

    resetStoreState();
    await useWorkspaceStore.getState().init();
    expect(useWorkspaceStore.getState().folders).toHaveLength(0);
    expect(useWorkspaceStore.getState().documents).toHaveLength(0);
  });

  it("duplica un proyecto como copia independiente", async () => {
    await useWorkspaceStore.getState().init();
    await useWorkspaceStore.getState().createProject("Original");
    const originalId = useWorkspaceStore.getState().project?.id;
    if (!originalId) throw new Error("esperaba un proyecto");
    await useWorkspaceStore.getState().createDocument(null, "Doc", "der");

    await useWorkspaceStore.getState().duplicateProject(originalId);

    const { projects } = useWorkspaceStore.getState();
    expect(projects).toHaveLength(2);
    const copy = projects.find((p) => p.name === "Original (copia)");
    expect(copy).toBeTruthy();
    expect(copy?.id).not.toBe(originalId);

    const copyContents = await db.documents.where("projectId").equals(copy!.id).toArray();
    expect(copyContents).toHaveLength(1);
    expect(copyContents[0]?.id).not.toBe(
      (await db.documents.where("projectId").equals(originalId).toArray())[0]?.id,
    );
  });

  it("recuerda el ultimo proyecto abierto aunque no haya documento activo", async () => {
    await useWorkspaceStore.getState().init();
    await useWorkspaceStore.getState().createProject("Solo proyecto");
    const projectId = useWorkspaceStore.getState().project?.id;

    resetStoreState();
    await useWorkspaceStore.getState().init();

    expect(useWorkspaceStore.getState().project?.id).toBe(projectId);
    expect(useWorkspaceStore.getState().activeDocumentId).toBeNull();
  });
});
