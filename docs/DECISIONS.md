# Decisiones de producto (PRODUCTO, no CATEDRA)

Registro de decisiones menores tomadas sobre la marcha, siguiendo el
criterio "mas simple, mantenible, accesible y rapido" cuando la
especificacion no fijaba una opcion unica. Agregar una entrada nueva por
decision, no reescribir las anteriores.

## 2026-09-07 - Bootstrap (Incremento 0)

- **Versionado de dependencias**: `package.json` usa `"latest"` para todas
  las dependencias en el bootstrap inicial. Al correr `npm install` por
  primera vez, npm resuelve las versiones estables vigentes en ese momento
  y las fija en `package-lock.json` (que se versiona en Git). Evita que se
  fijen versiones desactualizadas por conocimiento del asistente. A partir
  de ahi, actualizaciones deben hacerse explicitas (`npm outdated`,
  `npm update <paquete>`), no dejarse en `"latest"` indefinidamente en
  proyectos de mas largo plazo.
- **Electron en CommonJS**: `electron/main/index.cjs` y
  `electron/preload/index.cjs` se escriben en CommonJS (no ESM) para
  evitar friccion de interoperabilidad ESM/Electron en esta primera
  version. El resto del proyecto (`src/`) es ESM. Se puede migrar el
  proceso main a ESM mas adelante si Electron lo simplifica.
- **Notacion de dia 1**: se implementa unicamente Chen (la que usa la
  catedra). La arquitectura separa renderer de notacion y `RuleProfile`
  academico especificamente para que agregar otras notaciones (Incremento
  10) no requiera tocar el motor de reglas.
- **Empaquetado Electron completo diferido**: el Incremento 0 solo agrega
  un shell de Electron que abre una ventana (`npm run electron:dev`). La
  configuracion de `electron-builder` y el target `dist:win` portable se
  agregan en el Incremento 9, no antes, para no acoplar tooling de
  packaging a un producto que todavia no tiene funcionalidad real.
- **CI minimo primero**: `.github/workflows/ci.yml` corre
  typecheck/lint/test/build en cada push. E2E y el workflow de release
  (build de artefactos en un tag) se agregan en el Incremento 11.

## 2026-09-07 - Walking skeleton (Incremento 1)

- **Ajuste de tooling por TypeScript 6**: `npm install` resolvio
  `typescript@6.0.3`, que rompe la configuracion del Incremento 0
  (`baseUrl` deprecado, `tsc -b --noEmit` incompatible con proyectos
  referenciados, imports de CSS sin declaracion). Se resolvio: quitar
  `baseUrl` dejando solo `paths` (TS los resuelve relativo al tsconfig);
  reemplazar `tsc -b` por dos chequeos directos
  (`tsc -p tsconfig.json && tsc -p tsconfig.node.json`) sin project
  references ni `composite`; agregar `src/vite-env.d.ts` con la referencia
  a `vite/client` (declara los imports side-effect de `*.css`);
  `vitest.config.ts` ahora importa `defineConfig` de `vitest/config` para
  tener el tipo del bloque `test`. `.gitignore` ampliado (dist, tsbuildinfo,
  coverage, reportes de test).
- **Modelo del espacio de trabajo**: el arbol de proyecto se guarda como
  listas planas de `Folder` y `DocumentEntry` en Dexie (tablas separadas,
  indexadas por `projectId`/`parentId`), no como un JSON anidado dentro del
  proyecto. El anidamiento es una proyeccion pura (`buildWorkspaceTree`)
  que se calcula en la UI. En el Incremento 1 un documento es solo una
  entrada nombrada con un `kind` (`der` | `mr` | `combined`); todavia no
  tiene `ConceptualModel` ni `RelationalModel`.
- **`updatedAt` del proyecto**: cualquier escritura dentro de un proyecto
  (crear/renombrar/eliminar carpeta o documento) refresca `updatedAt` del
  proyecto, que es el criterio de orden de "Proyectos recientes".
- **Persistencia de sesion**: una unica fila `session` en Dexie guarda
  `lastProjectId` y `lastDocumentId`. Al iniciar, si el proyecto guardado
  ya no existe se limpia la sesion y se muestra la bienvenida.
- **Estado del shell**: `status` del store distingue `loading` / `empty`
  (bienvenida) / `ready` (shell completo). El estado efimero de UI
  (paneles abiertos, herramienta activa, vista DER/MR) vive en React state
  local dentro de `AppShell`, no en el store de dominio.
- **El arbol NO se expone como selector de Zustand**: construirlo en cada
  llamada devolveria una referencia nueva y `useSyncExternalStore` entraria
  en bucle de re-render. El Explorer selecciona `folders`/`documents`
  (referencias estables) y deriva el arbol con `useMemo`.
- **Tool rail y botones deshabilitados del header**: se incluyen en este
  incremento porque `docs/INCREMENTOS.md` los pide explicitamente como
  parte del "shell de interfaz completo y navegable". Esto flexibiliza,
  solo para el walking skeleton, la regla de `.claude/rules/ui.md` de no
  mostrar controles de incrementos futuros: undo/redo/validar/transformar/
  exportar aparecen deshabilitados y las herramientas de la rail
  (entidad, relacion, atributo, jerarquia, nota) solo cambian el estado
  visual, sin dibujar sobre el canvas todavia.
- **Atribucion de React Flow oculta** (`proOptions={{ hideAttribution: true }}`):
  `@xyflow/react` es MIT y lo permite; se prioriza la consigna estetica de
  "baja contaminacion visual" de la especificacion. Es una herramienta
  academica sin fines comerciales.
- **Dialogos sobre Radix**: se arma un unico primitivo `Modal`
  (`@radix-ui/react-dialog`) y encima `PromptDialog`, `ConfirmDialog` y
  `NewDocumentDialog`. Confirmacion explicita para toda eliminacion
  (proyecto, carpeta en cascada, documento).
