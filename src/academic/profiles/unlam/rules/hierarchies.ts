// Reglas del perfil UNLaM sobre jerarquias de generalizacion/especializacion
// (spec 6.6, 7.14, 8).

import type { AcademicRule, AcademicFinding } from "@/academic/types";
import { entityById, flattenAttributes } from "../helpers";

const VERSION = "1.0.0";

export const hierarchyRules: AcademicRule[] = [
  {
    id: "unlam.hierarchy.super-required",
    version: VERSION,
    category: "jerarquia",
    source: "CATEDRA",
    severity: "error",
    explanation:
      "Una jerarquia necesita una supraentidad: es la entidad general de la que las subentidades son casos particulares.",
    evaluate: (model) =>
      model.hierarchies
        .filter((hierarchy) => hierarchy.superEntityId.trim().length === 0)
        .map((hierarchy) => ({
          elementIds: [hierarchy.id],
          message: "La jerarquia no tiene supraentidad.",
        })),
  },
  {
    id: "unlam.hierarchy.subentities-required",
    version: VERSION,
    category: "jerarquia",
    source: "CATEDRA",
    severity: "error",
    explanation:
      "Una jerarquia sin subentidades no aporta informacion. Con una sola subentidad tampoco hay especializacion real: se esperan al menos dos.",
    evaluate: (model) => {
      const findings: AcademicFinding[] = [];
      for (const hierarchy of model.hierarchies) {
        if (hierarchy.subEntityIds.length === 0) {
          findings.push({
            elementIds: [hierarchy.id],
            message: "La jerarquia no tiene subentidades.",
          });
        } else if (hierarchy.subEntityIds.length === 1) {
          findings.push({
            elementIds: [hierarchy.id],
            severity: "warning",
            message: "La jerarquia tiene una sola subentidad; se esperan al menos dos.",
          });
        }
      }
      return findings;
    },
  },
  {
    id: "unlam.hierarchy.refs-exist",
    version: VERSION,
    category: "jerarquia",
    source: "GENERAL",
    severity: "error",
    explanation: "La jerarquia no puede referenciar entidades que no existen en el modelo.",
    evaluate: (model) => {
      const findings: AcademicFinding[] = [];
      for (const hierarchy of model.hierarchies) {
        if (
          hierarchy.superEntityId.trim().length > 0 &&
          !entityById(model, hierarchy.superEntityId)
        ) {
          findings.push({
            elementIds: [hierarchy.id],
            message: "La supraentidad de la jerarquia no existe.",
          });
        }
        for (const subId of hierarchy.subEntityIds) {
          if (!entityById(model, subId)) {
            findings.push({
              elementIds: [hierarchy.id],
              message: "Una subentidad de la jerarquia no existe.",
            });
          }
        }
      }
      return findings;
    },
  },
  {
    id: "unlam.hierarchy.super-not-sub",
    version: VERSION,
    category: "jerarquia",
    source: "GENERAL",
    severity: "error",
    explanation: "Una entidad no puede ser a la vez la supraentidad y una subentidad de la misma jerarquia.",
    evaluate: (model) =>
      model.hierarchies
        .filter((hierarchy) => hierarchy.subEntityIds.includes(hierarchy.superEntityId))
        .map((hierarchy) => ({
          elementIds: [hierarchy.id],
          message: "La supraentidad tambien figura como subentidad de la jerarquia.",
        })),
  },
  {
    id: "unlam.hierarchy.discriminator-combination",
    version: VERSION,
    category: "jerarquia",
    source: "CATEDRA",
    severity: "error",
    explanation:
      "Segun el material de catedra, el atributo discriminante de una jerarquia solo corresponde al caso de particion total y sin solapamiento (exclusiva).",
    evaluate: (model) =>
      model.hierarchies
        .filter((hierarchy) => hierarchy.discriminatorAttributeId)
        .filter(
          (hierarchy) =>
            !(hierarchy.partition === "total" && hierarchy.overlap === "exclusive"),
        )
        .map((hierarchy) => ({
          elementIds: [hierarchy.id],
          message:
            "La jerarquia tiene discriminante en una combinacion no admitida (solo se permite con particion total y exclusiva).",
        })),
  },
  {
    id: "unlam.hierarchy.discriminator-exists",
    version: VERSION,
    category: "jerarquia",
    source: "GENERAL",
    severity: "error",
    explanation: "El atributo discriminante indicado debe existir en la supraentidad de la jerarquia.",
    evaluate: (model) => {
      const findings: AcademicFinding[] = [];
      for (const hierarchy of model.hierarchies) {
        const discriminatorId = hierarchy.discriminatorAttributeId;
        if (!discriminatorId) continue;
        const superEntity = entityById(model, hierarchy.superEntityId);
        const attrs = superEntity ? flattenAttributes(superEntity.attributes) : [];
        if (!attrs.some((attribute) => attribute.id === discriminatorId)) {
          findings.push({
            elementIds: [hierarchy.id],
            message: "El atributo discriminante de la jerarquia no pertenece a la supraentidad.",
          });
        }
      }
      return findings;
    },
  },
];
