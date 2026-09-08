// Validacion del DER para la UI. Desde el Incremento 3 corre el `RuleProfile`
// UNLaM completo (src/academic): integridad de modelo (reglas GENERAL) +
// convenciones de catedra (CATEDRA / INFORMADA). Reemplaza a la validacion
// "estructural minima" del Incremento 2.

import type { ConceptualModel, ConceptualElementKind } from "@/domain/conceptual";
import {
  isModelValid,
  runProfile,
  unlamProfile,
  type AcademicIssue,
} from "@/academic";

export type { AcademicIssue } from "@/academic";
export { SEVERITY_LABELS } from "@/academic";
export type Severity = AcademicIssue["severity"];

/** Corre el perfil academico por defecto (UNLaM) sobre un DER. */
export function validateDer(model: ConceptualModel): AcademicIssue[] {
  return runProfile(model, unlamProfile);
}

/** true si el DER no tiene ningun problema de severidad "error" bajo el perfil UNLaM. */
export function isDerValid(model: ConceptualModel): boolean {
  return isModelValid(model, unlamProfile);
}

/** Tipo de elemento (para navegar desde un issue hacia el Inspector). */
export function elementKindOf(
  model: ConceptualModel,
  id: string,
): ConceptualElementKind | null {
  if (model.entities.some((entity) => entity.id === id)) return "entity";
  if (model.relationships.some((relationship) => relationship.id === id)) return "relationship";
  if (model.hierarchies.some((hierarchy) => hierarchy.id === id)) return "hierarchy";
  const hasAttribute = (attributes: { id: string; components?: unknown[] }[]): boolean =>
    attributes.some(
      (attribute) =>
        attribute.id === id ||
        hasAttribute((attribute.components as { id: string }[] | undefined) ?? []),
    );
  for (const entity of model.entities) {
    if (hasAttribute(entity.attributes)) return "attribute";
  }
  for (const relationship of model.relationships) {
    if (hasAttribute(relationship.attributes)) return "attribute";
  }
  return null;
}
