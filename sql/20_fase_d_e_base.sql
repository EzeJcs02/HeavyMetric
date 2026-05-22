-- ============================================================
-- 20_fase_d_e_base.sql
-- FASE D: Centro de Notificaciones, Timeline 360
-- FASE E (BASE): AI Engine, Workflow Engine, Risk/Uptime Score
-- ============================================================

-- 1. FASE D - CENTRO DE NOTIFICACIONES
-- Unifica CRM, postventa, stock, OT, compras, etc. con prioridad, lectura, y vínculo.
CREATE TABLE IF NOT EXISTS notificaciones (
  id              uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id uuid REFERENCES organizaciones(id),
  perfil_id       uuid REFERENCES perfiles(id), -- Usuario que recibe la notificación (null para broadcast org)
  tipo            text NOT NULL, -- ej: 'ot_demorada', 'service_vencido', 'aprobacion_pendiente'
  titulo          text NOT NULL,
  mensaje         text,
  prioridad       text CHECK (prioridad IN ('alta','media','baja')) DEFAULT 'media',
  leido           boolean DEFAULT false,
  vinculo_tipo    text, -- ej: 'orden_trabajo', 'maquina', 'cliente', 'solicitud'
  vinculo_id      uuid,
  created_at      timestamptz DEFAULT now()
);

-- RLS Notificaciones
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_policy" ON notificaciones 
  FOR ALL USING (organization_id = get_org_id() AND (perfil_id IS NULL OR perfil_id = auth.uid()));


-- 2. FASE D - TIMELINE 360 (Tabla de Notas Manuales)
-- Almacena notas, llamadas, correos generados manualmente
CREATE TABLE IF NOT EXISTS timeline_notas (
  id              uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id uuid REFERENCES organizaciones(id),
  cliente_id      uuid REFERENCES clientes(id),
  maquina_id      uuid REFERENCES maquinas(id), -- Opcional, si es sobre una máquina específica
  autor_id        uuid REFERENCES perfiles(id),
  tipo_nota       text CHECK (tipo_nota IN ('nota','llamada','correo','reunion')) DEFAULT 'nota',
  contenido       text NOT NULL,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE timeline_notas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "timeline_notas_policy" ON timeline_notas 
  FOR ALL USING (organization_id = get_org_id());

-- 2.b FASE D - TIMELINE 360 (VISTA UNIFICADA)
-- Une notas manuales, OTs, facturas y alertas en un solo log cronológico.
CREATE OR REPLACE VIEW timeline_eventos_360 AS
-- NOTAS MANUALES
SELECT 
  id as evento_id, organization_id, cliente_id, maquina_id, 
  created_at as fecha, 'nota' as origen, tipo_nota as tipo_evento, contenido as descripcion
FROM timeline_notas
UNION ALL
-- ORDENES DE TRABAJO
SELECT 
  id as evento_id, organization_id, cliente_id, maquina_id, 
  created_at as fecha, 'orden_trabajo' as origen, 'apertura_ot' as tipo_evento, 
  'Se abrió la OT #' || numero_ot || ' (' || estado || ')' as descripcion
FROM ordenes_trabajo
UNION ALL
-- CONTRATOS ALQUILER
SELECT 
  id as evento_id, organization_id, cliente_id, maquina_id, 
  created_at as fecha, 'contrato' as origen, 'nuevo_alquiler' as tipo_evento, 
  'Se inició contrato #' || numero_contrato as descripcion
FROM contratos_alquiler
UNION ALL
-- FACTURAS (solo vinculadas a cliente)
SELECT 
  id as evento_id, organization_id, cliente_id, NULL as maquina_id, 
  created_at as fecha, 'factura' as origen, 'emision_factura' as tipo_evento, 
  tipo_documento || ' por USD ' || monto_total_usd as descripcion
FROM transacciones
UNION ALL
-- ALERTAS
SELECT 
  id as evento_id, organization_id, 
  CASE WHEN entidad_tipo = 'cliente' THEN entidad_id ELSE NULL END as cliente_id,
  CASE WHEN entidad_tipo = 'maquina' THEN entidad_id ELSE NULL END as maquina_id,
  created_at as fecha, 'alerta' as origen, tipo as tipo_evento, titulo as descripcion
FROM alertas WHERE entidad_tipo IN ('cliente', 'maquina');


-- 3. FASE E (BASE) - AI ENGINE LOGS
-- Estructura para resúmenes, sugerencias, predicciones (asistiva)
CREATE TABLE IF NOT EXISTS ai_engine_logs (
  id              uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id uuid REFERENCES organizaciones(id),
  perfil_id       uuid REFERENCES perfiles(id),
  tipo_analisis   text NOT NULL, -- ej: 'resumen_cliente', 'prediccion_falla'
  input_data      jsonb,
  output_data     jsonb,
  feedback_util   boolean, -- Para mejorar prompts a futuro
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE ai_engine_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_logs_policy" ON ai_engine_logs 
  FOR ALL USING (organization_id = get_org_id());


-- 4. FASE E (BASE) - WORKFLOW ENGINE
-- Base de aprobaciones complejas
CREATE TABLE IF NOT EXISTS workflow_aprobaciones (
  id               uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id  uuid REFERENCES organizaciones(id),
  solicitante_id   uuid REFERENCES perfiles(id),
  aprobador_id     uuid REFERENCES perfiles(id), -- Si es null, cualquiera con rol owner puede aprobar
  tipo_workflow    text NOT NULL, -- ej: 'compra_monto_x', 'ot_costo_x', 'baja_activo', 'cambio_precio'
  entidad_tipo     text, 
  entidad_id       uuid,
  monto_involucrado numeric(15,2),
  datos_json       jsonb,
  estado           text CHECK (estado IN ('pendiente', 'aprobado', 'rechazado', 'cancelado')) DEFAULT 'pendiente',
  comentario_resolucion text,
  resolucion_at    timestamptz,
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE workflow_aprobaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workflow_policy" ON workflow_aprobaciones 
  FOR ALL USING (organization_id = get_org_id() AND (get_rol() IN ('owner','supervisor') OR solicitante_id = auth.uid()));


-- 5. FASE E (BASE) - RISK / UPTIME SCORE EN MAQUINAS
-- Alteramos la tabla máquinas de forma segura (sin borrar datos)
ALTER TABLE maquinas
  ADD COLUMN IF NOT EXISTS score_disponibilidad numeric(5,2) DEFAULT 100.00,
  ADD COLUMN IF NOT EXISTS score_fallas integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tiempo_detenido_horas integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS costo_acumulado_usd numeric(15,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS criticidad text CHECK (criticidad IN ('baja', 'media', 'alta', 'critica')) DEFAULT 'baja';
