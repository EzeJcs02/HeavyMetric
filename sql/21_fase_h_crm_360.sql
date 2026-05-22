-- ============================================================
-- 21_fase_h_crm_360.sql
-- FASE H: CRM COMERCIAL 360 & POSTVENTA
-- ============================================================

-- LEADS
CREATE TABLE IF NOT EXISTS leads (
  id                  uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  estado              text NOT NULL DEFAULT 'Lead'
);

ALTER TABLE leads ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizaciones(id);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS pipeline text CHECK (pipeline IN ('ventas','postventa')) DEFAULT 'ventas';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS nombre text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS empresa text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS telefono text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS rubro text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS origen text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS producto_interes text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS mensaje text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS notas text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS monto_estimado_usd numeric(15,2) DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_score integer DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_grade text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS prioridad text DEFAULT 'media';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS responsable_id uuid REFERENCES perfiles(id);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ultimo_contacto timestamptz;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS proximo_seguimiento timestamptz;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS sla_vencimiento timestamptz;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS cliente_id uuid REFERENCES clientes(id);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE leads ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "leads_policy" ON leads;
CREATE POLICY "leads_policy" ON leads FOR ALL USING (organization_id = get_org_id());

-- ACTIVIDADES DE LEADS (TIMELINE)
CREATE TABLE IF NOT EXISTS lead_actividades (
  id              uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  lead_id         uuid REFERENCES leads(id) ON DELETE CASCADE
);

ALTER TABLE lead_actividades ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizaciones(id);
ALTER TABLE lead_actividades ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'nota';
ALTER TABLE lead_actividades ADD COLUMN IF NOT EXISTS descripcion text NOT NULL DEFAULT '';
ALTER TABLE lead_actividades ADD COLUMN IF NOT EXISTS datos jsonb;
ALTER TABLE lead_actividades ADD COLUMN IF NOT EXISTS creado_por uuid REFERENCES perfiles(id);
ALTER TABLE lead_actividades ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE lead_actividades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lead_actividades_policy" ON lead_actividades;
CREATE POLICY "lead_actividades_policy" ON lead_actividades FOR ALL USING (organization_id = get_org_id());

-- TAREAS DE LEADS
CREATE TABLE IF NOT EXISTS lead_tareas (
  id              uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  lead_id         uuid REFERENCES leads(id) ON DELETE CASCADE
);

ALTER TABLE lead_tareas ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizaciones(id);
ALTER TABLE lead_tareas ADD COLUMN IF NOT EXISTS titulo text NOT NULL DEFAULT '';
ALTER TABLE lead_tareas ADD COLUMN IF NOT EXISTS descripcion text;
ALTER TABLE lead_tareas ADD COLUMN IF NOT EXISTS asignado_a uuid REFERENCES perfiles(id);
ALTER TABLE lead_tareas ADD COLUMN IF NOT EXISTS vencimiento timestamptz;
ALTER TABLE lead_tareas ADD COLUMN IF NOT EXISTS completada boolean DEFAULT false;
ALTER TABLE lead_tareas ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE lead_tareas ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE lead_tareas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lead_tareas_policy" ON lead_tareas;
CREATE POLICY "lead_tareas_policy" ON lead_tareas FOR ALL USING (organization_id = get_org_id());

-- COTIZACIONES
CREATE TABLE IF NOT EXISTS cotizaciones (
  id                  uuid DEFAULT uuid_generate_v4() PRIMARY KEY
);

ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizaciones(id);
ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES leads(id);
ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS cliente_id uuid REFERENCES clientes(id);
ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS numero_cotizacion serial;
ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS monto_total_usd numeric(15,2) NOT NULL DEFAULT 0;
ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS estado text DEFAULT 'borrador';
ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS notas text;
ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS creado_por uuid REFERENCES perfiles(id);
ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE cotizaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cotizaciones_policy" ON cotizaciones;
CREATE POLICY "cotizaciones_policy" ON cotizaciones FOR ALL USING (organization_id = get_org_id());

-- Triggers for updated_at
DROP TRIGGER IF EXISTS upd_leads ON leads;
CREATE TRIGGER upd_leads BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS upd_lead_tareas ON lead_tareas;
CREATE TRIGGER upd_lead_tareas BEFORE UPDATE ON lead_tareas FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS upd_cotizaciones ON cotizaciones;
CREATE TRIGGER upd_cotizaciones BEFORE UPDATE ON cotizaciones FOR EACH ROW EXECUTE FUNCTION set_updated_at();
