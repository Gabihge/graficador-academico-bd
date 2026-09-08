import { beforeEach, describe, it, expect } from "vitest";
import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { App } from "../src/app/App";
import { db } from "../src/infrastructure/persistence/db";
import { useWorkspaceStore } from "../src/state/workspaceStore";
import { useMrEditorStore } from "../src/state/mrEditorStore";

beforeEach(async () => {
  await Promise.all([
    db.projects.clear(),
    db.folders.clear(),
    db.documents.clear(),
    db.session.clear(),
    db.derDocuments.clear(),
    db.mrDocuments.clear(),
  ]);
  useWorkspaceStore.setState({
    status: "loading",
    projects: [],
    project: null,
    folders: [],
    documents: [],
    activeDocumentId: null,
  });
  useMrEditorStore.getState().clear();
});

async function createProjectAndMrDocument() {
  render(<App />);
  fireEvent.click(await screen.findByRole("button", { name: /Crear proyecto/i }));
  fireEvent.change(await screen.findByLabelText(/Nombre del proyecto/i), {
    target: { value: "BD 3636" },
  });
  fireEvent.click(screen.getByRole("button", { name: /^Crear$/i }));

  fireEvent.click(await screen.findByRole("button", { name: /^Documento$/i }));
  fireEvent.change(await screen.findByLabelText(/^Nombre$/i), { target: { value: "MR suelto" } });
  // Elegir el tipo "MR".
  fireEvent.click(screen.getByRole("radio", { name: /^MR/i }));
  fireEvent.click(screen.getByRole("button", { name: /Crear documento/i }));

  await waitFor(() => expect(screen.getByTestId("mr-canvas")).toBeInTheDocument());
  await waitFor(() => expect(useMrEditorStore.getState().status).toBe("ready"));
}

describe("Editor MR grafico (Incremento 5)", () => {
  it("monta el editor MR para un documento MR y la rail muestra la herramienta Esquema", async () => {
    await createProjectAndMrDocument();
    expect(screen.getByRole("button", { name: /^Esquema$/i })).toBeInTheDocument();
    // No hay herramientas del DER.
    expect(screen.queryByRole("button", { name: /^Entidad$/i })).not.toBeInTheDocument();
  });

  it("renderiza los esquemas creados y valida su integridad", async () => {
    await createProjectAndMrDocument();
    act(() => {
      const mr = useMrEditorStore.getState();
      const id = mr.addSchema({ x: 100, y: 100 });
      mr.renameSchema(id, "Sucursal");
      mr.renameAttribute(mr.addAttributeTo(id)!, "codigo");
    });
    await waitFor(() => expect(screen.getAllByText("Sucursal").length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole("button", { name: /^Validar$/i }));
    // El esquema tiene un atributo pero no PK -> advertencia en Validacion.
    expect(await screen.findByText(/no tiene clave primaria/i)).toBeInTheDocument();
  });

  it("Transformar esta deshabilitado en un documento MR", async () => {
    await createProjectAndMrDocument();
    expect(screen.getByRole("button", { name: /Transformar/i })).toBeDisabled();
  });
});
