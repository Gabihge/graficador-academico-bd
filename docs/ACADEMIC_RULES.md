# Reglas academicas - perfil UNLaM (Bases de Datos 3636)

Fuente: material de catedra (DER, restricciones, formalizacion, practicas)
+ convenciones informadas de la cursada. Ver procedencia completa en
`docs/ESPECIFICACION_ORIGINAL.md` seccion 41.

Notacion visual vigente: **Chen** clasico, con las reglas de abajo
superpuestas. Otras notaciones son un incremento futuro (ver
docs/INCREMENTOS.md, Incremento 10) y NO deben condicionar el diseño del
`RuleProfile`: el perfil define semantica y validez academica, nunca dibujo.

## Forma de un `RuleProfile`

```ts
{ id: "unlam-bd", version: "1.0.0", label: "UNLaM - Bases de Datos", ... }
```

Cada regla individual: id, version, categoria, fuente
(`CATEDRA` | `INFORMADA` | `PRODUCTO` | `GENERAL`), precondiciones,
validacion, transformacion (si corresponde), explicacion para el
estudiante, severidad, ejemplos/tests. Nunca como `if` disperso en un
componente generico.

## Convenciones DER (notacion Chen + catedra)

- Entidad regular: rectangulo. Entidad debil: doble rectangulo.
- Atributo: ovalo. Identificador: subrayado. Multivaluado: doble ovalo.
  Calculado/derivado: ovalo de linea punteada. Compuesto: agrupador
  conectado a sus componentes.
- Entidad debil: relacion identificadora hacia la fuerte con doble linea;
  no se redibujan en la debil los identificadores heredados de la fuerte;
  la identificacion completa depende de identificador(es) de la(s)
  fuerte(s) + discriminante(s).
- Relacion: rombo. Soporta atributos propios, grado unario/binario/ternario,
  y roles cuando una misma entidad participa mas de una vez.
- Cardinalidad (1:1, 1:N, N:N) y participacion (total, parcial) son ejes
  INDEPENDIENTES: nunca fusionar en un unico string en el dominio.
- Jerarquias: supraentidad + subentidades, particion (total|parcial) y
  solapamiento (exclusivo|inclusivo) son ejes independientes. El atributo
  discriminante solo aplica al caso de particion total sin solapamiento,
  segun el material de catedra.

## Transformacion DER -> MR (determinista, con trazabilidad)

Cada resultado guarda: elemento(s) de origen, regla aplicada, perfil y
version, fecha, revision del DER de origen.

| # | Caso | Regla |
|---|------|-------|
| 7.1 | Entidad regular | Genera una relacion; identificadores -> PK; atributos simples -> atributos |
| 7.2 | Binaria 1:1 | FK ubicada segun convencion versionada (nunca duplicada en ambos extremos salvo regla explicita); casos total/total, total/parcial, parcial/total, parcial/parcial cubiertos con tests |
| 7.3 | Binaria 1:N | PK del extremo 1 viaja como FK a la relacion del extremo N |
| 7.4 | Binaria N:N | Nueva relacion con FKs de ambas entidades; sus identificadores forman la PK; atributos propios de la relacion DER se incorporan |
| 7.5 | Unaria 1:1 / 1:N | FK autorreferenciada; se conservan los roles para distinguir origen/destino |
| 7.6 | Unaria N:N | Nueva relacion; la clave de la entidad participa dos veces (por rol) |
| 7.7 | Atributo compuesto | Se elimina el agrupador; sus componentes pasan a ser atributos |
| 7.8 | Atributo multivaluado | Se transforma conceptualmente a entidad debil y luego se aplica 7.9; se mantiene trazabilidad hasta la relacion resultante |
| 7.9 | Entidad debil | La relacion generada incluye discriminante(s) + atributos propios + FK heredada(s), que tambien integran la PK |
| 7.10 | Ternaria N:N:N | Nueva relacion; las tres FK forman la PK |
| 7.11 | Ternaria 1:N:N | Nueva relacion; solo los atributos de los extremos N forman la PK; los tres participantes siguen como FK |
| 7.12 | Ternaria 1:1:N | Nueva relacion; composicion de PK segun convencion, cubierta con fixture academico |
| 7.13 | Ternaria 1:1:1 | Nueva relacion; se elige un par de atributos para la clave de forma deterministica; el modo guiado explicita la eleccion |
| 7.14 | Jerarquias | El identificador de la supraentidad puede aparecer como PK+FK en las subentidades; se mantiene trazabilidad de herencia |
| 7.15 | Atributos calculados | Si no hay regla academica inequivoca: se conserva la propiedad en el DER y se emite advertencia en vez de inventar una transformacion |

### Convenciones de transformacion versionadas (`unlam-bd` 1.0.0)

Implementadas en `src/features/transformation` y parametrizadas por
`unlamTransformConventions` (`src/academic/profiles/unlam/transform-conventions.ts`).
Donde spec 7 dice "segun la convencion de catedra" o "parametrizada", el
parametro vive ahi, no como `if` suelto en el motor.

- **7.2 (1:1)**: la FK va en el extremo de participacion **parcial** y
  referencia al extremo **total**. Desempate (total/total o parcial/parcial):
  la FK va en el **segundo participante** (orden del array) referenciando al
  primero; la trazabilidad deja nota de que la fusion en una sola tabla
  (total/total) o una tabla puente (parcial/parcial) tambien serian validas.
- **7.3 (1:N)**: en notacion Chen, el participante con cardinalidad "1"
  relaciona cada instancia con una sola del otro lado; ese esquema recibe la
  FK, que referencia al participante con cardinalidad "N".
- **7.6 (unaria N:N)**: ambas columnas de la clave se prefijan por rol
  (`<rol>_<pk>`), aunque no colisionen, para que sean inequivocas.
- **7.12 (1:1:N)**: PK = FK al extremo N + FK al **primer** extremo 1 (orden
  del array). El otro par tambien seria clave candidata (nota en la traza).
- **7.13 (1:1:1)**: PK = FK a `participants[0]` + FK a `participants[1]`. Los
  otros pares son igual de validos; el modo guiado (Incremento 7) expondra la
  eleccion.
- **7.14 (jerarquias)**: estrategia **una tabla por entidad**. La supraentidad
  genera su esquema (7.1); cada subentidad genera su esquema cuya PK **es** la
  PK de la supraentidad, y esos atributos son ademas FK a la supraentidad
  (PK+FK). Igual para total/parcial y exclusiva/solapada en la v1.0.0.
- **7.15 (derivados)**: politica `keep-with-warning`. El atributo se conserva
  como atributo comun y se emite una entrada de traza `warning`; no se inventa
  una transformacion.
- **Nombre de atributo FK**: igual al nombre del atributo PK referenciado;
  ante colision (o en 7.6), se prefija con el rol del participante o el nombre
  de la entidad de origen (deterministico).

Presentacion academica del MR (spec: PK subrayado, FK negrita, PK+FK ambas)
tambien vive en estas convenciones (`mrPresentation`), no hardcodeada en el
componente.

## Validacion academica

Severidades: `error` (bloquea transformacion/archivo valido), `warning`
(permite continuar), `info` (sugerencia). Casos minimos de DER y MR listados
en `docs/ESPECIFICACION_ORIGINAL.md` seccion 8.

### `RuleProfile` UNLaM v1.0.0 - reglas DER (Incremento 3)

Implementado en `src/academic/profiles/unlam/`. Cada regla es un objeto
(`id`, `version`, `category`, `source`, `explanation`, `severity`, `evaluate`);
la precondicion vive dentro de `evaluate` (si no aplica devuelve `[]`). El
slot de transformacion DER -> MR lo agrega el Incremento 4. `validateDer`
(`src/features/validation`) corre este perfil y reemplaza a la "validacion
estructural minima" del Incremento 2.

| Regla | Categoria | Fuente | Severidad |
|---|---|---|---|
| `unlam.entity.name-required` | entidad | GENERAL | error |
| `unlam.entity.name-unique` | entidad | PRODUCTO | warning |
| `unlam.entity.regular-identifier-required` | entidad | CATEDRA | error |
| `unlam.attribute.name-required` | atributo | GENERAL | error |
| `unlam.attribute.name-unique-per-owner` | atributo | PRODUCTO | warning |
| `unlam.attribute.composite-needs-components` | atributo | CATEDRA | error |
| `unlam.attribute.non-composite-has-components` | atributo | GENERAL | warning |
| `unlam.attribute.identifier-should-be-simple` | atributo | CATEDRA | warning |
| `unlam.relationship.name-required` | relacion | GENERAL | error |
| `unlam.relationship.participant-entity-exists` | relacion | GENERAL | error |
| `unlam.relationship.degree-matches-participants` | relacion | CATEDRA | error |
| `unlam.relationship.binary-ternary-distinct-entities` | relacion | CATEDRA | error |
| `unlam.relationship.unary-roles-required` | relacion | CATEDRA | error |
| `unlam.relationship.identifier-attribute-only-nn` | relacion | CATEDRA | warning |
| `unlam.relationship.ternary-cardinality-note` | relacion | INFORMADA | info |
| `unlam.weak-entity.identifying-relationship-required` | entidad-debil | CATEDRA | error |
| `unlam.weak-entity.discriminator-required` | entidad-debil | CATEDRA | error |
| `unlam.weak-entity.identifying-relationship-shape` | entidad-debil | CATEDRA | warning |
| `unlam.relationship.identifying-requires-weak` | entidad-debil | CATEDRA | warning |
| `unlam.hierarchy.super-required` | jerarquia | CATEDRA | error |
| `unlam.hierarchy.subentities-required` | jerarquia | CATEDRA | error (0) / warning (1) |
| `unlam.hierarchy.refs-exist` | jerarquia | GENERAL | error |
| `unlam.hierarchy.super-not-sub` | jerarquia | GENERAL | error |
| `unlam.hierarchy.discriminator-combination` | jerarquia | CATEDRA | error |
| `unlam.hierarchy.discriminator-exists` | jerarquia | GENERAL | error |

Excepciones a `entity.regular-identifier-required`: entidades debiles (se
identifican por su entidad fuerte + discriminante) y subentidades de una
jerarquia (heredan el identificador de la supraentidad).

## Presentacion academica del MR (perfil UNLaM)

PK: subrayado. FK: negrita. PK+FK: ambas representaciones. Esta regla vive
en el `RuleProfile`, nunca hardcodeada en un componente generico.
