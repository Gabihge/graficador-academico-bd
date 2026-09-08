// Fixtures de las 15 reglas de transformacion DER -> MR (spec 7). Cada fixture
// es un DER de entrada + el MR esperado en forma SEMANTICA (spec 26). El DER se
// arma con el builder del Incremento 3 (tests/academic/builder.ts).

import type { ConceptualModel } from "@/domain/conceptual";
import { model } from "../academic/builder";
import { fk, schema, type SemSchema } from "./semanticize";

export interface TransformFixture {
  rule: string;
  title: string;
  der: ConceptualModel;
  expected: SemSchema[];
  /** true si el trace debe contener al menos una entrada `warning`. */
  expectWarning?: boolean;
}

const entities11 = () =>
  model()
    .entity("A", { attrs: [{ name: "aId", identifier: true }] })
    .entity("B", { attrs: [{ name: "bId", identifier: true }] });

const abc = () =>
  model()
    .entity("A", { attrs: [{ name: "aId", identifier: true }] })
    .entity("B", { attrs: [{ name: "bId", identifier: true }] })
    .entity("C", { attrs: [{ name: "cId", identifier: true }] });

export const transformFixtures: TransformFixture[] = [
  {
    rule: "7.1",
    title: "entidad regular con PK simple y atributo comun",
    der: model()
      .entity("Cliente", {
        attrs: [{ name: "dni", identifier: true }, { name: "nombre" }],
      })
      .build(),
    expected: [schema("Cliente", ["dni", "nombre"], ["dni"])],
  },

  // 7.2 - las 4 variantes de participacion (spec 7.2)
  {
    rule: "7.2",
    title: "binaria 1:1 total/total -> FK en el segundo participante",
    der: entities11()
      .relationship("R", {
        participants: [
          { entity: "A", cardinality: "1", participation: "total" },
          { entity: "B", cardinality: "1", participation: "total" },
        ],
      })
      .build(),
    expected: [
      schema("A", ["aId"], ["aId"]),
      schema("B", ["bId", "aId"], ["bId"], [fk("A", [["aId", "aId"]])]),
    ],
  },
  {
    rule: "7.2",
    title: "binaria 1:1 total/parcial -> FK en el extremo parcial (B)",
    der: entities11()
      .relationship("R", {
        participants: [
          { entity: "A", cardinality: "1", participation: "total" },
          { entity: "B", cardinality: "1", participation: "partial" },
        ],
      })
      .build(),
    expected: [
      schema("A", ["aId"], ["aId"]),
      schema("B", ["bId", "aId"], ["bId"], [fk("A", [["aId", "aId"]])]),
    ],
  },
  {
    rule: "7.2",
    title: "binaria 1:1 parcial/total -> FK en el extremo parcial (A)",
    der: entities11()
      .relationship("R", {
        participants: [
          { entity: "A", cardinality: "1", participation: "partial" },
          { entity: "B", cardinality: "1", participation: "total" },
        ],
      })
      .build(),
    expected: [
      schema("A", ["aId", "bId"], ["aId"], [fk("B", [["bId", "bId"]])]),
      schema("B", ["bId"], ["bId"]),
    ],
  },
  {
    rule: "7.2",
    title: "binaria 1:1 parcial/parcial -> desempate: FK en el segundo (B)",
    der: entities11()
      .relationship("R", {
        participants: [
          { entity: "A", cardinality: "1", participation: "partial" },
          { entity: "B", cardinality: "1", participation: "partial" },
        ],
      })
      .build(),
    expected: [
      schema("A", ["aId"], ["aId"]),
      schema("B", ["bId", "aId"], ["bId"], [fk("A", [["aId", "aId"]])]),
    ],
  },

  {
    rule: "7.3",
    title: "binaria 1:N -> FK en el extremo con cardinalidad 1",
    der: model()
      .entity("Empleado", { attrs: [{ name: "legajo", identifier: true }] })
      .entity("Sucursal", { attrs: [{ name: "codigo", identifier: true }] })
      .relationship("TrabajaEn", {
        participants: [
          { entity: "Empleado", cardinality: "1" },
          { entity: "Sucursal", cardinality: "N" },
        ],
      })
      .build(),
    expected: [
      schema("Empleado", ["legajo", "codigo"], ["legajo"], [
        fk("Sucursal", [["codigo", "codigo"]]),
      ]),
      schema("Sucursal", ["codigo"], ["codigo"]),
    ],
  },

  {
    rule: "7.4",
    title: "binaria N:N -> esquema puente con las dos FK como PK",
    der: model()
      .entity("Alumno", { attrs: [{ name: "legajo", identifier: true }] })
      .entity("Materia", { attrs: [{ name: "codigo", identifier: true }] })
      .relationship("Cursa", {
        participants: [
          { entity: "Alumno", cardinality: "N" },
          { entity: "Materia", cardinality: "N" },
        ],
      })
      .build(),
    expected: [
      schema("Alumno", ["legajo"], ["legajo"]),
      schema("Materia", ["codigo"], ["codigo"]),
      schema("Cursa", ["legajo", "codigo"], ["legajo", "codigo"], [
        fk("Alumno", [["legajo", "legajo"]]),
        fk("Materia", [["codigo", "codigo"]]),
      ]),
    ],
  },
  {
    rule: "7.4",
    title: "N:N con atributo propio de la relacion (item 9)",
    der: model()
      .entity("Producto", { attrs: [{ name: "sku", identifier: true }] })
      .entity("Pedido", { attrs: [{ name: "nro", identifier: true }] })
      .relationship("Contiene", {
        attrs: [{ name: "cantidad" }],
        participants: [
          { entity: "Producto", cardinality: "N" },
          { entity: "Pedido", cardinality: "N" },
        ],
      })
      .build(),
    expected: [
      schema("Producto", ["sku"], ["sku"]),
      schema("Pedido", ["nro"], ["nro"]),
      schema("Contiene", ["sku", "nro", "cantidad"], ["sku", "nro"], [
        fk("Producto", [["sku", "sku"]]),
        fk("Pedido", [["nro", "nro"]]),
      ]),
    ],
  },

  {
    rule: "7.5",
    title: "unaria 1:N -> FK autorreferenciada con el rol del extremo 1",
    der: model()
      .entity("Empleado", { attrs: [{ name: "legajo", identifier: true }] })
      .relationship("Supervisa", {
        degree: 1,
        participants: [
          { entity: "Empleado", cardinality: "1", role: "jefe" },
          { entity: "Empleado", cardinality: "N", role: "subordinado" },
        ],
      })
      .build(),
    expected: [
      schema("Empleado", ["legajo", "jefe_legajo"], ["legajo"], [
        fk("Empleado", [["jefe_legajo", "legajo"]]),
      ]),
    ],
  },
  {
    rule: "7.5",
    title: "unaria 1:1 -> FK autorreferenciada",
    der: model()
      .entity("Persona", { attrs: [{ name: "dni", identifier: true }] })
      .relationship("Casado", {
        degree: 1,
        participants: [
          { entity: "Persona", cardinality: "1", role: "conyugeA" },
          { entity: "Persona", cardinality: "1", role: "conyugeB" },
        ],
      })
      .build(),
    expected: [
      schema("Persona", ["dni", "conyugeA_dni"], ["dni"], [
        fk("Persona", [["conyugeA_dni", "dni"]]),
      ]),
    ],
  },

  {
    rule: "7.6",
    title: "unaria N:N -> nuevo esquema; la clave participa dos veces por rol",
    der: model()
      .entity("Pieza", { attrs: [{ name: "codigo", identifier: true }] })
      .relationship("Compone", {
        degree: 1,
        participants: [
          { entity: "Pieza", cardinality: "N", role: "todo" },
          { entity: "Pieza", cardinality: "N", role: "parte" },
        ],
      })
      .build(),
    expected: [
      schema("Pieza", ["codigo"], ["codigo"]),
      schema("Compone", ["todo_codigo", "parte_codigo"], ["todo_codigo", "parte_codigo"], [
        fk("Pieza", [["todo_codigo", "codigo"]]),
        fk("Pieza", [["parte_codigo", "codigo"]]),
      ]),
    ],
  },

  {
    rule: "7.7",
    title: "atributo compuesto -> se elimina el agrupador; quedan los componentes",
    der: model()
      .entity("Persona", {
        attrs: [
          { name: "id", identifier: true },
          {
            name: "domicilio",
            kind: "composite",
            components: [{ name: "calle" }, { name: "altura" }],
          },
        ],
      })
      .build(),
    expected: [schema("Persona", ["id", "calle", "altura"], ["id"])],
  },

  {
    rule: "7.8",
    title: "atributo multivaluado -> esquema propio con FK + valor como PK",
    der: model()
      .entity("Empleado", {
        attrs: [
          { name: "legajo", identifier: true },
          { name: "telefono", kind: "multivalued" },
        ],
      })
      .build(),
    expected: [
      schema("Empleado", ["legajo"], ["legajo"]),
      schema("Empleado_telefono", ["legajo", "telefono"], ["legajo", "telefono"], [
        fk("Empleado", [["legajo", "legajo"]]),
      ]),
    ],
  },

  {
    rule: "7.9",
    title: "entidad debil -> FK heredada + discriminante forman la PK",
    der: model()
      .entity("Edificio", { attrs: [{ name: "codigo", identifier: true }] })
      .entity("Departamento", {
        weak: true,
        attrs: [{ name: "nro", discriminator: true }],
      })
      .relationship("Contiene", {
        identifying: true,
        participants: [
          { entity: "Departamento", cardinality: "N", participation: "total" },
          { entity: "Edificio", cardinality: "1" },
        ],
      })
      .build(),
    expected: [
      schema("Edificio", ["codigo"], ["codigo"]),
      schema("Departamento", ["codigo", "nro"], ["codigo", "nro"], [
        fk("Edificio", [["codigo", "codigo"]]),
      ]),
    ],
  },

  {
    rule: "7.10",
    title: "ternaria N:N:N -> las tres FK forman la PK",
    der: abc()
      .relationship("T", {
        degree: 3,
        participants: [
          { entity: "A", cardinality: "N" },
          { entity: "B", cardinality: "N" },
          { entity: "C", cardinality: "N" },
        ],
      })
      .build(),
    expected: [
      schema("A", ["aId"], ["aId"]),
      schema("B", ["bId"], ["bId"]),
      schema("C", ["cId"], ["cId"]),
      schema("T", ["aId", "bId", "cId"], ["aId", "bId", "cId"], [
        fk("A", [["aId", "aId"]]),
        fk("B", [["bId", "bId"]]),
        fk("C", [["cId", "cId"]]),
      ]),
    ],
  },
  {
    rule: "7.11",
    title: "ternaria 1:N:N -> solo las claves de los extremos N forman la PK",
    der: abc()
      .relationship("T", {
        degree: 3,
        participants: [
          { entity: "A", cardinality: "1" },
          { entity: "B", cardinality: "N" },
          { entity: "C", cardinality: "N" },
        ],
      })
      .build(),
    expected: [
      schema("A", ["aId"], ["aId"]),
      schema("B", ["bId"], ["bId"]),
      schema("C", ["cId"], ["cId"]),
      schema("T", ["aId", "bId", "cId"], ["bId", "cId"], [
        fk("A", [["aId", "aId"]]),
        fk("B", [["bId", "bId"]]),
        fk("C", [["cId", "cId"]]),
      ]),
    ],
  },
  {
    rule: "7.12",
    title: "ternaria 1:1:N -> PK = extremo N + primer extremo 1",
    der: abc()
      .relationship("T", {
        degree: 3,
        participants: [
          { entity: "A", cardinality: "1" },
          { entity: "B", cardinality: "1" },
          { entity: "C", cardinality: "N" },
        ],
      })
      .build(),
    expected: [
      schema("A", ["aId"], ["aId"]),
      schema("B", ["bId"], ["bId"]),
      schema("C", ["cId"], ["cId"]),
      schema("T", ["aId", "bId", "cId"], ["aId", "cId"], [
        fk("A", [["aId", "aId"]]),
        fk("B", [["bId", "bId"]]),
        fk("C", [["cId", "cId"]]),
      ]),
    ],
  },
  {
    rule: "7.13",
    title: "ternaria 1:1:1 -> PK = par (participante 1, participante 2)",
    der: abc()
      .relationship("T", {
        degree: 3,
        participants: [
          { entity: "A", cardinality: "1" },
          { entity: "B", cardinality: "1" },
          { entity: "C", cardinality: "1" },
        ],
      })
      .build(),
    expected: [
      schema("A", ["aId"], ["aId"]),
      schema("B", ["bId"], ["bId"]),
      schema("C", ["cId"], ["cId"]),
      schema("T", ["aId", "bId", "cId"], ["aId", "bId"], [
        fk("A", [["aId", "aId"]]),
        fk("B", [["bId", "bId"]]),
        fk("C", [["cId", "cId"]]),
      ]),
    ],
  },

  {
    rule: "7.14",
    title: "jerarquia -> una tabla por entidad; subentidades con PK+FK heredada",
    der: model()
      .entity("Vehiculo", { attrs: [{ name: "patente", identifier: true }] })
      .entity("Auto", { attrs: [{ name: "puertas" }] })
      .entity("Moto")
      .hierarchy("H", {
        super: "Vehiculo",
        subs: ["Auto", "Moto"],
        partition: "total",
        overlap: "exclusive",
      })
      .build(),
    expected: [
      schema("Vehiculo", ["patente"], ["patente"]),
      schema("Auto", ["patente", "puertas"], ["patente"], [
        fk("Vehiculo", [["patente", "patente"]]),
      ]),
      schema("Moto", ["patente"], ["patente"], [fk("Vehiculo", [["patente", "patente"]])]),
    ],
  },

  {
    rule: "7.15",
    title: "atributo derivado -> se conserva como atributo comun con advertencia",
    der: model()
      .entity("Empleado", {
        attrs: [
          { name: "legajo", identifier: true },
          { name: "edad", kind: "derived" },
        ],
      })
      .build(),
    expected: [schema("Empleado", ["legajo", "edad"], ["legajo"])],
    expectWarning: true,
  },
];
