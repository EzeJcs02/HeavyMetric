-- =============================================================================
-- HeavyMetric — RPC: finalizar_contrato
-- Agente 1 — Backend | Knock S.A.
-- 
-- PROPÓSITO:
--   Encapsula el cierre de un contrato de alquiler en una transacción
--   atómica. Reemplaza las 3 llamadas secuenciales del frontend por una
--   sola operación que garantiza consistencia ante fallos de red.
--
-- PASOS (todos dentro de la misma transacción):
--   1. Leer y validar el contrato
--   2. Marcar el contrato como 'finalizado'
--   3. Liberar la máquina (en_alquiler = false)
--   4. Leer el tipo de cambio BNA vigente
--   5. Calcular el total y generar la transacción financiera
--
-- USO desde Frontend:
--   await supabase.rpc('finalizar_contrato', { p_contrato_id: 'uuid...' })
-- =============================================================================

CREATE OR REPLACE FUNCTION finalizar_contrato(p_contrato_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecuta con permisos del owner de la función, bypassea RLS
AS $$
DECLARE
  v_contrato        contratos_alquiler%ROWTYPE;
  v_cliente         clientes%ROWTYPE;
  v_tipo_cambio     NUMERIC;
  v_dias            INTEGER;
  v_total_usd       NUMERIC;
  v_fecha_hoy       DATE := CURRENT_DATE;
  v_transaccion_id  UUID;
BEGIN

  -- =========================================================================
  -- PASO 1: Leer el contrato y validar que sea finalizable
  -- =========================================================================
  SELECT * INTO v_contrato
  FROM contratos_alquiler
  WHERE id = p_contrato_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contrato no encontrado: %', p_contrato_id;
  END IF;

  IF v_contrato.estado IN ('finalizado', 'cancelado') THEN
    RAISE EXCEPTION 'El contrato ya está en estado "%". No se puede finalizar.', v_contrato.estado;
  END IF;

  -- =========================================================================
  -- PASO 2: Leer datos del cliente (necesario para condicion_iva)
  -- =========================================================================
  SELECT * INTO v_cliente
  FROM clientes
  WHERE id = v_contrato.cliente_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente del contrato no encontrado: %', v_contrato.cliente_id;
  END IF;

  -- =========================================================================
  -- PASO 3: Actualizar estado del contrato
  -- =========================================================================
  UPDATE contratos_alquiler
  SET
    estado    = 'finalizado',
    fecha_fin = v_fecha_hoy
  WHERE id = p_contrato_id;

  -- =========================================================================
  -- PASO 4: Liberar la máquina
  -- =========================================================================
  UPDATE maquinas
  SET en_alquiler = FALSE
  WHERE id = v_contrato.maquina_id;

  -- =========================================================================
  -- PASO 5: Obtener tipo de cambio BNA vigente
  -- =========================================================================
  SELECT venta INTO v_tipo_cambio
  FROM tipo_cambio
  ORDER BY fecha DESC
  LIMIT 1;

  -- Si no hay tipo de cambio registrado, lanzar error explícito
  IF v_tipo_cambio IS NULL OR v_tipo_cambio = 0 THEN
    RAISE EXCEPTION 'No hay tipo de cambio BNA disponible. Actualizá el cron antes de finalizar.';
  END IF;

  -- =========================================================================
  -- PASO 6: Calcular monto total del contrato
  -- =========================================================================
  v_dias := GREATEST(1, (v_fecha_hoy - v_contrato.fecha_inicio));
  v_total_usd := v_dias * v_contrato.tarifa_diaria_usd;

  -- =========================================================================
  -- PASO 7: Generar transacción financiera
  -- =========================================================================
  INSERT INTO transacciones (
    organization_id,
    tipo_documento,
    origen_tipo,
    contrato_alquiler_id,
    cliente_id,
    condicion_iva_cliente,
    monto_neto_usd,
    monto_iva_usd,
    monto_total_usd,
    tipo_cambio_bna,
    monto_total_ars,
    estado_pago,
    fecha_emision
  )
  VALUES (
    v_contrato.organization_id,
    CASE
      WHEN v_cliente.condicion_iva = 'Responsable Inscripto' THEN 'Factura A'
      WHEN v_cliente.condicion_iva = 'Monotributista'        THEN 'Factura B'
      ELSE                                                        'Factura C'
    END,
    'alquiler',
    v_contrato.id,
    v_contrato.cliente_id,
    v_cliente.condicion_iva,
    ROUND(v_total_usd / 1.21, 2),      -- Neto (sin IVA 21%)
    ROUND(v_total_usd * 0.21 / 1.21, 2), -- IVA
    ROUND(v_total_usd, 2),              -- Total bruto USD
    v_tipo_cambio,
    ROUND(v_total_usd * v_tipo_cambio, 2), -- Pesificación BNA
    'pendiente',
    v_fecha_hoy
  )
  RETURNING id INTO v_transaccion_id;

  -- =========================================================================
  -- RETORNAR RESUMEN DE LA OPERACIÓN
  -- =========================================================================
  RETURN json_build_object(
    'ok',               TRUE,
    'contrato_id',      p_contrato_id,
    'transaccion_id',   v_transaccion_id,
    'dias_facturados',  v_dias,
    'total_usd',        v_total_usd,
    'tipo_cambio_bna',  v_tipo_cambio,
    'total_ars',        ROUND(v_total_usd * v_tipo_cambio, 2)
  );

EXCEPTION
  WHEN OTHERS THEN
    -- PostgreSQL hace ROLLBACK automático de toda la transacción
    RAISE; -- Re-lanza el error al frontend
END;
$$;

-- Grant de ejecución al rol anon (el cliente Supabase del frontend lo necesita)
GRANT EXECUTE ON FUNCTION finalizar_contrato(UUID) TO anon, authenticated;
