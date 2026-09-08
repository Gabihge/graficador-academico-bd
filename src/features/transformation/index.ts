// API publica del motor de transformacion DER -> MR (Incremento 4).

export { transformDerToMr } from "./transform";
export type { TransformOptions, TransformResult } from "./transform";
export { presentRelationalModel, roleLabel } from "./present";
export type {
  PresentedSchema,
  PresentedAttribute,
  PresentedForeignKey,
} from "./present";
export { TRANSFORM_RULES } from "./rules";
export type { TransformRuleId } from "./rules";
export { MrReadonlyView } from "./MrReadonlyView";
export { MrResultModal } from "./MrResultModal";
export { RegenerateDialog } from "./RegenerateDialog";
