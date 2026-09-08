import { describe, it, expect } from "vitest";
import { runProfile, unlamProfile, UNLAM_PROFILE_ID } from "@/academic";
import { model } from "./builder";

/** Corre el perfil y devuelve los ruleId presentes. */
function ruleIdsFor(built: ReturnType<ReturnType<typeof model>["build"]>): string[] {
  return runProfile(built, unlamProfile).map((issue) => issue.ruleId);
}

describe("perfil UNLaM: metadatos", () => {
  it("es un perfil versionado con reglas bien formadas (spec seccion 5)", () => {
    expect(unlamProfile.id).toBe(UNLAM_PROFILE_ID);
    expect(unlamProfile.version).toBe("1.0.0");
    expect(unlamProfile.rules.length).toBeGreaterThan(10);
    for (const rule of unlamProfile.rules) {
      expect(rule.id.startsWith("unlam.")).toBe(true);
      expect(rule.version).toBe("1.0.0");
      expect(["CATEDRA", "INFORMADA", "PRODUCTO", "GENERAL"]).toContain(rule.source);
      expect(["error", "warning", "info"]).toContain(rule.severity);
      expect(rule.explanation.length).toBeGreaterThan(0);
    }
    // ids unicos
    const ids = unlamProfile.rules.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("perfil UNLaM: una comprobacion por regla", () => {
  it("entity.name-required", () => {
    expect(ruleIdsFor(model().entity("").build())).toContain("unlam.entity.name-required");
  });

  it("entity.name-unique", () => {
    const built = model().entity("Cliente").entity("Cliente").build();
    // ambas quedan sin id -> tambien dispara regular-identifier-required, pero
    // lo que probamos es la de nombre repetido.
    expect(ruleIdsFor(built)).toContain("unlam.entity.name-unique");
  });

  it("entity.regular-identifier-required (y su excepcion en subentidades)", () => {
    expect(ruleIdsFor(model().entity("A").build())).toContain(
      "unlam.entity.regular-identifier-required",
    );
    const withHierarchy = model()
      .entity("Super", { attrs: [{ name: "id", identifier: true }] })
      .entity("Sub")
      .entity("Sub2")
      .hierarchy("H", {
        super: "Super",
        subs: ["Sub", "Sub2"],
        partition: "total",
        overlap: "exclusive",
      })
      .build();
    expect(ruleIdsFor(withHierarchy)).not.toContain("unlam.entity.regular-identifier-required");
  });

  it("attribute.name-required", () => {
    const built = model()
      .entity("A", { attrs: [{ name: "id", identifier: true }, { name: "" }] })
      .build();
    expect(ruleIdsFor(built)).toContain("unlam.attribute.name-required");
  });

  it("attribute.name-unique-per-owner", () => {
    const built = model()
      .entity("A", {
        attrs: [{ name: "id", identifier: true }, { name: "x" }, { name: "x" }],
      })
      .build();
    expect(ruleIdsFor(built)).toContain("unlam.attribute.name-unique-per-owner");
  });

  it("attribute.composite-needs-components", () => {
    const built = model()
      .entity("A", {
        attrs: [
          { name: "id", identifier: true },
          { name: "c", kind: "composite", components: [] },
        ],
      })
      .build();
    expect(ruleIdsFor(built)).toContain("unlam.attribute.composite-needs-components");
  });

  it("attribute.identifier-should-be-simple", () => {
    const built = model()
      .entity("A", { attrs: [{ name: "x", kind: "multivalued", identifier: true }] })
      .build();
    expect(ruleIdsFor(built)).toContain("unlam.attribute.identifier-should-be-simple");
  });

  it("relationship.name-required", () => {
    const built = model()
      .entity("A", { attrs: [{ name: "aId", identifier: true }] })
      .entity("B", { attrs: [{ name: "bId", identifier: true }] })
      .relationship("", {
        participants: [
          { entity: "A", cardinality: "N" },
          { entity: "B", cardinality: "N" },
        ],
      })
      .build();
    expect(ruleIdsFor(built)).toContain("unlam.relationship.name-required");
  });

  it("relationship.participant-entity-exists", () => {
    const built = model()
      .entity("A", { attrs: [{ name: "aId", identifier: true }] })
      .relationship("R", {
        degree: 2,
        participants: [
          { entity: "A", cardinality: "1" },
          { entity: "fantasma", cardinality: "N" },
        ],
      })
      .build();
    expect(ruleIdsFor(built)).toContain("unlam.relationship.participant-entity-exists");
  });

  it("relationship.degree-matches-participants", () => {
    const built = model()
      .entity("A", { attrs: [{ name: "aId", identifier: true }] })
      .relationship("R", { degree: 3, participants: [{ entity: "A", cardinality: "N" }] })
      .build();
    expect(ruleIdsFor(built)).toContain("unlam.relationship.degree-matches-participants");
  });

  it("relationship.binary-ternary-distinct-entities", () => {
    const built = model()
      .entity("A", { attrs: [{ name: "aId", identifier: true }] })
      .relationship("R", {
        degree: 2,
        participants: [
          { entity: "A", cardinality: "1" },
          { entity: "A", cardinality: "N" },
        ],
      })
      .build();
    expect(ruleIdsFor(built)).toContain("unlam.relationship.binary-ternary-distinct-entities");
  });

  it("relationship.unary-roles-required", () => {
    const built = model()
      .entity("A", { attrs: [{ name: "aId", identifier: true }] })
      .relationship("R", {
        degree: 1,
        participants: [
          { entity: "A", cardinality: "1" },
          { entity: "A", cardinality: "N" },
        ],
      })
      .build();
    expect(ruleIdsFor(built)).toContain("unlam.relationship.unary-roles-required");
  });

  it("relationship.identifier-attribute-only-nn", () => {
    const built = model()
      .entity("A", { attrs: [{ name: "aId", identifier: true }] })
      .entity("B", { attrs: [{ name: "bId", identifier: true }] })
      .relationship("R", {
        attrs: [{ name: "clave", identifier: true }],
        participants: [
          { entity: "A", cardinality: "1" },
          { entity: "B", cardinality: "N" },
        ],
      })
      .build();
    expect(ruleIdsFor(built)).toContain("unlam.relationship.identifier-attribute-only-nn");
  });

  it("weak-entity.identifying-relationship-required", () => {
    const built = model()
      .entity("Fuerte", { attrs: [{ name: "id", identifier: true }] })
      .entity("Debil", { weak: true, attrs: [{ name: "d", discriminator: true }] })
      .relationship("R", {
        participants: [
          { entity: "Debil", cardinality: "N", participation: "total" },
          { entity: "Fuerte", cardinality: "1" },
        ],
      })
      .build();
    expect(ruleIdsFor(built)).toContain("unlam.weak-entity.identifying-relationship-required");
  });

  it("weak-entity.discriminator-required", () => {
    const built = model()
      .entity("Fuerte", { attrs: [{ name: "id", identifier: true }] })
      .entity("Debil", { weak: true, attrs: [{ name: "x" }] })
      .relationship("R", {
        identifying: true,
        participants: [
          { entity: "Debil", cardinality: "N", participation: "total" },
          { entity: "Fuerte", cardinality: "1" },
        ],
      })
      .build();
    expect(ruleIdsFor(built)).toContain("unlam.weak-entity.discriminator-required");
  });

  it("relationship.identifying-requires-weak", () => {
    const built = model()
      .entity("A", { attrs: [{ name: "aId", identifier: true }] })
      .entity("B", { attrs: [{ name: "bId", identifier: true }] })
      .relationship("R", {
        identifying: true,
        participants: [
          { entity: "A", cardinality: "1" },
          { entity: "B", cardinality: "N" },
        ],
      })
      .build();
    expect(ruleIdsFor(built)).toContain("unlam.relationship.identifying-requires-weak");
  });

  it("hierarchy.super-required", () => {
    const built = model()
      .entity("Auto")
      .entity("Moto")
      .hierarchy("H", { super: "", subs: ["Auto", "Moto"], partition: "total", overlap: "exclusive" })
      .build();
    expect(ruleIdsFor(built)).toContain("unlam.hierarchy.super-required");
  });

  it("hierarchy.subentities-required", () => {
    const built = model()
      .entity("V", { attrs: [{ name: "id", identifier: true }] })
      .hierarchy("H", { super: "V", subs: [], partition: "partial", overlap: "exclusive" })
      .build();
    expect(ruleIdsFor(built)).toContain("unlam.hierarchy.subentities-required");
  });

  it("hierarchy.refs-exist", () => {
    const built = model()
      .entity("V", { attrs: [{ name: "id", identifier: true }] })
      .entity("Sub")
      .build();
    built.hierarchies.push({
      id: "h1",
      name: "H",
      superEntityId: built.entities[0]!.id,
      subEntityIds: ["fantasma", built.entities[1]!.id],
      partition: "partial",
      overlap: "exclusive",
    });
    expect(ruleIdsFor(built)).toContain("unlam.hierarchy.refs-exist");
  });

  it("hierarchy.super-not-sub", () => {
    const built = model().entity("V", { attrs: [{ name: "id", identifier: true }] }).entity("Sub").build();
    built.hierarchies.push({
      id: "h1",
      name: "H",
      superEntityId: built.entities[0]!.id,
      subEntityIds: [built.entities[0]!.id, built.entities[1]!.id],
      partition: "partial",
      overlap: "exclusive",
    });
    expect(ruleIdsFor(built)).toContain("unlam.hierarchy.super-not-sub");
  });

  it("hierarchy.discriminator-combination", () => {
    const built = model()
      .entity("E", { attrs: [{ name: "id", identifier: true }, { name: "tipo" }] })
      .entity("S1")
      .entity("S2")
      .hierarchy("H", {
        super: "E",
        subs: ["S1", "S2"],
        partition: "partial",
        overlap: "exclusive",
      })
      .build();
    built.hierarchies[0]!.discriminatorAttributeId = built.entities[0]!.attributes[1]!.id;
    expect(ruleIdsFor(built)).toContain("unlam.hierarchy.discriminator-combination");
  });

  it("hierarchy.discriminator-exists", () => {
    const built = model()
      .entity("E", { attrs: [{ name: "id", identifier: true }] })
      .entity("S1")
      .entity("S2")
      .hierarchy("H", {
        super: "E",
        subs: ["S1", "S2"],
        partition: "total",
        overlap: "exclusive",
      })
      .build();
    built.hierarchies[0]!.discriminatorAttributeId = "no-existe";
    expect(ruleIdsFor(built)).toContain("unlam.hierarchy.discriminator-exists");
  });

  it("relationship.ternary-cardinality-note (info)", () => {
    const built = model()
      .entity("A", { attrs: [{ name: "aId", identifier: true }] })
      .entity("B", { attrs: [{ name: "bId", identifier: true }] })
      .entity("C", { attrs: [{ name: "cId", identifier: true }] })
      .relationship("T", {
        degree: 3,
        participants: [
          { entity: "A", cardinality: "N" },
          { entity: "B", cardinality: "N" },
          { entity: "C", cardinality: "N" },
        ],
      })
      .build();
    expect(ruleIdsFor(built)).toContain("unlam.relationship.ternary-cardinality-note");
  });
});
