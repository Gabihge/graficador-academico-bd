// API publica del motor de reglas academicas.

export * from "./types";
export * from "./transform-types";
export { runProfile, isModelValid, SEVERITY_LABELS } from "./engine";
export {
  unlamProfile,
  UNLAM_PROFILE_ID,
  UNLAM_PROFILE_VERSION,
} from "./profiles/unlam";
export {
  unlamTransformConventions,
  UNLAM_TRANSFORM_CONVENTIONS_VERSION,
} from "./profiles/unlam/transform-conventions";
