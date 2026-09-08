// Convenciones de transformacion DER -> MR del perfil UNLaM, version 1.0.0.
// Ver el detalle y la justificacion en docs/ACADEMIC_RULES.md
// ("Convenciones de transformacion versionadas").

import type { TransformConventions } from "@/academic/transform-types";

export const UNLAM_TRANSFORM_CONVENTIONS_VERSION = "1.0.0";

export const unlamTransformConventions: TransformConventions = {
  id: "unlam-bd",
  version: UNLAM_TRANSFORM_CONVENTIONS_VERSION,
  // 7.2: la FK va en el extremo de participacion parcial, hacia el total.
  oneToOneFkSide: "partial-side",
  oneToOneTieBreak: "second-participant",
  // 7.12: PK = FK al extremo N + FK al primer extremo 1.
  ternary11nPk: "n-side-plus-first-one-side",
  // 7.13: PK = FK a participants[0] + FK a participants[1].
  ternary111Pk: "first-two-participants",
  // 7.14: una tabla por entidad; las subentidades llevan la PK de la
  // supraentidad como PK+FK.
  hierarchyStrategy: "table-per-entity",
  // 7.15: se conserva el atributo y se advierte; no se inventa transformacion.
  derivedAttributePolicy: "keep-with-warning",
  mrPresentation: { pk: "underline", fk: "bold", pkfk: "underline+bold" },
};
