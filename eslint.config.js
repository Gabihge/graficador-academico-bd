import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

// Config plana (ESLint 9+). Cubre TypeScript estricto + reglas de React.
// El dominio (src/domain) no debe importar React: se agrega una regla
// especifica mas abajo para hacerlo cumplir automaticamente.
export default tseslint.config(
  { ignores: ["dist", "dist-electron", "release", "coverage"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
  {
    // Regla de arquitectura (seccion 2.2 y 14 de la especificacion):
    // el dominio no puede importar React ni componentes de UI.
    files: ["src/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [{ name: "react", message: "src/domain no debe depender de React (ver docs/ARCHITECTURE.md)." }],
        },
      ],
    },
  },
);
