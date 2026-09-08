// Reglas del perfil UNLaM sobre entidades debiles y relaciones identificadoras
// (spec 6.3, 7.9, 8).

import type { AcademicRule, AcademicFinding } from "@/academic/types";
import { flattenAttributes, relationshipsOfEntity } from "../helpers";

const VERSION = "1.0.0";

export const weakEntityRules: AcademicRule[] = [
  {
    id: "unlam.weak-entity.identifying-relationship-required",
    version: VERSION,
    category: "entidad-debil",
    source: "CATEDRA",
    severity: "error",
    explanation:
      "Una entidad debil no se identifica por si sola: necesita una relacion identificadora hacia una entidad fuerte, de la que hereda parte de su clave.",
    evaluate: (model) => {
      const findings: AcademicFinding[] = [];
      for (const entity of model.entities) {
        if (entity.kind !== "weak") continue;
        const hasIdentifying = relationshipsOfEntity(model, entity.id).some(
          (relationship) => relationship.identifying === true,
        );
        if (!hasIdentifying) {
          findings.push({
            elementIds: [entity.id],
            message: `La entidad debil "${entity.name.trim() || "sin nombre"}" no participa en ninguna relacion identificadora.`,
          });
        }
      }
      return findings;
    },
  },
  {
    id: "unlam.weak-entity.discriminator-required",
    version: VERSION,
    category: "entidad-debil",
    source: "CATEDRA",
    severity: "error",
    explanation:
      "La clave completa de una entidad debil es: identificador(es) de la entidad fuerte + discriminante(s) propios. Sin discriminante no se puede distinguir dos instancias debiles de la misma entidad fuerte.",
    evaluate: (model) => {
      const findings: AcademicFinding[] = [];
      for (const entity of model.entities) {
        if (entity.kind !== "weak") continue;
        const hasDiscriminator = flattenAttributes(entity.attributes).some(
          (attribute) => attribute.isDiscriminator,
        );
        if (!hasDiscriminator) {
          findings.push({
            elementIds: [entity.id],
            message: `La entidad debil "${entity.name.trim() || "sin nombre"}" no tiene ningun atributo discriminante.`,
          });
        }
      }
      return findings;
    },
  },
  {
    id: "unlam.weak-entity.identifying-relationship-shape",
    version: VERSION,
    category: "entidad-debil",
    source: "CATEDRA",
    severity: "warning",
    explanation:
      "La relacion identificadora deberia ser binaria, conectar la entidad debil con una entidad fuerte, y la participacion de la entidad debil deberia ser total (toda instancia debil depende de una fuerte).",
    evaluate: (model) => {
      const findings: AcademicFinding[] = [];
      const weakIds = new Set(
        model.entities.filter((e) => e.kind === "weak").map((e) => e.id),
      );
      for (const relationship of model.relationships) {
        if (relationship.identifying !== true) continue;
        const weakParticipants = relationship.participants.filter((p) => weakIds.has(p.entityId));
        if (weakParticipants.length === 0) continue; // lo cubre otra regla
        if (relationship.degree !== 2 || relationship.participants.length !== 2) {
          findings.push({
            elementIds: [relationship.id],
            message: `La relacion identificadora "${relationship.name.trim() || "sin nombre"}" deberia ser binaria.`,
          });
          continue;
        }
        if (weakParticipants.some((p) => p.participation !== "total")) {
          findings.push({
            elementIds: [relationship.id],
            message: `En la relacion identificadora "${relationship.name.trim() || "sin nombre"}", la entidad debil deberia participar de forma total.`,
          });
        }
      }
      return findings;
    },
  },
  {
    id: "unlam.relationship.identifying-requires-weak",
    version: VERSION,
    category: "entidad-debil",
    source: "CATEDRA",
    severity: "warning",
    explanation:
      "Marcar una relacion como identificadora solo tiene sentido si conecta una entidad debil con su entidad fuerte.",
    evaluate: (model) => {
      const weakIds = new Set(
        model.entities.filter((e) => e.kind === "weak").map((e) => e.id),
      );
      return model.relationships
        .filter((relationship) => relationship.identifying === true)
        .filter(
          (relationship) => !relationship.participants.some((p) => weakIds.has(p.entityId)),
        )
        .map((relationship) => ({
          elementIds: [relationship.id],
          message: `La relacion "${relationship.name.trim() || "sin nombre"}" esta marcada como identificadora pero no conecta ninguna entidad debil.`,
        }));
    },
  },
];
