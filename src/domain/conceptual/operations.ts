// Operaciones puras sobre el ConceptualModel: cada funcion recibe un modelo y
// devuelve uno nuevo, sin mutar el original (mismo estilo que
// src/domain/project/tree.ts). El store del editor (src/state/derEditorStore)
// las orquesta y se ocupa del historial de undo/redo, del `revision` y de la
// persistencia.

import { createAttribute, createParticipant } from "./factories";
import type {
  AttributeKind,
  AttributeOwnerKind,
  CardinalityBound,
  ConceptualAttribute,
  ConceptualModel,
  Entity,
  EntityKind,
  Hierarchy,
  HierarchyOverlap,
  HierarchyPartition,
  Participation,
  Relationship,
  RelationshipDegree,
} from "./types";

/**
 * Cantidad de participantes que espera una relacion segun su grado. La unaria
 * (grado 1) es el caso especial: dos participantes a la misma entidad,
 * distinguidos por rol (spec 7.6).
 */
export function expectedParticipantCount(degree: RelationshipDegree): number {
  return degree === 1 ? 2 : degree;
}

// --- helpers internos ---------------------------------------------------

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

function mapHierarchy(
  model: ConceptualModel,
  hierarchyId: string,
  update: (hierarchy: Hierarchy) => Hierarchy,
): ConceptualModel {
  return {
    ...model,
    hierarchies: model.hierarchies.map((hierarchy) =>
      hierarchy.id === hierarchyId ? update(hierarchy) : hierarchy,
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

/** Recorre todos los atributos del modelo (incluyendo componentes) aplicando `patch`. */
function mapEveryAttribute(
  model: ConceptualModel,
  patch: (attribute: ConceptualAttribute) => ConceptualAttribute,
): ConceptualModel {
  const walk = (attributes: ConceptualAttribute[]): ConceptualAttribute[] =>
    attributes.map((attribute) => {
      const patched = patch(attribute);
      if (patched.components) {
        return { ...patched, components: walk(patched.components) };
      }
      return patched;
    });
  return {
    ...model,
    entities: model.entities.map((entity) => ({
      ...entity,
      attributes: walk(entity.attributes),
    })),
    relationships: model.relationships.map((relationship) => ({
      ...relationship,
      attributes: walk(relationship.attributes),
    })),
  };
}

// --- Entidades -------------------------------------------------------------

export function addEntity(model: ConceptualModel, entity: Entity): ConceptualModel {
  return { ...model, entities: [...model.entities, entity] };
}

/**
 * Elimina una entidad y limpia lo que la referenciaba: participantes de
 * relacion y referencias de jerarquia (supra/sub). Las relaciones y
 * jerarquias afectadas NO se borran: quedan incompletas y la validacion las
 * marca hasta que el usuario las reconecte.
 */
export function removeEntity(model: ConceptualModel, entityId: string): ConceptualModel {
  return {
    ...model,
    entities: model.entities.filter((entity) => entity.id !== entityId),
    relationships: model.relationships.map((relationship) => ({
      ...relationship,
      participants: relationship.participants.filter((p) => p.entityId !== entityId),
    })),
    hierarchies: model.hierarchies.map((hierarchy) => ({
      ...hierarchy,
      superEntityId: hierarchy.superEntityId === entityId ? "" : hierarchy.superEntityId,
      subEntityIds: hierarchy.subEntityIds.filter((id) => id !== entityId),
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

export function setEntityKind(
  model: ConceptualModel,
  entityId: string,
  kind: EntityKind,
): ConceptualModel {
  return mapEntity(model, entityId, (entity) => ({ ...entity, kind }));
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

export function setRelationshipDegree(
  model: ConceptualModel,
  relationshipId: string,
  degree: RelationshipDegree,
): ConceptualModel {
  return mapRelationship(model, relationshipId, (relationship) => ({
    ...relationship,
    degree,
  }));
}

export function setRelationshipIdentifying(
  model: ConceptualModel,
  relationshipId: string,
  identifying: boolean,
): ConceptualModel {
  return mapRelationship(model, relationshipId, (relationship) => ({
    ...relationship,
    identifying,
  }));
}

/**
 * Conecta una entidad a una relacion agregando un participante con valores por
 * defecto (cardinalidad "N", participacion "partial"). Respeta el grado: la
 * relacion binaria/ternaria no admite mas participantes que su grado ni la
 * misma entidad dos veces; la unaria (grado 1) admite exactamente dos
 * participantes a la misma entidad.
 */
export function connect(
  model: ConceptualModel,
  relationshipId: string,
  entityId: string,
): ConceptualModel {
  return mapRelationship(model, relationshipId, (relationship) => {
    const limit = expectedParticipantCount(relationship.degree);
    if (relationship.participants.length >= limit) return relationship;
    const alreadyConnected = relationship.participants.some((p) => p.entityId === entityId);
    if (alreadyConnected && relationship.degree !== 1) return relationship;
    return {
      ...relationship,
      participants: [...relationship.participants, createParticipant(entityId)],
    };
  });
}

export function disconnect(
  model: ConceptualModel,
  relationshipId: string,
  participantId: string,
): ConceptualModel {
  return mapRelationship(model, relationshipId, (relationship) => ({
    ...relationship,
    participants: relationship.participants.filter((p) => p.id !== participantId),
  }));
}

function mapParticipant(
  model: ConceptualModel,
  relationshipId: string,
  participantId: string,
  update: (
    participant: Relationship["participants"][number],
  ) => Relationship["participants"][number],
): ConceptualModel {
  return mapRelationship(model, relationshipId, (relationship) => ({
    ...relationship,
    participants: relationship.participants.map((p) =>
      p.id === participantId ? update(p) : p,
    ),
  }));
}

export function setParticipantCardinality(
  model: ConceptualModel,
  relationshipId: string,
  participantId: string,
  cardinality: CardinalityBound,
): ConceptualModel {
  return mapParticipant(model, relationshipId, participantId, (p) => ({ ...p, cardinality }));
}

export function setParticipantParticipation(
  model: ConceptualModel,
  relationshipId: string,
  participantId: string,
  participation: Participation,
): ConceptualModel {
  return mapParticipant(model, relationshipId, participantId, (p) => ({ ...p, participation }));
}

export function setParticipantRole(
  model: ConceptualModel,
  relationshipId: string,
  participantId: string,
  role: string,
): ConceptualModel {
  const trimmed = role.trim();
  return mapParticipant(model, relationshipId, participantId, (p) => ({
    ...p,
    role: trimmed.length > 0 ? trimmed : undefined,
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

/** Elimina un atributo (o componente) por id, en cualquier nivel. */
export function removeAttribute(
  model: ConceptualModel,
  attributeId: string,
): ConceptualModel {
  const strip = (attributes: ConceptualAttribute[]): ConceptualAttribute[] =>
    attributes
      .filter((attribute) => attribute.id !== attributeId)
      .map((attribute) =>
        attribute.components
          ? { ...attribute, components: strip(attribute.components) }
          : attribute,
      );
  return {
    ...model,
    entities: model.entities.map((entity) => ({
      ...entity,
      attributes: strip(entity.attributes),
    })),
    relationships: model.relationships.map((relationship) => ({
      ...relationship,
      attributes: strip(relationship.attributes),
    })),
    hierarchies: model.hierarchies.map((hierarchy) =>
      hierarchy.discriminatorAttributeId === attributeId
        ? { ...hierarchy, discriminatorAttributeId: undefined }
        : hierarchy,
    ),
  };
}

export function renameAttribute(
  model: ConceptualModel,
  attributeId: string,
  name: string,
): ConceptualModel {
  return mapEveryAttribute(model, (attribute) =>
    attribute.id === attributeId ? { ...attribute, name } : attribute,
  );
}

export function setAttributeIdentifier(
  model: ConceptualModel,
  attributeId: string,
  isIdentifier: boolean,
): ConceptualModel {
  return mapEveryAttribute(model, (attribute) =>
    attribute.id === attributeId ? { ...attribute, isIdentifier } : attribute,
  );
}

export function setAttributeDiscriminator(
  model: ConceptualModel,
  attributeId: string,
  isDiscriminator: boolean,
): ConceptualModel {
  return mapEveryAttribute(model, (attribute) =>
    attribute.id === attributeId
      ? { ...attribute, isDiscriminator: isDiscriminator || undefined }
      : attribute,
  );
}

/**
 * Cambia el tipo de un atributo. Al pasar a "composite" se crea el arreglo
 * `components`; al salir de "composite" se descarta (sus componentes dejan de
 * existir). Solo aplica a atributos de primer nivel, no a componentes.
 */
export function setAttributeKind(
  model: ConceptualModel,
  attributeId: string,
  kind: AttributeKind,
): ConceptualModel {
  return mapOwnerAttributesEverywhere(model, (attribute) => {
    if (attribute.id !== attributeId) return attribute;
    if (kind === "composite") {
      return { ...attribute, kind, components: attribute.components ?? [] };
    }
    const next = { ...attribute, kind };
    delete next.components;
    return next;
  });
}

/** Como mapEveryAttribute pero solo en el primer nivel (no desciende a componentes). */
function mapOwnerAttributesEverywhere(
  model: ConceptualModel,
  patch: (attribute: ConceptualAttribute) => ConceptualAttribute,
): ConceptualModel {
  return {
    ...model,
    entities: model.entities.map((entity) => ({
      ...entity,
      attributes: entity.attributes.map(patch),
    })),
    relationships: model.relationships.map((relationship) => ({
      ...relationship,
      attributes: relationship.attributes.map(patch),
    })),
  };
}

export function addComponent(
  model: ConceptualModel,
  compositeAttributeId: string,
  component: ConceptualAttribute = createAttribute(),
): ConceptualModel {
  return mapOwnerAttributesEverywhere(model, (attribute) =>
    attribute.id === compositeAttributeId && attribute.kind === "composite"
      ? { ...attribute, components: [...(attribute.components ?? []), component] }
      : attribute,
  );
}

// (removeComponent / renameComponent reutilizan removeAttribute / renameAttribute,
// que ya operan a cualquier nivel.)
export const removeComponent = removeAttribute;
export const renameComponent = renameAttribute;

// --- Jerarquias ------------------------------------------------------

export function addHierarchy(model: ConceptualModel, hierarchy: Hierarchy): ConceptualModel {
  return { ...model, hierarchies: [...model.hierarchies, hierarchy] };
}

export function removeHierarchy(
  model: ConceptualModel,
  hierarchyId: string,
): ConceptualModel {
  return {
    ...model,
    hierarchies: model.hierarchies.filter((hierarchy) => hierarchy.id !== hierarchyId),
  };
}

export function renameHierarchy(
  model: ConceptualModel,
  hierarchyId: string,
  name: string,
): ConceptualModel {
  return mapHierarchy(model, hierarchyId, (hierarchy) => ({ ...hierarchy, name }));
}

export function setHierarchySuper(
  model: ConceptualModel,
  hierarchyId: string,
  superEntityId: string,
): ConceptualModel {
  return mapHierarchy(model, hierarchyId, (hierarchy) => ({
    ...hierarchy,
    superEntityId,
    subEntityIds: hierarchy.subEntityIds.filter((id) => id !== superEntityId),
  }));
}

export function addHierarchySub(
  model: ConceptualModel,
  hierarchyId: string,
  entityId: string,
): ConceptualModel {
  return mapHierarchy(model, hierarchyId, (hierarchy) => {
    if (hierarchy.superEntityId === entityId) return hierarchy;
    if (hierarchy.subEntityIds.includes(entityId)) return hierarchy;
    return { ...hierarchy, subEntityIds: [...hierarchy.subEntityIds, entityId] };
  });
}

export function removeHierarchySub(
  model: ConceptualModel,
  hierarchyId: string,
  entityId: string,
): ConceptualModel {
  return mapHierarchy(model, hierarchyId, (hierarchy) => ({
    ...hierarchy,
    subEntityIds: hierarchy.subEntityIds.filter((id) => id !== entityId),
  }));
}

export function setHierarchyPartition(
  model: ConceptualModel,
  hierarchyId: string,
  partition: HierarchyPartition,
): ConceptualModel {
  return mapHierarchy(model, hierarchyId, (hierarchy) => clearDiscriminatorIfNeeded({ ...hierarchy, partition }));
}

export function setHierarchyOverlap(
  model: ConceptualModel,
  hierarchyId: string,
  overlap: HierarchyOverlap,
): ConceptualModel {
  return mapHierarchy(model, hierarchyId, (hierarchy) => clearDiscriminatorIfNeeded({ ...hierarchy, overlap }));
}

export function setHierarchyDiscriminator(
  model: ConceptualModel,
  hierarchyId: string,
  discriminatorAttributeId: string | undefined,
): ConceptualModel {
  return mapHierarchy(model, hierarchyId, (hierarchy) => ({
    ...hierarchy,
    discriminatorAttributeId: discriminatorAttributeId || undefined,
  }));
}

/**
 * El discriminante de jerarquia solo se admite con particion total y
 * solapamiento exclusivo (convencion de catedra, spec 6.6). Si la combinacion
 * deja de admitirlo, se limpia para no dejar un estado invalido silencioso.
 */
function clearDiscriminatorIfNeeded(hierarchy: Hierarchy): Hierarchy {
  const allowed = hierarchy.partition === "total" && hierarchy.overlap === "exclusive";
  return allowed ? hierarchy : { ...hierarchy, discriminatorAttributeId: undefined };
}

// --- Consultas -------------------------------------------------------

interface AttributeLocation {
  attribute: ConceptualAttribute;
  ownerKind: AttributeOwnerKind;
  ownerId: string;
  /** Definido si el atributo es un componente de otro atributo compuesto. */
  parentAttributeId?: string;
}

/** Localiza un atributo por id, en primer nivel o como componente. */
export function findAttribute(
  model: ConceptualModel,
  attributeId: string,
): AttributeLocation | null {
  const search = (
    attributes: ConceptualAttribute[],
    ownerKind: AttributeOwnerKind,
    ownerId: string,
  ): AttributeLocation | null => {
    for (const attribute of attributes) {
      if (attribute.id === attributeId) return { attribute, ownerKind, ownerId };
      for (const component of attribute.components ?? []) {
        if (component.id === attributeId) {
          return { attribute: component, ownerKind, ownerId, parentAttributeId: attribute.id };
        }
      }
    }
    return null;
  };
  for (const entity of model.entities) {
    const found = search(entity.attributes, "entity", entity.id);
    if (found) return found;
  }
  for (const relationship of model.relationships) {
    const found = search(relationship.attributes, "relationship", relationship.id);
    if (found) return found;
  }
  return null;
}

/** Dueno (entidad o relacion) de un atributo de primer nivel, o null. */
export function findAttributeOwner(
  model: ConceptualModel,
  attributeId: string,
): { kind: AttributeOwnerKind; id: string } | null {
  const location = findAttribute(model, attributeId);
  if (!location) return null;
  return { kind: location.ownerKind, id: location.ownerId };
}

/** Aplana una lista de atributos incluyendo recursivamente sus componentes. */
export function flattenAttributes(
  attributes: ConceptualAttribute[],
): ConceptualAttribute[] {
  const out: ConceptualAttribute[] = [];
  for (const attribute of attributes) {
    out.push(attribute);
    if (attribute.components) out.push(...flattenAttributes(attribute.components));
  }
  return out;
}

/** Todos los ids de elementos que son nodos del canvas (para podar layout/seleccion). */
export function collectElementIds(model: ConceptualModel): string[] {
  const ids: string[] = [];
  const pushAttributes = (attributes: ConceptualAttribute[]): void => {
    for (const attribute of attributes) {
      ids.push(attribute.id);
      if (attribute.components) pushAttributes(attribute.components);
    }
  };
  for (const entity of model.entities) {
    ids.push(entity.id);
    pushAttributes(entity.attributes);
  }
  for (const relationship of model.relationships) {
    ids.push(relationship.id);
    pushAttributes(relationship.attributes);
  }
  for (const hierarchy of model.hierarchies) {
    ids.push(hierarchy.id);
  }
  return ids;
}
