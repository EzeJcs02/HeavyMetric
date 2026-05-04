# Estado Agente 1 — Backend HeavyMetric
> Última actualización: 2026-05-03 | Knock S.A.

---

## ✅ Completado

- [x] **Estructura de carpetas** — `api/`, `api/cron/`, `sql/`
- [x] **`sql/01_schema.sql`** — Schema completo listo para ejecutar en Supabase
- [x] **`sql/02_seed.sql`** — 4 clientes + 5 ítems de inventario de prueba
- [x] **`api/cron/actualizar-dolar.js`** — Cron serverless que llama a dolarapi.com y hace upsert en `tipo_cambio`
- [x] **`api/whatsapp-alerta.js`** — Endpoint POST con mensajes para `service_urgente` y `service_proximo`
- [x] **`sql/03_security_hardening.sql`** — Triggers de stock, horómetro y RLS de Soft Delete (Agente 4)
- [x] **vercel.json** — Cron configurado 3x/día (8, 14 y 20hs ARG)
- [x] **`.env.example`** — Plantilla de variables de entorno documentada
- [x] **`.gitignore`** — Protege `.env.local` y `node_modules/`

---

## ✅ Completado por el operador humano

- [x] **Ejecutar `01_schema.sql`** en Supabase SQL Editor ✅
- [x] **Ejecutar `02_seed.sql`** en Supabase SQL Editor ✅
- [x] **`.env.local`** creado con claves reales de Supabase ✅
- [ ] **Configurar variables en Vercel Dashboard** → Settings → Environment Variables (pendiente para deploy)
- [ ] **Vincular primer usuario como `owner`** en la tabla `perfiles` (pendiente hasta tener login)

---

## 📦 Tablas disponibles para el Agente 2 (Frontend)

| Tabla / Vista | Descripción |
|---|---|
| `organizaciones` | Tenant principal — Knock S.A. |
| `perfiles` | Usuarios con rol: `owner` \| `supervisor` \| `operativo` |
| `tipo_cambio` | Dólar BNA — actualizado 3x/día vía cron |
| `config_sistema` | Configuración global (ej: cotización actual dólar) |
| `clientes` | CRM básico con condición IVA |
| `inventario` | Stock de repuestos con SKU y precio USD |
| `maquinas` | Flota: horómetro, service, estado |
| `maquinas_service` *(vista)* | Máquinas + estado service calculado (`ok` / `proximo` / `urgente` / `vencido`) |
| `ordenes_trabajo` | OT con mano de obra y repuestos |
| `ot_repuestos` | Detalle de repuestos por OT |
| `contratos_alquiler` | Contratos con tarifa diaria USD |
| `alquileres_activos` *(vista)* | Alquileres con días restantes y estado de vencimiento |
| `transacciones` | Facturación ARCA: Fact. A/B/C, CAE, pesificación BNA |
| `solicitudes_edicion` | Flujo de aprobación Operativo → Supervisor → Owner |
| `ia_auditoria` | Log de decisiones tomadas por el Agente 3 (IA) |
| `alertas` | Alertas internas (service, stock, alquiler) |

---

## 🔐 Notas de seguridad para el Agente 2

- `VITE_SUPABASE_ANON_KEY` → ✅ segura para usar en frontend
- `SUPABASE_SERVICE_ROLE_KEY` → ❌ solo en `api/` (server-side), NUNCA en frontend
- Todas las tablas tienen **RLS habilitado** — el frontend siempre lee datos filtrados por `organization_id`
- Las vistas `maquinas_service` y `alquileres_activos` ya traen los campos calculados listos para renderizar

---

## 🔌 Endpoints API disponibles

| Ruta | Método | Descripción |
|---|---|---|
| `/api/cron/actualizar-dolar` | GET (cron) | Actualiza tipo de cambio BNA. Requiere header `Authorization: Bearer {CRON_SECRET}` |
| `/api/whatsapp-alerta` | POST | Envía alerta WhatsApp. Body: `{ tipo, maquina, cliente, horas_restantes, telefono }` |
