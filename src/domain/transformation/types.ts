// Trazabilidad de la transformacion DER -> MR (spec 7 y 10). Codigo de dominio
// puro. La transformacion en si vive en src/features/transformation; aca solo
// estan las formas de datos que persisten junto al MR derivado.

/**
 * Metadata de un MR derivado de un DER (spec 10). Permite saber de que DER y de
 * que revision salio, con que perfil y convenciones, y si el usuario lo edito a
 * mano despues (para no sobrescribirlo en silencio al regenerar).
 */
export interface MrDerivation {
  generatedFromDocumentId: string;
  generatedFromRevision: number;
  ruleProfileId: string;
  ruleProfileVersion: string;
  transformConventionsVersion: string;
  isDerived: true;
  /** Siempre false hasta que exista edicion de MR (Incremento 5). */
  hasManualChanges: boolean;
  /** ISO-8601. */
  generatedAt: string;
}

/** Un paso de la transformacion: de que salio cada elemento del MR. */
export interface TraceEntry {
  id: string;
  /** Id de la regla de spec 7 (ej. "7.4"). */
  ruleId: string;
  ruleTitle: string;
  /** Ids de los elementos del DER que originaron este resultado. */
  sourceElementIds: string[];
  targetKind: "schema" | "attribute" | "foreignKey";
  /** Id del elemento del MR resultante. */
  targetId: string;
  severity: "info" | "warning";
  /** Explicacion adicional (ej. eleccion de ubicacion de FK, alternativas). */
  note?: string;
}

export interface TransformationTrace {
  entries: TraceEntry[];
}
