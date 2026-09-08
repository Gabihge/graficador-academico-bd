// Migracion / normalizacion del ConceptualModel. Convierte cualquier forma
// previamente persistida (por ejemplo la del Incremento 2, con
// `Relationship.ends` y sin `Entity.kind`) a la forma canonica actual.
//
// Se aplica al LEER de Dexie (ver src/infrastructure/persistence/derDocumentRepo).
// No se usa una version nueva de Dexie porque el keyPath de la tabla no
// cambia: solo cambia la forma del valor, que Dexie no valida.

import { createParticipant } from "./factories";
import type {
  AttributeKind,
  CardinalityBound,
  ConceptualAttribute,
  ConceptualModel,
  Entity,
  Hierarchy,
  Participation,
  Relationship,
  RelationshipDegree,
  RelationshipParticipant,
} from "./types";

type UnknownRecord = Record<string, unknown>;

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asBool(value: unknown): boolean {
  return value === true;
}

function migrateAttribute(raw: unknown): ConceptualAttribute {
  const record = (raw ?? {}) as UnknownRecord;
  const kind = ["simple", "composite", "multivalued", "derived"].includes(
    record.kind as string,
  )
    ? (record.kind as AttributeKind)
    : "simple";
  const attribute: ConceptualAttribute = {
    id: asString(record.id) || crypto.randomUUID(),
    name: asString(record.name, "atributo"),
    kind,
    isIdentifier: asBool(record.isIdentifier),
  };
  if (asBool(record.isDiscriminator)) attribute.isDiscriminator = true;
  if (kind === "composite") {
    attribute.components = asArray(record.components).map(migrateAttribute);
  }
  return attribute;
}

function migrateParticipant(raw: unknown): RelationshipParticipant {
  const record = (raw ?? {}) as UnknownRecord;
  const cardinality: CardinalityBound = record.cardinality === "1" ? "1" : "N";
  const participation: Participation =
    record.participation === "total" ? "total" : "partial";
  const role = asString(record.role).trim();
  const participant = createParticipant(asString(record.entityId));
  return {
    ...participant,
    id: asString(record.id) || participant.id,
    cardinality,
    participation,
    ...(role.length > 0 ? { role } : {}),
  };
}

function migrateEntity(raw: unknown): Entity {
  const record = (raw ?? {}) as UnknownRecord;
  return {
    id: asString(record.id) || crypto.randomUUID(),
    name: asString(record.name, "Entidad"),
    kind: record.kind === "weak" ? "weak" : "regular",
    attributes: asArray(record.attributes).map(migrateAttribute),
  };
}

function migrateRelationship(raw: unknown): Relationship {
  const record = (raw ?? {}) as UnknownRecord;
  // Incremento 2 usaba `ends: { entityId, cardinality, participation }[]`.
  const rawParticipants = Array.isArray(record.participants)
    ? record.participants
    : asArray(record.ends);
  const participants = rawParticipants.map(migrateParticipant);
  const degreeRaw = Number(record.degree);
  const degree: RelationshipDegree =
    degreeRaw === 1 || degreeRaw === 3 ? (degreeRaw as RelationshipDegree) : 2;
  const relationship: Relationship = {
    id: asString(record.id) || crypto.randomUUID(),
    name: asString(record.name, "Relacion"),
    degree,
    participants,
    attributes: asArray(record.attributes).map(migrateAttribute),
  };
  if (asBool(record.identifying)) relationship.identifying = true;
  return relationship;
}

function migrateHierarchy(raw: unknown): Hierarchy {
  const record = (raw ?? {}) as UnknownRecord;
  const hierarchy: Hierarchy = {
    id: asString(record.id) || crypto.randomUUID(),
    name: asString(record.name, "Jerarquia"),
    superEntityId: asString(record.superEntityId),
    subEntityIds: asArray(record.subEntityIds).map((id) => asString(id)).filter(Boolean),
    partition: record.partition === "total" ? "total" : "partial",
    overlap: record.overlap === "overlapping" ? "overlapping" : "exclusive",
  };
  const discriminator = asString(record.discriminatorAttributeId).trim();
  if (discriminator.length > 0) hierarchy.discriminatorAttributeId = discriminator;
  return hierarchy;
}

/**
 * Normaliza un modelo conceptual de cualquier version previa a la forma actual.
 * Es idempotente: aplicarla a un modelo ya canonico lo devuelve equivalente.
 */
export function migrateConceptualModel(raw: unknown): ConceptualModel {
  const record = (raw ?? {}) as UnknownRecord;
  return {
    entities: asArray(record.entities).map(migrateEntity),
    relationships: asArray(record.relationships).map(migrateRelationship),
    hierarchies: asArray(record.hierarchies).map(migrateHierarchy),
    revision: Number.isFinite(Number(record.revision)) ? Number(record.revision) : 0,
  };
}
