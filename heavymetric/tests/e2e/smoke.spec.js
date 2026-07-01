import { test, expect } from '@playwright/test';

const E2E_EMAIL = process.env.E2E_EMAIL;
const E2E_PASSWORD = process.env.E2E_PASSWORD;

test.describe('HeavyMetric Smoke Tests', () => {
  let errors = [];

  test.beforeEach(async ({ page }) => {
    errors = []; // Reset errors for each test

    // Capturar errores de consola (console.error)
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(`Console Error: "${msg.text()}"`);
      }
    });

    // Capturar uncaught exceptions (pageerror)
    page.on('pageerror', exception => {
      errors.push(`Page Error (Uncaught exception): "${exception}"`);
    });

    // Capturar errores HTTP específicos
    page.on('response', response => {
      const status = response.status();
      if ([500, 502, 503, 504].includes(status)) {
        errors.push(`HTTP ${status} Error al cargar: ${response.url()}`);
      }
    });
  });

  test.afterEach(() => {
    // Si hubo algún error crítico capturado, fallamos el test mostrando los detalles
    expect(errors, `Se detectaron errores críticos en la página:\n${errors.join('\n')}`).toHaveLength(0);
  });

  test('Debe cargar la pantalla de login y autenticarse si hay credenciales', async ({ page }) => {
    await page.goto('/login');
    
    // Validar que el login renderizó (no hay pantalla blanca)
    await expect(page.locator('button', { hasText: /Ingresar|Iniciar/i }).first()).toBeVisible();

    if (E2E_EMAIL && E2E_PASSWORD) {
      await page.fill('input[type="email"]', E2E_EMAIL);
      await page.fill('input[type="password"]', E2E_PASSWORD);
      await page.click('button[type="submit"]');

      // Esperar a la navegación al dashboard o inicio
      await page.waitForURL('**/app**', { timeout: 15000 });
      await expect(page).toHaveURL(/.*\/app/);
    } else {
      console.log('Omitiendo login: No se proveyeron E2E_EMAIL y E2E_PASSWORD.');
    }
  });

  // Solo corremos la navegación si logramos autenticarnos (o si hay una sesión guardada)
  test('Debe navegar por las rutas principales sin romper (Pantalla blanca)', async ({ page }) => {
    test.skip(!E2E_EMAIL || !E2E_PASSWORD, 'Se requieren credenciales para probar rutas internas');

    // Autenticarnos rápidamente
    await page.goto('/login');
    await page.fill('input[type="email"]', E2E_EMAIL);
    await page.fill('input[type="password"]', E2E_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/app**', { timeout: 15000 });

    const routes = [
      '/app',
      '/app/clientes',
      '/app/activo360',
      '/app/taller',
      '/app/repuestos',
      '/app/facturacion',
      '/app/tesoreria',
      '/app/ceo',
      '/app/configuracion'
    ];

    for (const route of routes) {
      await page.goto(route);
      // Validar que no estemos viendo un ErrorBoundary o una pantalla blanca
      // Asumimos que el ErrorBoundary contiene "Algo salió mal"
      const errorBoundaryMsg = page.locator('text=Algo salió mal');
      await expect(errorBoundaryMsg).not.toBeVisible();
      
      // Esperar un elemento común del layout (como la navbar o menú) para verificar renderización
      const mainElement = page.locator('main').first();
      await expect(mainElement).toBeVisible();
    }
  });
});
