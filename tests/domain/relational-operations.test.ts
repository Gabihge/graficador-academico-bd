import { describe, it, expect } from "vitest";
import {
  addAttribute,
  addForeignKey,
  addSchema,
  attributeRole,
  collectRelationalElementIds,
  createRelationalAttribute,
  createRelationalModel,
  createSchema,
  findForeignKey,
  findRelationalAttribute,
  moveAttribute,
  removeAttribute,
  removeForeignKey,
  removeSchema,
  setAttributeInPrimaryKey,
  setForeignKeyColumns,
} from "@/domain/relational";

/** Modelo base: Sucursal(codigo pk) + Empleado(legajo pk) con una FK Empleado->Sucursal. */
function baseModel() {
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
  return { model, sucursalId: sucursal.id, empleadoId: empleado.id, legajoId: legajo.id };
}

describe("operaciones puras del RelationalModel", () => {
  it("addForeignKey deja las columnas = PK del destino y crea el atributo local", () => {
    const { model, empleadoId, sucursalId } = baseModel();
    const empleado = model.schemas.find((s) => s.id === empleadoId)!;
    const fk = empleado.foreignKeys[0]!;
    expect(fk.targetRelationId).toBe(sucursalId);
    expect(fk.localAttributeIds).toHaveLength(1);
    const localAttr = empleado.attributes.find((a) => a.id === fk.localAttributeIds[0]);
    expect(localAttr?.name).toBe("codigo");
    expect(attributeRole(empleado, localAttr!.id)).toBe("fk");
  });

  it("removeSchema quita las FK entrantes de los demas esquemas", () => {
    const { model, sucursalId, empleadoId } = baseModel();
    const next = removeSchema(model, sucursalId);
    expect(next.schemas.map((s) => s.id)).toEqual([empleadoId]);
    expect(next.schemas[0]?.foreignKeys).toHaveLength(0);
  });

  it("removeAttribute lo saca del esquema, de la PK y de las FK (y poda FK vacias)", () => {
    const { model, sucursalId, empleadoId } = baseModel();
    const codigoId = model.schemas.find((s) => s.id === sucursalId)!.primaryKey[0]!;

    const next = removeAttribute(model, codigoId);
    const sucursal = next.schemas.find((s) => s.id === sucursalId)!;
    const empleado = next.schemas.find((s) => s.id === empleadoId)!;
    expect(sucursal.attributes).toHaveLength(0);
    expect(sucursal.primaryKey).toEqual([]);
    // La FK apuntaba a `codigo`: al quedarse sin columnas locales se descarta.
    expect(empleado.foreignKeys).toHaveLength(0);
  });

  it("setAttributeInPrimaryKey agrega y quita de la PK sin duplicar", () => {
    const { model, empleadoId, legajoId } = baseModel();
    let next = setAttributeInPrimaryKey(model, empleadoId, legajoId, false);
    expect(next.schemas.find((s) => s.id === empleadoId)?.primaryKey).toEqual([]);
    next = setAttributeInPrimaryKey(next, empleadoId, legajoId, true);
    next = setAttributeInPrimaryKey(next, empleadoId, legajoId, true);
    expect(next.schemas.find((s) => s.id === empleadoId)?.primaryKey).toEqual([legajoId]);
  });

  it("moveAttribute reordena dentro del esquema", () => {
    const schema = createSchema("T");
    const a = createRelationalAttribute("a");
    const b = createRelationalAttribute("b");
    const c = createRelationalAttribute("c");
    let model = addSchema(createRelationalModel(), schema);
    model = addAttribute(addAttribute(addAttribute(model, schema.id, a), schema.id, b), schema.id, c);

    model = moveAttribute(model, schema.id, c.id, "up");
    expect(model.schemas[0]?.attributes.map((x) => x.name)).toEqual(["a", "c", "b"]);
    model = moveAttribute(model, schema.id, a.id, "up"); // no-op en el borde
    expect(model.schemas[0]?.attributes.map((x) => x.name)).toEqual(["a", "c", "b"]);
  });

  it("setForeignKeyColumns reemplaza los pares local/destino (FK compuesta)", () => {
    const target = createSchema("Curso");
    const anio = createRelationalAttribute("anio");
    const div = createRelationalAttribute("division");
    target.attributes.push(anio, div);
    target.primaryKey = [anio.id, div.id];

    const owner = createSchema("Inscripcion");
    const a = createRelationalAttribute("anio");
    const d = createRelationalAttribute("division");
    owner.attributes.push(a, d);

    let model = addSchema(addSchema(createRelationalModel(), target), owner);
    model = addForeignKey(model, owner.id, target.id);
    const fkId = model.schemas.find((s) => s.id === owner.id)!.foreignKeys[0]!.id;

    model = setForeignKeyColumns(model, fkId, [
      { localAttributeId: a.id, targetAttributeId: anio.id },
      { localAttributeId: d.id, targetAttributeId: div.id },
    ]);
    const fk = findForeignKey(model, fkId)!.foreignKey;
    expect(fk.localAttributeIds).toEqual([a.id, d.id]);
    expect(fk.targetAttributeIds).toEqual([anio.id, div.id]);
  });

  it("removeForeignKey y consultas", () => {
    const { model, empleadoId } = baseModel();
    const fkId = model.schemas.find((s) => s.id === empleadoId)!.foreignKeys[0]!.id;
    const next = removeForeignKey(model, fkId);
    expect(next.schemas.find((s) => s.id === empleadoId)?.foreignKeys).toHaveLength(0);

    const { model: m2, legajoId, empleadoId: eId } = baseModel();
    expect(findRelationalAttribute(m2, legajoId)?.schemaId).toBe(eId);
    expect(collectRelationalElementIds(m2).length).toBeGreaterThan(0);
  });

  it("no muta el modelo original", () => {
    const { model } = baseModel();
    const before = JSON.stringify(model);
    renameHelperNoop(model);
    expect(JSON.stringify(model)).toBe(before);
  });
});

function renameHelperNoop(model: ReturnType<typeof baseModel>["model"]) {
  addSchema(model, createSchema("Otro"));
}
