-- ================================================================
-- 17 — Cliente 360° + Flota + Planes de Mantenimiento
-- ================================================================

-- ── Extender tabla maquinas ─────────────────────────────────────
ALTER TABLE maquinas
  ADD COLUMN IF NOT EXISTS tipo               text DEFAULT 'maquinaria',
  ADD COLUMN IF NOT EXISTS estado_operativo   text DEFAULT 'Operativo'
    CHECK (estado_operativo IN ('Operativo','En mantenimiento','En taller','Esperando repuesto','Fuera de servicio','Baja')),
  ADD COLUMN IF NOT EXISTS km_actual          numeric(10,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ubicacion          text,
  ADD COLUMN IF NOT EXISTS garantia_hasta     date,
  ADD COLUMN IF NOT EXISTS comunicacion_service text DEFAULT 'pendiente'
    CHECK (comunicacion_service IN ('pendiente','avisado','confirmado','reprogramado','rechazado'));

-- ── Planes de mantenimiento preventivo ──────────────────────────
-- Cada máquina puede tener múltiples planes (aceite c/250hs, filtros c/500hs, etc.)
CREATE TABLE IF NOT EXISTS planes_mantenimiento (
  id                    uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  maquina_id            uuid NOT NULL REFERENCES maquinas(id) ON DELETE CASCADE,
  organization_id       uuid REFERENCES organizaciones(id) ON DELETE CASCADE,
  nombre                text NOT NULL,
  tipo_intervalo        text NOT NULL CHECK (tipo_intervalo IN ('horas','km','dias','calendario')),
  intervalo_valor       numeric NOT NULL,
  ultimo_realizado_valor numeric DEFAULT 0,
  ultimo_realizado_fecha date,
  descripcion           text,
  activo                boolean DEFAULT true,
  created_at            timestamptz DEFAULT now()
);
ALTER TABLE planes_mantenimiento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_planes_mantenimiento" ON planes_mantenimiento
  USING (organization_id = get_org_id())
  WITH CHECK (organization_id = get_org_id());

-- ── Extender generar_alertas_automaticas con estado_operativo ───
-- (reemplaza función existente agregando alerta por activos detenidos)
CREATE OR REPLACE FUNCTION generar_alertas_automaticas(p_org_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE total integer := 0; n integer;
BEGIN
  -- Limpiar alertas auto previas
  DELETE FROM alertas WHERE organization_id = p_org_id AND auto_generada = true AND resuelta = false;

  -- ── Service vencido ───────────────────────────────────────────
  INSERT INTO alertas (organization_id, tipo, titulo, descripcion, entidad_tipo, entidad_id, prioridad, auto_generada)
  SELECT p_org_id, 'service_urgente',
    'SERVICE VENCIDO: ' || nombre_unidad,
    'Vencido hace ' || ABS(horas_restantes_service) || ' hs. Requiere intervención inmediata.',
    'maquina', id, 'alta', true
  FROM maquinas_service
  WHERE organization_id = p_org_id AND estado_service = 'urgente';
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;

  -- ── Service próximo ───────────────────────────────────────────
  INSERT INTO alertas (organization_id, tipo, titulo, descripcion, entidad_tipo, entidad_id, prioridad, auto_generada)
  SELECT p_org_id, 'service_proximo',
    'Service próximo: ' || nombre_unidad,
    'Restan ' || horas_restantes_service || ' hs para el próximo service.',
    'maquina', id, 'media', true
  FROM maquinas_service
  WHERE organization_id = p_org_id AND estado_service = 'proximo';
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;

  -- ── Alquiler por vencer ────────────────────────────────────────
  INSERT INTO alertas (organization_id, tipo, titulo, descripcion, entidad_tipo, entidad_id, prioridad, auto_generada)
  SELECT p_org_id, 'alquiler_vencimiento',
    'Contrato por vencer: ' || nombre_unidad,
    'El contrato de alquiler vence en menos de 7 días.',
    'alquiler', id, 'media', true
  FROM alquileres_activos
  WHERE organization_id = p_org_id AND estado_vencimiento = 'por_vencer';
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;

  -- ── Stock mínimo (tabla repuestos) ─────────────────────────────
  INSERT INTO alertas (organization_id, tipo, titulo, descripcion, entidad_tipo, entidad_id, prioridad, auto_generada)
  SELECT p_org_id, 'stock_minimo',
    'Stock bajo: ' || nombre,
    'Stock actual ' || stock_actual || ' ' || unidad || ' — mínimo ' || stock_minimo || '.',
    'repuesto', id, 'media', true
  FROM repuestos
  WHERE organization_id = p_org_id AND activo = true AND stock_actual <= stock_minimo AND stock_minimo > 0;
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;

  -- ── Lead sin contactar > 24 hs ────────────────────────────────
  INSERT INTO alertas (organization_id, tipo, titulo, descripcion, entidad_tipo, entidad_id, prioridad, auto_generada)
  SELECT p_org_id, 'lead_sin_contacto',
    'Lead sin contactar: ' || COALESCE(empresa, nombre, 'Sin nombre'),
    'Lleva más de 24 hs sin ser contactado.',
    'lead', id, 'alta', true
  FROM leads
  WHERE organization_id = p_org_id
    AND estado NOT IN ('Ganado','Perdido','Facturado')
    AND (ultimo_contacto IS NULL OR ultimo_contacto < now() - interval '24 hours')
    AND created_at < now() - interval '24 hours';
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;

  -- ── Cotización enviada sin movimiento > 3 días ────────────────
  INSERT INTO alertas (organization_id, tipo, titulo, descripcion, entidad_tipo, entidad_id, prioridad, auto_generada)
  SELECT p_org_id, 'cotizacion_sin_seguimiento',
    'Cotización sin seguimiento: #' || numero_cotizacion,
    '3+ días enviada sin respuesta.',
    'cotizacion', id, 'media', true
  FROM cotizaciones
  WHERE organization_id = p_org_id
    AND estado = 'Enviada'
    AND updated_at < now() - interval '3 days';
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;

  -- ── Cotización crítica > 7 días ───────────────────────────────
  INSERT INTO alertas (organization_id, tipo, titulo, descripcion, entidad_tipo, entidad_id, prioridad, auto_generada)
  SELECT p_org_id, 'cotizacion_critica',
    'Cotización crítica: #' || numero_cotizacion,
    'USD ' || ROUND(total_usd::numeric, 0) || ' — sin respuesta hace 7+ días.',
    'cotizacion', id, 'alta', true
  FROM cotizaciones
  WHERE organization_id = p_org_id
    AND estado = 'Enviada'
    AND updated_at < now() - interval '7 days';
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;

  -- ── Seguimiento vencido ───────────────────────────────────────
  INSERT INTO alertas (organization_id, tipo, titulo, descripcion, entidad_tipo, entidad_id, prioridad, auto_generada)
  SELECT p_org_id, 'seguimiento_vencido',
    'Seguimiento vencido: ' || COALESCE(empresa, nombre, 'Lead'),
    'El seguimiento programado para ' || to_char(proximo_seguimiento, 'DD/MM/YYYY') || ' está vencido.',
    'lead', id, 'alta', true
  FROM leads
  WHERE organization_id = p_org_id
    AND proximo_seguimiento IS NOT NULL
    AND proximo_seguimiento < now()
    AND estado NOT IN ('Ganado','Perdido','Facturado');
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;

  -- ── Oportunidad A sin movimiento > 5 días ─────────────────────
  INSERT INTO alertas (organization_id, tipo, titulo, descripcion, entidad_tipo, entidad_id, prioridad, auto_generada)
  SELECT p_org_id, 'oportunidad_sin_movimiento',
    'Oportunidad A inactiva: ' || COALESCE(empresa, nombre, 'Lead'),
    'Lead Grado A sin actividad en más de 5 días.',
    'lead', id, 'alta', true
  FROM leads
  WHERE organization_id = p_org_id
    AND lead_grade = 'A'
    AND estado NOT IN ('Ganado','Perdido','Facturado')
    AND updated_at < now() - interval '5 days';
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;

  -- ── Activos fuera de servicio ─────────────────────────────────
  INSERT INTO alertas (organization_id, tipo, titulo, descripcion, entidad_tipo, entidad_id, prioridad, auto_generada)
  SELECT p_org_id, 'activo_detenido',
    'Activo fuera de servicio: ' || nombre_unidad,
    'Estado: ' || estado_operativo || '. Requiere atención.',
    'maquina', id, 'media', true
  FROM maquinas
  WHERE organization_id = p_org_id
    AND activa = true
    AND estado_operativo IN ('Fuera de servicio','Esperando repuesto');
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;

  RETURN total;
END;
$$;
