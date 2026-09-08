import { describe, it, expect } from "vitest";
import {
  addAttribute,
  addEntity,
  addRelationship,
  connect,
  createAttribute,
  createConceptualModel,
  createEntity,
  createRelationship,
  type ConceptualModel,
} from "@/domain/conceptual";
import { isStructurallyValid, validateStructure } from "@/features/validation";

/** DER binario correcto: dos entidades con identificador y una relacion que las une. */
function validBinaryDer(): ConceptualModel {
  const a = createEntity("Cliente");
  const b = createEntity("Sucursal");
  const rel = createRelationship("Atiende");
  let model = addEntity(addEntity(createConceptualModel(), a), b);
  model = addAttribute(model, "entity", a.id, createAttribute("dni", true));
  model = addAttribute(model, "entity", b.id, createAttribute("codigo", true));
  model = addRelationship(model, rel);
  model = connect(model, rel.id, a.id);
  model = connect(model, rel.id, b.id);
  return model;
}

function idsOf(model: ConceptualModel, message: RegExp): string[] {
  return validateStructure(model)
    .filter((issue) => message.test(issue.message))
    .map((issue) => issue.severity);
}

describe("validacion estructural minima", () => {
  it("un DER binario simple bien formado no tiene errores", () => {
    const model = validBinaryDer();
    expect(validateStructure(model).some((i) => i.severity === "error")).toBe(false);
    expect(isStructurallyValid(model)).toBe(true);
  });

  it("modelo vacio: info, no error", () => {
    const issues = validateStructure(createConceptualModel());
    expect(issues).toHaveLength(1);
    expect(issues[0]?.severity).toBe("info");
  });

  it("entidad sin identificador: advertencia", () => {
    const entity = createEntity("Cliente");
    const model = addEntity(createConceptualModel(), entity);
    expect(idsOf(model, /no tiene identificador/)).toEqual(["warning"]);
  });

  it("nombre vacio de entidad: error", () => {
    const model: ConceptualModel = {
      entities: [{ id: "e1", name: "  ", attributes: [] }],
      relationships: [],
    };
    expect(validateStructure(model).some((i) => i.severity === "error" && i.targetId === "e1")).toBe(
      true,
    );
  });

  it("entidades con el mismo nombre: advertencia en ambas", () => {
    const model = addEntity(
      addEntity(createConceptualModel(), createEntity("Cliente")),
      createEntity("cliente"),
    );
    expect(idsOf(model, /mas de una entidad llamada/)).toEqual(["warning", "warning"]);
  });

  it("relacion con menos de dos extremos: error de aridad", () => {
    const a = createEntity("A");
    const rel = createRelationship("R");
    let model = addRelationship(addEntity(createConceptualModel(), a), rel);
    model = connect(model, rel.id, a.id);
    expect(idsOf(model, /debe conectar exactamente dos entidades/)).toEqual(["error"]);
  });

  it("atributo sin nombre: error", () => {
    const entity = createEntity("A");
    let model = addEntity(createConceptualModel(), entity);
    model = addAttribute(model, "entity", entity.id, {
      id: "att1",
      name: "   ",
      isIdentifier: false,
    });
    expect(validateStructure(model).some((i) => i.severity === "error" && i.targetId === "att1")).toBe(
      true,
    );
  });

  it("atributos repetidos en el mismo dueno: advertencia", () => {
    const entity = createEntity("A");
    let model = addEntity(createConceptualModel(), entity);
    model = addAttribute(model, "entity", entity.id, createAttribute("nombre"));
    model = addAttribute(model, "entity", entity.id, createAttribute("Nombre"));
    expect(idsOf(model, /esta repetido/)).toEqual(["warning", "warning"]);
  });

  it("extremo hacia una entidad inexistente: error", () => {
    const model: ConceptualModel = {
      entities: [],
      relationships: [
        {
          id: "r1",
          name: "R",
          ends: [
            { entityId: "fantasma", cardinality: "1", participation: "total" },
            { entityId: "fantasma2", cardinality: "N", participation: "partial" },
          ],
          attributes: [],
        },
      ],
    };
    expect(
      validateStructure(model).filter((i) => /no existe/.test(i.message)),
    ).toHaveLength(2);
  });

  it("issues ordenados por severidad: errores antes que advertencias", () => {
    // Entidad sin nombre (error) + sin identificador (advertencia).
    const model: ConceptualModel = {
      entities: [{ id: "e1", name: "  ", attributes: [] }],
      relationships: [],
    };
    const severities = validateStructure(model).map((i) => i.severity);
    expect(severities.indexOf("error")).toBeLessThan(severities.indexOf("warning"));
  });
});
