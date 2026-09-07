---
paths:
  - "src/academic/**/*.ts"
---

# Perfil academico UNLaM (src/academic/profiles/unlam)

- Cada regla tiene: id, version, categoria, fuente (`CATEDRA` | `INFORMADA`
  | `PRODUCTO` | `GENERAL`), precondiciones, validacion, transformacion (si
  aplica), explicacion para el estudiante, severidad y al menos un test.
- Notacion visual por defecto: Chen (rectangulo=entidad, ovalo=atributo,
  rombo=relacion, subrayado=identificador). Ver docs/ACADEMIC_RULES.md para
  el detalle completo transcripto de la especificacion original.
- Ante una correccion de la catedra, se modifica el `RuleProfile` y sus
  tests - nunca el renderer generico.
- No inventar una regla de transformacion atribuida a la catedra si el
  material no la determina sin ambiguedad (ej. atributos calculados):
  emitir advertencia explicativa en vez de adivinar.
