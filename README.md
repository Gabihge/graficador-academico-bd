# Graficador Academico de Bases de Datos (DER/MR)

Herramienta academica **no oficial** para modelar DER y MR (Bases de Datos
3636, Ingenieria en Informatica, UNLaM). Local-first: funciona offline,
sin backend, con persistencia local y archivo portable `.bdproj`.
Disponible como web (PWA) y como ejecutable portable de Windows (Electron).

> No afiliada ni mantenida por UNLaM.

## Estado actual

Incremento 0 (bootstrap). Ver `docs/INCREMENTOS.md` para el plan completo
y en que incremento esta el proyecto ahora mismo.

## Empezar

Ver `docs/00_GUIA_DESDE_CERO.md` para la guia completa paso a paso. Resumen:

```bash
npm install
npm run dev          # servidor de desarrollo
npm run check        # typecheck + lint + test
npm run electron:dev # shell de escritorio
```

## Documentacion

| Archivo | Contenido |
|---|---|
| `docs/INCREMENTOS.md` | Plan de incrementos y gates de aceptacion |
| `docs/ARCHITECTURE.md` | Capas, modelo de dominio, decisiones estructurales |
| `docs/ACADEMIC_RULES.md` | Perfil academico UNLaM, notacion Chen, reglas DER/MR |
| `docs/MR_TEXT_DSL.md` | Sintaxis del editor de MR textual |
| `docs/FILE_FORMAT.md` | Formato `.bdproj` y persistencia local |
| `docs/DECISIONS.md` | Decisiones de producto no especificadas de antemano |
| `docs/ESPECIFICACION_ORIGINAL.md` | Especificacion completa original (referencia historica) |

## Stack

React + TypeScript + Vite, React Flow, Zustand + Immer, Dexie (IndexedDB),
Zod, Tailwind CSS 4 + Radix Primitives, CodeMirror 6 (desde el Incremento
6), Electron (portable Windows), Vitest + Testing Library + Playwright.
