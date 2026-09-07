# Especificación maestra para Work — Graficador Académico de Bases de Datos

**Documento:** especificación de implementación V1  
**Versión:** 1.0  
**Fecha:** 1 de septiembre de 2026  
**Objetivo:** entregar este archivo a ChatGPT Work para que construya una primera versión completa, ejecutable, testeada, documentada y preparada para versionarse con Git y publicarse en GitHub.

---

# 0. Instrucción principal para Work

Construí la **V1 completa** del producto descripto en este documento.

No desarrolles solamente un prototipo visual ni una demo. La entrega debe ser una aplicación funcional que permita crear, editar, validar, guardar, importar/exportar y transformar modelos DER y MR dentro de los límites especificados.

Trabajá incrementalmente internamente, pero la entrega final de este trabajo debe contener todos los entregables de V1.

Reglas de ejecución:

1. Este documento es la fuente funcional y técnica principal.
2. Las reglas académicas marcadas como `CÁTEDRA` son obligatorias para el perfil académico UNLaM.
3. Las reglas marcadas como `PRODUCTO` son decisiones de diseño de esta aplicación y no deben presentarse como reglas de la cátedra.
4. Las reglas marcadas como `INFORMADA` provienen de convenciones observadas/informadas de la cursada y deben mantenerse desacopladas para poder modificarse posteriormente.
5. Si una decisión menor no está especificada, elegí la opción más simple, mantenible, accesible y rápida que preserve los principios de este documento.
6. No bloquees la implementación por decisiones menores: documentá la decisión en `docs/DECISIONS.md`.
7. No dejes `TODO`, mocks o botones sin implementar para funcionalidades centrales de V1.
8. No agregues backend, autenticación, telemetría, base de datos remota ni dependencia de servicios cloud.
9. Usá únicamente versiones **estables** de las dependencias; no usar beta, RC o APIs experimentales salvo que sea estrictamente imprescindible y quede documentado.
10. Usá **npm** y generá/actualizá `package-lock.json`.
11. Antes de considerar terminada la entrega, deben pasar typecheck, lint, tests, build web y build de escritorio.
12. El código debe ser entendible por una persona que viene principalmente de Google Apps Script. La documentación forma parte obligatoria de la entrega.

---

# 1. Visión del producto

Construir una herramienta académica para modelado de bases de datos orientada principalmente a estudiantes de **Bases de Datos (3636) de Ingeniería en Informática de UNLaM**.

La aplicación debe tener la simpleza y rapidez de un graficador académico, pero con:

- modelado DER completo;
- modelo relacional gráfico y textual;
- reglas académicas versionadas;
- transformación DER → MR explicable;
- validación académica;
- persistencia local;
- trabajo offline;
- archivo portable;
- ejecutable Windows portable;
- experiencia moderna, limpia y rápida.

No es una herramienta de administración de DBMS.

No debe mezclar:

- modelo conceptual;
- modelo relacional/lógico;
- modelo físico.

El producto debe poder evolucionar posteriormente hacia otros perfiles académicos sin reescribir su núcleo.

---

# 2. Principios no negociables

## 2.1. Semántica antes que representación

El grafo visual NO es la fuente de verdad.

Debe existir un modelo semántico propio independiente de React Flow.

Ejemplo:

- una entidad es un objeto del dominio;
- una relación es un objeto del dominio;
- una PK es una propiedad semántica;
- una FK es una restricción semántica;
- el subrayado, negrita, color, posición o forma son representación.

Nunca deducir una PK porque un texto esté subrayado.

## 2.2. Separación de capas

Mantener separadas como mínimo:

1. dominio;
2. reglas académicas;
3. transformación;
4. validación;
5. persistencia;
6. archivo portable;
7. estado de aplicación;
8. proyección gráfica;
9. proyección textual;
10. interfaz.

## 2.3. Local-first

La aplicación funciona sin backend.

Los datos académicos se procesan y persisten localmente.

La red no debe ser necesaria para:

- editar;
- transformar;
- validar;
- guardar;
- reabrir;
- exportar;
- importar.

## 2.4. Interacción de impacto inmediato

Toda acción local debe dar feedback visual inmediatamente.

Persistencia, validación pesada, auto-layout y tareas secundarias no deben bloquear innecesariamente la interacción principal.

No utilizar loaders de pantalla completa para operaciones locales normales.

## 2.5. No pérdida silenciosa

Nunca:

- sobrescribir un MR editado manualmente al regenerar;
- perder comentarios del editor textual;
- eliminar contenido por una migración sin advertencia;
- reemplazar un proyecto por importación sin confirmación;
- descartar un borrador textual inválido silenciosamente.

## 2.6. Accesibilidad y color

El color es presentación, nunca la única portadora de significado.

PK, FK, errores, selecciones, cardinalidad y otros estados deben poder reconocerse sin depender únicamente del color.

---

# 3. Identidad académica y branding

La aplicación es una **herramienta académica no oficial**.

Puede usar el logo oficial de UNLaM como contexto visual académico si el asset es obtenido de una fuente oficial o provisto por el usuario.

Reglas:

- no redibujar ni inventar el logo;
- conservar proporciones;
- no deformarlo;
- no usarlo como si la aplicación fuera un producto institucional oficial;
- incluir en `Acerca de` la leyenda: `Herramienta académica no oficial. No afiliada ni mantenida por UNLaM.`;
- documentar origen del asset en `docs/BRANDING.md`;
- si no puede obtenerse un asset oficial con suficiente seguridad, usar temporalmente texto `UNLaM` y dejar documentado cómo reemplazarlo.

La marca visual de la aplicación debe ser subordinada al espacio de trabajo: el canvas es el protagonista.

---

# 4. Alcance funcional V1

## 4.1. Espacio de trabajo

Permitir:

- crear proyecto;
- abrir proyecto reciente;
- renombrar;
- duplicar;
- eliminar;
- importar `.bdproj`;
- exportar `.bdproj`;
- crear carpetas;
- crear subcarpetas;
- mover elementos;
- renombrar elementos;
- duplicar documentos;
- eliminar con confirmación;
- buscar por nombre dentro del proyecto;
- recordar último proyecto y documento abierto.

Tipos de documento:

- DER;
- MR;
- combinado DER + MR.

## 4.2. Editor DER

Debe soportar:

- entidad regular;
- entidad débil;
- atributos simples;
- identificadores simples;
- identificadores compuestos;
- atributos compuestos;
- atributos multivaluados;
- atributos calculados/derivados;
- relaciones unarias;
- relaciones binarias;
- relaciones ternarias;
- atributos de relación;
- atributos identificadores de relación cuando correspondan;
- roles en relaciones;
- cardinalidades;
- participación total/parcial;
- jerarquías;
- supraentidad;
- subentidades;
- partición total/parcial;
- solapamiento exclusivo/inclusivo;
- atributo discriminante de jerarquía en los casos admitidos;
- notas/anotaciones.

Operaciones de edición:

- crear;
- editar;
- conectar;
- reconectar cuando sea válido;
- mover;
- multiselección;
- copiar;
- cortar;
- pegar;
- duplicar;
- eliminar;
- undo;
- redo;
- alinear;
- distribuir;
- snap opcional;
- auto-layout;
- zoom;
- pan;
- fit view;
- centrar selección;
- minimapa ocultable.

## 4.3. Notaciones DER

V1 debe incluir:

1. `UNLaM — Convención de cátedra`, como perfil prioritario.
2. `Chen`, como vista alternativa.
3. `Crow's Foot`, como vista alternativa lógica donde la semántica pueda proyectarse sin pérdida.

Cambiar de notación no puede duplicar ni modificar el modelo conceptual.

Si algún concepto no tiene una proyección visual exacta en una notación secundaria:

- preservar la semántica;
- mostrar una representación razonable;
- indicar la limitación en ayuda contextual;
- nunca borrar la propiedad.

## 4.4. Editor MR gráfico

Debe permitir crear y editar:

- relaciones/esquemas;
- atributos;
- clave primaria simple o compuesta;
- claves foráneas simples o compuestas;
- atributos simultáneamente PK + FK;
- referencias entre relaciones;
- notas;
- nombre de relación;
- orden de atributos.

La vista gráfica y textual deben ser dos proyecciones del mismo `RelationalModel`.

## 4.5. Editor MR textual

Debe sentirse como un pequeño editor de código.

Requerimientos:

- CodeMirror 6;
- cierre automático de `(`;
- cierre automático de otros delimitadores razonables;
- bracket matching;
- comentarios `//`;
- comentarios `/* ... */`;
- syntax highlighting;
- números de línea;
- undo/redo;
- búsqueda;
- reemplazo;
- autocompletado de relaciones y atributos;
- errores de sintaxis en línea;
- formateo;
- indentación;
- selección múltiple si CodeMirror la provee;
- atajos estándares;
- parseo incremental/debounced;
- sincronización con MR gráfico;
- preservación de comentarios.

### 4.5.1. Sintaxis canónica inicial de la DSL

Usar como sintaxis semántica editable:

```text
// comentario de documento

ALUMNO(
  legajo @pk,
  idCarrera,
  nombre,

  @fk (idCarrera) -> CARRERA(idCarrera)
)

/*
  Comentario multilínea.
*/

INSCRIPCION(
  legajo @pk,
  codMateria @pk,
  fecha,

  @fk (legajo) -> ALUMNO(legajo),
  @fk (codMateria) -> MATERIA(codMateria)
)
```

Reglas:

- `NOMBRE(...)` define una relación.
- cada atributo ocupa preferentemente una línea en el formatter canónico;
- `@pk` marca participación del atributo en la PK;
- `@fk (...) -> RELACION(...)` declara la FK como restricción de relación;
- el diseño admite FK compuestas;
- los comentarios no forman parte de la semántica académica;
- la sintaxis es una decisión de PRODUCTO, no una convención docente.

No usar negrita/subrayado como mecanismo de parsing.

### 4.5.2. Presentación académica del MR

Crear una vista de presentación independiente del editor DSL.

Para el perfil UNLaM:

- PK: subrayado;
- FK: negrita;
- PK + FK: ambas representaciones.

Esta regla debe vivir en `RuleProfile`, no hardcodeada en componentes genéricos.

### 4.5.3. Preservación de comentarios

Los comentarios deben almacenarse como anotaciones persistentes, no solo como texto descartable.

Modelo recomendado:

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

El parser debe recuperar comentarios y el formatter reemitirlos.

Una edición gráfica válida no debe borrar comentarios ajenos al elemento editado.

### 4.5.4. Borradores sintácticamente inválidos

Mientras el usuario escribe:

1. CodeMirror mantiene el borrador actual.
2. Se parsea con debounce corto.
3. Si es válido, se actualiza el modelo semántico.
4. Si es inválido, se conserva el último `RelationalModel` válido.
5. Se muestran errores sin bloquear la escritura.
6. El borrador inválido no debe ser reemplazado por un render automático.
7. Si el usuario intenta abandonar el modo textual con errores, ofrecer:
   - volver a editar;
   - descartar cambios inválidos.

---

# 5. Perfil académico UNLaM

Implementar el perfil como módulo versionado, por ejemplo:

```ts
{
  id: "unlam-bd",
  version: "1.0.0",
  label: "UNLaM — Bases de Datos",
  ...
}
```

No distribuir las reglas académicas mediante `if` dispersos.

Cada regla debe tener:

- id;
- versión;
- categoría;
- fuente;
- precondiciones;
- validación;
- transformación, si corresponde;
- explicación al estudiante;
- severidad;
- ejemplos/tests.

Estados posibles de fuente:

- `CATEDRA`;
- `INFORMADA`;
- `PRODUCTO`;
- `GENERAL`.

---

# 6. Convenciones DER del perfil UNLaM

## 6.1. Entidades

`CATEDRA`

- entidad regular: rectángulo;
- entidad débil: doble rectángulo;
- nombre dentro de la entidad;
- mantener terminología entidad/instancia.

## 6.2. Atributos

`CATEDRA`

- atributo: óvalo;
- identificador: subrayado;
- identificador compuesto: sus componentes identificadores se representan como tales;
- atributo compuesto: agrupador conectado a componentes;
- atributo multivaluado: doble óvalo;
- atributo calculado/derivado: óvalo de línea punteada;
- discriminante de entidad débil: se representa siguiendo la convención identificadora del material de cátedra.

## 6.3. Entidad débil

`CATEDRA`

- doble rectángulo;
- relación identificadora hacia la fuerte con doble línea;
- no volver a dibujar en la débil los atributos identificadores heredados de la entidad fuerte;
- la identificación completa depende de identificadores de la/s fuerte/s + discriminante/s.

## 6.4. Relaciones

`CATEDRA`

- relación: rombo;
- soportar atributos asociados a la relación;
- soportar grado unario, binario y ternario;
- soportar roles para una misma entidad participante múltiples veces.

## 6.5. Cardinalidad y participación

`CATEDRA`

Modelar por separado:

- razón de cardinalidad;
- restricción de participación.

Binarias/unarias:

- `1:1`;
- `1:N`;
- `N:N`.

Participación:

- total;
- parcial.

En el dominio interno no fusionar cardinalidad y participación en un único string.

## 6.6. Jerarquías

`CATEDRA`

Representar:

- supraentidad;
- subentidades;
- herencia;
- partición: total o parcial;
- solapamiento: exclusivo o inclusivo.

Ambos ejes son independientes.

Atributo de jerarquía/discriminante:

- disponible solamente cuando el perfil lo admita;
- para la convención documentada, corresponde al caso de partición total y sin solapamiento;
- puede referir a un atributo existente o uno definido con ese propósito;
- el renderer UNLaM debe usar la figura visual correspondiente al perfil.

---

# 7. Reglas DER → MR

El motor debe ser determinístico y generar trazabilidad.

Cada resultado debe guardar:

- elemento/s de origen;
- regla aplicada;
- perfil y versión;
- fecha de generación;
- versión/revisión del DER de origen.

## 7.1. Entidad regular

`CATEDRA`

Una entidad regular genera una relación.

- nombre de entidad → nombre de relación;
- identificadores → PK;
- atributos simples → atributos;
- los componentes de un atributo compuesto se transforman según la regla específica.

## 7.2. Binaria 1:1

`CATEDRA / parametrizada`

Implementar la regla del perfil académico, contemplando opcionalidad.

El motor debe decidir la ubicación de FK según la convención académica versionada y explicar la decisión.

No colocar la misma FK en ambos extremos salvo que una regla explícita futura lo solicite.

Agregar tests para:

- participación total/total;
- total/parcial;
- parcial/total;
- parcial/parcial.

## 7.3. Binaria 1:N

`CATEDRA`

Transportar la PK del extremo `1` hacia la relación generada desde el extremo `N` como FK.

La transformación debe ser independiente de la representación gráfica.

## 7.4. Binaria N:N

`CATEDRA`

Crear una nueva relación con el nombre de la relación DER.

La nueva relación incluye las claves de las entidades participantes como FK.

Sus atributos identificadores correspondientes forman la PK según la regla de cátedra.

Los atributos propios de la relación DER se incorporan a la nueva relación.

Si un atributo propio de la relación es identificador, conservar ese carácter según el material de cátedra.

## 7.5. Unaria 1:1 / 1:N

`CATEDRA`

Generar FK autorreferenciada en la relación correspondiente.

Conservar roles para poder distinguir semánticamente origen/destino.

## 7.6. Unaria N:N

`CATEDRA`

Crear una nueva relación.

La clave de la entidad participa dos veces debido a sus roles diferentes.

Los nombres resultantes deben ser inequívocos y derivarse de roles cuando existan.

## 7.7. Atributo compuesto

`CATEDRA`

Eliminar el agrupador conceptual en MR e incorporar sus componentes como atributos.

## 7.8. Atributo multivaluado

`CATEDRA`

Transformar conceptualmente el atributo multivaluado a entidad débil y luego aplicar la transformación a MR.

Mantener trazabilidad desde el atributo original hasta la relación resultante.

## 7.9. Entidad débil

`CATEDRA`

La relación generada para la débil contiene:

- discriminante/s;
- atributos propios;
- FK heredada/s desde la/s entidad/es fuerte/s.

La/s FK heredada/s forman también parte de la PK junto con el/los discriminante/s.

## 7.10. Ternaria N:N:N

`CATEDRA`

Crear nueva relación con las claves de las tres entidades como FK.

Las tres forman la PK en el caso N:N:N.

## 7.11. Ternaria 1:N:N

`CATEDRA`

Crear nueva relación.

Solo forman parte de la PK los atributos que provienen de los extremos `N`.

Los tres participantes siguen representados mediante FK.

## 7.12. Ternaria 1:1:N

`CATEDRA`

Crear nueva relación.

Implementar la composición de PK según la convención de cátedra y cubrirla con fixture académico.

## 7.13. Ternaria 1:1:1

`CATEDRA`

Crear nueva relación.

La convención indica que debe elegirse un par de atributos para definir la clave.

El modo guiado debe explicar que existen alternativas y mostrar explícitamente cuál eligió el perfil.

La elección automática debe ser determinística.

## 7.14. Jerarquías

`CATEDRA`

Transformar supraentidad y subentidades según el perfil.

El identificador de la supraentidad debe poder aparecer en las relaciones de subentidad como PK + FK cuando corresponda.

Mantener trazabilidad de herencia.

## 7.15. Atributos calculados

No inventar una regla de transformación atribuida a la cátedra si el material no la determina de forma inequívoca.

El perfil debe permitir marcar la política como configurada/versionada.

Para V1:

- conservar la propiedad en el DER;
- al transformar, si no existe una regla académica inequívoca, emitir una advertencia explicativa en lugar de inventar una transformación.

---

# 8. Validación académica

Crear motor de validación independiente del renderer.

Tipos:

- `error`: impide transformación o archivo válido;
- `warning`: permite continuar con advertencia;
- `info`: sugerencia.

Ejemplos mínimos:

## DER

- entidad sin nombre;
- relación sin nombre;
- identificador inexistente cuando el perfil lo exija;
- conexión estructural imposible;
- atributo compuesto sin componentes;
- relación sin participantes suficientes;
- rol ambiguo en unaria;
- entidad débil sin relación identificadora;
- discriminante inconsistente;
- jerarquía sin supraentidad;
- jerarquía sin subentidades suficientes;
- atributo discriminante de jerarquía en combinación no admitida;
- cardinalidad incompleta;
- participación incompleta cuando se requiera.

## MR

- relación sin nombre;
- atributos duplicados en una misma relación;
- PK inexistente cuando corresponda;
- FK apuntando a relación inexistente;
- FK apuntando a atributo inexistente;
- cantidad de atributos de FK incompatible con la clave referenciada;
- PK marcada nullable si el modelo incorpora nullability;
- referencia circular: permitida si es semánticamente válida, no marcarla automáticamente como error.

Cada issue debe contener:

```ts
{
  id,
  severity,
  ruleId,
  message,
  elementIds,
  quickFix?
}
```

El inspector debe permitir enfocar el elemento afectado.

---

# 9. Transformación guiada

Además del botón automático, ofrecer `Transformación guiada`.

Flujo:

1. validar DER;
2. mostrar errores bloqueantes;
3. generar plan determinístico;
4. mostrar pasos;
5. cada paso incluye:
   - regla;
   - elemento origen;
   - resultado;
   - explicación;
6. permitir avanzar/retroceder visualmente;
7. finalizar creando el MR;
8. guardar trazabilidad.

No obligar al usuario a contestar preguntas si la regla es determinística.

Cuando exista una elección válida (por ejemplo un caso de clave ternaria 1:1:1), el modo automático usa una política estable y el guiado puede exponer la decisión.

---

# 10. Regeneración DER → MR

Un MR derivado guarda:

```ts
{
  generatedFromDocumentId,
  generatedFromRevision,
  ruleProfileId,
  ruleProfileVersion,
  isDerived: true,
  hasManualChanges
}
```

Si el DER cambia y el usuario vuelve a transformar:

- nunca sobrescribir silenciosamente;
- ofrecer:
  1. crear nuevo MR;
  2. reemplazar el MR derivado, con confirmación;
  3. cancelar.

Si `hasManualChanges === true`, la advertencia debe ser más explícita.

No implementar un merge automático complejo en V1.

---

# 11. Diseño visual y experiencia

## 11.1. Dirección estética

Estética:

- limpia;
- moderna;
- académica;
- minimalista;
- clara;
- de baja contaminación visual.

El canvas ocupa la mayor parte de la pantalla.

Evitar:

- barras gruesas permanentes;
- paneles siempre abiertos;
- fondos saturados;
- gradientes decorativos excesivos;
- sombras pesadas;
- bordes por todos lados;
- texto auxiliar innecesario.

## 11.2. Header flotante

Diseñar un header flotante translúcido.

Características:

- margen respecto de bordes de ventana;
- esquinas redondeadas;
- `backdrop-blur`;
- fondo con transparencia suficiente para sentirse ligero pero mantener legibilidad;
- sombra muy suave;
- agrupación clara.

Contenido sugerido:

### izquierda
- logo/identidad;
- nombre de proyecto/documento;
- indicador breve de guardado.

### centro
- selector DER / MR;
- selector de vista/notación cuando corresponda.

### derecha
- undo;
- redo;
- validación;
- transformar;
- exportar;
- menú `...`.

No saturar el header con todos los comandos.

## 11.3. Herramientas

Usar una rail/toolbox flotante vertical pequeña en el lado izquierdo del canvas.

Mostrar iconos + tooltip.

Para DER, herramientas mínimas visibles:

- selección;
- entidad;
- relación;
- atributo;
- jerarquía;
- nota.

Variantes se eligen después mediante propiedades o pequeño popover.

No crear un botón permanente diferente para cada subtipo si eso ensucia la interfaz.

## 11.4. Explorer

Panel lateral izquierdo:

- ocultable;
- redimensionable;
- árbol de proyecto;
- búsqueda;
- creación rápida.

En modo foco puede estar cerrado.

## 11.5. Inspector

Panel lateral derecho contextual:

- oculto por defecto;
- aparece al seleccionar o cuando el usuario lo solicita;
- edición completa de propiedades;
- tabs cuando sea útil: `Propiedades`, `Validación`, `Estilo`.

## 11.6. Canvas

Default:

- fondo casi blanco;
- cuadrícula de puntos opcional y muy tenue;
- alto contraste del contenido;
- handles discretos;
- selección clara pero no estridente;
- edges limpios;
- sin animaciones constantes.

## 11.7. Colores

Permitir:

- tema global;
- color por categoría;
- override por elemento;
- restaurar por defecto;
- exportación monocromática.

Categorías:

DER:
- entidad;
- entidad débil;
- relación;
- atributo;
- identificador;
- multivaluado;
- calculado;
- jerarquía;
- nota.

MR:
- relación;
- atributo;
- PK;
- FK;
- PK+FK;
- comentario;
- error;
- warning.

El perfil semántico no depende de estos colores.

## 11.8. Tema

V1:

- claro;
- oscuro;
- sistema.

El modo claro es el default para diagramas académicos.

La exportación debe poder forzar fondo blanco aunque la UI esté en dark mode.

## 11.9. Menús contextuales

Click derecho sobre canvas/elemento debe ofrecer acciones relevantes.

No duplicar veinte acciones en barras permanentes.

## 11.10. Command palette

Agregar `Ctrl+K`.

Permitir buscar comandos como:

- crear entidad;
- crear relación;
- fit view;
- validar;
- transformar DER a MR;
- exportar;
- abrir explorer;
- cambiar tema.

## 11.11. Toasts

Usar notificaciones breves para:

- guardado;
- exportación;
- importación;
- error recuperable.

No mostrar toast en cada operación normal.

---

# 12. Rendimiento

## 12.1. Reglas de implementación

React Flow:

- node types definidos fuera del render;
- nodos personalizados memoizados;
- edges personalizados memoizados;
- callbacks memoizados cuando aporten;
- evitar que componentes generales se suscriban a todo el array de nodes;
- usar selectores pequeños en Zustand;
- evitar estilos excesivamente complejos en cientos de elementos;
- no recalcular layouts en cada render.

Editor textual:

- parseo con debounce corto;
- no bloquear cada pulsación con serialización completa costosa;
- formato explícito o al perder foco cuando corresponda.

Persistencia:

- cambios en memoria primero;
- autosave después;
- batch/debounce de escrituras;
- mostrar estado `Guardando…` sin bloquear.

Transformación:

- función pura;
- no acoplada al ciclo de render;
- si un caso futuro resulta pesado, preparada para moverlo a Web Worker.

Auto-layout:

- lazy load;
- solo ejecutar por pedido;
- usar `elkjs` o alternativa estable equivalente si mejora el resultado;
- no incluir el coste en el startup principal.

## 12.2. Objetivos de rendimiento

Son objetivos de ingeniería, no SLA contractual.

Fixture académico normal:

- 20 entidades;
- 80 atributos;
- 25 relaciones;
- jerarquías y restricciones.

Fixture de estrés:

- aproximadamente 300 nodos visuales;
- aproximadamente 400 conexiones.

Validar:

- drag fluido;
- zoom/pan fluido;
- selección sin saltos perceptibles;
- transformación sin congelar la UI;
- persistencia sin bloquear;
- apertura del proyecto en tiempo razonable.

Registrar resultados en `docs/PERFORMANCE.md`.

---

# 13. Stack tecnológico V1

## Núcleo

- TypeScript estricto.
- React.
- Vite.
- npm.

## Canvas

- `@xyflow/react` / React Flow.

## Estado

- Zustand.
- Immer para actualizaciones/patches donde simplifique el historial.

Separar:
- estado persistente de dominio;
- estado efímero de UI.

## MR textual

- CodeMirror 6.
- Lezer o parser propio estructurado estable para la DSL, preferentemente Lezer si no introduce complejidad desproporcionada.

## Persistencia

- IndexedDB.
- Dexie.

## Validación de contratos

- Zod.

## UI

- Tailwind CSS 4.
- Radix Primitives.
- Lucide React para iconos.

No usar un kit visual pesado que imponga estética propia.

## PWA

- `vite-plugin-pwa`.

## Escritorio

- Electron.
- electron-builder.
- target Windows `portable`.

Seguridad Electron:

- `contextIsolation: true`;
- `nodeIntegration: false`;
- preload mínimo;
- IPC explícito y validado;
- renderer sin acceso directo a Node.

## Testing

- Vitest.
- React Testing Library.
- Playwright.
- `fake-indexeddb` para persistencia en unit/integration tests cuando corresponda.

## Exportación gráfica

Elegir una librería estable y liviana compatible con el DOM final, por ejemplo `html-to-image`, si supera pruebas de PNG/SVG.

## Auto-layout

`elkjs` lazy-loaded o alternativa estable equivalente.

---

# 14. Estructura del repositorio

Mantener un único repositorio, evitando monorepo innecesario para V1.

Estructura recomendada:

```text
/
├─ .github/
│  └─ workflows/
├─ docs/
├─ electron/
│  ├─ main/
│  └─ preload/
├─ public/
│  └─ branding/
├─ src/
│  ├─ app/
│  ├─ academic/
│  │  └─ profiles/
│  │     └─ unlam/
│  ├─ components/
│  ├─ domain/
│  │  ├─ conceptual/
│  │  ├─ relational/
│  │  ├─ project/
│  │  └─ shared/
│  ├─ features/
│  │  ├─ workspace/
│  │  ├─ der-editor/
│  │  ├─ mr-editor/
│  │  ├─ mr-text/
│  │  ├─ transformation/
│  │  ├─ validation/
│  │  ├─ import-export/
│  │  └─ settings/
│  ├─ infrastructure/
│  │  ├─ persistence/
│  │  ├─ files/
│  │  └─ platform/
│  ├─ state/
│  ├─ styles/
│  └─ utils/
├─ tests/
│  ├─ academic/
│  ├─ fixtures/
│  ├─ integration/
│  └─ e2e/
├─ package.json
├─ package-lock.json
├─ tsconfig.json
├─ vite.config.ts
└─ README.md
```

No importar componentes React desde `domain`.

---

# 15. Modelo de dominio mínimo

Usar IDs estables, preferentemente `crypto.randomUUID()`.

## 15.1. ConceptualModel

Debe poder expresar, como mínimo:

```ts
interface ConceptualModel {
  entities: Entity[];
  relationships: Relationship[];
  hierarchies: Hierarchy[];
  notes: Note[];
  revision: number;
}
```

Entidad:

```ts
interface Entity {
  id: string;
  name: string;
  kind: "regular" | "weak";
  attributes: Attribute[];
}
```

Atributo conceptual:

```ts
interface Attribute {
  id: string;
  name: string;
  kind: "simple" | "composite" | "multivalued" | "derived";
  isIdentifier: boolean;
  isDiscriminator?: boolean;
  components?: Attribute[];
}
```

Relación:

```ts
interface Relationship {
  id: string;
  name: string;
  degree: 1 | 2 | 3;
  participants: RelationshipParticipant[];
  attributes: Attribute[];
  identifying?: boolean;
}
```

Participante:

```ts
interface RelationshipParticipant {
  id: string;
  entityId: string;
  role?: string;
  maxCardinality: "1" | "N";
  participation: "total" | "partial";
}
```

Jerarquía:

```ts
interface Hierarchy {
  id: string;
  superEntityId: string;
  subEntityIds: string[];
  partition: "total" | "partial";
  overlap: "exclusive" | "overlapping";
  discriminatorAttributeId?: string;
}
```

Estos tipos son orientativos: Work puede refinarlos sin perder capacidad semántica.

## 15.2. RelationalModel

Debe modelar FK como objetos, no solo flags por atributo.

```ts
interface RelationalModel {
  schemas: RelationSchema[];
  notes: Note[];
  revision: number;
}

interface RelationSchema {
  id: string;
  name: string;
  attributes: RelationalAttribute[];
  primaryKey: string[];
  foreignKeys: ForeignKey[];
}

interface RelationalAttribute {
  id: string;
  name: string;
}

interface ForeignKey {
  id: string;
  localAttributeIds: string[];
  targetRelationId: string;
  targetAttributeIds: string[];
}
```

Un atributo PK+FK surge porque su id está en `primaryKey` y a la vez en una `ForeignKey`.

## 15.3. Layout separado

No guardar posiciones dentro del dominio conceptual.

Ejemplo:

```ts
interface ViewLayout {
  nodes: Record<string, {
    x: number;
    y: number;
    width?: number;
    height?: number;
  }>;
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
  styles: Record<string, ElementStyleOverride>;
}
```

Guardar layouts distintos para:

- DER UNLaM;
- DER Chen;
- DER Crow's Foot;
- MR gráfico.

---

# 16. Estado, comandos, undo/redo

Todas las modificaciones deben pasar por una capa de acciones/comandos central.

El historial debe contemplar:

- creación;
- edición;
- eliminación;
- movimiento;
- conexión;
- cambio de cardinalidad;
- cambio de estilo;
- edición MR;
- edición textual válida;
- transformaciones cuando corresponda.

Puede utilizarse Immer patches si simplifican una implementación confiable.

Requisitos:

- Ctrl+Z;
- Ctrl+Y y Ctrl+Shift+Z;
- historial de sesión;
- no persistir un historial infinito dentro del archivo;
- limitar historial por memoria;
- una operación de drag debe generar un paso útil de historial, no cientos.

---

# 17. Persistencia local

Dexie/IndexedDB.

Persistir:

- proyectos;
- documentos;
- modelos;
- layouts;
- preferencias;
- comentarios;
- metadatos de transformación;
- último estado de sesión.

Autosave:

- configurable;
- activado por defecto;
- debounce;
- indicador `Guardando…` / `Guardado`;
- no bloquear UI.

Implementar recuperación razonable ante cierre abrupto.

---

# 18. Formato `.bdproj`

Archivo JSON UTF-8 versionado.

Extensión:

`.bdproj`

Estructura conceptual:

```json
{
  "format": "bdproj",
  "formatVersion": 1,
  "appVersion": "1.0.0",
  "exportedAt": "ISO-8601",
  "project": {},
  "documents": [],
  "layouts": [],
  "settings": {},
  "academicProfiles": []
}
```

Requisitos:

- Zod schema;
- validar antes de importar;
- mensajes de error comprensibles;
- exportación determinística razonable;
- migraciones explícitas;
- nunca confiar en JSON importado;
- tests de round-trip.

V1 no necesita ZIP si no hay adjuntos binarios.

---

# 19. Importar y exportar

## Proyecto

- importar `.bdproj`;
- exportar `.bdproj`.

## Visual

- PNG;
- SVG si la implementación elegida produce un resultado confiable;
- fondo configurable;
- opción monocromática;
- exportar contenido completo, no solo viewport visible.

## Web

Usar File System Access API cuando esté disponible como mejora progresiva.

Tener fallback:

- download;
- file input.

## Electron

Usar diálogos nativos vía IPC seguro para:

- abrir;
- guardar;
- guardar como.

El mismo `.bdproj` debe abrirse en web y Electron.

---

# 20. PWA

Debe:

- ser instalable cuando el navegador lo admita;
- funcionar offline después de la primera carga;
- cachear app shell/assets;
- no depender de red para datos del usuario;
- mostrar actualización disponible sin interrumpir una edición;
- permitir aplicar actualización de forma segura.

---

# 21. Electron Windows portable

Crear comandos npm claros, por ejemplo:

```text
npm run electron:dev
npm run build
npm run dist:win
```

`dist:win` debe producir un `.exe` portable.

El build portable:

- no requiere instalación;
- no requiere privilegios de administrador;
- comparte el formato `.bdproj`;
- debe poder abrir archivos por diálogo;
- debe funcionar sin internet.

Documentar la ruta de salida exacta.

No implementar auto-update en V1 para la variante portable.

Documentar que un binario sin firma de código puede generar advertencias de Windows SmartScreen.

---

# 22. Atajos mínimos

Global/editor:

- `Ctrl+S`: guardar/exportar según contexto seguro;
- `Ctrl+Z`: undo;
- `Ctrl+Y` / `Ctrl+Shift+Z`: redo;
- `Ctrl+C`;
- `Ctrl+X`;
- `Ctrl+V`;
- `Ctrl+D`: duplicar;
- `Delete` / `Backspace`: eliminar cuando canvas tiene foco;
- `Ctrl+K`: command palette;
- `F`: fit view cuando canvas tiene foco y no se escribe texto;
- `Esc`: cancelar herramienta/selección contextual.

Atajos de creación pueden agregarse, pero nunca deben interferir con escritura en CodeMirror o inputs.

Crear pantalla de atajos.

---

# 23. Ayuda contextual

Agregar ayuda concisa y útil:

- tooltip de cada herramienta;
- explicación de error;
- ayuda para cardinalidad;
- ayuda para entidad débil;
- ayuda para jerarquía;
- ayuda para transformación;
- leyenda de sintaxis MR textual;
- link interno a `Acerca de`.

No convertir la interfaz en un curso teórico permanente.

---

# 24. Accesibilidad

Requisitos:

- Radix para primitives accesibles;
- focus visible;
- navegación por teclado en controles;
- labels accesibles;
- tooltips no como única fuente de información crítica;
- contraste adecuado;
- `prefers-reduced-motion`;
- color no exclusivo;
- tamaños de click razonables;
- canvas con las capacidades de teclado posibles de React Flow;
- comandos también disponibles desde UI.

---

# 25. Privacidad y seguridad

V1:

- sin cuentas;
- sin backend;
- sin analytics;
- sin telemetry;
- sin envío de modelos a terceros;
- sin ejecución de código desde `.bdproj`.

Importaciones:

- validar con Zod;
- tratar todo contenido como datos;
- escapar texto;
- no inyectar HTML de usuario.

Electron:

- mínimo privilegio;
- no exponer `fs` al renderer;
- validar IPC;
- CSP razonable;
- sin navegación remota arbitraria dentro de la ventana.

---

# 26. Tests académicos obligatorios

Crear fixtures y expected outputs.

Como mínimo:

1. entidad regular con PK simple;
2. entidad con PK compuesta;
3. atributo compuesto;
4. atributo multivaluado;
5. entidad débil;
6. binaria 1:1 con variantes de participación;
7. binaria 1:N;
8. binaria N:N;
9. N:N con atributo de relación;
10. unaria 1:1;
11. unaria 1:N;
12. unaria N:N con roles;
13. ternaria N:N:N;
14. ternaria 1:N:N;
15. ternaria 1:1:N;
16. ternaria 1:1:1;
17. jerarquía total exclusiva;
18. jerarquía parcial exclusiva;
19. jerarquía total solapada;
20. jerarquía parcial solapada;
21. atributo discriminante de jerarquía admitido;
22. caso inválido de entidad débil;
23. FK simple;
24. FK compuesta;
25. atributo PK+FK;
26. round-trip DSL MR;
27. comentarios MR preservados;
28. `.bdproj` export/import exacto semánticamente.

Las transformaciones deben compararse por semántica, no por IDs aleatorios o coordenadas.

---

# 27. Tests técnicos

## Unit

- dominio;
- parser MR;
- formatter MR;
- validadores;
- transformación;
- migraciones;
- serialización.

## Integration

- store + dominio;
- Dexie;
- sincronización MR textual/gráfico;
- undo/redo;
- import/export.

## E2E Playwright

Escenarios mínimos:

1. crear proyecto;
2. crear DER;
3. guardar;
4. cerrar/reabrir;
5. transformar a MR;
6. editar MR gráfico;
7. editar MR textual;
8. escribir comentario;
9. reabrir y verificar comentario;
10. exportar/importar `.bdproj`;
11. cambiar notación;
12. undo/redo;
13. validar;
14. offline básico.

No es obligatorio automatizar el `.exe` con Playwright si complica la suite, pero debe existir smoke test/documentación manual de Electron.

---

# 28. Calidad de código

Configurar:

- TypeScript strict;
- ESLint;
- Prettier;
- EditorConfig.

Scripts mínimos:

```json
{
  "dev": "...",
  "build": "...",
  "preview": "...",
  "lint": "...",
  "typecheck": "...",
  "test": "...",
  "test:watch": "...",
  "test:e2e": "...",
  "check": "...",
  "electron:dev": "...",
  "dist:win": "..."
}
```

`npm run check` debe ejecutar al menos:

- typecheck;
- lint;
- tests unit/integration.

No permitir `any` indiscriminado.

No duplicar tipos equivalentes.

---

# 29. Git y GitHub — archivos que Work debe preparar

Crear:

```text
.gitignore
.gitattributes
.editorconfig
.github/workflows/ci.yml
.github/workflows/release.yml
```

## CI

En push/PR:

1. checkout;
2. Node estable;
3. `npm ci`;
4. `npm run typecheck`;
5. `npm run lint`;
6. `npm run test`;
7. `npm run build`.

E2E puede ejecutarse en workflow separado si el tiempo de instalación de navegadores lo justifica.

## Release

Al crear tag `v*`:

- compilar;
- ejecutar checks;
- generar artefacto Windows portable;
- subirlo a GitHub Release si el workflow puede hacerlo con `GITHUB_TOKEN`.

No requerir secretos externos para el flujo básico.

---

# 30. Política de ramas recomendada

Para una persona trabajando principalmente sola:

- `main`: siempre usable;
- `feature/<nombre>`;
- `fix/<nombre>`;
- `docs/<nombre>`;
- `refactor/<nombre>`.

No crear `develop` salvo que realmente sea necesario.

Cada mejora:

1. actualizar `main`;
2. crear branch;
3. trabajar;
4. ejecutar `npm run check`;
5. commit;
6. push;
7. PR;
8. merge;
9. borrar branch.

Usar Conventional Commits de forma simple:

```text
feat: ...
fix: ...
docs: ...
refactor: ...
test: ...
chore: ...
```

---

# 31. Versionado

Usar SemVer.

Durante construcción:

`0.1.0-dev`

Cuando esta especificación esté satisfecha y todos los criterios de aceptación se cumplan:

`1.0.0`

Tag:

```text
v1.0.0
```

El formato `.bdproj` tiene versión independiente:

```text
formatVersion: 1
```

No usar la versión de la app como sustituto de `formatVersion`.

---

# 32. Documentación obligatoria

Work debe entregar:

## `README.md`

Debe contener:

- qué es el proyecto;
- captura o descripción breve;
- requisitos;
- instalación;
- desarrollo;
- tests;
- build web;
- Electron;
- estructura;
- licencia;
- estado no oficial respecto a UNLaM.

## `docs/00_GUIA_DESDE_CERO.md`

Escrita para una persona que viene de Google Apps Script.

No asumir dominio de ecosistema Node.

Cada procedimiento debe usar:

**qué hacés → por qué → comando → qué deberías ver → qué hacer si falla.**

Cubrir:

1. abrir proyecto en VS Code;
2. terminal integrada;
3. comprobar Node y npm;
4. `npm install`;
5. `npm run dev`;
6. qué es localhost;
7. detener servidor;
8. estructura de carpetas;
9. qué es `package.json`;
10. qué es `package-lock.json`;
11. qué es `node_modules`;
12. React mínimo;
13. TypeScript mínimo;
14. Vite;
15. modificar un componente;
16. modificar una regla académica;
17. agregar un test;
18. ejecutar tests;
19. lint/typecheck;
20. build;
21. Electron;
22. ubicación del `.exe`;
23. Git básico;
24. GitHub;
25. branches;
26. PR;
27. tags;
28. release;
29. errores comunes.

## `docs/ARCHITECTURE.md`

Explicar:

- capas;
- dominio;
- reglas;
- React Flow;
- CodeMirror;
- Zustand;
- Dexie;
- archivo;
- Electron.

## `docs/ACADEMIC_RULES.md`

Tabla de reglas implementadas.

Campos:

- ID;
- fuente;
- explicación;
- validación;
- transformación;
- test asociado.

## `docs/MR_TEXT_DSL.md`

Gramática y ejemplos.

## `docs/FILE_FORMAT.md`

Formato `.bdproj` y migraciones.

## `docs/DECISIONS.md`

ADRs breves para decisiones no especificadas.

## `docs/PERFORMANCE.md`

Fixtures y resultados.

## `docs/TROUBLESHOOTING.md`

Errores frecuentes.

## `docs/RELEASE.md`

Cómo publicar una nueva versión.

## `docs/BRANDING.md`

Uso del logo y disclaimer.

---

# 33. Entregables de código

La entrega final de Work debe incluir:

- aplicación React completa;
- DER editor;
- MR gráfico;
- MR textual;
- transformación;
- validación;
- perfiles;
- persistencia;
- `.bdproj`;
- PWA;
- Electron;
- tests;
- documentación;
- CI;
- release workflow;
- assets de branding permitidos;
- proyecto de ejemplo.

Agregar un proyecto de ejemplo que demuestre:

- entidad regular;
- débil;
- 1:N;
- N:N;
- ternaria;
- jerarquía;
- MR resultante.

---

# 34. Criterios de aceptación V1

La V1 NO se considera terminada si falla alguno de estos puntos centrales.

## Aplicación

- abre sin errores;
- no hay errores importantes en consola;
- canvas DER usable;
- canvas MR usable;
- editor textual usable.

## Semántica

- el renderer no es la fuente de verdad;
- cambiar notación no cambia el dominio;
- guardar/reabrir preserva semántica;
- `.bdproj` round-trip preserva semántica;
- PK/FK no dependen de estilos.

## DER

- se pueden crear todos los elementos V1;
- entidad débil funciona;
- ternarias funcionan;
- jerarquías funcionan;
- cardinalidad/participación funcionan.

## MR

- PK simple/compuesta;
- FK simple/compuesta;
- PK+FK;
- gráfico/texto sincronizados;
- comentarios preservados;
- auto-close de paréntesis.

## Transformación

- reglas principales implementadas;
- resultado reproducible;
- trazabilidad;
- modo automático;
- modo guiado;
- no sobrescribe silenciosamente.

## UX

- canvas limpio;
- header flotante translúcido;
- paneles ocultables;
- feedback de guardado;
- shortcuts;
- command palette;
- modo claro/oscuro.

## Offline

- la PWA puede reabrirse offline tras carga inicial.

## Escritorio

- `npm run dist:win` genera portable;
- abre;
- puede guardar/importar `.bdproj`.

## Calidad

- `npm run typecheck` pasa;
- `npm run lint` pasa;
- `npm run test` pasa;
- `npm run build` pasa;
- documentación presente.

---

# 35. Orden de implementación obligatorio para Work

Aunque la entrega final sea completa, implementar en este orden para evitar una UI bonita sobre un dominio frágil.

## Fase 1 — Bootstrap

- Vite;
- React;
- TypeScript;
- Tailwind;
- Radix;
- Zustand;
- testing;
- Electron skeleton;
- PWA skeleton.

Gate:

- dev;
- build;
- test;
- electron abre.

## Fase 2 — Dominio

- Project;
- Document;
- ConceptualModel;
- RelationalModel;
- ViewLayout;
- RuleProfile;
- TransformationTrace.

Gate:

- unit tests.

## Fase 3 — Archivo/persistencia

- Zod;
- Dexie;
- `.bdproj`;
- migrations;
- round-trip.

Gate:

- tests de persistencia.

## Fase 4 — Canvas DER

- React Flow;
- nodos;
- edges;
- edición;
- propiedades;
- undo/redo.

Gate:

- escenario DER mínimo completo.

## Fase 5 — Reglas académicas y validación

- perfil UNLaM;
- validadores;
- inspector.

Gate:

- fixtures inválidos/válidos.

## Fase 6 — Transformación

- reglas;
- trazabilidad;
- automático;
- guiado.

Gate:

- fixtures esperados.

## Fase 7 — MR gráfico

- relaciones;
- atributos;
- PK/FK;
- edición.

## Fase 8 — MR textual

- CodeMirror;
- grammar/parser;
- formatter;
- comments;
- bidirectional sync.

Gate:

- round-trip;
- invalid draft behavior.

## Fase 9 — UX final

- floating header;
- tool rail;
- explorer;
- inspector;
- themes;
- colors;
- command palette;
- shortcuts.

## Fase 10 — Offline/Desktop/Exports

- PWA;
- Electron;
- PNG/SVG;
- file dialogs.

## Fase 11 — QA

- performance;
- E2E;
- accessibility;
- docs;
- CI/release.

No saltar gates aunque se continúe automáticamente.

---

# 36. Procedimiento que Work debe ejecutar antes de entregar

Desde una instalación limpia del repo:

```text
npm ci
npm run typecheck
npm run lint
npm run test
npm run build
```

Luego:

```text
npm run test:e2e
```

Luego smoke test:

```text
npm run electron:dev
```

Finalmente:

```text
npm run dist:win
```

Si algún paso falla, corregirlo antes de presentar la entrega.

---

# 37. Qué debe informar Work en su respuesta final

La respuesta final de Work debe incluir:

1. resumen de lo construido;
2. árbol principal de archivos;
3. decisiones arquitectónicas relevantes;
4. comandos exactos para ejecutar;
5. comandos exactos para testear;
6. comando exacto para generar portable;
7. ruta del artefacto generado;
8. lista de funcionalidades;
9. tests ejecutados y resultado;
10. limitaciones conocidas reales;
11. decisiones que quedaron documentadas en `docs/DECISIONS.md`.

No responder solamente “listo”.

---

# 38. Pasos del usuario después de recibir la entrega de Work

Esta sección debe respetarse también en `docs/00_GUIA_DESDE_CERO.md`.

## Paso 1 — Guardar el proyecto

Crear una carpeta local, por ejemplo:

```text
graficador-academico-bd
```

Colocar allí todos los archivos entregados por Work.

Abrir la carpeta desde VS Code:

`File → Open Folder`.

## Paso 2 — Abrir terminal

En VS Code:

`Terminal → New Terminal`.

Verificar que la terminal esté posicionada en la raíz del proyecto.

## Paso 3 — Verificar entorno

Ejecutar:

```bash
node -v
npm -v
git --version
```

Si el Node instalado cumple las versiones requeridas por el proyecto, continuar.

## Paso 4 — Instalar dependencias

```bash
npm install
```

Esto crea `node_modules` y usa/actualiza `package-lock.json`.

## Paso 5 — Ejecutar desarrollo

```bash
npm run dev
```

Abrir la URL local indicada por Vite.

Probar manualmente:

- crear proyecto;
- crear DER;
- guardar;
- recargar;
- transformar;
- MR gráfico;
- MR textual.

## Paso 6 — Ejecutar checks

```bash
npm run check
npm run build
```

Luego:

```bash
npm run test:e2e
```

## Paso 7 — Probar Electron

```bash
npm run electron:dev
```

## Paso 8 — Generar portable

```bash
npm run dist:win
```

Abrir el `.exe` indicado por la documentación.

## Paso 9 — Inicializar Git

Si el directorio todavía no es un repositorio:

```bash
git init
git branch -M main
git status
```

## Paso 10 — Primer commit

```bash
git add .
git commit -m "feat: initial complete v1"
```

## Paso 11 — Crear repositorio en GitHub

En GitHub:

1. crear repositorio nuevo;
2. nombre recomendado: `graficador-academico-bd`;
3. elegir público o privado;
4. NO agregar README, `.gitignore` ni licencia desde GitHub si ya existen localmente;
5. crear.

Copiar la URL Git del repositorio.

## Paso 12 — Vincular remoto

```bash
git remote add origin <URL_DEL_REPOSITORIO>
git remote -v
git push -u origin main
```

## Paso 13 — Trabajo futuro

Antes de una funcionalidad:

```bash
git checkout main
git pull
git checkout -b feature/nombre-corto
```

Trabajar.

Luego:

```bash
npm run check
git status
git add .
git commit -m "feat: descripcion"
git push -u origin feature/nombre-corto
```

Crear Pull Request en GitHub.

Después del merge:

```bash
git checkout main
git pull
git branch -d feature/nombre-corto
```

## Paso 14 — Primera release estable

Cuando V1 cumpla todos los criterios:

```bash
git checkout main
git pull
git tag -a v1.0.0 -m "Version 1.0.0"
git push origin v1.0.0
```

El workflow de release debe construir/publicar los artefactos configurados.

---

# 39. Funcionalidades deliberadamente fuera de V1

No agregar si comprometen la calidad de lo anterior:

- cuentas de usuario;
- colaboración tiempo real;
- backend;
- sincronización cloud;
- SQL DDL automático;
- conexión a DBMS;
- ingeniería reversa;
- normalización automática;
- álgebra relacional;
- SQL editor;
- multiplayer;
- AI integrada;
- marketplace de perfiles.

La arquitectura debe permitir evolución, pero V1 debe priorizar hacer muy bien DER + MR + transformación + persistencia.

---

# 40. Mejoras candidatas posteriores a V1

Después de estabilizar la primera versión:

- generación SQL;
- normalización;
- dependencias funcionales;
- álgebra relacional;
- ejercicios guiados;
- modo profesor;
- comparación de soluciones;
- perfiles académicos importables;
- colaboración/sync;
- importación desde SQL;
- exportación PDF avanzada;
- instaladores firmados;
- macOS/Linux;
- plugin system.

No anticipar estas funcionalidades en la UI principal de V1 con botones deshabilitados.

---

# 41. Fuentes académicas que dieron origen a la especificación

La implementación académica debe mantenerse alineada con:

1. `01_DER_Modelado.pdf` — material de cátedra UNLaM.
2. `01_DER_Restricciones.pdf` — restricciones DER/MR.
3. `02_Formalización del Diseño.pdf` — contexto posterior de formalización.
4. `02_PRÁCTICA_MR.pdf`.
5. `01_PRÁCTICA_DER.pdf`.
6. contexto vigente de Bases de Datos 3636.
7. convenciones adicionales informadas por la cursada actual, siempre identificadas como tales.

Ante futuras correcciones docentes, modificar el `RuleProfile` y sus tests, no el renderer genérico.

---

# 42. Fuentes técnicas y criterio de actualización

Las tecnologías fueron elegidas por:

- rapidez de desarrollo;
- UX inmediata;
- capacidad offline;
- bajo acoplamiento;
- ecosistema estable;
- facilidad de mantenimiento;
- compatibilidad con VS Code, Git y GitHub;
- posibilidad de generar web y Windows portable.

Antes de instalar dependencias, Work debe verificar documentación oficial y elegir versiones estables y compatibles entre sí.

No fijar deliberadamente versiones antiguas solo porque aparezcan en ejemplos.

Guardar las versiones efectivamente elegidas en `package-lock.json`.

---

# 43. Resultado esperado

Al finalizar, el usuario debe poder:

1. abrir la app;
2. crear un proyecto;
3. crear un DER completo usando la convención académica;
4. trabajar con una interfaz limpia donde el canvas sea protagonista;
5. personalizar colores sin alterar semántica;
6. guardar automáticamente;
7. transformar el DER a MR;
8. entender qué reglas se aplicaron;
9. visualizar y editar el MR gráficamente;
10. editar el mismo MR como texto con experiencia de editor de código;
11. usar comentarios y auto-cierre de paréntesis;
12. validar errores;
13. cerrar y reabrir sin pérdida;
14. exportar/importar `.bdproj`;
15. trabajar offline;
16. ejecutar la versión portable de Windows;
17. versionar todo el código mediante Git;
18. alojarlo en GitHub;
19. continuar evolucionándolo sin rehacer el núcleo.

Ese es el estándar mínimo de completitud de V1.
