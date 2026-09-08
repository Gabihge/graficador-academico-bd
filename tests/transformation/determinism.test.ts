import { describe, it, expect } from "vitest";
import { unlamTransformConventions } from "@/academic";
import { transformDerToMr } from "@/features/transformation";
import { model } from "../academic/builder";
import { semanticize } from "./semanticize";

function run(der: Parameters<typeof transformDerToMr>[0]) {
  return transformDerToMr(der, {
    conventions: unlamTransformConventions,
    ruleProfileId: "unlam-bd",
    ruleProfileVersion: "1.0.0",
    sourceDocumentId: "doc-1",
    sourceRevision: 3,
  });
}

const sampleDer = () =>
  model()
    .entity("Alumno", { attrs: [{ name: "legajo", identifier: true }] })
    .entity("Materia", { attrs: [{ name: "codigo", identifier: true }] })
    .entity("Docente", { attrs: [{ name: "dni", identifier: true }] })
    .relationship("Cursa", {
      attrs: [{ name: "nota" }],
      participants: [
        { entity: "Alumno", cardinality: "N" },
        { entity: "Materia", cardinality: "N" },
      ],
    })
    .relationship("Dicta", {
      participants: [
        { entity: "Docente", cardinality: "1" },
        { entity: "Materia", cardinality: "N" },
      ],
    })
    .build();

describe("transformacion determinista", () => {
  it("dos corridas sobre el mismo modelo dan un MR semanticamente identico", () => {
    const a = run(sampleDer());
    const b = run(sampleDer());
    expect(semanticize(a.relational)).toEqual(semanticize(b.relational));
  });

  it("la secuencia de reglas aplicadas es la misma entre corridas", () => {
    const a = run(sampleDer()).trace.entries.map((e) => e.ruleId);
    const b = run(sampleDer()).trace.entries.map((e) => e.ruleId);
    expect(a).toEqual(b);
    expect(a).toContain("7.4");
    expect(a).toContain("7.3");
  });
});
