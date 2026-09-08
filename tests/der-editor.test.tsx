import { beforeEach, describe, it, expect } from "vitest";
import { act, render, screen, fireEvent, waitFor, within } from "@testing-library/react";
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
  useDerEditorStore.getState().clear();
});

async function createProjectAndDerDocument() {
  render(<App />);
  fireEvent.click(await screen.findByRole("button", { name: /Crear proyecto/i }));
  fireEvent.change(await screen.findByLabelText(/Nombre del proyecto/i), {
    target: { value: "Bases de Datos 3636" },
  });
  fireEvent.click(screen.getByRole("button", { name: /^Crear$/i }));

  fireEvent.click(await screen.findByRole("button", { name: /^Documento$/i }));
  fireEvent.change(await screen.findByLabelText(/^Nombre$/i), {
    target: { value: "DER sucursales" },
  });
  fireEvent.click(screen.getByRole("button", { name: /Crear documento/i }));

  await waitFor(() => expect(screen.getByTestId("der-canvas")).toBeInTheDocument());
  await waitFor(() => expect(useDerEditorStore.getState().status).toBe("ready"));
}

describe("Editor DER (Incremento 3)", () => {
  it("monta el editor Chen y renderiza las entidades creadas", async () => {
    await createProjectAndDerDocument();
    act(() => {
      useDerEditorStore.getState().addEntity({ x: 120, y: 120 });
    });
    await waitFor(() => expect(screen.getAllByText("Entidad").length).toBeGreaterThan(0));
  });

  it("el boton Validar abre la pestana Validacion con issues del perfil academico", async () => {
    await createProjectAndDerDocument();
    act(() => {
      useDerEditorStore.getState().addEntity({ x: 0, y: 0 });
    });
    fireEvent.click(screen.getByRole("button", { name: /^Validar$/i }));
    expect(await screen.findByText(/no tiene identificador/i)).toBeInTheDocument();
  });

  it("permite marcar una entidad como debil desde el Inspector (doble rectangulo)", async () => {
    await createProjectAndDerDocument();
    let entityId = "";
    act(() => {
      entityId = useDerEditorStore.getState().addEntity({ x: 100, y: 100 });
    });
    // El Inspector abre en Propiedades con la entidad seleccionada.
    fireEvent.click(await screen.findByRole("button", { name: /^Debil$/i }));
    await waitFor(() =>
      expect(useDerEditorStore.getState().model.entities.find((e) => e.id === entityId)?.kind).toBe(
        "weak",
      ),
    );
  });

  it("la herramienta Jerarquia crea un nodo de jerarquia", async () => {
    await createProjectAndDerDocument();
    expect(screen.getByRole("button", { name: /Jerarquia/i })).toBeEnabled();
    act(() => {
      useDerEditorStore.getState().addHierarchy({ x: 200, y: 200 });
    });
    await waitFor(() =>
      expect(useDerEditorStore.getState().model.hierarchies).toHaveLength(1),
    );
    expect(await screen.findByText(/ISA/)).toBeInTheDocument();
  });

  it("Transformar esta deshabilitado con un DER invalido; Exportar sigue deshabilitado", async () => {
    await createProjectAndDerDocument();
    // DER vacio -> invalido academicamente -> no se puede transformar.
    expect(screen.getByRole("button", { name: /Transformar/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Exportar/i })).toBeDisabled();
  });

  it("con un DER academicamente valido, Transformar se habilita y abre el MR derivado", async () => {
    await createProjectAndDerDocument();

    act(() => {
      const der = useDerEditorStore.getState();
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
    });

    const transformBtn = await screen.findByRole("button", { name: /Transformar/i });
    await waitFor(() => expect(transformBtn).toBeEnabled());
    fireEvent.click(transformBtn);

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/MR derivado \(automatico\)/i)).toBeInTheDocument();
    expect(within(dialog).getByText("Cursa")).toBeInTheDocument();
    // La trazabilidad cita la regla 7.4 (N:N).
    expect(within(dialog).getByText(/Regla 7\.4/)).toBeInTheDocument();
  });
});
