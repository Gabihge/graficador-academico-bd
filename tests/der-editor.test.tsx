import { beforeEach, describe, it, expect } from "vitest";
import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { App } from "../src/app/App";
import { db } from "../src/infrastructure/persistence/db";
import { useWorkspaceStore } from "../src/state/workspaceStore";
import { useDerEditorStore } from "../src/state/derEditorStore";

beforeEach(async () => {
  await Promise.all([
    db.projects.clear(),
    db.folders.clear(),
    db.documents.clear(),
    db.session.clear(),
    db.derDocuments.clear(),
  ]);
  useWorkspaceStore.setState({
    status: "loading",
    projects: [],
    project: null,
    folders: [],
    documents: [],
    activeDocumentId: null,
  });
  useDerEditorStore.getState().clear();
});

async function createProjectAndDerDocument() {
  render(<App />);
  fireEvent.click(await screen.findByRole("button", { name: /Crear proyecto/i }));
  fireEvent.change(await screen.findByLabelText(/Nombre del proyecto/i), {
    target: { value: "Bases de Datos 3636" },
  });
  fireEvent.click(screen.getByRole("button", { name: /^Crear$/i }));

  // Crear un documento DER desde el explorador.
  fireEvent.click(await screen.findByRole("button", { name: /^Documento$/i }));
  fireEvent.change(await screen.findByLabelText(/^Nombre$/i), {
    target: { value: "DER sucursales" },
  });
  fireEvent.click(screen.getByRole("button", { name: /Crear documento/i }));

  await waitFor(() => expect(screen.getByTestId("der-canvas")).toBeInTheDocument());
  await waitFor(() => expect(useDerEditorStore.getState().status).toBe("ready"));
}

describe("Editor DER (Incremento 2)", () => {
  it("monta el editor Chen para un documento DER y renderiza las entidades creadas", async () => {
    await createProjectAndDerDocument();

    act(() => {
      useDerEditorStore.getState().addEntity({ x: 120, y: 120 });
    });

    await waitFor(() => expect(screen.getAllByText("Entidad").length).toBeGreaterThan(0));
  });

  it("el boton Validar abre la pestana Validacion del inspector con los problemas estructurales", async () => {
    await createProjectAndDerDocument();

    act(() => {
      useDerEditorStore.getState().addEntity({ x: 0, y: 0 });
    });

    fireEvent.click(screen.getByRole("button", { name: /^Validar$/i }));

    expect(await screen.findByText(/no tiene identificador/i)).toBeInTheDocument();
  });

  it("no expone controles de incrementos futuros (transformar / exportar siguen deshabilitados)", async () => {
    await createProjectAndDerDocument();

    expect(screen.getByRole("button", { name: /Transformar/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Exportar/i })).toBeDisabled();
  });
});
