import { describe, it, expect } from "vitest";
import type { ConceptualModel } from "@/domain/conceptual";
import { unlamTransformConventions } from "@/academic";
import { transformDerToMr } from "@/features/transformation";
import { semanticize } from "./semanticize";
import { transformFixtures } from "./fixtures";

function run(der: ConceptualModel) {
  return transformDerToMr(der, {
    conventions: unlamTransformConventions,
    ruleProfileId: "unlam-bd",
    ruleProfileVersion: "1.0.0",
    sourceDocumentId: "doc-1",
    sourceRevision: der.revision,
  });
}

// Gate del Incremento 4: los fixtures esperados de las 15 reglas de
// transformacion pasan, comparados por semantica (spec 26).

describe("transformacion DER -> MR (gate Incremento 4)", () => {
  for (const fixture of transformFixtures) {
    it(`${fixture.rule} - ${fixture.title}`, () => {
      const result = run(fixture.der);

      expect(semanticize(result.relational)).toEqual(
        [...fixture.expected].sort((a, b) => a.name.localeCompare(b.name)),
      );

      // El trace cita la regla y los elementos de origen.
      const ruleEntries = result.trace.entries.filter((e) => e.ruleId === fixture.rule);
      expect(ruleEntries.length, `trace debe citar la regla ${fixture.rule}`).toBeGreaterThan(0);
      expect(
        ruleEntries.every((e) => e.sourceElementIds.length > 0),
        "cada entrada del trace debe citar al menos un elemento de origen del DER",
      ).toBe(true);

      if (fixture.expectWarning) {
        expect(
          result.trace.entries.some((e) => e.severity === "warning"),
          "se esperaba una entrada de trace `warning`",
        ).toBe(true);
      }
    });
  }

  it("cubre las 15 reglas de spec 7", () => {
    const covered = new Set(transformFixtures.map((f) => f.rule));
    const all = Array.from({ length: 15 }, (_, i) => `7.${i + 1}`);
    expect([...covered].sort()).toEqual(expect.arrayContaining(all));
  });
});

describe("transformacion: metadata de derivacion (spec 10)", () => {
  it("guarda de que DER y revision salio, con perfil y convenciones", () => {
    const der = transformFixtures[0]!.der;
    const { derivation } = run(der);
    expect(derivation).toMatchObject({
      generatedFromDocumentId: "doc-1",
      ruleProfileId: "unlam-bd",
      ruleProfileVersion: "1.0.0",
      transformConventionsVersion: "1.0.0",
      isDerived: true,
      hasManualChanges: false,
    });
    expect(typeof derivation.generatedAt).toBe("string");
  });
});
