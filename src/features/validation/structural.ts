// Validacion ESTRUCTURAL minima del ConceptualModel (Incremento 2).
//
// Esto NO es la validacion academica de la catedra: comprueba integridad del
// modelo (nombres presentes, relaciones binarias bien formadas, referencias
// consistentes), no convenciones UNLaM. La validacion academica vive en un
// `RuleProfile` versionado (src/academic/profiles/unlam) y llega en el
// Incremento 3, tal como ya anticipan docs/ACADEMIC_RULES.md e
// docs/INCREMENTOS.md. Por eso aca no hay ninguna regla de catedra como `if`
// suelto: solo chequeos de forma del grafo.

import { MAX_RELATIONSHIP_ENDS, type ConceptualModel } from "@/domain/conceptual";

export type Severity = "error" | "warning" | "info";

export interface ValidationIssue {
  /** Clave estable para listar en React y para deduplicar. */
  id: string;
  severity: Severity;
  message: string;
  targetKind: "entity" | "relationship" | "attribute" | "model";
  /** Elemento al que apunta el problema; null cuando es del modelo entero. */
  targetId: string | null;
}

export const SEVERITY_LABELS: Record<Severity, string> = {
  error: "Error",
  warning: "Advertencia",
  info: "Informacion",
};

/** Orden de severidad para presentacion: errores primero. */
export const SEVERITY_ORDER: Record<Severity, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("es");
}

/**
 * Analiza el modelo y devuelve la lista de problemas estructurales, ordenada
 * por severidad (errores, luego advertencias, luego info).
 */
export function validateStructure(model: ConceptualModel): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const entityIds = new Set(model.entities.map((entity) => entity.id));

  if (model.entities.length === 0) {
    issues.push({
      id: "model:empty",
      severity: "info",
      message: "El diagrama esta vacio: agrega al menos una entidad.",
      targetKind: "model",
      targetId: null,
    });
  }

  // Entidades con nombre repetido (case-insensitive).
  const entityNameCounts = new Map<string, number>();
  for (const entity of model.entities) {
    if (isBlank(entity.name)) continue;
    const key = normalize(entity.name);
    entityNameCounts.set(key, (entityNameCounts.get(key) ?? 0) + 1);
  }

  for (const entity of model.entities) {
    if (isBlank(entity.name)) {
      issues.push({
        id: `entity:${entity.id}:name`,
        severity: "error",
        message: "La entidad no tiene nombre.",
        targetKind: "entity",
        targetId: entity.id,
      });
    } else if ((entityNameCounts.get(normalize(entity.name)) ?? 0) > 1) {
      issues.push({
        id: `entity:${entity.id}:duplicate-name`,
        severity: "warning",
        message: `Hay mas de una entidad llamada "${entity.name.trim()}".`,
        targetKind: "entity",
        targetId: entity.id,
      });
    }

    const hasIdentifier = entity.attributes.some((attribute) => attribute.isIdentifier);
    if (!hasIdentifier) {
      issues.push({
        id: `entity:${entity.id}:no-identifier`,
        severity: "warning",
        message: `La entidad "${entity.name.trim() || "sin nombre"}" no tiene identificador.`,
        targetKind: "entity",
        targetId: entity.id,
      });
    }

    collectAttributeIssues(entity.attributes, `entity:${entity.id}`, issues);
  }

  for (const relationship of model.relationships) {
    const label = relationship.name.trim() || "sin nombre";

    if (isBlank(relationship.name)) {
      issues.push({
        id: `relationship:${relationship.id}:name`,
        severity: "error",
        message: "La relacion no tiene nombre.",
        targetKind: "relationship",
        targetId: relationship.id,
      });
    }

    if (relationship.ends.length !== MAX_RELATIONSHIP_ENDS) {
      issues.push({
        id: `relationship:${relationship.id}:arity`,
        severity: "error",
        message: `La relacion "${label}" debe conectar exactamente dos entidades (tiene ${relationship.ends.length}).`,
        targetKind: "relationship",
        targetId: relationship.id,
      });
    }

    const seenEntities = new Set<string>();
    for (const end of relationship.ends) {
      if (!entityIds.has(end.entityId)) {
        issues.push({
          id: `relationship:${relationship.id}:end:${end.entityId}:missing`,
          severity: "error",
          message: `La relacion "${label}" apunta a una entidad que no existe.`,
          targetKind: "relationship",
          targetId: relationship.id,
        });
      }
      if (seenEntities.has(end.entityId)) {
        issues.push({
          id: `relationship:${relationship.id}:self`,
          severity: "error",
          message: `La relacion "${label}" conecta dos veces la misma entidad (las relaciones unarias llegan en el Incremento 3).`,
          targetKind: "relationship",
          targetId: relationship.id,
        });
      }
      seenEntities.add(end.entityId);
    }

    collectAttributeIssues(relationship.attributes, `relationship:${relationship.id}`, issues);
  }

  return issues.sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );
}

function collectAttributeIssues(
  attributes: { id: string; name: string }[],
  ownerKey: string,
  issues: ValidationIssue[],
): void {
  const nameCounts = new Map<string, number>();
  for (const attribute of attributes) {
    if (isBlank(attribute.name)) continue;
    const key = normalize(attribute.name);
    nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
  }

  for (const attribute of attributes) {
    if (isBlank(attribute.name)) {
      issues.push({
        id: `${ownerKey}:attribute:${attribute.id}:name`,
        severity: "error",
        message: "Hay un atributo sin nombre.",
        targetKind: "attribute",
        targetId: attribute.id,
      });
    } else if ((nameCounts.get(normalize(attribute.name)) ?? 0) > 1) {
      issues.push({
        id: `${ownerKey}:attribute:${attribute.id}:duplicate-name`,
        severity: "warning",
        message: `El atributo "${attribute.name.trim()}" esta repetido en el mismo elemento.`,
        targetKind: "attribute",
        targetId: attribute.id,
      });
    }
  }
}

/** true si el modelo no tiene ningun problema de severidad "error". */
export function isStructurallyValid(model: ConceptualModel): boolean {
  return !validateStructure(model).some((issue) => issue.severity === "error");
}
