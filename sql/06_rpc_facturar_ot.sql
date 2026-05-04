-- =============================================================================
-- HeavyMetric — RPC: facturar_ot
-- Agente 1 — Backend | Knock S.A.
--
-- PROPÓSITO:
--   Genera una transacción de facturación para una OT completada y
--   cambia su estado a 'facturada', todo en una sola transacción SQL.
--   Determina el tipo de documento automáticamente según condición IVA.
--
-- USO desde Frontend:
--   await supabase.rpc('facturar_ot', {
--     p_ot_id:          'uuid...',
--     p_tipo_documento: 'Factura A'  -- opcional, si se omite lo calcula solo
--   })
-- =============================================================================

CREATE OR REPLACE FUNCTION facturar_ot(
  p_ot_id          UUID,
  p_tipo_documento TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ot              ordenes_trabajo%ROWTYPE;
  v_cliente         clientes%ROWTYPE;
  v_tipo_cambio     NUMERIC;
  v_tipo_doc        TEXT;
  v_monto_total     NUMERIC;
  v_tx_id           UUID;
BEGIN

  -- =========================================================================
  -- PASO 1: Leer y validar la OT
  -- =========================================================================
  SELECT * INTO v_ot FROM ordenes_trabajo WHERE id = p_ot_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'OT no encontrada: %', p_ot_id;
  END IF;
  IF v_ot.estado = 'facturada' THEN
    RAISE EXCEPTION 'La OT #% ya ha sido facturada.', v_ot.numero_ot;
  END IF;
  IF v_ot.estado NOT IN ('completada', 'en_progreso') THEN
    RAISE EXCEPTION 'La OT debe estar completada antes de facturar. Estado actual: %', v_ot.estado;
  END IF;

  -- =========================================================================
  -- PASO 2: Datos del cliente
  -- =========================================================================
  SELECT * INTO v_cliente FROM clientes WHERE id = v_ot.cliente_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente no encontrado: %', v_ot.cliente_id;
  END IF;

  -- =========================================================================
  -- PASO 3: Tipo de cambio BNA
  -- =========================================================================
  SELECT venta INTO v_tipo_cambio FROM tipo_cambio ORDER BY fecha DESC LIMIT 1;
  IF v_tipo_cambio IS NULL OR v_tipo_cambio = 0 THEN
    RAISE EXCEPTION 'No hay tipo de cambio BNA disponible.';
  END IF;

  -- =========================================================================
  -- PASO 4: Tipo de documento (override manual o automático por IVA)
  -- =========================================================================
  v_tipo_doc := COALESCE(
    p_tipo_documento,
    CASE
      WHEN v_cliente.condicion_iva = 'Responsable Inscripto' THEN 'Factura A'
      WHEN v_cliente.condicion_iva = 'Monotributista'        THEN 'Factura B'
      ELSE                                                        'Factura C'
    END
  );

  -- =========================================================================
  -- PASO 5: Calcular monto total
  -- =========================================================================
  v_monto_total := ROUND(COALESCE(v_ot.total_usd, 0), 2);

  -- =========================================================================
  -- PASO 6: Crear transacción
  -- =========================================================================
  INSERT INTO transacciones (
    organization_id,
    tipo_documento,
    origen_tipo,
    orden_trabajo_id,
    cliente_id,
    condicion_iva_cliente,
    monto_neto_usd,
    monto_iva_usd,
    monto_total_usd,
    tipo_cambio_bna,
    monto_total_ars,
    estado_pago,
    fecha_emision
  ) VALUES (
    v_ot.organization_id,
    v_tipo_doc,
    'taller',
    v_ot.id,
    v_ot.cliente_id,
    v_cliente.condicion_iva,
    ROUND(v_monto_total / 1.21, 2),
    ROUND(v_monto_total * 0.21 / 1.21, 2),
    v_monto_total,
    v_tipo_cambio,
    ROUND(v_monto_total * v_tipo_cambio, 2),
    'pendiente',
    CURRENT_DATE
  ) RETURNING id INTO v_tx_id;

  -- =========================================================================
  -- PASO 7: Marcar OT como facturada
  -- =========================================================================
  UPDATE ordenes_trabajo SET estado = 'facturada' WHERE id = p_ot_id;

  -- =========================================================================
  -- RETORNAR RESUMEN
  -- =========================================================================
  RETURN json_build_object(
    'ok',             TRUE,
    'transaccion_id', v_tx_id,
    'ot_id',          p_ot_id,
    'tipo_documento', v_tipo_doc,
    'total_usd',      v_monto_total,
    'tipo_cambio',    v_tipo_cambio,
    'total_ars',      ROUND(v_monto_total * v_tipo_cambio, 2)
  );

EXCEPTION
  WHEN OTHERS THEN RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION facturar_ot(UUID, TEXT) TO anon, authenticated;
