// Metadata de las 15 reglas de transformacion DER -> MR (spec 7). Se usa para
// poblar `TraceEntry.ruleId` / `ruleTitle`. La logica vive en transform.ts.

export interface TransformRuleMeta {
  id: string;
  title: string;
}

export const TRANSFORM_RULES = {
  "7.1": { id: "7.1", title: "Entidad regular" },
  "7.2": { id: "7.2", title: "Binaria 1:1" },
  "7.3": { id: "7.3", title: "Binaria 1:N" },
  "7.4": { id: "7.4", title: "Binaria N:N" },
  "7.5": { id: "7.5", title: "Unaria 1:1 / 1:N" },
  "7.6": { id: "7.6", title: "Unaria N:N" },
  "7.7": { id: "7.7", title: "Atributo compuesto" },
  "7.8": { id: "7.8", title: "Atributo multivaluado" },
  "7.9": { id: "7.9", title: "Entidad debil" },
  "7.10": { id: "7.10", title: "Ternaria N:N:N" },
  "7.11": { id: "7.11", title: "Ternaria 1:N:N" },
  "7.12": { id: "7.12", title: "Ternaria 1:1:N" },
  "7.13": { id: "7.13", title: "Ternaria 1:1:1" },
  "7.14": { id: "7.14", title: "Jerarquias" },
  "7.15": { id: "7.15", title: "Atributos calculados" },
} as const satisfies Record<string, TransformRuleMeta>;

export type TransformRuleId = keyof typeof TRANSFORM_RULES;
