import { describe, it, expect } from "vitest";
import {
  elementKindOf,
  isDerValid,
  validateDer,
} from "@/features/validation";
import { model } from "../academic/builder";

describe("validateDer (feature de validacion del Incremento 3)", () => {
  it("corre el perfil academico UNLaM: DER correcto -> sin errores", () => {
    const built = model()
      .entity("Cliente", { attrs: [{ name: "dni", identifier: true }] })
      .entity("Sucursal", { attrs: [{ name: "codigo", identifier: true }] })
      .relationship("Atiende", {
        participants: [
          { entity: "Cliente", cardinality: "N", participation: "partial" },
          { entity: "Sucursal", cardinality: "1", participation: "total" },
        ],
      })
      .build();
    expect(validateDer(built).filter((i) => i.severity === "error")).toEqual([]);
    expect(isDerValid(built)).toBe(true);
  });

  it("los issues traen ruleId, fuente y explicacion", () => {
    const built = model().entity("A").build();
    const issue = validateDer(built).find(
      (i) => i.ruleId === "unlam.entity.regular-identifier-required",
    );
    expect(issue).toBeDefined();
    expect(issue?.source).toBe("CATEDRA");
    expect(issue?.explanation.length).toBeGreaterThan(0);
    expect(issue?.elementIds.length).toBeGreaterThan(0);
  });

  it("elementKindOf resuelve el tipo de elemento para navegar desde un issue", () => {
    const built = model()
      .entity("A", { attrs: [{ name: "x", kind: "composite", components: [{ name: "c" }] }] })
      .build();
    const entityId = built.entities[0]!.id;
    const componentId = built.entities[0]!.attributes[0]!.components![0]!.id;
    expect(elementKindOf(built, entityId)).toBe("entity");
    expect(elementKindOf(built, componentId)).toBe("attribute");
    expect(elementKindOf(built, "no-existe")).toBeNull();
  });
});
