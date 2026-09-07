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

## Validacion academica

Severidades: `error` (bloquea transformacion/archivo valido), `warning`
(permite continuar), `info` (sugerencia). Casos minimos de DER y MR listados
en `docs/ESPECIFICACION_ORIGINAL.md` seccion 8 (se transcriben a fixtures de
test en el Incremento 3, no antes).

## Presentacion academica del MR (perfil UNLaM)

PK: subrayado. FK: negrita. PK+FK: ambas representaciones. Esta regla vive
en el `RuleProfile`, nunca hardcodeada en un componente generico.
