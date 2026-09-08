// Convenciones parametrizadas de la transformacion DER -> MR (spec 7). Son
// decisiones academicas versionadas: cuando spec 7 dice "segun la convencion
// de catedra" o "parametrizada", ese parametro vive aca, no como `if` suelto
// en el motor (docs/ACADEMIC_RULES.md, .claude/rules/academic.md).
//
// NO se agrega un slot `transform` a `AcademicRule`: el motor de transformacion
// es su propio modulo (src/features/transformation) y consume estas
// convenciones. El perfil de VALIDACION del Incremento 3 no se toca.

/** Donde ubicar la FK en una relacion binaria 1:1. */
export type OneToOneFkSide = "partial-side";

/** Como componer la PK de la relacion generada por una ternaria 1:1:N. */
export type Ternary11nPk = "n-side-plus-first-one-side";

/** Como elegir el par de claves para la PK de una ternaria 1:1:1. */
export type Ternary111Pk = "first-two-participants";

/** Como transformar una jerarquia. */
export type HierarchyStrategy = "table-per-entity";

/** Que hacer con un atributo derivado/calculado al transformar (spec 7.15). */
export type DerivedAttributePolicy = "keep-with-warning";

/** Presentacion academica del MR (spec: PK subrayado, FK negrita). */
export interface MrPresentation {
  pk: "underline";
  fk: "bold";
  pkfk: "underline+bold";
}

export interface TransformConventions {
  id: string;
  version: string;
  oneToOneFkSide: OneToOneFkSide;
  /**
   * Desempate 1:1 cuando ambos extremos tienen la misma participacion: la FK
   * va en el segundo participante (orden del array) y referencia al primero.
   */
  oneToOneTieBreak: "second-participant";
  ternary11nPk: Ternary11nPk;
  ternary111Pk: Ternary111Pk;
  hierarchyStrategy: HierarchyStrategy;
  derivedAttributePolicy: DerivedAttributePolicy;
  mrPresentation: MrPresentation;
}
