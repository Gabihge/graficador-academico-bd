import { describe, it, expect } from "vitest";
import { migrateConceptualModel } from "@/domain/conceptual";

describe("migrateConceptualModel", () => {
  it("actualiza un modelo con la forma del Incremento 2 (ends, sin kind)", () => {
    const legacy = {
      entities: [
        {
          id: "e1",
          name: "Cliente",
          attributes: [{ id: "a1", name: "dni", isIdentifier: true }],
        },
      ],
      relationships: [
        {
          id: "r1",
          name: "Compra",
          ends: [
            { entityId: "e1", cardinality: "1", participation: "total" },
            { entityId: "e2", cardinality: "N", participation: "partial" },
          ],
          attributes: [],
        },
      ],
    };

    const model = migrateConceptualModel(legacy);

    expect(model.entities[0]?.kind).toBe("regular");
    expect(model.entities[0]?.attributes[0]?.kind).toBe("simple");
    expect(model.hierarchies).toEqual([]);
    expect(model.revision).toBe(0);

    const relationship = model.relationships[0]!;
    expect(relationship.degree).toBe(2);
    expect(relationship.participants).toHaveLength(2);
    expect(relationship.participants[0]).toMatchObject({
      entityId: "e1",
      cardinality: "1",
      participation: "total",
    });
    expect(relationship.participants[0]?.id).toBeTruthy();
  });

  it("es idempotente sobre un modelo ya canonico", () => {
    const canonical = migrateConceptualModel({
      entities: [{ id: "e1", name: "A", kind: "weak", attributes: [] }],
      relationships: [],
      hierarchies: [
        {
          id: "h1",
          name: "ISA",
          superEntityId: "e1",
          subEntityIds: ["e2"],
          partition: "total",
          overlap: "overlapping",
        },
      ],
      revision: 7,
    });

    expect(migrateConceptualModel(canonical)).toEqual(canonical);
    expect(canonical.entities[0]?.kind).toBe("weak");
    expect(canonical.revision).toBe(7);
  });

  it("tolera entradas corruptas o vacias", () => {
    expect(migrateConceptualModel(undefined)).toEqual({
      entities: [],
      relationships: [],
      hierarchies: [],
      revision: 0,
    });
    expect(migrateConceptualModel({ entities: "nope" }).entities).toEqual([]);
  });
});
