// Operaciones puras sobre el ConceptualModel: cada funcion recibe un modelo y
// devuelve uno nuevo, sin mutar el original (mismo estilo que
// src/domain/project/tree.ts). El store del editor (src/state/derEditorStore)
// las orquesta y se ocupa del historial de undo/redo y de la persistencia.
//
// Alcance Incremento 2: entidad regular, atributo simple, identificador,
// relacion binaria, cardinalidad y participacion. Todo lo demas (entidad
// debil, unarias/ternarias, roles, jerarquias) es Incremento 3.

import { createAttribute } from "./factories";
import type {
  AttributeOwnerKind,
  CardinalityBound,
  ConceptualAttribute,
  ConceptualModel,
  Entity,
  Participation,
  Relationship,
} from "./types";

/** Maximo de extremos de una relacion en el Incremento 2 (relacion binaria). */
export const MAX_RELATIONSHIP_ENDS = 2;

function mapEntity(
  model: ConceptualModel,
  entityId: string,
  update: (entity: Entity) => Entity,
): ConceptualModel {
  return {
    ...model,
    entities: model.entities.map((entity) =>
      entity.id === entityId ? update(entity) : entity,
    ),
  };
}

function mapRelationship(
  model: ConceptualModel,
  relationshipId: string,
  update: (relationship: Relationship) => Relationship,
): ConceptualModel {
  return {
    ...model,
    relationships: model.relationships.map((relationship) =>
      relationship.id === relationshipId ? update(relationship) : relationship,
    ),
  };
}

function mapOwnerAttributes(
  model: ConceptualModel,
  ownerKind: AttributeOwnerKind,
  ownerId: string,
  update: (attributes: ConceptualAttribute[]) => ConceptualAttribute[],
): ConceptualModel {
  if (ownerKind === "entity") {
    return mapEntity(model, ownerId, (entity) => ({
      ...entity,
      attributes: update(entity.attributes),
    }));
  }
  return mapRelationship(model, ownerId, (relationship) => ({
    ...relationship,
    attributes: update(relationship.attributes),
  }));
}

// --- Entidades -------------------------------------------------------------

export function addEntity(model: ConceptualModel, entity: Entity): ConceptualModel {
  return { ...model, entities: [...model.entities, entity] };
}

/**
 * Elimina una entidad y limpia los extremos de relacion que la referenciaban.
 * La relacion afectada NO se borra: queda con un solo extremo y la validacion
 * estructural la marca como incompleta hasta que el usuario la reconecte.
 */
export function removeEntity(model: ConceptualModel, entityId: string): ConceptualModel {
  return {
    entities: model.entities.filter((entity) => entity.id !== entityId),
    relationships: model.relationships.map((relationship) => ({
      ...relationship,
      ends: relationship.ends.filter((end) => end.entityId !== entityId),
    })),
  };
}

export function renameEntity(
  model: ConceptualModel,
  entityId: string,
  name: string,
): ConceptualModel {
  return mapEntity(model, entityId, (entity) => ({ ...entity, name }));
}

// --- Relaciones ----------------------------------------------------------

export function addRelationship(
  model: ConceptualModel,
  relationship: Relationship,
): ConceptualModel {
  return { ...model, relationships: [...model.relationships, relationship] };
}

export function removeRelationship(
  model: ConceptualModel,
  relationshipId: string,
): ConceptualModel {
  return {
    ...model,
    relationships: model.relationships.filter(
      (relationship) => relationship.id !== relationshipId,
    ),
  };
}

export function renameRelationship(
  model: ConceptualModel,
  relationshipId: string,
  name: string,
): ConceptualModel {
  return mapRelationship(model, relationshipId, (relationship) => ({
    ...relationship,
    name,
  }));
}

/**
 * Conecta una entidad a una relacion agregando un extremo con valores por
 * defecto (cardinalidad "N", participacion "partial"). Es no-op si la
 * relacion ya tiene dos extremos o si esa entidad ya esta conectada: las
 * unarias y ternarias son del Incremento 3.
 */
export function connect(
  model: ConceptualModel,
  relationshipId: string,
  entityId: string,
): ConceptualModel {
  return mapRelationship(model, relationshipId, (relationship) => {
    if (relationship.ends.length >= MAX_RELATIONSHIP_ENDS) return relationship;
    if (relationship.ends.some((end) => end.entityId === entityId)) return relationship;
    return {
      ...relationship,
      ends: [
        ...relationship.ends,
        { entityId, cardinality: "N", participation: "partial" },
      ],
    };
  });
}

export function disconnect(
  model: ConceptualModel,
  relationshipId: string,
  entityId: string,
): ConceptualModel {
  return mapRelationship(model, relationshipId, (relationship) => ({
    ...relationship,
    ends: relationship.ends.filter((end) => end.entityId !== entityId),
  }));
}

export function setEndCardinality(
  model: ConceptualModel,
  relationshipId: string,
  entityId: string,
  cardinality: CardinalityBound,
): ConceptualModel {
  return mapRelationship(model, relationshipId, (relationship) => ({
    ...relationship,
    ends: relationship.ends.map((end) =>
      end.entityId === entityId ? { ...end, cardinality } : end,
    ),
  }));
}

export function setEndParticipation(
  model: ConceptualModel,
  relationshipId: string,
  entityId: string,
  participation: Participation,
): ConceptualModel {
  return mapRelationship(model, relationshipId, (relationship) => ({
    ...relationship,
    ends: relationship.ends.map((end) =>
      end.entityId === entityId ? { ...end, participation } : end,
    ),
  }));
}

// --- Atributos ---------------------------------------------------------

export function addAttribute(
  model: ConceptualModel,
  ownerKind: AttributeOwnerKind,
  ownerId: string,
  attribute: ConceptualAttribute = createAttribute(),
): ConceptualModel {
  return mapOwnerAttributes(model, ownerKind, ownerId, (attributes) => [
    ...attributes,
    attribute,
  ]);
}

export function removeAttribute(
  model: ConceptualModel,
  attributeId: string,
): ConceptualModel {
  const strip = (attributes: ConceptualAttribute[]) =>
    attributes.filter((attribute) => attribute.id !== attributeId);
  return {
    entities: model.entities.map((entity) => ({
      ...entity,
      attributes: strip(entity.attributes),
    })),
    relationships: model.relationships.map((relationship) => ({
      ...relationship,
      attributes: strip(relationship.attributes),
    })),
  };
}

function mapAttributeById(
  model: ConceptualModel,
  attributeId: string,
  update: (attribute: ConceptualAttribute) => ConceptualAttribute,
): ConceptualModel {
  const patch = (attributes: ConceptualAttribute[]) =>
    attributes.map((attribute) =>
      attribute.id === attributeId ? update(attribute) : attribute,
    );
  return {
    entities: model.entities.map((entity) => ({
      ...entity,
      attributes: patch(entity.attributes),
    })),
    relationships: model.relationships.map((relationship) => ({
      ...relationship,
      attributes: patch(relationship.attributes),
    })),
  };
}

export function renameAttribute(
  model: ConceptualModel,
  attributeId: string,
  name: string,
): ConceptualModel {
  return mapAttributeById(model, attributeId, (attribute) => ({ ...attribute, name }));
}

export function setAttributeIdentifier(
  model: ConceptualModel,
  attributeId: string,
  isIdentifier: boolean,
): ConceptualModel {
  return mapAttributeById(model, attributeId, (attribute) => ({
    ...attribute,
    isIdentifier,
  }));
}

// --- Consultas -------------------------------------------------------

/** Devuelve el dueno (entidad o relacion) de un atributo, o null si no existe. */
export function findAttributeOwner(
  model: ConceptualModel,
  attributeId: string,
): { kind: AttributeOwnerKind; id: string } | null {
  for (const entity of model.entities) {
    if (entity.attributes.some((attribute) => attribute.id === attributeId)) {
      return { kind: "entity", id: entity.id };
    }
  }
  for (const relationship of model.relationships) {
    if (relationship.attributes.some((attribute) => attribute.id === attributeId)) {
      return { kind: "relationship", id: relationship.id };
    }
  }
  return null;
}

/** Todos los ids de elementos del modelo (entidades, relaciones, atributos). */
export function collectElementIds(model: ConceptualModel): string[] {
  const ids: string[] = [];
  for (const entity of model.entities) {
    ids.push(entity.id);
    for (const attribute of entity.attributes) ids.push(attribute.id);
  }
  for (const relationship of model.relationships) {
    ids.push(relationship.id);
    for (const attribute of relationship.attributes) ids.push(attribute.id);
  }
  return ids;
}
