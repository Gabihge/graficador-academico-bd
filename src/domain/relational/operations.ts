// Operaciones puras sobre el RelationalModel: cada funcion recibe un modelo y
// devuelve uno nuevo, sin mutar el original (mismo estilo que
// src/domain/conceptual/operations.ts). El store del editor MR
// (src/state/mrEditorStore) las orquesta y se ocupa del historial de
// undo/redo, del `revision`, del `hasManualChanges` y de la persistencia.

import { createForeignKey, createRelationalAttribute } from "./factories";
import type {
  ForeignKey,
  RelationalAttribute,
  RelationalModel,
  RelationSchema,
} from "./types";

export type MoveDirection = "up" | "down";

function mapSchema(
  model: RelationalModel,
  schemaId: string,
  update: (schema: RelationSchema) => RelationSchema,
): RelationalModel {
  return {
    ...model,
    schemas: model.schemas.map((schema) =>
      schema.id === schemaId ? update(schema) : schema,
    ),
  };
}

/** Recorre cada esquema aplicando `update` (para limpiezas globales). */
function mapEverySchema(
  model: RelationalModel,
  update: (schema: RelationSchema) => RelationSchema,
): RelationalModel {
  return { ...model, schemas: model.schemas.map(update) };
}

// --- Esquemas ----------------------------------------------------------

export function addSchema(
  model: RelationalModel,
  schema: RelationSchema,
): RelationalModel {
  return { ...model, schemas: [...model.schemas, schema] };
}

export function renameSchema(
  model: RelationalModel,
  schemaId: string,
  name: string,
): RelationalModel {
  return mapSchema(model, schemaId, (schema) => ({ ...schema, name }));
}

/**
 * Elimina un esquema y, en los demas, quita las FK que lo referenciaban (y los
 * atributos locales que solo servian a esas FK quedan como atributos comunes;
 * no se borran para no perder datos silenciosamente).
 */
export function removeSchema(
  model: RelationalModel,
  schemaId: string,
): RelationalModel {
  return {
    ...model,
    schemas: model.schemas
      .filter((schema) => schema.id !== schemaId)
      .map((schema) => ({
        ...schema,
        foreignKeys: schema.foreignKeys.filter((fk) => fk.targetRelationId !== schemaId),
      })),
  };
}

// --- Atributos ----------------------------------------------------------

export function addAttribute(
  model: RelationalModel,
  schemaId: string,
  attribute: RelationalAttribute = createRelationalAttribute(),
): RelationalModel {
  return mapSchema(model, schemaId, (schema) => ({
    ...schema,
    attributes: [...schema.attributes, attribute],
  }));
}

export function renameAttribute(
  model: RelationalModel,
  attributeId: string,
  name: string,
): RelationalModel {
  return mapEverySchema(model, (schema) => ({
    ...schema,
    attributes: schema.attributes.map((attribute) =>
      attribute.id === attributeId ? { ...attribute, name } : attribute,
    ),
  }));
}

/**
 * Elimina un atributo: lo saca del esquema, de su `primaryKey` y de cualquier
 * FK (local o destino); las FK que quedan sin columnas se descartan.
 */
export function removeAttribute(
  model: RelationalModel,
  attributeId: string,
): RelationalModel {
  const cleanFk = (fk: ForeignKey): ForeignKey | null => {
    const localIndex = fk.localAttributeIds.indexOf(attributeId);
    const targetIndex = fk.targetAttributeIds.indexOf(attributeId);
    if (localIndex === -1 && targetIndex === -1) return fk;
    // Se quita el par completo (la posicion i empareja local[i] con target[i]).
    const drop = localIndex !== -1 ? localIndex : targetIndex;
    const localAttributeIds = fk.localAttributeIds.filter((_, i) => i !== drop);
    const targetAttributeIds = fk.targetAttributeIds.filter((_, i) => i !== drop);
    if (localAttributeIds.length === 0) return null;
    return { ...fk, localAttributeIds, targetAttributeIds };
  };

  return mapEverySchema(model, (schema) => ({
    ...schema,
    attributes: schema.attributes.filter((attribute) => attribute.id !== attributeId),
    primaryKey: schema.primaryKey.filter((id) => id !== attributeId),
    foreignKeys: schema.foreignKeys
      .map(cleanFk)
      .filter((fk): fk is ForeignKey => fk !== null),
  }));
}

export function moveAttribute(
  model: RelationalModel,
  schemaId: string,
  attributeId: string,
  direction: MoveDirection,
): RelationalModel {
  return mapSchema(model, schemaId, (schema) => {
    const index = schema.attributes.findIndex((a) => a.id === attributeId);
    if (index === -1) return schema;
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= schema.attributes.length) return schema;
    const attributes = [...schema.attributes];
    const [moved] = attributes.splice(index, 1);
    attributes.splice(target, 0, moved!);
    return { ...schema, attributes };
  });
}

export function setAttributeInPrimaryKey(
  model: RelationalModel,
  schemaId: string,
  attributeId: string,
  inPk: boolean,
): RelationalModel {
  return mapSchema(model, schemaId, (schema) => {
    const has = schema.primaryKey.includes(attributeId);
    if (inPk === has) return schema;
    return {
      ...schema,
      primaryKey: inPk
        ? [...schema.primaryKey, attributeId]
        : schema.primaryKey.filter((id) => id !== attributeId),
    };
  });
}

// --- Claves foraneas ------------------------------------------------

/**
 * Agrega una FK de `ownerSchemaId` hacia `targetSchemaId` con columnas por
 * defecto = PK del destino: por cada atributo PK del destino se crea un
 * atributo local con el mismo nombre (o prefijado si colisiona).
 */
export function addForeignKey(
  model: RelationalModel,
  ownerSchemaId: string,
  targetSchemaId: string,
): RelationalModel {
  const target = model.schemas.find((s) => s.id === targetSchemaId);
  if (!target || ownerSchemaId === targetSchemaId) return model;

  return mapSchema(model, ownerSchemaId, (owner) => {
    const newAttributes: RelationalAttribute[] = [];
    const localIds: string[] = [];
    for (const targetAttrId of target.primaryKey) {
      const targetName =
        target.attributes.find((a) => a.id === targetAttrId)?.name ?? "id";
      const taken =
        owner.attributes.some((a) => a.name === targetName) ||
        newAttributes.some((a) => a.name === targetName);
      const attribute = createRelationalAttribute(
        taken ? `${target.name}_${targetName}` : targetName,
      );
      newAttributes.push(attribute);
      localIds.push(attribute.id);
    }
    const fk = createForeignKey(localIds, target.id, [...target.primaryKey]);
    return {
      ...owner,
      attributes: [...owner.attributes, ...newAttributes],
      foreignKeys: [...owner.foreignKeys, fk],
    };
  });
}

export interface ForeignKeyPair {
  localAttributeId: string;
  targetAttributeId: string;
}

export function setForeignKeyColumns(
  model: RelationalModel,
  foreignKeyId: string,
  pairs: ForeignKeyPair[],
): RelationalModel {
  return mapEverySchema(model, (schema) => ({
    ...schema,
    foreignKeys: schema.foreignKeys.map((fk) =>
      fk.id === foreignKeyId
        ? {
            ...fk,
            localAttributeIds: pairs.map((p) => p.localAttributeId),
            targetAttributeIds: pairs.map((p) => p.targetAttributeId),
          }
        : fk,
    ),
  }));
}

export function setForeignKeyTarget(
  model: RelationalModel,
  foreignKeyId: string,
  targetSchemaId: string,
): RelationalModel {
  return mapEverySchema(model, (schema) => ({
    ...schema,
    foreignKeys: schema.foreignKeys.map((fk) =>
      fk.id === foreignKeyId
        ? { ...fk, targetRelationId: targetSchemaId, targetAttributeIds: [] }
        : fk,
    ),
  }));
}

export function removeForeignKey(
  model: RelationalModel,
  foreignKeyId: string,
): RelationalModel {
  return mapEverySchema(model, (schema) => ({
    ...schema,
    foreignKeys: schema.foreignKeys.filter((fk) => fk.id !== foreignKeyId),
  }));
}

// --- Consultas -------------------------------------------------------

export function findRelationalAttribute(
  model: RelationalModel,
  attributeId: string,
): { attribute: RelationalAttribute; schemaId: string } | null {
  for (const schema of model.schemas) {
    const attribute = schema.attributes.find((a) => a.id === attributeId);
    if (attribute) return { attribute, schemaId: schema.id };
  }
  return null;
}

export function findForeignKey(
  model: RelationalModel,
  foreignKeyId: string,
): { foreignKey: ForeignKey; schemaId: string } | null {
  for (const schema of model.schemas) {
    const foreignKey = schema.foreignKeys.find((fk) => fk.id === foreignKeyId);
    if (foreignKey) return { foreignKey, schemaId: schema.id };
  }
  return null;
}

/** Ids de elementos que son nodos del canvas (para podar layout/seleccion). */
export function collectRelationalElementIds(model: RelationalModel): string[] {
  const ids: string[] = [];
  for (const schema of model.schemas) {
    ids.push(schema.id);
    for (const attribute of schema.attributes) ids.push(attribute.id);
    for (const fk of schema.foreignKeys) ids.push(fk.id);
  }
  return ids;
}
