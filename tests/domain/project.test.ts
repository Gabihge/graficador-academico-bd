import { describe, it, expect } from "vitest";
import {
  buildWorkspaceTree,
  cloneProject,
  createDocument,
  createFolder,
  createProject,
  duplicateDocument,
  filterWorkspaceTree,
  type DocumentEntry,
  type Folder,
} from "@/domain/project";

describe("fabricas de dominio", () => {
  it("crea un proyecto con id, timestamps y nombre normalizado", () => {
    const project = createProject("  Bases de Datos  ");
    expect(project.id).toMatch(/[0-9a-f-]{36}/);
    expect(project.name).toBe("Bases de Datos");
    expect(project.createdAt).toBe(project.updatedAt);
  });

  it("aplica un fallback si el nombre queda vacio", () => {
    expect(createProject("   ").name).toBe("Proyecto sin titulo");
    expect(createFolder("p1", null, "").name).toBe("Carpeta sin titulo");
    expect(createDocument("p1", null, "  ", "der").name).toBe("Documento sin titulo");
  });

  it("duplica un documento con id y timestamps nuevos", () => {
    const original = createDocument("p1", null, "DER inicial", "der");
    const copy = duplicateDocument(original);
    expect(copy.id).not.toBe(original.id);
    expect(copy.name).toBe("DER inicial (copia)");
    expect(copy.kind).toBe("der");
    expect(copy.projectId).toBe("p1");
  });
});

describe("arbol del espacio de trabajo", () => {
  const folder = (id: string, parentId: string | null, name: string): Folder => ({
    id,
    projectId: "p1",
    parentId,
    name,
    createdAt: "2026-01-01T00:00:00.000Z",
  });
  const doc = (id: string, parentId: string | null, name: string): DocumentEntry => ({
    id,
    projectId: "p1",
    parentId,
    name,
    kind: "der",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  });

  it("anida carpetas y documentos y ordena carpetas antes que documentos", () => {
    const tree = buildWorkspaceTree({
      folders: [folder("f1", null, "Practica"), folder("f2", "f1", "TP1")],
      documents: [doc("d1", null, "Notas"), doc("d2", "f1", "Enunciado"), doc("d3", "f2", "Modelo")],
    });

    expect(tree.map((n) => n.kind)).toEqual(["folder", "document"]);
    const practica = tree[0];
    expect(practica).toMatchObject({ kind: "folder", name: "Practica" });
    if (practica?.kind !== "folder") throw new Error("esperaba una carpeta");
    // Subcarpeta "TP1" antes que el documento "Enunciado".
    expect(practica.children.map((n) => n.name)).toEqual(["TP1", "Enunciado"]);
  });

  it("trata como raiz una carpeta con parentId inexistente (sin perder datos)", () => {
    const tree = buildWorkspaceTree({
      folders: [folder("f1", "desaparecida", "Huerfana")],
      documents: [],
    });
    expect(tree).toHaveLength(1);
    expect(tree[0]?.name).toBe("Huerfana");
  });

  it("filtra por nombre conservando las carpetas ancestro", () => {
    const tree = buildWorkspaceTree({
      folders: [folder("f1", null, "Practica")],
      documents: [doc("d1", "f1", "Sucursal"), doc("d2", "f1", "Cliente"), doc("d3", null, "Borrador")],
    });

    const filtered = filterWorkspaceTree(tree, "clien");
    expect(filtered).toHaveLength(1);
    const practica = filtered[0];
    if (practica?.kind !== "folder") throw new Error("esperaba una carpeta");
    expect(practica.children.map((n) => n.name)).toEqual(["Cliente"]);
  });

  it("devuelve el arbol intacto si la query esta vacia", () => {
    const tree = buildWorkspaceTree({ folders: [], documents: [doc("d1", null, "X")] });
    expect(filterWorkspaceTree(tree, "   ")).toBe(tree);
  });
});

describe("clonado de proyecto", () => {
  it("remapea ids preservando la jerarquia", () => {
    const source = createProject("Origen");
    const f1 = createFolder(source.id, null, "Practica");
    const f2 = createFolder(source.id, f1.id, "TP1");
    const d1 = createDocument(source.id, f2.id, "Modelo", "der");

    const { project, contents } = cloneProject(source, { folders: [f1, f2], documents: [d1] });

    expect(project.id).not.toBe(source.id);
    expect(project.name).toBe("Origen (copia)");
    expect(contents.folders.every((f) => f.projectId === project.id)).toBe(true);
    expect(contents.documents.every((d) => d.projectId === project.id)).toBe(true);

    // La jerarquia se mantiene: el documento sigue colgando de "TP1" dentro de "Practica".
    const tree = buildWorkspaceTree(contents);
    const practica = tree[0];
    if (practica?.kind !== "folder") throw new Error("esperaba una carpeta");
    const tp1 = practica.children[0];
    if (tp1?.kind !== "folder") throw new Error("esperaba una subcarpeta");
    expect(tp1.children.map((n) => n.name)).toEqual(["Modelo"]);

    // Sin ids compartidos con el origen.
    const sourceIds = new Set([f1.id, f2.id, d1.id]);
    for (const node of [...contents.folders, ...contents.documents]) {
      expect(sourceIds.has(node.id)).toBe(false);
    }
  });
});
