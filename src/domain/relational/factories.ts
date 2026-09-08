// Fabricas puras de objetos del modelo relacional. IDs con
// crypto.randomUUID(); nombres normalizados con fallback.

import type {
  ForeignKey,
  RelationalAttribute,
  RelationalModel,
  RelationSchema,
} from "./types";

const FALLBACK_SCHEMA_NAME = "Relacion";
const FALLBACK_ATTRIBUTE_NAME = "atributo";

function newId(): string {
  return crypto.randomUUID();
}

export function normalizeName(raw: string, fallback: string): string {
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

export function createRelationalModel(): RelationalModel {
  return { schemas: [], notes: [], revision: 0 };
}

export function createSchema(name = FALLBACK_SCHEMA_NAME): RelationSchema {
  return {
    id: newId(),
    name: normalizeName(name, FALLBACK_SCHEMA_NAME),
    attributes: [],
    primaryKey: [],
    foreignKeys: [],
  };
}

export function createRelationalAttribute(
  name = FALLBACK_ATTRIBUTE_NAME,
): RelationalAttribute {
  return { id: newId(), name: normalizeName(name, FALLBACK_ATTRIBUTE_NAME) };
}

export function createForeignKey(
  localAttributeIds: string[],
  targetRelationId: string,
  targetAttributeIds: string[],
): ForeignKey {
  return {
    id: newId(),
    localAttributeIds: [...localAttributeIds],
    targetRelationId,
    targetAttributeIds: [...targetAttributeIds],
  };
}
