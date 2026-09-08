// Modelo semantico conceptual (DER) - Incremento 2. Codigo de dominio puro:
// sin React, sin Dexie, sin nada visual. Describe QUE es una entidad, un
// atributo, un identificador y una relacion binaria; nunca como se dibujan
// (eso vive en el renderer Chen) ni como se guardan (eso vive en
// infrastructure/persistence). Ver docs/ARCHITECTURE.md y docs/ACADEMIC_RULES.md.
//
// Regla de oro (CLAUDE.md): el grafo visual nunca es la fuente de verdad.
// Una propiedad semantica como "este atributo es identificador" se guarda
// explicitamente aca, jamas se deduce de un estilo (ej. subrayado).

/**
 * Cardinalidad maxima de un extremo de relacion. Eje INDEPENDIENTE de la
 * participacion: nunca se fusionan en un unico string (.claude/rules/domain.md).
 * Los grados unario/ternario y los roles llegan en el Incremento 3.
 */
export type CardinalityBound = "1" | "N";

/**
 * Participacion de una entidad en una relacion. Eje INDEPENDIENTE de la
 * cardinalidad. "total" = toda instancia de la entidad participa;
 * "partial" = puede haber instancias que no participen.
 */
export type Participation = "total" | "partial";

/**
 * Atributo simple de una entidad o de una relacion (Incremento 2). Los
 * atributos compuestos, multivaluados y derivados son del Incremento 3.
 */
export interface ConceptualAttribute {
  id: string;
  name: string;
  /**
   * Integra el identificador (clave) de su entidad. El identificador de la
   * entidad es el conjunto de sus atributos con este flag en `true`, por lo
   * que un identificador compuesto se representa marcando varios. En Chen se
   * dibuja subrayado, pero esa es representacion: la verdad esta en este flag.
   * En atributos de relacion se mantiene siempre en `false` en el Incremento 2.
   */
  isIdentifier: boolean;
}

/** Entidad regular (rectangulo en Chen). Entidad debil: Incremento 3. */
export interface Entity {
  id: string;
  name: string;
  attributes: ConceptualAttribute[];
}

/**
 * Un extremo de una relacion: la entidad que participa mas su cardinalidad y
 * su participacion, guardadas como ejes separados.
 */
export interface RelationshipEnd {
  entityId: string;
  cardinality: CardinalityBound;
  participation: Participation;
}

/**
 * Relacion (rombo en Chen). En el Incremento 2 es siempre binaria: `ends`
 * tiene exactamente dos elementos que referencian entidades distintas. Las
 * relaciones unarias y ternarias, y los roles, son del Incremento 3.
 */
export interface Relationship {
  id: string;
  name: string;
  ends: RelationshipEnd[];
  attributes: ConceptualAttribute[];
}

/** Diagrama de entidad-relacion completo. Serializable a JSON de forma directa. */
export interface ConceptualModel {
  entities: Entity[];
  relationships: Relationship[];
}

/** Dueno posible de un atributo dentro del modelo. */
export type AttributeOwnerKind = "entity" | "relationship";

/** Tipo de elemento del modelo, para seleccion y validacion. */
export type ConceptualElementKind = "entity" | "relationship" | "attribute";
