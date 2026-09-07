import { test, expect } from "@playwright/test";

// Prueba minima de arranque (Incremento 0). Se reemplaza/expande cuando
// exista la interfaz real en el Incremento 1.
test("la aplicacion arranca y muestra el titulo", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Graficador Academico/);
});
