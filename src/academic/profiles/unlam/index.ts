// Perfil academico UNLaM - Bases de Datos (3636), version 1.0.0.
//
// Reune las reglas (spec seccion 5) del perfil. Notacion visual vigente: Chen
// (ver docs/ACADEMIC_RULES.md), pero este perfil NO define dibujo: define que
// es VALIDO. Otras notaciones (Incremento 10) no condicionan estas reglas.
//
// Fuentes de cada regla:
// - CATEDRA: material de la catedra (spec seccion 41);
// - INFORMADA: convencion observada de la cursada, desacoplable;
// - PRODUCTO: decision de esta app;
// - GENERAL: integridad del modelo, independiente de la catedra.

import type { RuleProfile } from "@/academic/types";
import { entityRules } from "./rules/entities";
import { attributeRules } from "./rules/attributes";
import { relationshipRules } from "./rules/relationships";
import { weakEntityRules } from "./rules/weak-entities";
import { hierarchyRules } from "./rules/hierarchies";

export const UNLAM_PROFILE_ID = "unlam-bd";
export const UNLAM_PROFILE_VERSION = "1.0.0";

export const unlamProfile: RuleProfile = {
  id: UNLAM_PROFILE_ID,
  version: UNLAM_PROFILE_VERSION,
  label: "UNLaM - Bases de Datos",
  rules: [
    ...entityRules,
    ...attributeRules,
    ...relationshipRules,
    ...weakEntityRules,
    ...hierarchyRules,
  ],
};
