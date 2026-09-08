import { describe, it, expect } from "vitest";
import { unlamTransformConventions } from "@/academic";
import { transformDerToMr, presentRelationalModel } from "@/features/transformation";
import { model } from "../academic/builder";

function present(der: Parameters<typeof transformDerToMr>[0]) {
  const { relational } = transformDerToMr(der, {
    conventions: unlamTransformConventions,
    ruleProfileId: "unlam-bd",
    ruleProfileVersion: "1.0.0",
    sourceDocumentId: "doc-1",
    sourceRevision: 0,
  });
  return presentRelationalModel(relational, unlamTransformConventions.mrPresentation);
}

describe("presentRelationalModel", () => {
  it("asigna pk / fk / pk+fk / plain segun corresponda", () => {
    // Jerarquia -> la subentidad tiene un atributo PK+FK.
    const der = model()
      .entity("Vehiculo", { attrs: [{ name: "patente", identifier: true }, { name: "color" }] })
      .entity("Auto", { attrs: [{ name: "puertas" }] })
      .entity("Moto")
      .hierarchy("H", {
        super: "Vehiculo",
        subs: ["Auto", "Moto"],
        partition: "total",
        overlap: "exclusive",
      })
      .build();

    const schemas = present(der);
    const vehiculo = schemas.find((s) => s.name === "Vehiculo")!;
    const auto = schemas.find((s) => s.name === "Auto")!;

    expect(vehiculo.attributes.find((a) => a.name === "patente")?.role).toBe("pk");
    expect(vehiculo.attributes.find((a) => a.name === "color")?.role).toBe("plain");
    expect(auto.attributes.find((a) => a.name === "patente")?.role).toBe("pk+fk");
    expect(auto.attributes.find((a) => a.name === "patente")?.emphasis).toBe("underline+bold");
    expect(auto.attributes.find((a) => a.name === "puertas")?.role).toBe("plain");
    expect(auto.foreignKeys[0]).toMatchObject({
      targetSchemaName: "Vehiculo",
      localAttributeNames: ["patente"],
      targetAttributeNames: ["patente"],
    });
  });
});
