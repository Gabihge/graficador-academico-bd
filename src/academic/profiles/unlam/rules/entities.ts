// Reglas del perfil UNLaM sobre entidades y sus identificadores.

import type { AcademicRule } from "@/academic/types";
import { isBlank, normalizeName } from "../helpers";

const VERSION = "1.0.0";

export const entityRules: AcademicRule[] = [
  {
    id: "unlam.entity.name-required",
    version: VERSION,
    category: "entidad",
    source: "GENERAL",
    severity: "error",
    explanation:
      "Toda entidad debe tener un nombre: es lo que la identifica en el diagrama y lo que dara nombre a su relacion en el modelo relacional.",
    evaluate: (model) =>
      model.entities
        .filter((entity) => isBlank(entity.name))
        .map((entity) => ({
          elementIds: [entity.id],
          message: "La entidad no tiene nombre.",
        })),
  },
  {
    id: "unlam.entity.name-unique",
    version: VERSION,
    category: "entidad",
    source: "PRODUCTO",
    severity: "warning",
    explanation:
      "Dos entidades con el mismo nombre se confunden entre si y generan nombres de relacion ambiguos al transformar a MR.",
    evaluate: (model) => {
      const counts = new Map<string, number>();
      for (const entity of model.entities) {
        if (isBlank(entity.name)) continue;
        const key = normalizeName(entity.name);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      return model.entities
        .filter(
          (entity) =>
            !isBlank(entity.name) && (counts.get(normalizeName(entity.name)) ?? 0) > 1,
        )
        .map((entity) => ({
          elementIds: [entity.id],
          message: `Hay mas de una entidad llamada "${entity.name.trim()}".`,
        }));
    },
  },
  {
    id: "unlam.entity.regular-identifier-required",
    version: VERSION,
    category: "entidad",
    source: "CATEDRA",
    severity: "error",
    explanation:
      "En el perfil de la catedra, toda entidad regular debe tener al menos un atributo identificador (su clave). Excepciones: las entidades debiles (se identifican por su entidad fuerte mas su discriminante) y las subentidades de una jerarquia (heredan el identificador de la supraentidad).",
    evaluate: (model) => {
      const subEntityIds = new Set(
        model.hierarchies.flatMap((hierarchy) => hierarchy.subEntityIds),
      );
      return model.entities
        .filter((entity) => entity.kind === "regular")
        .filter((entity) => !subEntityIds.has(entity.id))
        .filter((entity) => !hasIdentifier(entity.attributes))
        .map((entity) => ({
          elementIds: [entity.id],
          message: `La entidad regular "${entity.name.trim() || "sin nombre"}" no tiene identificador.`,
        }));
    },
  },
];

function hasIdentifier(attributes: { isIdentifier: boolean }[]): boolean {
  return attributes.some((attribute) => attribute.isIdentifier);
}
