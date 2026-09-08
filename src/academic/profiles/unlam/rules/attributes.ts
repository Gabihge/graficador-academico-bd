// Reglas del perfil UNLaM sobre atributos (spec 6.2, 8).

import type { AcademicRule, AcademicFinding } from "@/academic/types";
import type { ConceptualAttribute } from "@/domain/conceptual";
import { flattenAttributes, isBlank, normalizeName } from "../helpers";

const VERSION = "1.0.0";

/** Recorre cada atributo del modelo con el contexto de su dueno. */
function forEachAttribute(
  model: Parameters<AcademicRule["evaluate"]>[0],
  visit: (attribute: ConceptualAttribute, ownerLabel: string) => AcademicFinding[],
): AcademicFinding[] {
  const findings: AcademicFinding[] = [];
  for (const entity of model.entities) {
    for (const attribute of flattenAttributes(entity.attributes)) {
      findings.push(...visit(attribute, `la entidad "${entity.name.trim() || "sin nombre"}"`));
    }
  }
  for (const relationship of model.relationships) {
    for (const attribute of flattenAttributes(relationship.attributes)) {
      findings.push(
        ...visit(attribute, `la relacion "${relationship.name.trim() || "sin nombre"}"`),
      );
    }
  }
  return findings;
}

export const attributeRules: AcademicRule[] = [
  {
    id: "unlam.attribute.name-required",
    version: VERSION,
    category: "atributo",
    source: "GENERAL",
    severity: "error",
    explanation: "Un atributo sin nombre no se puede transformar ni interpretar.",
    evaluate: (model) =>
      forEachAttribute(model, (attribute) =>
        isBlank(attribute.name)
          ? [{ elementIds: [attribute.id], message: "Hay un atributo sin nombre." }]
          : [],
      ),
  },
  {
    id: "unlam.attribute.name-unique-per-owner",
    version: VERSION,
    category: "atributo",
    source: "PRODUCTO",
    severity: "warning",
    explanation:
      "Dos atributos con el mismo nombre en la misma entidad o relacion son indistinguibles.",
    evaluate: (model) => {
      const findings: AcademicFinding[] = [];
      const check = (attributes: ConceptualAttribute[]) => {
        const counts = new Map<string, number>();
        for (const attribute of attributes) {
          if (isBlank(attribute.name)) continue;
          const key = normalizeName(attribute.name);
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        for (const attribute of attributes) {
          if (isBlank(attribute.name)) continue;
          if ((counts.get(normalizeName(attribute.name)) ?? 0) > 1) {
            findings.push({
              elementIds: [attribute.id],
              message: `El atributo "${attribute.name.trim()}" esta repetido en el mismo elemento.`,
            });
          }
        }
      };
      for (const entity of model.entities) check(entity.attributes);
      for (const relationship of model.relationships) check(relationship.attributes);
      return findings;
    },
  },
  {
    id: "unlam.attribute.composite-needs-components",
    version: VERSION,
    category: "atributo",
    source: "CATEDRA",
    severity: "error",
    explanation:
      "Un atributo compuesto se representa como un agrupador conectado a sus componentes: sin componentes no es compuesto.",
    evaluate: (model) =>
      forEachAttribute(model, (attribute, ownerLabel) =>
        attribute.kind === "composite" && (attribute.components ?? []).length === 0
          ? [
              {
                elementIds: [attribute.id],
                message: `El atributo compuesto "${attribute.name.trim() || "sin nombre"}" de ${ownerLabel} no tiene componentes.`,
              },
            ]
          : [],
      ),
  },
  {
    id: "unlam.attribute.non-composite-has-components",
    version: VERSION,
    category: "atributo",
    source: "GENERAL",
    severity: "warning",
    explanation:
      "Solo los atributos compuestos tienen componentes. Si el atributo no es compuesto, sus componentes se ignoran.",
    evaluate: (model) =>
      forEachAttribute(model, (attribute) =>
        attribute.kind !== "composite" && (attribute.components ?? []).length > 0
          ? [
              {
                elementIds: [attribute.id],
                message: `El atributo "${attribute.name.trim() || "sin nombre"}" tiene componentes pero no es compuesto.`,
              },
            ]
          : [],
      ),
  },
  {
    id: "unlam.attribute.identifier-should-be-simple",
    version: VERSION,
    category: "atributo",
    source: "CATEDRA",
    severity: "warning",
    explanation:
      "El identificador de una entidad se forma con atributos simples. Un atributo multivaluado o derivado no puede formar parte de la clave.",
    evaluate: (model) =>
      forEachAttribute(model, (attribute) =>
        attribute.isIdentifier &&
        (attribute.kind === "multivalued" || attribute.kind === "derived")
          ? [
              {
                elementIds: [attribute.id],
                message: `El atributo "${attribute.name.trim() || "sin nombre"}" es ${attribute.kind === "multivalued" ? "multivaluado" : "derivado"} y no deberia integrar el identificador.`,
              },
            ]
          : [],
      ),
  },
];
