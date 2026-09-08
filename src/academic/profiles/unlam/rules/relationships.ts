// Reglas del perfil UNLaM sobre relaciones: nombre, grado, roles, participantes
// (spec 6.4, 6.5, 7, 8).

import type { AcademicRule, AcademicFinding } from "@/academic/types";
import { expectedParticipantCount } from "@/domain/conceptual";
import { cardinalityPattern, distinctEntityIds, isBlank } from "../helpers";

const VERSION = "1.0.0";

export const relationshipRules: AcademicRule[] = [
  {
    id: "unlam.relationship.name-required",
    version: VERSION,
    category: "relacion",
    source: "GENERAL",
    severity: "error",
    explanation:
      "Toda relacion debe tener un nombre: describe el vinculo entre las entidades y nombra la tabla que puede generar.",
    evaluate: (model) =>
      model.relationships
        .filter((relationship) => isBlank(relationship.name))
        .map((relationship) => ({
          elementIds: [relationship.id],
          message: "La relacion no tiene nombre.",
        })),
  },
  {
    id: "unlam.relationship.participant-entity-exists",
    version: VERSION,
    category: "relacion",
    source: "GENERAL",
    severity: "error",
    explanation: "Una relacion no puede apuntar a una entidad que no existe en el modelo.",
    evaluate: (model) => {
      const entityIds = new Set(model.entities.map((entity) => entity.id));
      const findings: AcademicFinding[] = [];
      for (const relationship of model.relationships) {
        for (const participant of relationship.participants) {
          if (!entityIds.has(participant.entityId)) {
            findings.push({
              elementIds: [relationship.id, participant.id],
              message: `La relacion "${label(relationship.name)}" tiene un participante que apunta a una entidad inexistente.`,
            });
          }
        }
      }
      return findings;
    },
  },
  {
    id: "unlam.relationship.degree-matches-participants",
    version: VERSION,
    category: "relacion",
    source: "CATEDRA",
    severity: "error",
    explanation:
      "El grado declarado de la relacion (unaria, binaria o ternaria) debe coincidir con la cantidad de participantes conectados: una relacion sin participantes suficientes esta incompleta.",
    evaluate: (model) => {
      const findings: AcademicFinding[] = [];
      for (const relationship of model.relationships) {
        const expected = expectedParticipantCount(relationship.degree);
        const actual = relationship.participants.length;
        if (actual !== expected) {
          findings.push({
            elementIds: [relationship.id],
            message: `La relacion "${label(relationship.name)}" es de grado ${relationship.degree} y espera ${expected} participante(s), pero tiene ${actual}.`,
          });
        }
      }
      return findings;
    },
  },
  {
    id: "unlam.relationship.binary-ternary-distinct-entities",
    version: VERSION,
    category: "relacion",
    source: "CATEDRA",
    severity: "error",
    explanation:
      "Una relacion binaria o ternaria conecta entidades distintas. Si una entidad participa mas de una vez, la relacion es unaria (grado 1) y hay que declararla como tal, con roles.",
    evaluate: (model) => {
      const findings: AcademicFinding[] = [];
      for (const relationship of model.relationships) {
        if (relationship.degree === 1) continue;
        if (relationship.participants.length === 0) continue;
        const distinct = distinctEntityIds(relationship);
        if (distinct.length !== relationship.participants.length) {
          findings.push({
            elementIds: [relationship.id],
            message: `La relacion "${label(relationship.name)}" conecta una misma entidad mas de una vez; si es recursiva, declarala como unaria.`,
          });
        }
      }
      return findings;
    },
  },
  {
    id: "unlam.relationship.unary-roles-required",
    version: VERSION,
    category: "relacion",
    source: "CATEDRA",
    severity: "error",
    explanation:
      "En una relacion unaria la misma entidad participa dos veces; para distinguir los extremos (por ejemplo jefe / subordinado) cada participante necesita un rol y los dos roles deben ser distintos.",
    evaluate: (model) => {
      const findings: AcademicFinding[] = [];
      for (const relationship of model.relationships) {
        if (relationship.degree !== 1) continue;
        if (relationship.participants.length < 2) continue;
        const roles = relationship.participants.map((p) => (p.role ?? "").trim());
        if (roles.some((role) => role.length === 0)) {
          findings.push({
            elementIds: [relationship.id],
            message: `La relacion unaria "${label(relationship.name)}" necesita un rol en cada participante.`,
          });
        } else if (roles[0]?.toLocaleLowerCase("es") === roles[1]?.toLocaleLowerCase("es")) {
          findings.push({
            elementIds: [relationship.id],
            message: `La relacion unaria "${label(relationship.name)}" tiene el mismo rol en los dos extremos.`,
          });
        }
      }
      return findings;
    },
  },
  {
    id: "unlam.relationship.identifier-attribute-only-nn",
    version: VERSION,
    category: "relacion",
    source: "CATEDRA",
    severity: "warning",
    explanation:
      "Un atributo propio de la relacion solo puede integrar la clave cuando la relacion es N:N (se transforma en una tabla propia). En 1:1 o 1:N los atributos de la relacion viajan como atributos comunes.",
    evaluate: (model) => {
      const findings: AcademicFinding[] = [];
      for (const relationship of model.relationships) {
        const hasIdentifierAttr = relationship.attributes.some((a) => a.isIdentifier);
        if (!hasIdentifierAttr) continue;
        const pattern = cardinalityPattern(relationship);
        const allN = relationship.participants.every((p) => p.cardinality === "N");
        if (!allN) {
          findings.push({
            elementIds: [relationship.id],
            message: `La relacion "${label(relationship.name)}" (${pattern}) tiene un atributo marcado como identificador, pero eso solo corresponde en relaciones N:N.`,
          });
        }
      }
      return findings;
    },
  },
  {
    id: "unlam.relationship.ternary-cardinality-note",
    version: VERSION,
    category: "relacion",
    source: "INFORMADA",
    severity: "info",
    explanation:
      "En una relacion ternaria conviene revisar el patron de cardinalidad (N:N:N, 1:N:N, 1:1:N, 1:1:1) porque determina que atributos forman la clave al transformar a MR.",
    evaluate: (model) =>
      model.relationships
        .filter((relationship) => relationship.degree === 3 && relationship.participants.length === 3)
        .map((relationship) => ({
          elementIds: [relationship.id],
          message: `Relacion ternaria "${label(relationship.name)}": patron de cardinalidad ${cardinalityPattern(relationship)}.`,
        })),
  },
];

function label(name: string): string {
  return name.trim() || "sin nombre";
}
