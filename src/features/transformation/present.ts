// Proyeccion pura de un RelationalModel a una estructura de display, con la
// presentacion academica del MR (spec: PK subrayado, FK negrita, PK+FK ambas).
// La regla de estilo vive en las convenciones del perfil, no hardcodeada.
// Reutilizada por el modal y por la vista de solo lectura.

import {
  attributeRole,
  type RelationalModel,
  type AttributeRole,
} from "@/domain/relational";
import type { MrPresentation } from "@/academic";

export interface PresentedForeignKey {
  localAttributeNames: string[];
  targetSchemaName: string;
  targetAttributeNames: string[];
}

export interface PresentedAttribute {
  name: string;
  role: AttributeRole;
  /** Estilo textual segun la presentacion academica ("underline", "bold", ...). */
  emphasis: MrPresentation["pk"] | MrPresentation["fk"] | MrPresentation["pkfk"] | "none";
}

export interface PresentedSchema {
  name: string;
  attributes: PresentedAttribute[];
  foreignKeys: PresentedForeignKey[];
}

const ROLE_LABEL: Record<AttributeRole, string> = {
  pk: "PK",
  fk: "FK",
  "pk+fk": "PK+FK",
  plain: "",
};

export function roleLabel(role: AttributeRole): string {
  return ROLE_LABEL[role];
}

export function presentRelationalModel(
  model: RelationalModel,
  presentation: MrPresentation,
): PresentedSchema[] {
  const nameById = new Map<string, string>();
  for (const schema of model.schemas) nameById.set(schema.id, schema.name);

  return model.schemas.map((schema) => {
    const attributeNameById = new Map<string, string>();
    for (const attribute of schema.attributes) {
      attributeNameById.set(attribute.id, attribute.name);
    }

    return {
      name: schema.name,
      attributes: schema.attributes.map((attribute) => {
        const role = attributeRole(schema, attribute.id);
        const emphasis =
          role === "pk"
            ? presentation.pk
            : role === "fk"
              ? presentation.fk
              : role === "pk+fk"
                ? presentation.pkfk
                : "none";
        return { name: attribute.name, role, emphasis } satisfies PresentedAttribute;
      }),
      foreignKeys: schema.foreignKeys.map((fk) => ({
        localAttributeNames: fk.localAttributeIds.map(
          (id) => attributeNameById.get(id) ?? "?",
        ),
        targetSchemaName: nameById.get(fk.targetRelationId) ?? "?",
        targetAttributeNames: fk.targetAttributeIds.map((id) => {
          const target = model.schemas.find((s) => s.id === fk.targetRelationId);
          return target?.attributes.find((a) => a.id === id)?.name ?? "?";
        }),
      })),
    } satisfies PresentedSchema;
  });
}
