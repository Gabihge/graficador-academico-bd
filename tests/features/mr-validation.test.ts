import { describe, it, expect } from "vitest";
import {
  addAttribute,
  addForeignKey,
  addSchema,
  createRelationalAttribute,
  createRelationalModel,
  createSchema,
  setAttributeInPrimaryKey,
  setForeignKeyColumns,
  type RelationalModel,
} from "@/domain/relational";
import { isMrValid, mrElementKindOf, validateMr } from "@/features/validation";

/** MR bien formado: Sucursal(codigo pk) <- Empleado(legajo pk, codigo fk). */
function validModel(): { model: RelationalModel; sucursalId: string; empleadoId: string } {
  const sucursal = createSchema("Sucursal");
  const codigo = createRelationalAttribute("codigo");
  sucursal.attributes.push(codigo);
  sucursal.primaryKey = [codigo.id];

  const empleado = createSchema("Empleado");
  const legajo = createRelationalAttribute("legajo");
  empleado.attributes.push(legajo);
  empleado.primaryKey = [legajo.id];

  let model = addSchema(addSchema(createRelationalModel(), sucursal), empleado);
  model = addForeignKey(model, empleado.id, sucursal.id);
  return { model, sucursalId: sucursal.id, empleadoId: empleado.id };
}

describe("validacion estructural del MR", () => {
  it("un MR bien formado no tiene errores", () => {
    const { model } = validModel();
    expect(validateMr(model).filter((i) => i.severity === "error")).toEqual([]);
    expect(isMrValid(model)).toBe(true);
  });

  it("relacion sin nombre: error (dato importado, la fabrica normaliza)", () => {
    const model: RelationalModel = {
      schemas: [{ id: "s1", name: "  ", attributes: [], primaryKey: [], foreignKeys: [] }],
      notes: [],
      revision: 0,
    };
    expect(validateMr(model).some((i) => i.severity === "error" && /no tiene nombre/.test(i.message))).toBe(true);
  });

  it("atributos duplicados en un esquema: error", () => {
    const schema = createSchema("T");
    let model = addSchema(createRelationalModel(), schema);
    model = addAttribute(model, schema.id, createRelationalAttribute("x"));
    model = addAttribute(model, schema.id, createRelationalAttribute("X"));
    expect(validateMr(model).some((i) => /duplicado/.test(i.message))).toBe(true);
  });

  it("relacion sin PK: advertencia", () => {
    const schema = createSchema("T");
    let model = addSchema(createRelationalModel(), schema);
    model = addAttribute(model, schema.id, createRelationalAttribute("x"));
    expect(validateMr(model).some((i) => i.severity === "warning" && /clave primaria/.test(i.message))).toBe(true);
  });

  it("FK apuntando a un esquema inexistente: error", () => {
    const { model } = validModel();
    const empleado = model.schemas.find((s) => s.name === "Empleado")!;
    empleado.foreignKeys[0]!.targetRelationId = "fantasma";
    expect(validateMr(model).some((i) => i.severity === "error" && /no existe/.test(i.message))).toBe(true);
  });

  it("FK con distinta cantidad de atributos local vs destino: error", () => {
    const { model } = validModel();
    const empleado = model.schemas.find((s) => s.name === "Empleado")!;
    empleado.foreignKeys[0]!.targetAttributeIds = [];
    expect(validateMr(model).some((i) => i.severity === "error" && /distinta cantidad/.test(i.message))).toBe(true);
  });

  it("FK que no referencia la PK del destino: advertencia", () => {
    const { model } = validModel();
    const sucursal = model.schemas.find((s) => s.name === "Sucursal")!;
    // agregar un atributo no-PK al destino y redirigir la FK a el
    let next = addAttribute(model, sucursal.id, createRelationalAttribute("nombre"));
    const nombreId = next.schemas.find((s) => s.name === "Sucursal")!.attributes.find((a) => a.name === "nombre")!.id;
    const empleado = next.schemas.find((s) => s.name === "Empleado")!;
    next = setForeignKeyColumns(next, empleado.foreignKeys[0]!.id, [
      { localAttributeId: empleado.foreignKeys[0]!.localAttributeIds[0]!, targetAttributeId: nombreId },
    ]);
    expect(validateMr(next).some((i) => i.severity === "warning" && /clave primaria/.test(i.message))).toBe(true);
  });

  it("referencia circular NO se marca como error (spec 8)", () => {
    // A(id) y B(id) con FK A->B y FK B->A.
    const a = createSchema("A");
    const aId = createRelationalAttribute("aId");
    a.attributes.push(aId);
    a.primaryKey = [aId.id];
    const b = createSchema("B");
    const bId = createRelationalAttribute("bId");
    b.attributes.push(bId);
    b.primaryKey = [bId.id];
    let model = addSchema(addSchema(createRelationalModel(), a), b);
    model = addForeignKey(model, a.id, b.id);
    model = addForeignKey(model, b.id, a.id);
    // marcar los atributos locales como PK para que la FK referencie exactamente la PK del destino
    model = setAttributeInPrimaryKey(model, a.id, aId.id, true);
    expect(validateMr(model).filter((i) => i.severity === "error")).toEqual([]);
  });

  it("mrElementKindOf resuelve schema / attribute / foreignKey", () => {
    const { model, sucursalId } = validModel();
    const empleado = model.schemas.find((s) => s.name === "Empleado")!;
    expect(mrElementKindOf(model, sucursalId)).toBe("schema");
    expect(mrElementKindOf(model, empleado.attributes[0]!.id)).toBe("attribute");
    expect(mrElementKindOf(model, empleado.foreignKeys[0]!.id)).toBe("foreignKey");
    expect(mrElementKindOf(model, "nope")).toBeNull();
  });
});
