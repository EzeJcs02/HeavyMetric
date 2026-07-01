# Pruebas End-to-End (E2E) con Playwright

Esta carpeta contiene la suite de pruebas E2E automáticas para HeavyMetric, implementadas con [Playwright](https://playwright.dev/).

## Configuración Inicial

Para correr las pruebas por primera vez, necesitas instalar las dependencias y los navegadores de Playwright:

```bash
# 1. Instalar dependencias del proyecto (si no lo hiciste)
npm install

# 2. Instalar navegadores de Playwright
npx playwright install
```

## Ejecutar Pruebas

La suite de pruebas levanta automáticamente el servidor de desarrollo (`npm run dev`) antes de ejecutar los tests.

```bash
# Ejecutar los smoke tests
npm run test:e2e
```

## Variables de Entorno (Opcional)

Por defecto, el *smoke test* de rutas protegidas se omitirá si no tienes credenciales. Si quieres probar la navegación autenticada completa:

1. Crea o configura en tu `.env` o en tu entorno de terminal:
   ```bash
   E2E_EMAIL=usuario@ejemplo.com
   E2E_PASSWORD=tu_contraseña
   ```
2. Ejecuta nuevamente `npm run test:e2e`.

## Características Implementadas

- **Captura automática de Errores JS:** Si el navegador detecta un `console.error` o una excepción no controlada (`pageerror`), el test fallará automáticamente.
- **Captura de Errores HTTP:** Si alguna petición de red (ej. Supabase API) devuelve `500`, `502`, `503` o `504`, el test fallará.
- **Evidencia de Fallos:** Cuando un test falla, Playwright guarda un **Screenshot**, un **Video** y el **Trace** completo del estado para poder debugearlo.
- **Reporte HTML:** Al finalizar, se genera un reporte web con resultados visuales (si falla un test, se te indicará el comando para abrirlo, usualmente `npx playwright show-report`).
