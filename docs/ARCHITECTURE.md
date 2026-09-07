# Arquitectura

## Principio rector: semantica antes que representacion

El grafo visual (React Flow) NO es la fuente de verdad. Existe un modelo
semantico propio, independiente de la libreria de canvas:

- una entidad es un objeto del dominio;
- una relacion es un objeto del dominio;
- una PK es una propiedad semantica;
- una FK es una restriccion semantica;
- el subrayado, negrita, color, posicion o forma son representacion.

Nunca deducir una PK porque un texto este subrayado en el renderer.

## Capas (no se mezclan)

1. dominio (`src/domain`)
2. reglas academicas (`src/academic`)
3. transformacion (`src/features/transformation`)
4. validacion (`src/features/validation`)
5. persistencia (`src/infrastructure/persistence`)
6. archivo portable `.bdproj` (`src/infrastructure/files`)
7. estado de aplicacion (`src/state`)
8. proyeccion grafica (React Flow, dentro de `src/features/der-editor` y `mr-editor`)
9. proyeccion textual (CodeMirror, dentro de `src/features/mr-text`)
10. interfaz (`src/components`, `src/features/*`)

Regla dura: nada bajo `src/domain` importa React (enforced por ESLint, ver
`.claude/rules/domain.md`).

## Modelo de dominio minimo

- `ConceptualModel`: entidades, atributos, relaciones, jerarquias (DER).
- `RelationalModel`: relaciones/esquemas, atributos, PK, FK (MR).
- `ViewLayout`: posiciones, colores, estilo - separado de ambos modelos.
- `RuleProfile`: reglas academicas versionadas (ver docs/ACADEMIC_RULES.md).
- `TransformationTrace`: de que elemento del DER salio cada elemento del MR,
  que regla se aplico, en que version del perfil.

IDs con `crypto.randomUUID()`. Todo objeto de dominio serializa a JSON de
forma directa.

## Estado

- Zustand para estado persistente de dominio + Immer para patches donde
  simplifique el historial de undo/redo.
- Estado efimero de UI (que panel esta abierto, hover, etc.) vive en React
  state local, no en el store de dominio.

## Notacion vs. reglas academicas (por que estan separadas)

`RuleProfile` (perfil UNLaM) determina que es VALIDO y como se TRANSFORMA
un DER a MR. El renderer de notacion (hoy: Chen) determina como se DIBUJA.
Son cosas distintas a proposito: la notacion vigente en la catedra es Chen,
pero la arquitectura ya esta preparada para agregar otras notaciones
(Crow's Foot, etc.) en el Incremento 10 sin tocar el motor de reglas ni el
motor de transformacion. Ver docs/INCREMENTOS.md.

## Persistencia y portabilidad

- IndexedDB via Dexie para autoguardado local.
- Formato `.bdproj` (JSON validado con Zod) para exportar/importar el
  proyecto completo de forma portable, sin backend.

## Escritorio (Electron)

- `contextIsolation: true`, `nodeIntegration: false`, preload minimo,
  IPC explicito y validado, renderer sin acceso directo a Node.
- Skeleton actual en CommonJS (`.cjs`) - ver docs/DECISIONS.md.
