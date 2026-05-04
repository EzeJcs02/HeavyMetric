-- =============================================================================
-- HeavyMetric — RPC: finalizar_ot
-- Agente 1 — Backend | Knock S.A.
--
-- PROPÓSITO:
--   Cierra una Orden de Trabajo de forma atómica, actualizando:
--     1. Estado y costos finales de la OT
--     2. Horómetro de la máquina
--     3. Último service (si corresponde)
--     4. Libera la máquina del taller
--
-- USO desde Frontend:
--   await supabase.rpc('finalizar_ot', {
--     p_ot_id:               'uuid...',
--     p_horometro_final:     1500,
--     p_horas_mano_obra:     4.5,
--     p_precio_hora_usd:     45,
--     p_estado:              'completada',  -- o 'facturada'
--     p_notas_internas:      'texto...',
--     p_resetear_service:    true
--   })
-- =============================================================================

CREATE OR REPLACE FUNCTION finalizar_ot(
  p_ot_id             UUID,
  p_horometro_final   NUMERIC,
  p_horas_mano_obra   NUMERIC,
  p_precio_hora_usd   NUMERIC,
  p_estado            TEXT,
  p_notas_internas    TEXT     DEFAULT NULL,
  p_resetear_service  BOOLEAN  DEFAULT FALSE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ot              ordenes_trabajo%ROWTYPE;
  v_total_mo        NUMERIC;
  v_total_final     NUMERIC;
BEGIN

  -- =========================================================================
  -- PASO 1: Leer y validar la OT
  -- =========================================================================
  SELECT * INTO v_ot
  FROM ordenes_trabajo
  WHERE id = p_ot_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Orden de Trabajo no encontrada: %', p_ot_id;
  END IF;

  IF v_ot.estado IN ('completada', 'facturada', 'cancelada') THEN
    RAISE EXCEPTION 'La OT ya está en estado "%". No se puede finalizar.', v_ot.estado;
  END IF;

  IF p_estado NOT IN ('completada', 'facturada') THEN
    RAISE EXCEPTION 'Estado inválido: %. Debe ser "completada" o "facturada".', p_estado;
  END IF;

  -- =========================================================================
  -- PASO 2: Calcular totales de mano de obra
  -- =========================================================================
  v_total_mo    := ROUND(p_horas_mano_obra * p_precio_hora_usd, 2);
  v_total_final := ROUND(v_total_mo + COALESCE(v_ot.total_repuestos_usd, 0), 2);

  -- =========================================================================
  -- PASO 3: Actualizar la OT
  -- =========================================================================
  UPDATE ordenes_trabajo
  SET
    estado              = p_estado,
    fecha_egreso        = CURRENT_DATE,
    horas_mano_obra     = p_horas_mano_obra,
    precio_hora_usd     = p_precio_hora_usd,
    total_mano_obra_usd = v_total_mo,
    total_usd           = v_total_final,
    notas_internas      = COALESCE(p_notas_internas, notas_internas)
  WHERE id = p_ot_id;

  -- =========================================================================
  -- PASO 4: Actualizar la máquina
  -- =========================================================================
  UPDATE maquinas
  SET
    horometro_actual      = p_horometro_final,
    en_taller             = FALSE,
    -- Si se marcó "resetear service", actualizamos el último service
    ultimo_service_horas  = CASE
                              WHEN p_resetear_service THEN p_horometro_final
                              ELSE ultimo_service_horas
                            END
  WHERE id = v_ot.maquina_id;

  -- =========================================================================
  -- RETORNAR RESUMEN
  -- =========================================================================
  RETURN json_build_object(
    'ok',               TRUE,
    'ot_id',            p_ot_id,
    'estado',           p_estado,
    'total_mo_usd',     v_total_mo,
    'total_final_usd',  v_total_final,
    'horometro_nuevo',  p_horometro_final,
    'service_reseteado', p_resetear_service
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION finalizar_ot(UUID, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, BOOLEAN) TO anon, authenticated;
