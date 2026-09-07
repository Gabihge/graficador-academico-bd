---
paths:
  - "src/domain/**/*.ts"
---

# Reglas del dominio (src/domain)

- Cero dependencias de React, React Flow, Radix o CSS. Este codigo debe
  poder testearse sin montar nada visual.
- IDs con `crypto.randomUUID()`.
- `ConceptualModel` (DER) y `RelationalModel` (MR) son los dos modelos
  semanticos. `ViewLayout` (posiciones, colores, estilo) vive separado y
  nunca contamina estos dos.
- No fusionar cardinalidad y participacion en un unico string: son dos
  propiedades independientes.
- Todo objeto de dominio es serializable a JSON de forma directa (lo
  persiste Dexie y lo exporta `.bdproj`).
