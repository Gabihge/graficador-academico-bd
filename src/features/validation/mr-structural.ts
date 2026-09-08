// Validacion ESTRUCTURAL minima del RelationalModel (Incremento 5). Comprueba
// integridad del modelo (nombres, referencias, aridad de FK), NO convenciones
// academicas de la catedra (un `RuleProfile` del MR queda pendiente). Casos
// tomados de la lista MR de spec seccion 8.
//
// La referencia circular NO se marca: spec 8 dice explicitamente que es valida
// si es semanticamente correcta.

import {
  attributeName,
  schemaById,
  type RelationalModel,
  type RelationSchema,
} from "@/domain/relational";

export type Severity = "error" | "warning" | "info";

export interface MrIssue {
  id: string;
  severity: Severity;
  message: string;
  /** Elementos del MR involucrados (el primero es el principal). */
  elementIds: string[];
}

export const MR_SEVERITY_LABELS: Record<Severity, string> = {
  error: "Error",
  warning: "Advertencia",
  info: "Informacion",
};

const ORDER: Record<Severity, number> = { error: 0, warning: 1, info: 2 };

function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("es");
}

export function validateMr(model: RelationalModel): MrIssue[] {
  const issues: MrIssue[] = [];

  // Nombres de esquema duplicados.
  const schemaNameCounts = new Map<string, number>();
  for (const schema of model.schemas) {
    if (isBlank(schema.name)) continue;
    const key = normalize(schema.name);
    schemaNameCounts.set(key, (schemaNameCounts.get(key) ?? 0) + 1);
  }

  for (const schema of model.schemas) {
    const label = schema.name.trim() || "sin nombre";

    if (isBlank(schema.name)) {
      issues.push({
        id: `schema:${schema.id}:name`,
        severity: "error",
        message: "La relacion no tiene nombre.",
        elementIds: [schema.id],
      });
    } else if ((schemaNameCounts.get(normalize(schema.name)) ?? 0) > 1) {
      issues.push({
        id: `schema:${schema.id}:dup-name`,
        severity: "warning",
        message: `Hay mas de una relacion llamada "${label}".`,
        elementIds: [schema.id],
      });
    }

    // Atributos duplicados en el mismo esquema.
    const attrCounts = new Map<string, number>();
    for (const attribute of schema.attributes) {
      if (isBlank(attribute.name)) continue;
      attrCounts.set(normalize(attribute.name), (attrCounts.get(normalize(attribute.name)) ?? 0) + 1);
    }
    for (const attribute of schema.attributes) {
      if (isBlank(attribute.name)) {
        issues.push({
          id: `attr:${attribute.id}:name`,
          severity: "error",
          message: `La relacion "${label}" tiene un atributo sin nombre.`,
          elementIds: [attribute.id, schema.id],
        });
      } else if ((attrCounts.get(normalize(attribute.name)) ?? 0) > 1) {
        issues.push({
          id: `attr:${attribute.id}:dup`,
          severity: "error",
          message: `El atributo "${attribute.name.trim()}" esta duplicado en "${label}".`,
          elementIds: [attribute.id, schema.id],
        });
      }
    }

    // PK inexistente cuando corresponda -> advertencia (una relacion sin PK).
    if (schema.attributes.length > 0 && schema.primaryKey.length === 0) {
      issues.push({
        id: `schema:${schema.id}:no-pk`,
        severity: "warning",
        message: `La relacion "${label}" no tiene clave primaria.`,
        elementIds: [schema.id],
      });
    }
    for (const pkId of schema.primaryKey) {
      if (!schema.attributes.some((a) => a.id === pkId)) {
        issues.push({
          id: `schema:${schema.id}:pk-missing:${pkId}`,
          severity: "error",
          message: `La clave primaria de "${label}" referencia un atributo que no existe.`,
          elementIds: [schema.id],
        });
      }
    }

    for (const fk of schema.foreignKeys) {
      collectForeignKeyIssues(model, schema, fk, label, issues);
    }
  }

  return issues.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
}

function collectForeignKeyIssues(
  model: RelationalModel,
  owner: RelationSchema,
  fk: RelationSchema["foreignKeys"][number],
  ownerLabel: string,
  issues: MrIssue[],
): void {
  const target = schemaById(model, fk.targetRelationId);

  if (!target) {
    issues.push({
      id: `fk:${fk.id}:target-missing`,
      severity: "error",
      message: `Una FK de "${ownerLabel}" apunta a una relacion que no existe.`,
      elementIds: [fk.id, owner.id],
    });
    return;
  }

  if (fk.localAttributeIds.length !== fk.targetAttributeIds.length) {
    issues.push({
      id: `fk:${fk.id}:arity`,
      severity: "error",
      message: `Una FK de "${ownerLabel}" -> "${target.name}" tiene distinta cantidad de atributos locales (${fk.localAttributeIds.length}) y de destino (${fk.targetAttributeIds.length}).`,
      elementIds: [fk.id, owner.id],
    });
  }

  for (const localId of fk.localAttributeIds) {
    if (!owner.attributes.some((a) => a.id === localId)) {
      issues.push({
        id: `fk:${fk.id}:local-missing:${localId}`,
        severity: "error",
        message: `Una FK de "${ownerLabel}" usa un atributo local que no existe.`,
        elementIds: [fk.id, owner.id],
      });
    }
  }
  for (const targetId of fk.targetAttributeIds) {
    if (!target.attributes.some((a) => a.id === targetId)) {
      issues.push({
        id: `fk:${fk.id}:target-attr-missing:${targetId}`,
        severity: "error",
        message: `Una FK de "${ownerLabel}" apunta a un atributo inexistente de "${target.name}".`,
        elementIds: [fk.id, owner.id],
      });
    }
  }

  // La FK deberia referenciar exactamente la PK del destino.
  if (fk.localAttributeIds.length > 0) {
    const targetSet = [...fk.targetAttributeIds].sort();
    const pkSet = [...target.primaryKey].sort();
    if (targetSet.length !== pkSet.length || targetSet.some((id, i) => id !== pkSet[i])) {
      const cols = fk.targetAttributeIds.map((id) => attributeName(target, id)).join(", ");
      issues.push({
        id: `fk:${fk.id}:not-pk`,
        severity: "warning",
        message: `Una FK de "${ownerLabel}" referencia (${cols}) de "${target.name}", que no es su clave primaria.`,
        elementIds: [fk.id, owner.id],
      });
    }
  }
}

export function isMrValid(model: RelationalModel): boolean {
  return !validateMr(model).some((issue) => issue.severity === "error");
}

/** Tipo de elemento (para navegar desde un issue hacia el Inspector). */
export function mrElementKindOf(
  model: RelationalModel,
  id: string,
): "schema" | "attribute" | "foreignKey" | null {
  for (const schema of model.schemas) {
    if (schema.id === id) return "schema";
    if (schema.attributes.some((a) => a.id === id)) return "attribute";
    if (schema.foreignKeys.some((fk) => fk.id === id)) return "foreignKey";
  }
  return null;
}
