// Tipos del motor de reglas academicas. Codigo puro: sin React, sin UI.
//
// Un `RuleProfile` agrupa reglas versionadas (spec seccion 5). Cada regla es
// un objeto autocontenido: NUNCA una regla academica dispersa como `if` en un
// componente generico (.claude/rules/academic.md).
//
// Alcance Incremento 3: solo VALIDACION del DER. El slot de transformacion
// DER -> MR (spec seccion 7) lo agrega el Incremento 4 como un tipo companero,
// sin tocar estas reglas.

import type { ConceptualModel } from "@/domain/conceptual";

/** Procedencia de una regla (spec seccion 5). */
export type RuleSource = "CATEDRA" | "INFORMADA" | "PRODUCTO" | "GENERAL";

export type RuleSeverity = "error" | "warning" | "info";

/** Hallazgo puntual que produce una regla al evaluar un modelo. */
export interface AcademicFinding {
  /** Ids de los elementos del modelo involucrados (el primero es el principal). */
  elementIds: string[];
  message: string;
  /** Override opcional de la severidad de la regla para este caso concreto. */
  severity?: RuleSeverity;
}

/**
 * Regla academica. La "precondicion" de la spec se resuelve dentro de
 * `evaluate`: si la regla no aplica al modelo, devuelve `[]`.
 */
export interface AcademicRule {
  id: string;
  version: string;
  category: string;
  source: RuleSource;
  /** Por que existe la regla, en lenguaje para el estudiante. */
  explanation: string;
  severity: RuleSeverity;
  evaluate: (model: ConceptualModel) => AcademicFinding[];
}

/** Problema concreto reportado tras correr el perfil sobre un modelo. */
export interface AcademicIssue {
  /** Clave estable para React y para deduplicar. */
  id: string;
  ruleId: string;
  ruleVersion: string;
  category: string;
  source: RuleSource;
  severity: RuleSeverity;
  message: string;
  explanation: string;
  elementIds: string[];
}

/** Perfil academico versionado (spec seccion 5). */
export interface RuleProfile {
  id: string;
  version: string;
  label: string;
  rules: AcademicRule[];
}
