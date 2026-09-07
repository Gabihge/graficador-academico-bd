# Graficador Academico de Bases de Datos (DER/MR) - UNLaM

Herramienta academica NO oficial para modelar DER y MR (Bases de Datos 3636,
Ing. Informatica, UNLaM). Local-first, web + Electron portable. No es un
administrador de DBMS.

## Regla de oro

El grafo visual (React Flow) NUNCA es la fuente de verdad. Existe un modelo
semantico propio (`src/domain/`) independiente de cualquier renderer. Nunca
deducir una propiedad semantica (ej. PK) a partir de un estilo visual
(ej. subrayado).

## Como se construye este proyecto

Ciclo de vida INCREMENTAL. El plan completo de incrementos, con el alcance
exacto de cada uno y sus "gates" de aceptacion, esta en `docs/INCREMENTOS.md`.
Antes de tocar codigo, confirma en que incremento estamos y no adelantes
funcionalidad de incrementos futuros (ver `docs/DECISIONS.md` para lo que
ya se decidio explicitamente diferir).

Notacion DER vigente: **Chen** (la que usa la catedra), con las reglas
academicas de UNLaM superpuestas via `RuleProfile`. Soporte para otras
notaciones (Crow's Foot, etc.) es un incremento futuro: por eso el
renderer de notacion SIEMPRE debe estar separado del `RuleProfile`
academico (ver `docs/ARCHITECTURE.md`).

## Comandos

- `npm run dev` - servidor de desarrollo (Vite, puerto 5173)
- `npm run check` - typecheck + lint + test (correr antes de cada commit)
- `npm run build` - build web de produccion
- `npm run electron:dev` - abre el shell de Electron contra el dev server
- `npm run test:e2e` - Playwright

## Reglas de arquitectura que SIEMPRE aplican

- `src/domain/**` no importa React ni nada de UI (enforced por ESLint).
- Separar estado persistente de dominio (Zustand + Dexie) de estado efimero
  de UI (React state local).
- Ninguna regla academica como `if` suelto: vive en
  `src/academic/profiles/unlam` como `RuleProfile` versionado.
- No backend, no auth, no telemetria, no servicios cloud (principio local-first).
- Documentar cualquier decision menor no especificada en `docs/DECISIONS.md`
  en vez de bloquear el avance.

## Donde esta cada cosa (detalle bajo demanda, no lo repitas aca)

- Arquitectura y capas: `docs/ARCHITECTURE.md`
- Reglas academicas DER/MR (perfil UNLaM, notacion Chen): `docs/ACADEMIC_RULES.md`
- Sintaxis del DSL del editor MR textual: `docs/MR_TEXT_DSL.md`
- Formato de archivo `.bdproj`: `docs/FILE_FORMAT.md`
- Decisiones tecnicas ya tomadas: `docs/DECISIONS.md`
- Especificacion original completa (historica, NO releer salvo que se te pida
  explicitamente): `docs/ESPECIFICACION_ORIGINAL.md`

<!-- docs/ESPECIFICACION_ORIGINAL.md tiene 2500+ lineas: es la especificacion
     completa que dio origen a este proyecto. Es referencia historica, NO
     el documento de trabajo dia a dia. No la cargues completa salvo que
     el usuario pida explicitamente revisar un punto puntual de ella. -->
