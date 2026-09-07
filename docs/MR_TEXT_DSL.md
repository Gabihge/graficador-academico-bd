# DSL del editor MR textual

Decision de PRODUCTO (no es una convencion de la catedra). Se implementa en
el Incremento 6, con CodeMirror 6 + parser Lezer.

## Sintaxis canonica

```text
// comentario de documento

ALUMNO(
  legajo @pk,
  idCarrera,
  nombre,

  @fk (idCarrera) -> CARRERA(idCarrera)
)

/*
  Comentario multilinea.
*/

INSCRIPCION(
  legajo @pk,
  codMateria @pk,
  fecha,

  @fk (legajo) -> ALUMNO(legajo),
  @fk (codMateria) -> MATERIA(codMateria)
)
```

- `NOMBRE(...)` define una relacion.
- Cada atributo ocupa preferentemente una linea en el formatter canonico.
- `@pk` marca participacion del atributo en la PK (admite PK compuesta).
- `@fk (...) -> RELACION(...)` declara la FK como restriccion de relacion
  (admite FK compuesta).
- Los comentarios (`//` y `/* */`) NO forman parte de la semantica
  academica, pero SI deben preservarse como anotaciones persistentes
  (no como texto descartable) - ver modelo `TextComment` mas abajo.
- No usar negrita/subrayado como mecanismo de parsing.

## Preservacion de comentarios

```ts
type TextCommentAnchor =
  | { kind: "document" }
  | { kind: "relation"; relationId: string; position: "before" | "after" }
  | { kind: "attribute"; relationId: string; attributeId: string; position: "before" | "after" | "inline" };

interface TextComment {
  id: string;
  style: "line" | "block";
  text: string;
  anchor: TextCommentAnchor;
}
```

El parser recupera comentarios y el formatter los reemite. Una edicion
grafica valida nunca borra comentarios ajenos al elemento editado.

## Borradores invalidos mientras se escribe

1. CodeMirror mantiene el borrador actual.
2. Se parsea con debounce corto.
3. Valido -> se actualiza el `RelationalModel`. Invalido -> se conserva el
   ultimo modelo valido.
4. Se muestran errores sin bloquear la escritura.
5. El borrador invalido nunca es reemplazado por un render automatico.
6. Si el usuario intenta salir del modo textual con errores: ofrecer volver
   a editar o descartar los cambios invalidos (nunca descartar en silencio).
