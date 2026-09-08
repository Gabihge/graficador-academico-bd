// Consultas puras sobre el RelationalModel. El "rol" de un atributo se DERIVA
// aca (spec 15.2): nunca se guarda en el modelo.

import type {
  AttributeRole,
  RelationalModel,
  RelationSchema,
} from "./types";

/** Rol derivado de un atributo dentro de su esquema. */
export function attributeRole(schema: RelationSchema, attributeId: string): AttributeRole {
  const inPk = schema.primaryKey.includes(attributeId);
  const inFk = schema.foreignKeys.some((fk) => fk.localAttributeIds.includes(attributeId));
  if (inPk && inFk) return "pk+fk";
  if (inPk) return "pk";
  if (inFk) return "fk";
  return "plain";
}

export function schemaById(
  model: RelationalModel,
  schemaId: string,
): RelationSchema | undefined {
  return model.schemas.find((schema) => schema.id === schemaId);
}

export function schemaByName(
  model: RelationalModel,
  name: string,
): RelationSchema | undefined {
  return model.schemas.find((schema) => schema.name === name);
}

/** Atributos que integran la PK del esquema, en el orden de `primaryKey`. */
export function pkAttributes(schema: RelationSchema) {
  return schema.primaryKey
    .map((id) => schema.attributes.find((attribute) => attribute.id === id))
    .filter((attribute): attribute is NonNullable<typeof attribute> => Boolean(attribute));
}

/** Nombre de un atributo dentro de un esquema, o `?` si no existe. */
export function attributeName(schema: RelationSchema, attributeId: string): string {
  return schema.attributes.find((attribute) => attribute.id === attributeId)?.name ?? "?";
}
