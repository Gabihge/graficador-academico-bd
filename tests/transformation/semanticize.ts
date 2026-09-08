// Normaliza un RelationalModel a una forma comparable por SEMANTICA, no por
// ids ni orden (spec seccion 26: "comparar por semantica, no por IDs aleatorios
// o coordenadas").

import type { RelationalModel, RelationSchema } from "@/domain/relational";

export interface SemForeignKey {
  /** Pares [nombre atributo local, nombre atributo destino], ordenados. */
  columns: [string, string][];
  target: string;
}

export interface SemSchema {
  name: string;
  attributes: string[];
  primaryKey: string[];
  foreignKeys: SemForeignKey[];
}

function attrName(schema: RelationSchema, id: string): string {
  return schema.attributes.find((a) => a.id === id)?.name ?? "?";
}

export function semanticize(model: RelationalModel): SemSchema[] {
  const nameById = new Map(model.schemas.map((s) => [s.id, s.name]));

  return model.schemas
    .map((schema): SemSchema => {
      const targetOf = (relationId: string) => nameById.get(relationId) ?? "?";
      const targetSchemaById = new Map(model.schemas.map((s) => [s.id, s]));

      const foreignKeys = schema.foreignKeys
        .map((fk): SemForeignKey => {
          const targetSchema = targetSchemaById.get(fk.targetRelationId);
          const columns = fk.localAttributeIds
            .map(
              (localId, index): [string, string] => [
                attrName(schema, localId),
                targetSchema
                  ? attrName(targetSchema, fk.targetAttributeIds[index] ?? "")
                  : "?",
              ],
            )
            .sort((a, b) => a[0].localeCompare(b[0]));
          return { columns, target: targetOf(fk.targetRelationId) };
        })
        .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));

      return {
        name: schema.name,
        attributes: [...schema.attributes.map((a) => a.name)].sort(),
        primaryKey: schema.primaryKey.map((id) => attrName(schema, id)).sort(),
        foreignKeys,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Helper para escribir fixtures esperados de forma compacta. */
export function schema(
  name: string,
  attributes: string[],
  primaryKey: string[],
  foreignKeys: SemForeignKey[] = [],
): SemSchema {
  return {
    name,
    attributes: [...attributes].sort(),
    primaryKey: [...primaryKey].sort(),
    foreignKeys: foreignKeys
      .map(
        (foreignKey): SemForeignKey => ({
          columns: [...foreignKey.columns].sort((a, b) => a[0].localeCompare(b[0])),
          target: foreignKey.target,
        }),
      )
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
  };
}

export function fk(target: string, columns: [string, string][]): SemForeignKey {
  return { columns, target };
}
