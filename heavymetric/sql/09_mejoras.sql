-- ================================================================
-- 09 — Mejoras: alertas auto, NPS, horómetros, cross-reference
-- Ejecutar en Supabase SQL Editor
-- ================================================================

-- ── Alertas: flag auto_generada ──────────────────────────────────
ALTER TABLE alertas ADD COLUMN IF NOT EXISTS auto_generada boolean DEFAULT false;

-- ── NPS en OT ────────────────────────────────────────────────────
ALTER TABLE ordenes_trabajo ADD COLUMN IF NOT EXISTS nps_score integer CHECK (nps_score BETWEEN 1 AND 10);

-- ── Historial horómetros ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS historial_horometros (
  id            uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  maquina_id    uuid REFERENCES maquinas(id) ON DELETE CASCADE,
  lectura_horas numeric NOT NULL,
  fecha_lectura date NOT NULL DEFAULT CURRENT_DATE,
  fuente        text DEFAULT 'Manual' CHECK (fuente IN ('Manual', 'Tecnico', 'Cliente', 'OT')),
  notas         text,
  created_by    uuid REFERENCES perfiles(id),
  created_at    timestamptz DEFAULT now()
);
ALTER TABLE historial_horometros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "horometros_org" ON historial_horometros FOR ALL USING (
  EXISTS (SELECT 1 FROM maquinas m WHERE m.id = maquina_id AND m.organization_id = get_org_id())
);

-- ── Cross-reference repuestos ────────────────────────────────────
CREATE TABLE IF NOT EXISTS cross_reference_repuestos (
  id                   uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  inventario_id        uuid REFERENCES inventario(id) ON DELETE CASCADE,
  marca_compatible     text NOT NULL,
  modelo_compatible    text NOT NULL,
  tipo_equipo          text,
  tipo_compatibilidad  text CHECK (tipo_compatibilidad IN ('Directa','Alternativa','Equivalente')) DEFAULT 'Directa',
  nivel_confianza      text CHECK (nivel_confianza IN ('Alta','Media','Baja')) DEFAULT 'Alta',
  notas                text,
  created_at           timestamptz DEFAULT now()
);
ALTER TABLE cross_reference_repuestos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crossref_org" ON cross_reference_repuestos FOR ALL USING (
  EXISTS (SELECT 1 FROM inventario i WHERE i.id = inventario_id AND i.organization_id = get_org_id())
);

-- ── RPC: generar alertas automáticas ────────────────────────────
CREATE OR REPLACE FUNCTION generar_alertas_automaticas(p_org_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE total integer := 0; n integer;
BEGIN
  -- Limpiar alertas auto previas
  DELETE FROM alertas WHERE organization_id = p_org_id AND auto_generada = true AND resuelta = false;

  -- Service vencido
  INSERT INTO alertas (organization_id, tipo, titulo, descripcion, entidad_tipo, entidad_id, prioridad, auto_generada)
  SELECT p_org_id, 'service_urgente',
    'SERVICE VENCIDO: ' || nombre_unidad,
    'Vencido hace ' || ABS(horas_restantes_service) || ' hs. Requiere intervención inmediata.',
    'maquina', id, 'alta', true
  FROM maquinas_service WHERE organization_id = p_org_id AND estado_service = 'vencido';
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;

  -- Service urgente (< 50 hs)
  INSERT INTO alertas (organization_id, tipo, titulo, descripcion, entidad_tipo, entidad_id, prioridad, auto_generada)
  SELECT p_org_id, 'service_proximo',
    'Service próximo: ' || nombre_unidad,
    'Faltan ' || horas_restantes_service || ' hs para el próximo service.',
    'maquina', id, 'alta', true
  FROM maquinas_service WHERE organization_id = p_org_id AND estado_service = 'urgente';
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;

  -- Stock mínimo
  INSERT INTO alertas (organization_id, tipo, titulo, descripcion, entidad_tipo, entidad_id, prioridad, auto_generada)
  SELECT p_org_id, 'stock_minimo',
    CASE WHEN stock_actual = 0 THEN 'Sin stock: ' ELSE 'Stock bajo: ' END || nombre_repuesto,
    'Stock: ' || stock_actual || ' u. / Mínimo: ' || stock_minimo || ' u.',
    'inventario', id,
    CASE WHEN stock_actual = 0 THEN 'alta' ELSE 'media' END,
    true
  FROM inventario WHERE organization_id = p_org_id AND activo = true AND stock_actual <= stock_minimo;
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;

  -- Alquileres por vencer (≤ 7 días)
  INSERT INTO alertas (organization_id, tipo, titulo, descripcion, entidad_tipo, entidad_id, prioridad, auto_generada)
  SELECT p_org_id, 'alquiler_vencimiento',
    'Alquiler vence en ' || (ca.fecha_fin - CURRENT_DATE) || ' días: ' || m.nombre_unidad,
    'Contrato #' || ca.numero_contrato || ' — ' || c.razon_social || '. Vence: ' || ca.fecha_fin,
    'contrato_alquiler', ca.id,
    CASE WHEN (ca.fecha_fin - CURRENT_DATE) <= 2 THEN 'alta' ELSE 'media' END,
    true
  FROM contratos_alquiler ca
  JOIN maquinas m ON ca.maquina_id = m.id
  JOIN clientes c ON ca.cliente_id = c.id
  WHERE ca.organization_id = p_org_id AND ca.estado = 'activo'
    AND (ca.fecha_fin - CURRENT_DATE) BETWEEN 0 AND 7;
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;

  RETURN total;
END;
$$;

GRANT EXECUTE ON FUNCTION generar_alertas_automaticas(uuid) TO authenticated;
