// Fabricas puras de objetos del modelo conceptual. Cada funcion devuelve un
// objeto nuevo y serializable a JSON; no toca persistencia ni estado global.
// Mismo patron que src/domain/project/factories.ts: IDs con
// crypto.randomUUID() y nombres normalizados con fallback para que ningun
// elemento quede sin nombre visible.

import type {
  ConceptualAttribute,
  ConceptualModel,
  Entity,
  Relationship,
} from "./types";

const FALLBACK_ENTITY_NAME = "Entidad";
const FALLBACK_RELATIONSHIP_NAME = "Relacion";
const FALLBACK_ATTRIBUTE_NAME = "atributo";

function newId(): string {
  return crypto.randomUUID();
}

/** Recorta espacios y aplica un fallback si el nombre queda vacio. */
export function normalizeName(raw: string, fallback: string): string {
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

export function createConceptualModel(): ConceptualModel {
  return { entities: [], relationships: [] };
}

export function createEntity(name = FALLBACK_ENTITY_NAME): Entity {
  return {
    id: newId(),
    name: normalizeName(name, FALLBACK_ENTITY_NAME),
    attributes: [],
  };
}

export function createRelationship(name = FALLBACK_RELATIONSHIP_NAME): Relationship {
  return {
    id: newId(),
    name: normalizeName(name, FALLBACK_RELATIONSHIP_NAME),
    ends: [],
    attributes: [],
  };
}

export function createAttribute(
  name = FALLBACK_ATTRIBUTE_NAME,
  isIdentifier = false,
): ConceptualAttribute {
  return {
    id: newId(),
    name: normalizeName(name, FALLBACK_ATTRIBUTE_NAME),
    isIdentifier,
  };
}
