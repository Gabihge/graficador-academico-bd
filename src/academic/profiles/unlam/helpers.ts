// Utilidades compartidas por las reglas del perfil UNLaM. Puras y sin estado.

import { flattenAttributes as flattenAttributesDomain } from "@/domain/conceptual";
import type { ConceptualModel, Entity, Relationship } from "@/domain/conceptual";

/** Re-export para las reglas del perfil. */
export const flattenAttributes = flattenAttributesDomain;

export function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

export function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase("es");
}

export function entityById(model: ConceptualModel, id: string): Entity | undefined {
  return model.entities.find((entity) => entity.id === id);
}

/** Ids de entidades distintas que participan en una relacion. */
export function distinctEntityIds(relationship: Relationship): string[] {
  return [...new Set(relationship.participants.map((p) => p.entityId))];
}

/**
 * Patron de cardinalidad de una relacion, como los "N:N", "1:N", "1:1:N" que
 * usa la catedra. Ordena los bounds para que el patron sea estable
 * (1 antes que N).
 */
export function cardinalityPattern(relationship: Relationship): string {
  return relationship.participants
    .map((p) => p.cardinality)
    .sort((a, b) => (a === b ? 0 : a === "1" ? -1 : 1))
    .join(":");
}

/** Relaciones en las que participa una entidad. */
export function relationshipsOfEntity(
  model: ConceptualModel,
  entityId: string,
): Relationship[] {
  return model.relationships.filter((relationship) =>
    relationship.participants.some((p) => p.entityId === entityId),
  );
}
