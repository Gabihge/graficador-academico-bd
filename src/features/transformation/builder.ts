// Acumulador mutable para construir el RelationalModel + la trazabilidad
// durante la transformacion. Uso interno de transform.ts.

import {
  createForeignKey,
  createRelationalAttribute,
  createRelationalModel,
  createSchema,
  type RelationalModel,
  type RelationSchema,
} from "@/domain/relational";
import type { TraceEntry, TransformationTrace } from "@/domain/transformation";
import { TRANSFORM_RULES, type TransformRuleId } from "./rules";

export class MrBuilder {
  readonly model: RelationalModel = createRelationalModel();
  private readonly entries: TraceEntry[] = [];

  addSchema(name: string): RelationSchema {
    const schema = createSchema(name);
    this.model.schemas.push(schema);
    return schema;
  }

  /** Agrega un atributo simple al esquema; devuelve su id. */
  addAttribute(schema: RelationSchema, name: string): string {
    const attribute = createRelationalAttribute(name);
    schema.attributes.push(attribute);
    return attribute.id;
  }

  /** Marca uno o mas atributos como parte de la PK (sin duplicar). */
  addToPrimaryKey(schema: RelationSchema, attributeIds: string[]): void {
    for (const id of attributeIds) {
      if (!schema.primaryKey.includes(id)) schema.primaryKey.push(id);
    }
  }

  /**
   * Crea una FK en `owner` hacia la PK de `target`: por cada atributo PK del
   * destino agrega un atributo local (mismo nombre; si colisiona, prefijado) y
   * arma el objeto ForeignKey. Devuelve los ids de los atributos locales.
   */
  addForeignKeyToPk(
    owner: RelationSchema,
    target: RelationSchema,
    prefix?: string,
    forcePrefix = false,
  ): string[] {
    if (target.primaryKey.length === 0) return [];
    const localIds: string[] = [];
    for (const targetAttrId of target.primaryKey) {
      const targetName =
        target.attributes.find((a) => a.id === targetAttrId)?.name ?? "id";
      const taken = owner.attributes.some((a) => a.name === targetName);
      const localName =
        forcePrefix || taken
          ? `${(prefix && prefix.trim()) || target.name}_${targetName}`
          : targetName;
      localIds.push(this.addAttribute(owner, localName));
    }
    owner.foreignKeys.push(
      createForeignKey(localIds, target.id, [...target.primaryKey]),
    );
    return localIds;
  }

  trace(
    ruleId: TransformRuleId,
    params: {
      sourceElementIds: string[];
      targetKind: TraceEntry["targetKind"];
      targetId: string;
      severity?: TraceEntry["severity"];
      note?: string;
    },
  ): void {
    this.entries.push({
      id: crypto.randomUUID(),
      ruleId,
      ruleTitle: TRANSFORM_RULES[ruleId].title,
      sourceElementIds: params.sourceElementIds,
      targetKind: params.targetKind,
      targetId: params.targetId,
      severity: params.severity ?? "info",
      note: params.note,
    });
  }

  buildTrace(): TransformationTrace {
    return { entries: this.entries };
  }
}
