# 🚜 HeavyMetric - Sistema de Gestión ERP (v2.4.0)

Este documento detalla el funcionamiento técnico, operativo y la arquitectura del sistema HeavyMetric desarrollado para **Knock S.A.**

---

## 🛠️ Ficha Técnica (Stack Tecnológico)

El sistema ha sido construido bajo estándares modernos de desarrollo web para garantizar velocidad, seguridad y escalabilidad.

- **Frontend:** React.js (v18) con Vite para una carga instantánea.
- **Estilizado:** Tailwind CSS (Diseño "Heavy Industrial" personalizado).
- **Backend (BaaS):** Supabase (PostgreSQL).
- **Seguridad:** Row Level Security (RLS) para proteger los datos por organización.
- **Automatización:** Vercel Serverless Functions (Node.js) para actualización de moneda y alertas.
- **Generación de Reportes:** jsPDF (Contratos) y XLSX (Excel de inventario).
- **IA de Auditoría:** Integración con Anthropic Claude para asistencia inteligente.

---

## 📖 Manual de Usuario

### 1. Dashboard (Torre de Control)
- **Indicadores (KPIs):** Visualización en tiempo real de Órdenes de Trabajo activas, Máquinas alquiladas y Facturación mensual.
- **Tipo de Cambio:** Actualización automática diaria del dólar oficial BNA (Venta).
- **Alertas de Service:** Panel que avisa qué máquinas están a menos de 50 horas de su próximo mantenimiento.

### 2. Módulo de Taller (OT)
- **Creación:** Al abrir una OT, se debe vincular a una máquina de la flota.
- **Repuestos:** Los repuestos utilizados descuentan automáticamente del inventario de "Ventas".
- **Finalización:** Al cerrar la OT, el sistema solicita el horómetro final y genera automáticamente el registro para facturación.

### 3. Módulo de Alquileres
- **Contratos:** Permite iniciar un contrato seleccionando cliente y máquina disponible.
- **Checklist:** Registro de horómetros de salida y entrada.
- **Finalización:** Al finalizar, se calcula el uso y se envía la transacción al módulo de Facturación.

### 4. Inventario / Ventas
- **Gestión de Stock:** Semaforización de stock (Verde: OK, Amarillo: Crítico, Rojo: Sin stock).
- **Ajustes:** Botones rápidos para sumar o restar stock tras ingresos de mercadería.

### 5. Facturación y Precios
- **Precios (Owner):** Configuración de tarifas por hora de taller (Estándar/Urgente) y alquileres.
- **Cobros:** Registro de pagos (Pendiente / Cobrado) para mantener el flujo de caja controlado.

---

## ⚙️ Arquitectura de Datos (Backend)

### Funciones Atómicas (RPC)
Para garantizar que los datos no se "rompan" si falla el internet, usamos procesos atómicos en el servidor:
- `finalizar_contrato`: Cierra el contrato, actualiza la máquina y crea la factura en un solo paso.
- `finalizar_ot`: Cierra la orden, actualiza el horómetro de la máquina y crea la factura de servicio.

### Seguridad (RLS)
Cada tabla tiene políticas de seguridad que aseguran que:
1. Solo los usuarios autenticados vean datos.
2. Los empleados no puedan borrar registros críticos.
3. El `Owner` sea el único con acceso al panel de Precios globales.

---

## 🚀 Despliegue y Mantenimiento

- **Hosting:** Vercel (Producción).
- **Base de Datos:** Supabase (AWS Frankfurt).
- **Variables de Entorno:**
  - `VITE_SUPABASE_URL`: Conexión a DB.
  - `VITE_SUPABASE_ANON_KEY`: Acceso público.
  - `SUPABASE_SERVICE_ROLE_KEY`: Acceso para procesos de servidor.
  - `CRON_SECRET`: Seguridad para el actualizador del dólar.

---
*Desarrollado con precisión técnica por Antigravity AI para Knock S.A.*
