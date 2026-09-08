import { describe, it, expect } from "vitest";
import {
  attributeRole,
  createForeignKey,
  createRelationalAttribute,
  createRelationalModel,
  createSchema,
  pkAttributes,
} from "@/domain/relational";

describe("RelationalModel: fabricas y rol derivado de atributo", () => {
  it("crea esquemas y modelos con la forma canonica (spec 15.2)", () => {
    expect(createRelationalModel()).toEqual({ schemas: [], notes: [], revision: 0 });
    const schema = createSchema("  Cliente  ");
    expect(schema.name).toBe("Cliente");
    expect(schema.primaryKey).toEqual([]);
    expect(schema.foreignKeys).toEqual([]);
  });

  it("FK simple: un atributo PK en un esquema, referenciado por una FK de un solo atributo (item 23)", () => {
    const target = createSchema("Sucursal");
    const codigo = createRelationalAttribute("codigo");
    target.attributes.push(codigo);
    target.primaryKey = [codigo.id];

    const owner = createSchema("Empleado");
    const legajo = createRelationalAttribute("legajo");
    const sucursalFk = createRelationalAttribute("codigo");
    owner.attributes.push(legajo, sucursalFk);
    owner.primaryKey = [legajo.id];
    owner.foreignKeys.push(createForeignKey([sucursalFk.id], target.id, [codigo.id]));

    expect(attributeRole(owner, legajo.id)).toBe("pk");
    expect(attributeRole(owner, sucursalFk.id)).toBe("fk");
  });

  it("FK compuesta: una FK sobre dos atributos hacia una PK compuesta (item 24)", () => {
    const target = createSchema("Curso");
    const anio = createRelationalAttribute("anio");
    const div = createRelationalAttribute("division");
    target.attributes.push(anio, div);
    target.primaryKey = [anio.id, div.id];

    const owner = createSchema("Inscripcion");
    const a = createRelationalAttribute("anio");
    const d = createRelationalAttribute("division");
    owner.attributes.push(a, d);
    owner.foreignKeys.push(createForeignKey([a.id, d.id], target.id, [anio.id, div.id]));

    expect(owner.foreignKeys[0]?.localAttributeIds).toHaveLength(2);
    expect(attributeRole(owner, a.id)).toBe("fk");
    expect(attributeRole(owner, d.id)).toBe("fk");
  });

  it("atributo PK+FK: su id esta en primaryKey y en una FK a la vez (item 25)", () => {
    const target = createSchema("Vehiculo");
    const patente = createRelationalAttribute("patente");
    target.attributes.push(patente);
    target.primaryKey = [patente.id];

    const sub = createSchema("Auto");
    const inherited = createRelationalAttribute("patente");
    sub.attributes.push(inherited);
    sub.primaryKey = [inherited.id];
    sub.foreignKeys.push(createForeignKey([inherited.id], target.id, [patente.id]));

    expect(attributeRole(sub, inherited.id)).toBe("pk+fk");
    expect(pkAttributes(sub).map((a) => a.name)).toEqual(["patente"]);
  });
});
