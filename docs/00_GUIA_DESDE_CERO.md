# Guia desde cero

Pensada para alguien que integra por primera vez este stack (React + TS +
Vite + Electron + Git/GitHub). Seguir en orden.

## 1. Verificar el entorno

```bash
node -v
npm -v
git --version
```

Necesitas Node LTS vigente (ver https://nodejs.org) y Git instalado.

## 2. Ubicar el proyecto

Descomprimir/copiar esta carpeta (`graficador-academico-bd/`) donde
trabajes tus proyectos. Abrirla en VS Code: `File > Open Folder`.

## 3. Instalar dependencias

```bash
npm install
```

Esto crea `node_modules/` y escribe `package-lock.json` con las versiones
reales resueltas (ver docs/DECISIONS.md sobre por que `package.json` usa
`"latest"`).

## 4. Verificar que el Incremento 0 funciona

```bash
npm run dev
```

Abrir la URL que indica Vite (por defecto `http://localhost:5173`): deberia
verse el placeholder "Graficador Academico de Bases de Datos - Incremento 0:
bootstrap OK".

En otra terminal:

```bash
npm run check
```

Debe pasar typecheck + lint + test sin errores.

```bash
npm run electron:dev
```

Debe abrir una ventana de escritorio vacia mostrando lo mismo que el
navegador.

## 5. Inicializar Git y subir a GitHub

```bash
git init
git branch -M main
git add .
git commit -m "feat: incremento 0 - bootstrap y documentacion base"
```

En GitHub: crear un repositorio nuevo llamado `graficador-academico-bd`
(publico o privado, sin agregar README/.gitignore/licencia desde GitHub
porque ya existen localmente). Copiar la URL del repositorio y:

```bash
git remote add origin <URL_DEL_REPOSITORIO>
git push -u origin main
```

## 6. Seguir trabajando (a partir del Incremento 1)

Cada incremento nuevo, en una rama propia:

```bash
git checkout main
git pull
git checkout -b feature/incremento-1-walking-skeleton
```

Trabajar (idealmente con Claude Code apuntando a esta carpeta, dandole
como contexto solo `docs/INCREMENTOS.md` + el doc especifico del
incremento - nunca `docs/ESPECIFICACION_ORIGINAL.md` completo salvo que
haga falta revisar un detalle puntual).

Antes de cada commit:

```bash
npm run check
```

Luego:

```bash
git add .
git commit -m "feat: <descripcion corta>"
git push -u origin feature/incremento-1-walking-skeleton
```

Crear el Pull Request en GitHub, revisar el diff, mergear. Despues:

```bash
git checkout main
git pull
git branch -d feature/incremento-1-walking-skeleton
```

Y se repite para el incremento siguiente.
