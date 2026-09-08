import { describe, it, expect } from "vitest";
import {
  addAttribute,
  addEntity,
  addRelationship,
  connect,
  createAttribute,
  createConceptualModel,
  createEntity,
  createRelationship,
  disconnect,
  findAttributeOwner,
  removeAttribute,
  removeEntity,
  setAttributeIdentifier,
  setEndCardinality,
  setEndParticipation,
} from "@/domain/conceptual";

describe("fabricas del modelo conceptual", () => {
  it("crea entidades, relaciones y atributos con id y nombre normalizado", () => {
    const entity = createEntity("  Cliente  ");
    expect(entity.id).toMatch(/[0-9a-f-]{36}/);
    expect(entity.name).toBe("Cliente");
    expect(entity.attributes).toEqual([]);

    expect(createRelationship("   ").name).toBe("Relacion");
    expect(createAttribute("dni", true)).toMatchObject({ name: "dni", isIdentifier: true });
  });
});

describe("operaciones sobre entidades", () => {
  it("removeEntity tambien limpia los extremos de relacion que la referenciaban", () => {
    const a = createEntity("A");
    const b = createEntity("B");
    const rel = createRelationship("R");
    let model = addRelationship(addEntity(addEntity(createConceptualModel(), a), b), rel);
    model = connect(model, rel.id, a.id);
    model = connect(model, rel.id, b.id);
    expect(model.relationships[0]?.ends).toHaveLength(2);

    model = removeEntity(model, a.id);
    expect(model.entities.map((e) => e.name)).toEqual(["B"]);
    // La relacion sobrevive pero queda con un solo extremo (incompleta).
    expect(model.relationships[0]?.ends).toHaveLength(1);
    expect(model.relationships[0]?.ends[0]?.entityId).toBe(b.id);
  });
});

describe("operaciones sobre relaciones binarias", () => {
  function twoEntitiesAndRelationship() {
    const a = createEntity("A");
    const b = createEntity("B");
    const rel = createRelationship("R");
    const model = addRelationship(
      addEntity(addEntity(createConceptualModel(), a), b),
      rel,
    );
    return { model, a, b, rel };
  }

  it("connect topa en dos extremos (nada de ternarias en el Incremento 2)", () => {
    const { model, a, b, rel } = twoEntitiesAndRelationship();
    const c = createEntity("C");
    let next = addEntity(model, c);
    next = connect(next, rel.id, a.id);
    next = connect(next, rel.id, b.id);
    next = connect(next, rel.id, c.id); // se ignora
    expect(next.relationships[0]?.ends.map((e) => e.entityId)).toEqual([a.id, b.id]);
  });

  it("connect ignora conectar dos veces la misma entidad (unaria = Incremento 3)", () => {
    const { model, a, rel } = twoEntitiesAndRelationship();
    let next = connect(model, rel.id, a.id);
    next = connect(next, rel.id, a.id);
    expect(next.relationships[0]?.ends).toHaveLength(1);
  });

  it("disconnect quita el extremo indicado", () => {
    const { model, a, b, rel } = twoEntitiesAndRelationship();
    let next = connect(connect(model, rel.id, a.id), rel.id, b.id);
    next = disconnect(next, rel.id, a.id);
    expect(next.relationships[0]?.ends.map((e) => e.entityId)).toEqual([b.id]);
  });

  it("cardinalidad y participacion son ejes independientes", () => {
    const { model, a, rel } = twoEntitiesAndRelationship();
    let next = connect(model, rel.id, a.id);
    expect(next.relationships[0]?.ends[0]).toMatchObject({
      cardinality: "N",
      participation: "partial",
    });

    next = setEndCardinality(next, rel.id, a.id, "1");
    expect(next.relationships[0]?.ends[0]?.participation).toBe("partial");

    next = setEndParticipation(next, rel.id, a.id, "total");
    expect(next.relationships[0]?.ends[0]).toMatchObject({
      cardinality: "1",
      participation: "total",
    });
  });
});

describe("operaciones sobre atributos", () => {
  it("agrega, marca identificador y elimina, y encuentra el dueno", () => {
    const entity = createEntity("Cliente");
    const attribute = createAttribute("dni");
    let model = addAttribute(addEntity(createConceptualModel(), entity), "entity", entity.id, attribute);

    expect(findAttributeOwner(model, attribute.id)).toEqual({ kind: "entity", id: entity.id });
    expect(model.entities[0]?.attributes[0]?.isIdentifier).toBe(false);

    model = setAttributeIdentifier(model, attribute.id, true);
    expect(model.entities[0]?.attributes[0]?.isIdentifier).toBe(true);

    model = removeAttribute(model, attribute.id);
    expect(model.entities[0]?.attributes).toHaveLength(0);
    expect(findAttributeOwner(model, attribute.id)).toBeNull();
  });

  it("no muta el modelo original (operaciones puras)", () => {
    const entity = createEntity("A");
    const base = addEntity(createConceptualModel(), entity);
    const next = addAttribute(base, "entity", entity.id, createAttribute("x"));
    expect(base.entities[0]?.attributes).toHaveLength(0);
    expect(next.entities[0]?.attributes).toHaveLength(1);
  });
});
