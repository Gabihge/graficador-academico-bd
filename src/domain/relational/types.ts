// Modelo semantico relacional (MR). Codigo de dominio puro: sin React, sin
// Dexie, sin nada visual. Es la contraparte del ConceptualModel: describe QUE
// es un esquema de relacion, un atributo, una PK y una FK; nunca como se
// dibujan ni como se guardan. Forma alineada con la especificacion original
// (seccion 15.2).
//
// El MR de este incremento (Incremento 4) se produce SOLO por transformacion
// automatica desde un DER y es de solo lectura. La edicion llega en el
// Incremento 5.

/** Atributo de un esquema de relacion. */
export interface RelationalAttribute {
  id: string;
  name: string;
}

/**
 * Clave foranea como OBJETO (spec 15.2): nunca un flag por atributo. Vincula
 * uno o mas atributos locales con los atributos de la clave de otro esquema.
 */
export interface ForeignKey {
  id: string;
  localAttributeIds: string[];
  targetRelationId: string;
  targetAttributeIds: string[];
}

/**
 * Esquema de relacion (una "tabla"). `primaryKey` es la lista de ids de
 * atributos que forman la clave primaria. Un atributo PK+FK surge porque su id
 * esta en `primaryKey` y a la vez en un `ForeignKey` (spec 15.2).
 */
export interface RelationSchema {
  id: string;
  name: string;
  attributes: RelationalAttribute[];
  primaryKey: string[];
  foreignKeys: ForeignKey[];
}

/** Nota libre del modelo relacional (todavia sin editor: Incremento 5+). */
export interface RelationalNote {
  id: string;
  text: string;
}

/** Modelo relacional completo. Serializable a JSON de forma directa. */
export interface RelationalModel {
  schemas: RelationSchema[];
  notes: RelationalNote[];
  /** Contador que aumenta con cada cambio; base de trazabilidad. */
  revision: number;
}

/**
 * Rol DERIVADO de un atributo dentro de su esquema:
 * - `pk`: solo en `primaryKey`;
 * - `fk`: solo en algun `ForeignKey`;
 * - `pk+fk`: en ambos;
 * - `plain`: en ninguno.
 * Nunca se guarda: se calcula (ver queries.ts).
 */
export type AttributeRole = "pk" | "fk" | "pk+fk" | "plain";
