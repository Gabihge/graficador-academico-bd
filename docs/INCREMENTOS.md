# Plan de incrementos

Ciclo de vida incremental. Cada incremento entrega algo que se puede correr
y ver, y tiene un "gate" que debe pasar antes de avanzar al siguiente. No se
adelanta funcionalidad de un incremento posterior dentro de uno anterior
(ni siquiera como boton deshabilitado).

Reemplaza al orden de "Fases" de `docs/ESPECIFICACION_ORIGINAL.md` seccion 35:
mismo contenido funcional, pero separando explicitamente un primer
incremento de interfaz completa (walking skeleton) antes de la profundidad
semantica de DER, tal como se decidio en la planificacion.

## Incremento 0 - Fundaciones (este)

Repositorio, tooling (Vite/TS/Tailwind/ESLint/Vitest/Playwright/Electron
skeleton), CLAUDE.md, reglas con scope, y toda la documentacion base.
Sin logica de producto.

**Gate:** `npm run dev`, `npm run build`, `npm run test`, `npm run electron:dev`
(abre una ventana vacia) funcionan desde una instalacion limpia.

## Incremento 1 - Walking skeleton (interfaz completa, funcionalidad minima)

Espacio de trabajo real: crear/abrir/renombrar/duplicar/eliminar proyecto,
crear carpetas, crear documento (tipo DER/MR/combinado), buscar, recordar
ultimo proyecto/documento abierto. Persistencia real con Dexie.

Shell de interfaz completo y navegable: header flotante (con los botones
del layout final, aunque transformar/validar/exportar esten deshabilitados),
tool rail, explorer funcional, inspector vacio, canvas de React Flow
montado (sin nodos editables todavia).

**Gate:** crear un proyecto, crear un documento DER vacio, cerrar la app y
reabrirlo sin perder nada. **CUMPLIDO** (2026-09-07): cubierto por el test
de integracion `tests/integration/workspace-persistence.test.ts` ("conserva
el proyecto y el documento DER tras cerrar y reabrir la app") y por el test
de componente `tests/app.test.tsx`. `npm run check` y `npm run build`
verdes desde instalacion limpia.

## Incremento 2 - DER basico (Chen)

`ConceptualModel` para entidad regular, atributo simple, identificador,
relacion binaria, cardinalidad y participacion. Renderer Chen para estos
elementos. Edicion completa (crear/mover/conectar/eliminar/undo/redo).
Validacion estructural minima.

**Gate:** se puede dibujar y validar un DER binario simple de punta a punta.

## Incremento 3 - DER avanzado + perfil UNLaM completo

Entidad debil, atributos compuestos/multivaluados/derivados, unarias,
ternarias, roles, jerarquias. `RuleProfile` UNLaM completo. Validacion
academica completa (seccion 8 de la especificacion original).

**Gate:** fixtures academicos validos/invalidos (seccion 26) pasan.

## Incremento 4 - Transformacion DER -> MR (automatica)

Motor determinista con trazabilidad (secciones 7 y 10). Primero solo el
modo automatico.

**Gate:** fixtures esperados de las 15 reglas de transformacion pasan.

## Incremento 5 - MR grafico

Editor de relaciones/esquemas, atributos, PK/FK simples y compuestas,
referencias. Misma fuente de verdad (`RelationalModel`) que el incremento 6.

## Incremento 6 - MR textual (DSL)

CodeMirror 6 + parser (Lezer) para la DSL de `docs/MR_TEXT_DSL.md`. Sync
bidireccional con el MR grafico. Preservacion de comentarios. Manejo de
borradores invalidos sin perder el ultimo modelo valido.

**Gate:** round-trip texto <-> modelo sin perdida; comentarios preservados.

## Incremento 7 - Transformacion guiada + regeneracion segura

Modo guiado paso a paso (seccion 9). Nunca sobrescribir un MR editado
manualmente sin confirmacion explicita (seccion 10).

## Incremento 8 - UX final

Command palette, atajos, temas, accesibilidad, colores personalizables sin
alterar semantica, toasts, menus contextuales.

## Incremento 9 - Offline / Escritorio / Exportacion

PWA (`vite-plugin-pwa`), empaquetado Electron portable Windows
(`electron-builder`, `dist:win`), exportacion PNG/SVG, import/export
`.bdproj` completo con Zod.

## Incremento 10 - Multi-notacion (futuro, fuera del alcance actual)

Agregar Crow's Foot (y eventualmente otras) como vistas alternativas del
mismo `ConceptualModel`. Posible porque desde el Incremento 0 el renderer
de notacion esta separado del `RuleProfile` academico. No se empieza a
trabajar en esto hasta que los incrementos 1-9 esten estables.

## Incremento 11 - QA y cierre

Performance, E2E completo, accesibilidad, CI/release, tag `v1.0.0`.

---

## Como se trabaja cada incremento (para ahorrar contexto)

1. Antes de empezar, releer solo este archivo + el/los docs especificos
   que toca el incremento (no `ESPECIFICACION_ORIGINAL.md` completo).
2. Trabajar en una rama `feature/<incremento>-<nombre-corto>`.
3. Correr `npm run check` antes de cada commit.
4. Al cerrar el incremento: actualizar este archivo marcando el gate como
   cumplido y agregar a `docs/DECISIONS.md` cualquier decision menor que
   se haya tomado sobre la marcha.
