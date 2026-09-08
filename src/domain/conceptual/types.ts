// Modelo semantico conceptual (DER). Codigo de dominio puro: sin React, sin
// Dexie, sin nada visual. Describe QUE es cada elemento del DER; nunca como se
// dibuja (eso vive en el renderer Chen) ni como se guarda (eso vive en
// infrastructure/persistence). Ver docs/ARCHITECTURE.md y docs/ACADEMIC_RULES.md.
//
// Regla de oro (CLAUDE.md): el grafo visual nunca es la fuente de verdad. Una
// propiedad semantica (identificador, entidad debil, discriminante, ...) se
// guarda explicitamente aca, jamas se deduce de un estilo.
//
// Forma alineada con la especificacion original (seccion 15.1). El Incremento 2
// solo cubria entidad regular / atributo simple / relacion binaria; el
// Incremento 3 agrega entidad debil, atributos compuestos/multivaluados/
// derivados, relaciones unarias y ternarias, roles y jerarquias.

/** Cardinalidad maxima de un participante. Eje INDEPENDIENTE de la participacion. */
export type CardinalityBound = "1" | "N";

/**
 * Participacion de una entidad en una relacion. Eje INDEPENDIENTE de la
 * cardinalidad. "total" = toda instancia participa; "partial" = puede haber
 * instancias que no participen. Nunca fusionar con la cardinalidad en un
 * unico string (.claude/rules/domain.md).
 */
export type Participation = "total" | "partial";

/** Entidad regular (rectangulo) o debil (doble rectangulo). */
export type EntityKind = "regular" | "weak";

/**
 * Tipo de atributo conceptual:
 * - simple: ovalo;
 * - composite: agrupador conectado a sus componentes;
 * - multivalued: doble ovalo;
 * - derived: ovalo de linea punteada (calculado).
 */
export type AttributeKind = "simple" | "composite" | "multivalued" | "derived";

/** Grado (aridad) de una relacion: unaria, binaria o ternaria. */
export type RelationshipDegree = 1 | 2 | 3;

/** Ejes independientes de una jerarquia (spec 6.6). */
export type HierarchyPartition = "total" | "partial";
export type HierarchyOverlap = "exclusive" | "overlapping";

/**
 * Atributo de una entidad o de una relacion. Un atributo compuesto lleva
 * `components`; el identificador de una entidad es el conjunto de sus
 * atributos con `isIdentifier`. `isDiscriminator` marca el discriminante de
 * una entidad debil.
 */
export interface ConceptualAttribute {
  id: string;
  name: string;
  kind: AttributeKind;
  isIdentifier: boolean;
  isDiscriminator?: boolean;
  /** Solo para `kind === "composite"`: subatributos simples. */
  components?: ConceptualAttribute[];
}

/** Entidad. Regular = rectangulo; debil = doble rectangulo (spec 6.1, 6.3). */
export interface Entity {
  id: string;
  name: string;
  kind: EntityKind;
  attributes: ConceptualAttribute[];
}

/**
 * Un participante de una relacion: la entidad que participa mas su cardinalidad,
 * su participacion y (opcional) su rol. El rol desambigua cuando una misma
 * entidad participa mas de una vez (relaciones unarias, spec 6.4 / 7.6).
 */
export interface RelationshipParticipant {
  id: string;
  entityId: string;
  role?: string;
  cardinality: CardinalityBound;
  participation: Participation;
}

/**
 * Relacion (rombo). `degree` es la aridad intencional:
 * - 1 (unaria): exactamente dos participantes a la MISMA entidad, con roles
 *   distintos y no vacios;
 * - 2 (binaria): dos participantes a entidades distintas;
 * - 3 (ternaria): tres participantes a entidades distintas.
 * `identifying` marca la relacion identificadora de una entidad debil hacia su
 * entidad fuerte (spec 6.3).
 */
export interface Relationship {
  id: string;
  name: string;
  degree: RelationshipDegree;
  participants: RelationshipParticipant[];
  attributes: ConceptualAttribute[];
  identifying?: boolean;
}

/**
 * Jerarquia de generalizacion/especializacion (spec 6.6). Particion y
 * solapamiento son ejes independientes. El discriminante solo se admite en el
 * caso particion total + solapamiento exclusivo (convencion de catedra).
 */
export interface Hierarchy {
  id: string;
  name: string;
  superEntityId: string;
  subEntityIds: string[];
  partition: HierarchyPartition;
  overlap: HierarchyOverlap;
  discriminatorAttributeId?: string;
}

/** Diagrama de entidad-relacion completo. Serializable a JSON de forma directa. */
export interface ConceptualModel {
  entities: Entity[];
  relationships: Relationship[];
  hierarchies: Hierarchy[];
  /** Contador que aumenta con cada cambio estructural; base de trazabilidad. */
  revision: number;
}

/** Dueno posible de un atributo dentro del modelo. */
export type AttributeOwnerKind = "entity" | "relationship";

/** Tipo de elemento del modelo, para seleccion y validacion. */
export type ConceptualElementKind =
  | "entity"
  | "relationship"
  | "attribute"
  | "hierarchy";
