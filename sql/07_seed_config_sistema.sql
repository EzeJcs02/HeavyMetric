-- =============================================================================
-- HeavyMetric — Seed: config_sistema
-- Agente 1 — Backend | Knock S.A.
--
-- PROPÓSITO:
--   Inserta la configuración global inicial del sistema.
--   El módulo de Precios (solo Owner) lee y edita estos valores.
--
-- EJECUCIÓN: Correr UNA sola vez en Supabase SQL Editor.
--   Si ya existe un registro, el ON CONFLICT lo actualiza.
-- =============================================================================

-- Asume que ya existe la tabla config_sistema del 01_schema.sql
-- Si falta alguna columna, agregala con ALTER TABLE antes de insertar.

DO $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Obtener el ID de la primera organización (Knock S.A.)
  SELECT id INTO v_org_id FROM organizaciones LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró ninguna organización. Ejecutá 01_schema.sql y 02_seed.sql primero.';
  END IF;

  INSERT INTO config_sistema (
    organization_id,
    -- ── Tarifas de Mano de Obra ──────────────────────────────────────────────
    precio_hora_taller_usd,       -- Hora estándar en taller
    precio_hora_urgente_usd,      -- Hora urgente / fuera de horario
    -- ── Tarifas de Alquiler ──────────────────────────────────────────────────
    tarifa_minima_alquiler_usd,   -- Piso de tarifa diaria para cualquier unidad
    -- ── Alertas de Morosidad ─────────────────────────────────────────────────
    dias_gracia_pago,             -- Días antes de bloquear al cliente por deuda
    -- ── Política de Stock ────────────────────────────────────────────────────
    alerta_stock_habilitada       -- Si true, el sistema genera alertas por stock bajo
  )
  VALUES (
    v_org_id,
    45.00,    -- USD/h estándar
    65.00,    -- USD/h urgente (44% sobre estándar)
    150.00,   -- USD/día mínimo alquiler
    10,       -- 10 días de gracia
    true
  )
  ON CONFLICT (organization_id) DO UPDATE SET
    precio_hora_taller_usd     = EXCLUDED.precio_hora_taller_usd,
    precio_hora_urgente_usd    = EXCLUDED.precio_hora_urgente_usd,
    tarifa_minima_alquiler_usd = EXCLUDED.tarifa_minima_alquiler_usd,
    dias_gracia_pago           = EXCLUDED.dias_gracia_pago,
    alerta_stock_habilitada    = EXCLUDED.alerta_stock_habilitada,
    updated_at                 = now();

  RAISE NOTICE '✅ config_sistema insertada/actualizada para org: %', v_org_id;
END $$;

-- Verificar resultado:
SELECT * FROM config_sistema;
