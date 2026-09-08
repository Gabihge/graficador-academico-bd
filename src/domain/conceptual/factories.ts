// Fabricas puras de objetos del modelo conceptual. Cada funcion devuelve un
// objeto nuevo y serializable a JSON; no toca persistencia ni estado global.
// IDs con crypto.randomUUID(); nombres normalizados con fallback para que
// ningun elemento quede sin nombre visible.

import type {
  AttributeKind,
  ConceptualAttribute,
  ConceptualModel,
  Entity,
  EntityKind,
  Relationship,
  RelationshipDegree,
  RelationshipParticipant,
  Hierarchy,
} from "./types";

const FALLBACK_ENTITY_NAME = "Entidad";
const FALLBACK_RELATIONSHIP_NAME = "Relacion";
const FALLBACK_ATTRIBUTE_NAME = "atributo";
const FALLBACK_HIERARCHY_NAME = "Jerarquia";

function newId(): string {
  return crypto.randomUUID();
}

/** Recorta espacios y aplica un fallback si el nombre queda vacio. */
export function normalizeName(raw: string, fallback: string): string {
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

export function createConceptualModel(): ConceptualModel {
  return { entities: [], relationships: [], hierarchies: [], revision: 0 };
}

export function createEntity(
  name = FALLBACK_ENTITY_NAME,
  kind: EntityKind = "regular",
): Entity {
  return {
    id: newId(),
    name: normalizeName(name, FALLBACK_ENTITY_NAME),
    kind,
    attributes: [],
  };
}

export function createRelationship(
  name = FALLBACK_RELATIONSHIP_NAME,
  degree: RelationshipDegree = 2,
): Relationship {
  return {
    id: newId(),
    name: normalizeName(name, FALLBACK_RELATIONSHIP_NAME),
    degree,
    participants: [],
    attributes: [],
  };
}

export function createAttribute(
  name = FALLBACK_ATTRIBUTE_NAME,
  kind: AttributeKind = "simple",
): ConceptualAttribute {
  const attribute: ConceptualAttribute = {
    id: newId(),
    name: normalizeName(name, FALLBACK_ATTRIBUTE_NAME),
    kind,
    isIdentifier: false,
  };
  if (kind === "composite") attribute.components = [];
  return attribute;
}

export function createParticipant(entityId: string): RelationshipParticipant {
  return {
    id: newId(),
    entityId,
    cardinality: "N",
    participation: "partial",
  };
}

export function createHierarchy(superEntityId = ""): Hierarchy {
  return {
    id: newId(),
    name: FALLBACK_HIERARCHY_NAME,
    superEntityId,
    subEntityIds: [],
    partition: "partial",
    overlap: "exclusive",
  };
}
