// Motor determinista de transformacion DER -> MR (spec 7 y 10).
//
// Recorre el ConceptualModel en el orden de sus arrays y produce un
// RelationalModel + una TransformationTrace + la MrDerivation. Las decisiones
// parametrizadas (ubicacion de FK en 1:1, composicion de PK en ternarias,
// jerarquias, atributos derivados) provienen de `TransformConventions`
// (src/academic), nunca de un `if` suelto aca.
//
// Determinismo: mismos ids de entrada -> mismo MR salvo por los uuid generados
// (los tests comparan por semantica, no por ids).

import type {
  ConceptualAttribute,
  ConceptualModel,
  Entity,
  Relationship,
  RelationshipParticipant,
} from "@/domain/conceptual";
import type { RelationalModel, RelationSchema } from "@/domain/relational";
import type { MrDerivation, TransformationTrace } from "@/domain/transformation";
import type { TransformConventions } from "@/academic";
import { MrBuilder } from "./builder";

export interface TransformOptions {
  conventions: TransformConventions;
  ruleProfileId: string;
  ruleProfileVersion: string;
  sourceDocumentId: string;
  sourceRevision: number;
}

export interface TransformResult {
  relational: RelationalModel;
  trace: TransformationTrace;
  derivation: MrDerivation;
}

export function transformDerToMr(
  model: ConceptualModel,
  options: TransformOptions,
): TransformResult {
  const b = new MrBuilder();
  const schemaByEntityId = new Map<string, RelationSchema>();
  const multivaluedQueue: { owner: Entity; attribute: ConceptualAttribute }[] = [];

  // --- Fase 1: entidades regulares -> esquema base (7.1, 7.7, 7.15) ---------
  for (const entity of model.entities) {
    if (entity.kind !== "regular") continue;
    const schema = b.addSchema(entity.name);
    schemaByEntityId.set(entity.id, schema);
    b.trace("7.1", {
      sourceElementIds: [entity.id],
      targetKind: "schema",
      targetId: schema.id,
    });
    addEntityAttributes(b, schema, entity, entity.attributes, multivaluedQueue);
  }

  // --- Fase 1b: atributos multivaluados -> esquema propio (7.8) ------------
  for (const { owner, attribute } of multivaluedQueue) {
    const ownerSchema = schemaByEntityId.get(owner.id);
    if (!ownerSchema) continue;
    const schema = b.addSchema(`${owner.name}_${attribute.name}`);
    const fkIds = b.addForeignKeyToPk(schema, ownerSchema, owner.name);
    const valueId = b.addAttribute(schema, attribute.name);
    b.addToPrimaryKey(schema, [...fkIds, valueId]);
    b.trace("7.8", {
      sourceElementIds: [attribute.id, owner.id],
      targetKind: "schema",
      targetId: schema.id,
      note: "El atributo multivaluado se convierte en un esquema propio con la clave de la entidad como FK y parte de la PK.",
    });
  }

  // --- Fase 2: entidades debiles (7.9) -----------------------------------
  for (const entity of model.entities) {
    if (entity.kind !== "weak") continue;
    const schema = b.addSchema(entity.name);
    schemaByEntityId.set(entity.id, schema);
    b.trace("7.9", {
      sourceElementIds: [entity.id],
      targetKind: "schema",
      targetId: schema.id,
    });

    const pkIds: string[] = [];

    // FK heredada(s) desde la(s) entidad(es) fuerte(s) via relacion identificadora.
    for (const relationship of model.relationships) {
      if (relationship.identifying !== true) continue;
      if (!relationship.participants.some((p) => p.entityId === entity.id)) continue;
      for (const participant of relationship.participants) {
        if (participant.entityId === entity.id) continue;
        const strongSchema = schemaByEntityId.get(participant.entityId);
        if (!strongSchema) continue;
        const fkIds = b.addForeignKeyToPk(schema, strongSchema, participant.role);
        pkIds.push(...fkIds);
        b.trace("7.9", {
          sourceElementIds: [entity.id, relationship.id, participant.entityId],
          targetKind: "foreignKey",
          targetId: schema.foreignKeys[schema.foreignKeys.length - 1]!.id,
          note: "La FK heredada de la entidad fuerte integra la PK de la entidad debil.",
        });
      }
    }

    // Discriminante(s) + atributos propios.
    for (const attribute of flattenForRelational(entity.attributes)) {
      if (attribute.kind === "multivalued") {
        multivaluedQueue.push({ owner: entity, attribute });
        continue;
      }
      const attrId = b.addAttribute(schema, attribute.name);
      if (attribute.isDiscriminator) {
        pkIds.push(attrId);
      } else if (attribute.isIdentifier) {
        pkIds.push(attrId);
      }
      if (attribute.kind === "derived") {
        b.trace("7.15", {
          sourceElementIds: [attribute.id],
          targetKind: "attribute",
          targetId: attrId,
          severity: "warning",
          note: "Atributo derivado/calculado: se conserva como atributo comun; no hay una regla de transformacion inequivoca de la catedra.",
        });
      }
    }
    b.addToPrimaryKey(schema, pkIds);
  }

  // --- Fase 3: relaciones -------------------------------------------------
  for (const relationship of model.relationships) {
    // Las relaciones identificadoras de una entidad debil ya se consumieron.
    if (
      relationship.identifying === true &&
      relationship.participants.some(
        (p) => model.entities.find((e) => e.id === p.entityId)?.kind === "weak",
      )
    ) {
      continue;
    }
    if (relationship.degree === 2) transformBinary(b, model, relationship, schemaByEntityId);
    else if (relationship.degree === 1) transformUnary(b, relationship, schemaByEntityId);
    else transformTernary(b, model, relationship, schemaByEntityId, options.conventions);
  }

  // --- Fase 4: jerarquias (7.14) ---------------------------------------
  for (const hierarchy of model.hierarchies) {
    const superSchema = schemaByEntityId.get(hierarchy.superEntityId);
    if (!superSchema || superSchema.primaryKey.length === 0) continue;
    for (const subId of hierarchy.subEntityIds) {
      const subSchema = schemaByEntityId.get(subId);
      if (!subSchema) continue;
      const fkIds = b.addForeignKeyToPk(subSchema, superSchema);
      // Convencion table-per-entity: la PK de la subentidad ES la PK heredada
      // (PK + FK a la supraentidad).
      subSchema.primaryKey = [...fkIds];
      b.trace("7.14", {
        sourceElementIds: [hierarchy.id, hierarchy.superEntityId, subId],
        targetKind: "schema",
        targetId: subSchema.id,
        note: "table-per-entity: la subentidad lleva el identificador de la supraentidad como PK + FK.",
      });
    }
  }

  const derivation: MrDerivation = {
    generatedFromDocumentId: options.sourceDocumentId,
    generatedFromRevision: options.sourceRevision,
    ruleProfileId: options.ruleProfileId,
    ruleProfileVersion: options.ruleProfileVersion,
    transformConventionsVersion: options.conventions.version,
    isDerived: true,
    hasManualChanges: false,
    generatedAt: new Date().toISOString(),
  };

  return { relational: b.model, trace: b.buildTrace(), derivation };
}

// --- helpers de atributos ---------------------------------------------

/** Aplana atributos compuestos (7.7); deja multivaluados y derivados como estan. */
function flattenForRelational(
  attributes: ConceptualAttribute[],
): ConceptualAttribute[] {
  const out: ConceptualAttribute[] = [];
  for (const attribute of attributes) {
    if (attribute.kind === "composite") {
      out.push(...flattenForRelational(attribute.components ?? []));
    } else {
      out.push(attribute);
    }
  }
  return out;
}

function addEntityAttributes(
  b: MrBuilder,
  schema: RelationSchema,
  entity: Entity,
  attributes: ConceptualAttribute[],
  multivaluedQueue: { owner: Entity; attribute: ConceptualAttribute }[],
): void {
  const pkIds: string[] = [];
  for (const raw of attributes) {
    if (raw.kind === "composite") {
      addEntityAttributes(b, schema, entity, raw.components ?? [], multivaluedQueue);
      b.trace("7.7", {
        sourceElementIds: [raw.id],
        targetKind: "schema",
        targetId: schema.id,
        note: "El agrupador compuesto se elimina; sus componentes pasan a ser atributos.",
      });
      continue;
    }
    if (raw.kind === "multivalued") {
      multivaluedQueue.push({ owner: entity, attribute: raw });
      continue;
    }
    const attrId = b.addAttribute(schema, raw.name);
    if (raw.isIdentifier) pkIds.push(attrId);
    if (raw.kind === "derived") {
      b.trace("7.15", {
        sourceElementIds: [raw.id],
        targetKind: "attribute",
        targetId: attrId,
        severity: "warning",
        note: "Atributo derivado/calculado: se conserva como atributo comun; no hay una regla de transformacion inequivoca de la catedra.",
      });
    }
  }
  b.addToPrimaryKey(schema, pkIds);
}

/** Agrega los atributos propios de una relacion a un esquema (7.4/7.10 etc.). */
function addRelationshipAttributes(
  b: MrBuilder,
  schema: RelationSchema,
  relationship: Relationship,
): void {
  const pkIds: string[] = [];
  for (const raw of flattenForRelational(relationship.attributes)) {
    if (raw.kind === "multivalued") {
      const attrId = b.addAttribute(schema, raw.name);
      b.trace("7.8", {
        sourceElementIds: [raw.id, relationship.id],
        targetKind: "attribute",
        targetId: attrId,
        severity: "warning",
        note: "Atributo multivaluado en una relacion: se conserva como atributo comun (caso poco frecuente).",
      });
      continue;
    }
    const attrId = b.addAttribute(schema, raw.name);
    if (raw.isIdentifier) pkIds.push(attrId);
  }
  b.addToPrimaryKey(schema, pkIds);
}

// --- binarias --------------------------------------------------------

function transformBinary(
  b: MrBuilder,
  model: ConceptualModel,
  relationship: Relationship,
  schemaByEntityId: Map<string, RelationSchema>,
): void {
  const [p0, p1] = relationship.participants;
  if (!p0 || !p1) return;
  const s0 = schemaByEntityId.get(p0.entityId);
  const s1 = schemaByEntityId.get(p1.entityId);
  if (!s0 || !s1) return;

  const nn = p0.cardinality === "N" && p1.cardinality === "N";
  const oneOne = p0.cardinality === "1" && p1.cardinality === "1";

  if (nn) {
    // 7.4: esquema puente con FK de ambas entidades; la union forma la PK.
    const schema = b.addSchema(relationship.name);
    const fk0 = b.addForeignKeyToPk(schema, s0, p0.role ?? entityName(model, p0));
    const fk1 = b.addForeignKeyToPk(schema, s1, p1.role ?? entityName(model, p1));
    b.addToPrimaryKey(schema, [...fk0, ...fk1]);
    addRelationshipAttributes(b, schema, relationship);
    b.trace("7.4", {
      sourceElementIds: [relationship.id, p0.entityId, p1.entityId],
      targetKind: "schema",
      targetId: schema.id,
    });
    return;
  }

  if (oneOne) {
    // 7.2: la FK va en el extremo de participacion parcial (hacia el total);
    // si empatan, en el segundo participante.
    const fkOnP1 =
      p1.participation === "partial" && p0.participation === "total"
        ? true
        : p0.participation === "partial" && p1.participation === "total"
          ? false
          : true; // desempate: second-participant
    const owner = fkOnP1 ? s1 : s0;
    const target = fkOnP1 ? s0 : s1;
    const ownerParticipant = fkOnP1 ? p1 : p0;
    b.addForeignKeyToPk(owner, target, ownerParticipant.role);
    b.trace("7.2", {
      sourceElementIds: [relationship.id, p0.entityId, p1.entityId],
      targetKind: "foreignKey",
      targetId: owner.foreignKeys[owner.foreignKeys.length - 1]!.id,
      note:
        p0.participation === p1.participation
          ? p0.participation === "total"
            ? "Participacion total/total: tambien seria valido fusionar ambas entidades en una sola tabla. Se ubica la FK en el segundo participante por convencion."
            : "Participacion parcial/parcial: tambien seria valido usar una tabla puente. Se ubica la FK en el segundo participante por convencion."
          : "La FK se ubica en el extremo de participacion parcial y referencia al extremo de participacion total.",
    });
    return;
  }

  // 7.3: 1:N. En notacion Chen, el participante con cardinalidad "1" relaciona
  // cada instancia con una sola del otro lado: ese es el esquema que recibe la
  // FK, que referencia al participante con cardinalidad "N".
  const fkHolder = p0.cardinality === "1" ? p0 : p1;
  const referenced = p0.cardinality === "1" ? p1 : p0;
  const holderSchema = schemaByEntityId.get(fkHolder.entityId)!;
  const referencedSchema = schemaByEntityId.get(referenced.entityId)!;
  b.addForeignKeyToPk(holderSchema, referencedSchema, referenced.role);
  addRelationshipAttributes(b, holderSchema, relationship);
  b.trace("7.3", {
    sourceElementIds: [relationship.id, referenced.entityId, fkHolder.entityId],
    targetKind: "foreignKey",
    targetId: holderSchema.foreignKeys[holderSchema.foreignKeys.length - 1]!.id,
    note: "La PK del extremo referenciado viaja como FK al esquema del extremo con cardinalidad 1.",
  });
}

// --- unarias --------------------------------------------------------

function transformUnary(
  b: MrBuilder,
  relationship: Relationship,
  schemaByEntityId: Map<string, RelationSchema>,
): void {
  const [p0, p1] = relationship.participants;
  if (!p0 || !p1) return;
  const schema = schemaByEntityId.get(p0.entityId);
  if (!schema) return;

  const nn = p0.cardinality === "N" && p1.cardinality === "N";
  if (nn) {
    // 7.6: nueva relacion; la clave de la entidad participa dos veces, por rol.
    // Ambas columnas se prefijan por rol para que sean inequivocas.
    const rel = b.addSchema(relationship.name);
    const fk0 = b.addForeignKeyToPk(rel, schema, p0.role ?? "origen", true);
    const fk1 = b.addForeignKeyToPk(rel, schema, p1.role ?? "destino", true);
    b.addToPrimaryKey(rel, [...fk0, ...fk1]);
    addRelationshipAttributes(b, rel, relationship);
    b.trace("7.6", {
      sourceElementIds: [relationship.id, p0.entityId],
      targetKind: "schema",
      targetId: rel.id,
      note: "Unaria N:N: la clave de la entidad aparece dos veces, prefijada por cada rol.",
    });
    return;
  }

  // 7.5: FK autorreferenciada en el esquema de la entidad; el nombre de la
  // columna usa el rol del participante con cardinalidad "1" (a quien se
  // apunta); si ambos son "1", el primero.
  const onePart = p0.cardinality === "1" ? p0 : p1;
  b.addForeignKeyToPk(schema, schema, onePart.role ?? "ref");
  b.trace("7.5", {
    sourceElementIds: [relationship.id, p0.entityId],
    targetKind: "foreignKey",
    targetId: schema.foreignKeys[schema.foreignKeys.length - 1]!.id,
    note: "Unaria 1:1 / 1:N: FK autorreferenciada; se conservan los roles para distinguir origen y destino.",
  });
}

// --- ternarias -----------------------------------------------------

function transformTernary(
  b: MrBuilder,
  model: ConceptualModel,
  relationship: Relationship,
  schemaByEntityId: Map<string, RelationSchema>,
  conventions: TransformConventions,
): void {
  const parts = relationship.participants;
  const p0 = parts[0];
  const p1 = parts[1];
  const p2 = parts[2];
  if (!p0 || !p1 || !p2 || parts.length !== 3) return;
  const s0 = schemaByEntityId.get(p0.entityId);
  const s1 = schemaByEntityId.get(p1.entityId);
  const s2 = schemaByEntityId.get(p2.entityId);
  if (!s0 || !s1 || !s2) return;

  const schema = b.addSchema(relationship.name);
  const fk0 = b.addForeignKeyToPk(schema, s0, p0.role ?? entityName(model, p0));
  const fk1 = b.addForeignKeyToPk(schema, s1, p1.role ?? entityName(model, p1));
  const fk2 = b.addForeignKeyToPk(schema, s2, p2.role ?? entityName(model, p2));
  const fkByParticipant = [fk0, fk1, fk2];
  const nCount = parts.filter((p) => p.cardinality === "N").length;

  let pk: string[];
  let ruleId: "7.10" | "7.11" | "7.12" | "7.13";
  let note: string | undefined;

  if (nCount === 3) {
    ruleId = "7.10";
    pk = [...fk0, ...fk1, ...fk2];
  } else if (nCount === 2) {
    ruleId = "7.11";
    pk = parts.flatMap((p, i) => (p.cardinality === "N" ? fkByParticipant[i]! : []));
  } else if (nCount === 1) {
    ruleId = "7.12";
    const nIndex = parts.findIndex((p) => p.cardinality === "N");
    const firstOneIndex = parts.findIndex((p) => p.cardinality === "1");
    pk = [...fkByParticipant[nIndex]!, ...fkByParticipant[firstOneIndex]!];
    note =
      conventions.ternary11nPk === "n-side-plus-first-one-side"
        ? "1:1:N: la PK combina la clave del extremo N con la del primer extremo 1. El otro par tambien seria una clave candidata valida."
        : undefined;
  } else {
    ruleId = "7.13";
    pk = [...fk0, ...fk1];
    note =
      "1:1:1: se elige la clave con el par (participante 1, participante 2). Los otros pares son igual de validos; el modo guiado (Incremento 7) expondra la eleccion.";
  }

  b.addToPrimaryKey(schema, pk);
  addRelationshipAttributes(b, schema, relationship);
  b.trace(ruleId, {
    sourceElementIds: [relationship.id, p0.entityId, p1.entityId, p2.entityId],
    targetKind: "schema",
    targetId: schema.id,
    note,
  });
}

function entityName(model: ConceptualModel, participant: RelationshipParticipant): string {
  return model.entities.find((e) => e.id === participant.entityId)?.name ?? "ref";
}
