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
