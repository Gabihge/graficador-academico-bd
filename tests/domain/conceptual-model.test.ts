import { describe, it, expect } from "vitest";
import {
  addAttribute,
  addComponent,
  addEntity,
  addHierarchy,
  addHierarchySub,
  addRelationship,
  connect,
  createAttribute,
  createConceptualModel,
  createEntity,
  createHierarchy,
  createRelationship,
  disconnect,
  findAttribute,
  removeAttribute,
  removeEntity,
  setAttributeKind,
  setEntityKind,
  setHierarchyOverlap,
  setHierarchyPartition,
  setHierarchyDiscriminator,
  setParticipantCardinality,
  setParticipantParticipation,
  setParticipantRole,
  setRelationshipDegree,
} from "@/domain/conceptual";

describe("fabricas del modelo conceptual", () => {
  it("crea entidades, relaciones y atributos con la forma canonica", () => {
    const entity = createEntity("  Cliente  ");
    expect(entity.name).toBe("Cliente");
    expect(entity.kind).toBe("regular");

    expect(createRelationship("R").degree).toBe(2);
    expect(createRelationship("R", 3).degree).toBe(3);

    const composite = createAttribute("direccion", "composite");
    expect(composite.kind).toBe("composite");
    expect(composite.components).toEqual([]);

    expect(createConceptualModel()).toEqual({
      entities: [],
      relationships: [],
      hierarchies: [],
      revision: 0,
    });
  });
});

describe("relaciones: grado, participantes y roles", () => {
  function twoEntitiesAndRelationship(degree: 1 | 2 | 3 = 2) {
    const a = createEntity("A");
    const b = createEntity("B");
    let model = addEntity(addEntity(createConceptualModel(), a), b);
    const rel = createRelationship("R", degree);
    model = addRelationship(model, rel);
    return { model, a, b, rel };
  }

  it("connect binaria: topa en el grado y no admite la misma entidad dos veces", () => {
    const { model, a, b, rel } = twoEntitiesAndRelationship(2);
    const c = createEntity("C");
    let next = addEntity(model, c);
    next = connect(next, rel.id, a.id);
    next = connect(next, rel.id, b.id);
    next = connect(next, rel.id, c.id); // ignorado: ya tiene 2
    next = connect(next, rel.id, a.id); // ignorado: entidad repetida
    expect(next.relationships[0]?.participants.map((p) => p.entityId)).toEqual([a.id, b.id]);
  });

  it("connect unaria: admite la misma entidad dos veces (dos participantes)", () => {
    const { model, a, rel } = twoEntitiesAndRelationship(1);
    let next = connect(model, rel.id, a.id);
    next = connect(next, rel.id, a.id);
    next = connect(next, rel.id, a.id); // ignorado: ya tiene 2
    expect(next.relationships[0]?.participants).toHaveLength(2);
    expect(next.relationships[0]?.participants.every((p) => p.entityId === a.id)).toBe(true);
  });

  it("disconnect quita el participante por su id", () => {
    const { model, a, b, rel } = twoEntitiesAndRelationship(2);
    let next = connect(connect(model, rel.id, a.id), rel.id, b.id);
    const firstParticipant = next.relationships[0]!.participants[0]!;
    next = disconnect(next, rel.id, firstParticipant.id);
    expect(next.relationships[0]?.participants).toHaveLength(1);
    expect(next.relationships[0]?.participants[0]?.entityId).toBe(b.id);
  });

  it("cardinalidad, participacion y rol son ejes independientes", () => {
    const { model, a, rel } = twoEntitiesAndRelationship(2);
    let next = connect(model, rel.id, a.id);
    const pid = next.relationships[0]!.participants[0]!.id;
    next = setParticipantCardinality(next, rel.id, pid, "1");
    next = setParticipantParticipation(next, rel.id, pid, "total");
    next = setParticipantRole(next, rel.id, pid, "  jefe  ");
    expect(next.relationships[0]?.participants[0]).toMatchObject({
      cardinality: "1",
      participation: "total",
      role: "jefe",
    });
    // rol vacio limpia el campo
    next = setParticipantRole(next, rel.id, pid, "   ");
    expect(next.relationships[0]?.participants[0]?.role).toBeUndefined();
  });

  it("setRelationshipDegree cambia el grado declarado", () => {
    const { model, rel } = twoEntitiesAndRelationship(2);
    expect(setRelationshipDegree(model, rel.id, 3).relationships[0]?.degree).toBe(3);
  });
});

describe("entidades y atributos avanzados", () => {
  it("removeEntity limpia participantes y referencias de jerarquia", () => {
    const a = createEntity("A");
    const b = createEntity("B");
    let model = addEntity(addEntity(createConceptualModel(), a), b);
    const rel = createRelationship("R");
    model = addRelationship(model, rel);
    model = connect(connect(model, rel.id, a.id), rel.id, b.id);
    const hierarchy = createHierarchy(a.id);
    model = addHierarchySub(addHierarchy(model, hierarchy), hierarchy.id, b.id);

    model = removeEntity(model, a.id);
    expect(model.relationships[0]?.participants).toHaveLength(1);
    expect(model.hierarchies[0]?.superEntityId).toBe("");
    model = removeEntity(model, b.id);
    expect(model.hierarchies[0]?.subEntityIds).toEqual([]);
  });

  it("setAttributeKind crea y descarta componentes al entrar/salir de compuesto", () => {
    const entity = createEntity("Cliente");
    const attribute = createAttribute("direccion");
    let model = addAttribute(addEntity(createConceptualModel(), entity), "entity", entity.id, attribute);

    model = setAttributeKind(model, attribute.id, "composite");
    model = addComponent(model, attribute.id, createAttribute("calle"));
    expect(model.entities[0]?.attributes[0]?.components).toHaveLength(1);

    model = setAttributeKind(model, attribute.id, "simple");
    expect(model.entities[0]?.attributes[0]?.components).toBeUndefined();
  });

  it("findAttribute localiza componentes y su atributo padre", () => {
    const entity = createEntity("Cliente");
    const composite = createAttribute("direccion", "composite");
    let model = addAttribute(addEntity(createConceptualModel(), entity), "entity", entity.id, composite);
    const component = createAttribute("calle");
    model = addComponent(model, composite.id, component);

    const location = findAttribute(model, component.id);
    expect(location?.parentAttributeId).toBe(composite.id);
    expect(location?.ownerId).toBe(entity.id);
  });

  it("removeAttribute borra a cualquier nivel y limpia el discriminante de jerarquia", () => {
    const entity = createEntity("Figura");
    const attribute = createAttribute("tipo");
    let model = addAttribute(addEntity(createConceptualModel(), entity), "entity", entity.id, attribute);
    const hierarchy = createHierarchy(entity.id);
    model = addHierarchy(model, hierarchy);
    model = setHierarchyOverlap(setHierarchyPartition(model, hierarchy.id, "total"), hierarchy.id, "exclusive");
    model = setHierarchyDiscriminator(model, hierarchy.id, attribute.id);
    expect(model.hierarchies[0]?.discriminatorAttributeId).toBe(attribute.id);

    model = removeAttribute(model, attribute.id);
    expect(model.entities[0]?.attributes).toHaveLength(0);
    expect(model.hierarchies[0]?.discriminatorAttributeId).toBeUndefined();
  });

  it("setEntityKind cambia entre regular y debil", () => {
    const entity = createEntity("Dependiente");
    const model = addEntity(createConceptualModel(), entity);
    expect(setEntityKind(model, entity.id, "weak").entities[0]?.kind).toBe("weak");
  });
});

describe("jerarquias", () => {
  it("cambiar a una combinacion no admitida limpia el discriminante", () => {
    const superEntity = createEntity("Empleado");
    const attribute = createAttribute("categoria");
    let model = addAttribute(
      addEntity(createConceptualModel(), superEntity),
      "entity",
      superEntity.id,
      attribute,
    );
    const hierarchy = createHierarchy(superEntity.id);
    model = addHierarchy(model, hierarchy);
    model = setHierarchyPartition(model, hierarchy.id, "total");
    model = setHierarchyOverlap(model, hierarchy.id, "exclusive");
    model = setHierarchyDiscriminator(model, hierarchy.id, attribute.id);
    expect(model.hierarchies[0]?.discriminatorAttributeId).toBe(attribute.id);

    model = setHierarchyOverlap(model, hierarchy.id, "overlapping");
    expect(model.hierarchies[0]?.discriminatorAttributeId).toBeUndefined();
  });
});
