import { describe, it, expect } from "vitest";
import { runProfile, unlamProfile } from "@/academic";
import { academicFixtures } from "./fixtures";

// Gate del Incremento 3: los fixtures academicos de estructura DER (spec
// seccion 26, items 1-22) pasan bajo el RuleProfile UNLaM. No hay
// transformacion DER -> MR (eso es Incremento 4).

describe("fixtures academicos DER (gate Incremento 3)", () => {
  for (const fixture of academicFixtures) {
    it(fixture.title, () => {
      const issues = runProfile(fixture.model, unlamProfile);
      const errors = issues.filter((issue) => issue.severity === "error");

      if (fixture.expect === "valid") {
        expect(
          errors,
          `esperaba sin errores, aparecieron: ${errors.map((e) => e.ruleId).join(", ")}`,
        ).toEqual([]);
      } else {
        expect(
          issues.map((issue) => issue.ruleId),
          `esperaba el ruleId ${fixture.expect.invalidRuleId}`,
        ).toContain(fixture.expect.invalidRuleId);
      }
    });
  }

  it("cubre los 22 casos minimos de la seccion 26", () => {
    // items 1..22, con 3 desdoblado (3 + 3b) y 6 en 4 variantes -> >= 22 titulos numerados
    const numbered = academicFixtures.filter((f) => /^\d/.test(f.title));
    expect(numbered.length).toBeGreaterThanOrEqual(22);
  });
});
