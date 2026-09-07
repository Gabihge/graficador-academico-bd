---
paths:
  - "src/components/**/*.tsx"
  - "src/features/**/*.tsx"
---

# UI (src/components, src/features)

- El canvas es protagonista. Evitar barras gruesas permanentes, paneles
  siempre abiertos, sombras pesadas, gradientes decorativos.
- Header flotante translucido (backdrop-blur, esquinas redondeadas,
  margen respecto del borde de la ventana).
- El color nunca es la unica forma de distinguir un estado (PK, FK, error,
  seleccion): siempre debe reconocerse tambien sin color.
- No agregar botones ni menus para funcionalidad de un incremento futuro
  (ver docs/INCREMENTOS.md) - ni siquiera deshabilitados.
- Tailwind CSS 4 (utilidades ya disponibles via @tailwindcss/vite, sin
  tailwind.config.js) + Radix Primitives + lucide-react. Nada de kits de
  UI pesados que impongan estetica propia.
