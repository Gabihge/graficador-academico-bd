// Motor que corre un RuleProfile sobre un ConceptualModel. Independiente del
// renderer (spec seccion 8): entra un modelo semantico, salen problemas.

import type { ConceptualModel } from "@/domain/conceptual";
import type { AcademicIssue, RuleProfile, RuleSeverity } from "./types";

const SEVERITY_ORDER: Record<RuleSeverity, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

export const SEVERITY_LABELS: Record<RuleSeverity, string> = {
  error: "Error",
  warning: "Advertencia",
  info: "Informacion",
};

/**
 * Evalua todas las reglas del perfil y devuelve los problemas ordenados por
 * severidad (errores primero) y, dentro de cada severidad, por orden de
 * declaracion de las reglas.
 */
export function runProfile(
  model: ConceptualModel,
  profile: RuleProfile,
): AcademicIssue[] {
  const issues: AcademicIssue[] = [];

  for (const rule of profile.rules) {
    let findings;
    try {
      findings = rule.evaluate(model);
    } catch {
      // Una regla que revienta no debe tumbar toda la validacion.
      continue;
    }
    for (const finding of findings) {
      const severity = finding.severity ?? rule.severity;
      issues.push({
        id: `${rule.id}#${finding.elementIds.join(",")}`,
        ruleId: rule.id,
        ruleVersion: rule.version,
        category: rule.category,
        source: rule.source,
        severity,
        message: finding.message,
        explanation: rule.explanation,
        elementIds: finding.elementIds,
      });
    }
  }

  return issues.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}

/** true si el modelo no tiene ningun problema de severidad "error" bajo el perfil. */
export function isModelValid(model: ConceptualModel, profile: RuleProfile): boolean {
  return !runProfile(model, profile).some((issue) => issue.severity === "error");
}
