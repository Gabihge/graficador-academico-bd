import { beforeEach, describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { App } from "../src/app/App";
import { db } from "../src/infrastructure/persistence/db";
import { useWorkspaceStore } from "../src/state/workspaceStore";

beforeEach(async () => {
  await Promise.all([
    db.projects.clear(),
    db.folders.clear(),
    db.documents.clear(),
    db.session.clear(),
  ]);
  useWorkspaceStore.setState({
    status: "loading",
    projects: [],
    project: null,
    folders: [],
    documents: [],
    activeDocumentId: null,
  });
});

describe("App (Incremento 1)", () => {
  it("muestra la pantalla de bienvenida cuando no hay proyecto", async () => {
    render(<App />);
    expect(
      await screen.findByRole("heading", { name: /Graficador Academico de Bases de Datos/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Crear proyecto/i })).toBeInTheDocument();
  });

  it("crea un proyecto desde la bienvenida y entra al shell con el canvas montado", async () => {
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /Crear proyecto/i }));
    fireEvent.change(await screen.findByLabelText(/Nombre del proyecto/i), {
      target: { value: "Bases de Datos 3636" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Crear$/i }));

    await waitFor(() => expect(screen.getByTestId("canvas-host")).toBeInTheDocument());
    expect(screen.getByRole("toolbar", { name: /Herramientas de dibujo/i })).toBeInTheDocument();
    // El nombre del proyecto aparece en el header y en el explorer.
    expect(screen.getAllByText("Bases de Datos 3636").length).toBeGreaterThan(0);
  });
});
