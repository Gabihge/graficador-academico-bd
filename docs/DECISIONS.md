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

## 2026-09-07 - DER basico (Incremento 2)

- **Identificador como flag por atributo**: `ConceptualAttribute.isIdentifier`
  es un booleano; el identificador de una entidad es el conjunto de sus
  atributos con el flag en `true`. Se eligio sobre una lista separada de
  "atributos clave" en la entidad porque simplifica el sync con la UI (un
  checkbox por atributo) y con el borrado, y ya soporta identificador
  compuesto. Es propiedad semantica: el subrayado de Chen se deriva de ella,
  nunca al reves (regla de oro de CLAUDE.md).
- **Cardinalidad y participacion por extremo y como ejes separados**: cada
  `RelationshipEnd` guarda `cardinality` (`"1" | "N"`) y `participation`
  (`"total" | "partial"`) como campos distintos, nunca un string fusionado
  tipo `"1:N total"` (.claude/rules/domain.md). Valores por defecto al
  conectar: `"N"` y `"partial"`.
- **Relacion siempre binaria en este incremento**: `connect` es no-op si la
  relacion ya tiene dos extremos o si la entidad ya esta conectada. Unarias,
  ternarias y roles son del Incremento 3. La validacion estructural marca como
  error toda relacion con aridad distinta de dos o que repita una entidad.
- **Validacion del Incremento 2 = solo integridad estructural**: vive en
  `src/features/validation/structural.ts` y chequea forma del grafo (nombres
  presentes, relaciones binarias bien formadas, referencias consistentes,
  nombres duplicados, entidad sin identificador). NO es la validacion
  academica de la catedra: esa se implementa como `RuleProfile` versionado en
  `src/academic/profiles/unlam` en el Incremento 3, tal como ya anticipaban
  `docs/ACADEMIC_RULES.md` e `docs/INCREMENTOS.md`. Por eso no hay ninguna
  regla de catedra como `if` suelto en el validador estructural.
- **Atributos como ovalos-nodo en Chen**: cada atributo se dibuja como un
  ovalo propio conectado por una linea a su dueno (entidad o relacion), no
  como texto dentro del rectangulo. Es la notacion Chen estricta de
  `docs/ACADEMIC_RULES.md`; decision confirmada con el usuario al arrancar el
  incremento.
- **Participacion distinguible sin color**: la arista de participacion total
  se dibuja con linea doble (dos trazos paralelos) y la parcial con linea
  simple; la etiqueta ademas rotula "total"/"parcial" y la cardinalidad.
  Cumple `.claude/rules/ui.md` (el color nunca es el unico indicador).
- **Estado del editor DER en un store propio**: `src/state/derEditorStore.ts`
  (Zustand) tiene el `ConceptualModel`, el `ViewLayout`, la seleccion y el
  historial de undo/redo. El estado efimero de UI (herramienta activa,
  pestana del inspector, paneles) sigue en React state local del shell.
- **`ViewLayout` separado del modelo**: las posiciones de los nodos
  (`src/domain/view/layout.ts`) se persisten junto al `ConceptualModel` pero
  como objeto aparte, indexado por id de elemento. Mover un nodo no toca la
  semantica. El canvas nunca es fuente de verdad.
- **Historial de undo/redo en memoria y por documento**: no se persiste; se
  descarta al cerrar o cambiar de documento. Tope 100 entradas. Un arrastre
  de nodo es una unica entrada de historial (snapshot al empezar el gesto).
- **Persistencia Dexie v2**: nueva tabla `derDocuments` (`documentId` ->
  `{ model, layout, updatedAt }`). Upgrade aditivo: no migra ni toca las
  tablas del Incremento 1. Escritura con debounce de 400 ms; se expone
  `flushDerEditorPersistence()` para forzarla (tests / cierre).
- **Limpieza de contenido DER al borrar**: `deleteDocument`,
  `deleteFolderCascade` y `deleteProjectCascade` ahora tambien borran las
  filas de `derDocuments` de los documentos afectados, para no dejar
  huerfanos que introduce este incremento.
- **`workspaceStore.setSaveState`**: se agrego esta accion para que el editor
  DER (que persiste su propio contenido fuera de ese store) pueda reflejar
  "Guardando..."/"Guardado" en el indicador ya existente del header.
  Acoplamiento minimo y explicito entre los dos stores.
- **Botones del header habilitados en este incremento**: Deshacer, Rehacer y
  Validar pasan a funcionar cuando hay un documento DER activo. Transformar y
  Exportar siguen deshabilitados (Incrementos 4 y 9).
- **Herramientas "Jerarquia" y "Nota" siguen inertes**: se mantienen visibles
  pero sin efecto (continua la excepcion documentada del Incremento 1).
  "Jerarquia" se activa en el Incremento 3; "Nota", cuando corresponda.

### Pendientes detectados (revisar en incrementos futuros, NO se tocan ahora)

- `duplicateDocument`, `duplicateProject` y `cloneProject` todavia NO copian
  el `ConceptualModel` / `ViewLayout` de los documentos DER: siguen copiando
  solo la entrada del arbol, como en el Incremento 1. Al duplicar, el DER
  destino arranca vacio. Revisar cuando duplicar con contenido sea un
  requisito.
- La tool rail expone "Jerarquia" y "Nota" como controles inertes, lo que
  roza `.claude/rules/ui.md` ("no mostrar controles de incrementos futuros").
  Reconciliar al implementarlas.
- El renombrado de elementos del DER es solo por el Inspector; evaluar edicion
  inline sobre el propio nodo del canvas mas adelante.

## 2026-09-07 - DER avanzado + perfil UNLaM (Incremento 3)

- **Modelo alineado a la forma canonica (spec 15.1)**: se refactorizo el
  `ConceptualModel` del Incremento 2 (necesario: no podia expresar entidad
  debil, ternarias ni jerarquias). `Relationship.ends` -> `participants` (con
  `id` y `role?`); `Relationship.degree` (1|2|3) y `Relationship.identifying?`;
  `Entity.kind: "regular" | "weak"`; `ConceptualAttribute` gana
  `kind: "simple"|"composite"|"multivalued"|"derived"`, `components?`,
  `isDiscriminator?`; `ConceptualModel` gana `hierarchies: Hierarchy[]` y
  `revision: number`. Se prefirio alinear ahora, con la superficie chica, a
  reconciliar en el Incremento 4.
- **`degree` como aridad intencional**: se guarda (default 2) y la validacion
  compara `participants` contra `degree`. La relacion unaria es `degree 1` con
  **dos** participantes a la **misma** entidad y **roles distintos no vacios**
  (spec 7.6); binaria/ternaria = `degree` participantes a entidades distintas.
- **Atributo compuesto se dibuja en el canvas**: el ovalo agrupador con un
  ovalo hijo por componente, unidos por linea (notacion Chen 6.2). Los
  componentes se editan en el Inspector y tambien son nodos.
- **La validacion academica reemplaza a la estructural**: `src/features/
  validation` pasa a exponer `validateDer(model)`, que corre el `RuleProfile`
  UNLaM completo (`src/academic`). El perfil incluye tanto reglas de
  integridad de modelo (`source: "GENERAL"`, antes en `structural.ts`, ahora
  borrado) como reglas de catedra (`CATEDRA` / `INFORMADA`). Ninguna regla
  como `if` suelto.
- **Reglas solo con `evaluate` (sin transformacion)**: `AcademicRule` en el
  Incremento 3 solo valida. El slot de transformacion DER -> MR (spec 7) lo
  agrega el Incremento 4 como tipo companero, sin tocar estas reglas. La
  "precondicion" de la spec se resuelve dentro de `evaluate` (si no aplica
  devuelve `[]`).
- **Interpretacion del gate**: "fixtures seccion 26" para este incremento son
  los items 1-22 (estructura DER + veredicto valido/invalido bajo el perfil).
  Los items 23-28 (FK, PK+FK, round-trip DSL, comentarios, `.bdproj`) son de
  los Incrementos 4-9. Sin transformacion DER -> MR.
- **Excepcion de identificador para subentidades**: `entity.regular-identifier-
  required` no dispara para entidades debiles ni para subentidades de una
  jerarquia (heredan el identificador de la supraentidad).
- **Migracion por normalizacion en la carga, no por version de Dexie**: el
  keyPath de `derDocuments` no cambia; solo cambia la forma del valor.
  `migrateConceptualModel(raw)` (dominio, idempotente) actualiza cualquier
  forma vieja (`ends` -> `participants`, `kind` por defecto, `hierarchies: []`,
  `revision: 0`) y se aplica en `derDocumentRepo.loadDerDocument`.
- **`revision`** se incrementa en cada commit estructural del store (base de la
  trazabilidad de transformacion del Incremento 4).
- **Jerarquia por canvas**: la primera entidad conectada es la supraentidad;
  las siguientes, subentidades (ajustable desde el Inspector). El discriminante
  se limpia automaticamente si la combinacion particion/solapamiento deja de
  admitirlo (solo total + exclusiva).
- **El Inspector aparece al seleccionar** (spec 11.5): `AppShell` se suscribe
  al `derEditorStore` y abre el panel cuando la seleccion pasa de vacia a un
  elemento. La pestana "Estilo" del Inspector sigue pendiente (Incremento 8).
- **Herramienta "Jerarquia" activada**; "Nota" sigue inerte (las notas son del
  Incremento 8). Las variantes (entidad debil, tipo de atributo) se eligen en
  el Inspector, no con un boton por subtipo (spec 11.3).

### Pendientes detectados (revisar en incrementos futuros, NO se tocan ahora)

- Transformacion DER -> MR y el slot `transform` de las reglas del perfil:
  Incremento 4.
- Multiseleccion, copiar/cortar/pegar, alinear/distribuir, auto-layout,
  minimapa y la herramienta "Nota": Incremento 8 (spec 4.2 los lista pero el
  gate del Incremento 3 no los pide).
- `duplicateDocument` / `duplicateProject` / `cloneProject` siguen sin copiar
  el `ConceptualModel` / `ViewLayout` (arrastrado del Incremento 2).
- Layouts separados por notacion (spec 15.3): hoy hay un unico `ViewLayout`
  por documento. Relevante recien con Crow's Foot (Incremento 10).
- `ConceptualModel.notes` (spec 15.1): no se agrego todavia; llega con las
  notas del Incremento 8.
