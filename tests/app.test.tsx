import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "../src/app/App";

// Prueba minima de arranque (Incremento 0): confirma que el pipeline de
// tooling (Vitest + React Testing Library + jsdom) esta correctamente
// configurado antes de escribir dominio o UI reales.
describe("bootstrap", () => {
  it("renderiza el placeholder inicial", () => {
    render(<App />);
    expect(screen.getByText(/Graficador Academico de Bases de Datos/i)).toBeInTheDocument();
  });
});
