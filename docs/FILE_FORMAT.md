# Formato de archivo `.bdproj`

Se implementa en profundidad en el Incremento 9, pero la decision de forma
queda fijada desde el Incremento 0 para que la persistencia (Dexie, desde
el Incremento 1) sea compatible desde el principio.

- JSON validado con Zod al importar (nunca confiar en un `.bdproj` externo
  sin validar contra el esquema).
- Contiene: metadata del proyecto, arbol de carpetas/documentos,
  `ConceptualModel` y/o `RelationalModel` de cada documento, `ViewLayout`,
  y `TransformationTrace` cuando un MR es derivado de un DER.
- Importar un `.bdproj` nunca reemplaza el proyecto actual sin confirmacion
  explicita del usuario (principio de "no perdida silenciosa").
- Migraciones de formato: versionar el archivo (`schemaVersion`) para poder
  migrar `.bdproj` viejos sin perder datos.

## Persistencia local (Dexie / IndexedDB)

Mismo modelo de dominio que `.bdproj`, pero en IndexedDB para autoguardado
continuo sin intervencion del usuario. El `.bdproj` es el mecanismo de
exportacion/portabilidad; Dexie es el mecanismo de autoguardado.

Estado del esquema Dexie:

- **v1** (Incremento 1): espacio de trabajo (`projects`, `folders`,
  `documents`, `session`).
- **v2** (Incremento 2): `derDocuments` (`ConceptualModel` + `ViewLayout` por
  documento DER).
- **v3** (Incremento 4): `mrDocuments` (`RelationalModel` + `MrDerivation` +
  `TransformationTrace` por documento MR). Un MR derivado guarda de que DER y
  revision salio, con que perfil y version de convenciones.

Todos los upgrades son aditivos. La edicion del MR (y su `ViewLayout` propio)
llega en el Incremento 5; el import/export `.bdproj` en el Incremento 9.
