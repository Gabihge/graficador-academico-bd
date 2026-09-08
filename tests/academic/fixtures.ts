// Fixtures academicos del DER (spec seccion 26, items 1-22) mas variantes
// invalidas para ejercitar cada regla `error` del perfil UNLaM.
//
// Cada fixture es un ConceptualModel afirmado como valido (sin issues `error`
// bajo el perfil) o invalido (contiene un `ruleId` esperado). Se comparan por
// semantica, no por ids ni coordenadas.

import type { ConceptualModel } from "@/domain/conceptual";
import { model } from "./builder";

export interface AcademicFixture {
  title: string;
  model: ConceptualModel;
  expect: "valid" | { invalidRuleId: string };
}

const participations = [
  ["total", "total"],
  ["total", "partial"],
  ["partial", "total"],
  ["partial", "partial"],
] as const;

export const academicFixtures: AcademicFixture[] = [
  // 1. entidad regular con PK simple
  {
    title: "1. entidad regular con PK simple",
    model: model().entity("Cliente", { attrs: [{ name: "dni", identifier: true }] }).build(),
    expect: "valid",
  },
  // 2. entidad con PK compuesta
  {
    title: "2. entidad con PK compuesta",
    model: model()
      .entity("Inscripcion", {
        attrs: [
          { name: "alumnoId", identifier: true },
          { name: "cursoId", identifier: true },
          { name: "fecha" },
        ],
      })
      .build(),
    expect: "valid",
  },
  // 3. atributo compuesto (valido + invalido sin componentes)
  {
    title: "3. atributo compuesto con componentes",
    model: model()
      .entity("Persona", {
        attrs: [
          { name: "id", identifier: true },
          {
            name: "domicilio",
            kind: "composite",
            components: [{ name: "calle" }, { name: "numero" }],
          },
        ],
      })
      .build(),
    expect: "valid",
  },
  {
    title: "3b. atributo compuesto sin componentes (invalido)",
    model: model()
      .entity("Persona", {
        attrs: [
          { name: "id", identifier: true },
          { name: "domicilio", kind: "composite", components: [] },
        ],
      })
      .build(),
    expect: { invalidRuleId: "unlam.attribute.composite-needs-components" },
  },
  // 4. atributo multivaluado
  {
    title: "4. atributo multivaluado",
    model: model()
      .entity("Empleado", {
        attrs: [
          { name: "legajo", identifier: true },
          { name: "telefono", kind: "multivalued" },
        ],
      })
      .build(),
    expect: "valid",
  },
  // 5. entidad debil
  {
    title: "5. entidad debil con relacion identificadora",
    model: model()
      .entity("Edificio", { attrs: [{ name: "codigo", identifier: true }] })
      .entity("Departamento", { weak: true, attrs: [{ name: "nro", discriminator: true }] })
      .relationship("Contiene", {
        identifying: true,
        participants: [
          { entity: "Departamento", cardinality: "N", participation: "total" },
          { entity: "Edificio", cardinality: "1", participation: "partial" },
        ],
      })
      .build(),
    expect: "valid",
  },
  // 6. binaria 1:1 con variantes de participacion
  ...participations.map(([pa, pb], index) => ({
    title: `6.${index + 1}. binaria 1:1 (${pa}/${pb})`,
    model: model()
      .entity("A", { attrs: [{ name: "aId", identifier: true }] })
      .entity("B", { attrs: [{ name: "bId", identifier: true }] })
      .relationship("R", {
        participants: [
          { entity: "A", cardinality: "1", participation: pa },
          { entity: "B", cardinality: "1", participation: pb },
        ],
      })
      .build(),
    expect: "valid" as const,
  })),
  // 7. binaria 1:N
  {
    title: "7. binaria 1:N",
    model: model()
      .entity("Sucursal", { attrs: [{ name: "codigo", identifier: true }] })
      .entity("Empleado", { attrs: [{ name: "legajo", identifier: true }] })
      .relationship("TrabajaEn", {
        participants: [
          { entity: "Empleado", cardinality: "1", participation: "total" },
          { entity: "Sucursal", cardinality: "N", participation: "partial" },
        ],
      })
      .build(),
    expect: "valid",
  },
  // 8. binaria N:N
  {
    title: "8. binaria N:N",
    model: model()
      .entity("Alumno", { attrs: [{ name: "legajo", identifier: true }] })
      .entity("Materia", { attrs: [{ name: "codigo", identifier: true }] })
      .relationship("Cursa", {
        participants: [
          { entity: "Alumno", cardinality: "N", participation: "partial" },
          { entity: "Materia", cardinality: "N", participation: "partial" },
        ],
      })
      .build(),
    expect: "valid",
  },
  // 9. N:N con atributo de relacion
  {
    title: "9. N:N con atributo de relacion",
    model: model()
      .entity("Producto", { attrs: [{ name: "sku", identifier: true }] })
      .entity("Pedido", { attrs: [{ name: "nro", identifier: true }] })
      .relationship("Contiene", {
        attrs: [{ name: "cantidad" }],
        participants: [
          { entity: "Producto", cardinality: "N", participation: "partial" },
          { entity: "Pedido", cardinality: "N", participation: "partial" },
        ],
      })
      .build(),
    expect: "valid",
  },
  // 10. unaria 1:1
  {
    title: "10. unaria 1:1",
    model: model()
      .entity("Persona", { attrs: [{ name: "dni", identifier: true }] })
      .relationship("Matrimonio", {
        degree: 1,
        participants: [
          { entity: "Persona", cardinality: "1", participation: "partial", role: "conyuge A" },
          { entity: "Persona", cardinality: "1", participation: "partial", role: "conyuge B" },
        ],
      })
      .build(),
    expect: "valid",
  },
  // 11. unaria 1:N
  {
    title: "11. unaria 1:N",
    model: model()
      .entity("Empleado", { attrs: [{ name: "legajo", identifier: true }] })
      .relationship("Supervisa", {
        degree: 1,
        participants: [
          { entity: "Empleado", cardinality: "1", participation: "partial", role: "jefe" },
          { entity: "Empleado", cardinality: "N", participation: "partial", role: "subordinado" },
        ],
      })
      .build(),
    expect: "valid",
  },
  // 12. unaria N:N con roles
  {
    title: "12. unaria N:N con roles",
    model: model()
      .entity("Pieza", { attrs: [{ name: "codigo", identifier: true }] })
      .relationship("SeComponeDe", {
        degree: 1,
        participants: [
          { entity: "Pieza", cardinality: "N", participation: "partial", role: "todo" },
          { entity: "Pieza", cardinality: "N", participation: "partial", role: "parte" },
        ],
      })
      .build(),
    expect: "valid",
  },
  // 13-16. ternarias
  ...(
    [
      ["13. ternaria N:N:N", ["N", "N", "N"]],
      ["14. ternaria 1:N:N", ["1", "N", "N"]],
      ["15. ternaria 1:1:N", ["1", "1", "N"]],
      ["16. ternaria 1:1:1", ["1", "1", "1"]],
    ] as const
  ).map(([title, cards]) => ({
    title,
    model: model()
      .entity("A", { attrs: [{ name: "aId", identifier: true }] })
      .entity("B", { attrs: [{ name: "bId", identifier: true }] })
      .entity("C", { attrs: [{ name: "cId", identifier: true }] })
      .relationship("T", {
        degree: 3,
        participants: [
          { entity: "A", cardinality: cards[0], participation: "partial" },
          { entity: "B", cardinality: cards[1], participation: "partial" },
          { entity: "C", cardinality: cards[2], participation: "partial" },
        ],
      })
      .build(),
    expect: "valid" as const,
  })),
  // 17-20. jerarquias (particion x solapamiento)
  ...(
    [
      ["17. jerarquia total exclusiva", "total", "exclusive"],
      ["18. jerarquia parcial exclusiva", "partial", "exclusive"],
      ["19. jerarquia total solapada", "total", "overlapping"],
      ["20. jerarquia parcial solapada", "partial", "overlapping"],
    ] as const
  ).map(([title, partition, overlap]) => ({
    title,
    model: model()
      .entity("Vehiculo", { attrs: [{ name: "patente", identifier: true }] })
      .entity("Auto")
      .entity("Moto")
      .hierarchy("H", { super: "Vehiculo", subs: ["Auto", "Moto"], partition, overlap })
      .build(),
    expect: "valid" as const,
  })),
  // 21. atributo discriminante de jerarquia admitido
  {
    title: "21. discriminante de jerarquia admitido (total + exclusiva)",
    model: model()
      .entity("Empleado", {
        attrs: [
          { name: "legajo", identifier: true },
          { name: "tipo" },
        ],
      })
      .entity("Gerente")
      .entity("Operario")
      .hierarchy("H", {
        super: "Empleado",
        subs: ["Gerente", "Operario"],
        partition: "total",
        overlap: "exclusive",
        discriminatorAttr: "tipo",
      })
      .build(),
    expect: "valid",
  },
  // 22. caso invalido de entidad debil
  {
    title: "22. entidad debil sin relacion identificadora (invalido)",
    model: model()
      .entity("Pedido", { attrs: [{ name: "nro", identifier: true }] })
      .entity("Item", { weak: true, attrs: [{ name: "linea", discriminator: true }] })
      .relationship("Tiene", {
        participants: [
          { entity: "Item", cardinality: "N", participation: "total" },
          { entity: "Pedido", cardinality: "1", participation: "partial" },
        ],
      })
      .build(),
    expect: { invalidRuleId: "unlam.weak-entity.identifying-relationship-required" },
  },

  // --- Extra: un fixture invalido por cada regla `error` restante ---------
  {
    title: "inv. entidad sin nombre",
    model: model().entity("", { attrs: [{ name: "x", identifier: true }] }).build(),
    expect: { invalidRuleId: "unlam.entity.name-required" },
  },
  {
    title: "inv. entidad regular sin identificador",
    model: model().entity("Cliente", { attrs: [{ name: "nombre" }] }).build(),
    expect: { invalidRuleId: "unlam.entity.regular-identifier-required" },
  },
  {
    title: "inv. relacion sin nombre",
    model: model()
      .entity("A", { attrs: [{ name: "aId", identifier: true }] })
      .entity("B", { attrs: [{ name: "bId", identifier: true }] })
      .relationship("", {
        participants: [
          { entity: "A", cardinality: "N" },
          { entity: "B", cardinality: "N" },
        ],
      })
      .build(),
    expect: { invalidRuleId: "unlam.relationship.name-required" },
  },
  {
    title: "inv. relacion binaria con un solo participante",
    model: model()
      .entity("A", { attrs: [{ name: "aId", identifier: true }] })
      .relationship("R", { degree: 2, participants: [{ entity: "A", cardinality: "N" }] })
      .build(),
    expect: { invalidRuleId: "unlam.relationship.degree-matches-participants" },
  },
  {
    title: "inv. relacion binaria con la misma entidad dos veces",
    model: model()
      .entity("A", { attrs: [{ name: "aId", identifier: true }] })
      .relationship("R", {
        degree: 2,
        participants: [
          { entity: "A", cardinality: "1" },
          { entity: "A", cardinality: "N" },
        ],
      })
      .build(),
    expect: { invalidRuleId: "unlam.relationship.binary-ternary-distinct-entities" },
  },
  {
    title: "inv. relacion unaria sin roles",
    model: model()
      .entity("A", { attrs: [{ name: "aId", identifier: true }] })
      .relationship("R", {
        degree: 1,
        participants: [
          { entity: "A", cardinality: "1" },
          { entity: "A", cardinality: "N" },
        ],
      })
      .build(),
    expect: { invalidRuleId: "unlam.relationship.unary-roles-required" },
  },
  {
    title: "inv. jerarquia sin supraentidad",
    model: model()
      .entity("Auto")
      .entity("Moto")
      .hierarchy("H", { super: "", subs: ["Auto", "Moto"], partition: "total", overlap: "exclusive" })
      .build(),
    expect: { invalidRuleId: "unlam.hierarchy.super-required" },
  },
  {
    title: "inv. jerarquia sin subentidades",
    model: model()
      .entity("Vehiculo", { attrs: [{ name: "patente", identifier: true }] })
      .hierarchy("H", { super: "Vehiculo", subs: [], partition: "partial", overlap: "exclusive" })
      .build(),
    expect: { invalidRuleId: "unlam.hierarchy.subentities-required" },
  },
  {
    title: "inv. discriminante de jerarquia en combinacion no admitida",
    model: buildHierarchyWithForcedDiscriminator(),
    expect: { invalidRuleId: "unlam.hierarchy.discriminator-combination" },
  },
  {
    title: "inv. entidad debil sin discriminante",
    model: model()
      .entity("Pedido", { attrs: [{ name: "nro", identifier: true }] })
      .entity("Item", { weak: true, attrs: [{ name: "descripcion" }] })
      .relationship("Tiene", {
        identifying: true,
        participants: [
          { entity: "Item", cardinality: "N", participation: "total" },
          { entity: "Pedido", cardinality: "1", participation: "partial" },
        ],
      })
      .build(),
    expect: { invalidRuleId: "unlam.weak-entity.discriminator-required" },
  },
];

/** Jerarquia parcial (no admite discriminante) pero con `discriminatorAttributeId` seteado a mano. */
function buildHierarchyWithForcedDiscriminator(): ConceptualModel {
  const built = model()
    .entity("Empleado", {
      attrs: [
        { name: "legajo", identifier: true },
        { name: "tipo" },
      ],
    })
    .entity("Gerente")
    .entity("Operario")
    .hierarchy("H", {
      super: "Empleado",
      subs: ["Gerente", "Operario"],
      partition: "partial",
      overlap: "exclusive",
    })
    .build();
  const discriminator = built.entities[0]?.attributes.find((a) => a.name === "tipo");
  built.hierarchies[0]!.discriminatorAttributeId = discriminator?.id;
  return built;
}
