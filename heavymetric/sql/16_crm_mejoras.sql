-- ================================================================
-- 16 — CRM Etapa 2: pipelines, actividades, tareas, alertas comerciales
-- ================================================================

-- ── Extender tabla leads ────────────────────────────────────────
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS pipeline          text DEFAULT 'ventas' CHECK (pipeline IN ('ventas','postventa')),
  ADD COLUMN IF NOT EXISTS prioridad         text DEFAULT 'media'  CHECK (prioridad IN ('alta','media','baja')),
  ADD COLUMN IF NOT EXISTS responsable_id    uuid REFERENCES perfiles(id),
  ADD COLUMN IF NOT EXISTS ultimo_contacto   timestamptz,
  ADD COLUMN IF NOT EXISTS proximo_seguimiento timestamptz;

-- ── Actividades / timeline ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_actividades (
  id          uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  lead_id     uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tipo        text NOT NULL CHECK (tipo IN ('nota','cambio_estado','contacto','tarea_creada','cotizacion','sistema')),
  descripcion text NOT NULL,
  datos       jsonb,
  creado_por  uuid REFERENCES perfiles(id),
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE lead_actividades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_lead_actividades" ON lead_actividades
  USING (lead_id IN (SELECT id FROM leads WHERE organization_id = get_org_id()))
  WITH CHECK (lead_id IN (SELECT id FROM leads WHERE organization_id = get_org_id()));

-- ── Tareas de seguimiento ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_tareas (
  id          uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  lead_id     uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  titulo      text NOT NULL,
  descripcion text,
  vencimiento date,
  completada  boolean DEFAULT false,
  asignado_a  uuid REFERENCES perfiles(id),
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE lead_tareas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_lead_tareas" ON lead_tareas
  USING (lead_id IN (SELECT id FROM leads WHERE organization_id = get_org_id()))
  WITH CHECK (lead_id IN (SELECT id FROM leads WHERE organization_id = get_org_id()));

-- ── Extender generar_alertas_automaticas con reglas comerciales ─
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

  -- ── Stock mínimo ───────────────────────────────────────────────
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

  RETURN total;
END;
$$;
