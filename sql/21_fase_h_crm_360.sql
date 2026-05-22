-- ============================================================
-- 21_fase_h_crm_360.sql
-- FASE H: CRM COMERCIAL 360 & POSTVENTA
-- ============================================================

-- LEADS
CREATE TABLE IF NOT EXISTS leads (
  id                  uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id     uuid REFERENCES organizaciones(id),
  pipeline            text CHECK (pipeline IN ('ventas','postventa')) DEFAULT 'ventas',
  estado              text NOT NULL,
  
  -- Datos de contacto
  nombre              text,
  empresa             text,
  telefono            text,
  email               text,
  rubro               text,
  
  -- Calificación y Origen
  origen              text,
  producto_interes    text,
  mensaje             text,
  notas               text,
  
  -- Monto y Score
  monto_estimado_usd  numeric(15,2) DEFAULT 0,
  lead_score          integer DEFAULT 0,
  lead_grade          text CHECK (lead_grade IN ('A','B','C')),
  
  -- Seguimiento
  prioridad           text CHECK (prioridad IN ('alta','media','baja')) DEFAULT 'media',
  responsable_id      uuid REFERENCES perfiles(id),
  ultimo_contacto     timestamptz,
  proximo_seguimiento timestamptz,
  sla_vencimiento     timestamptz,
  
  -- Conversión
  cliente_id          uuid REFERENCES clientes(id), -- Se vincula cuando se convierte
  
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leads_policy" ON leads 
  FOR ALL USING (organization_id = get_org_id());

-- ACTIVIDADES DE LEADS (TIMELINE)
CREATE TABLE IF NOT EXISTS lead_actividades (
  id              uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  lead_id         uuid REFERENCES leads(id) ON DELETE CASCADE,
  tipo            text NOT NULL, -- ej: 'cambio_estado', 'contacto', 'nota', 'cotizacion'
  descripcion     text NOT NULL,
  datos           jsonb,
  creado_por      uuid REFERENCES perfiles(id),
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE lead_actividades ENABLE ROW LEVEL SECURITY;
-- Asumimos que si tiene acceso al lead, tiene acceso a sus actividades (pero simplificamos pidiendo org_id si estuviera, sino join)
-- Agregamos organization_id por simplicidad y buena práctica RLS
ALTER TABLE lead_actividades ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizaciones(id);
CREATE POLICY "lead_actividades_policy" ON lead_actividades 
  FOR ALL USING (organization_id = get_org_id());


-- TAREAS DE LEADS (SEGUIMIENTOS Y PROXIMAS ACCIONES)
CREATE TABLE IF NOT EXISTS lead_tareas (
  id              uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id uuid REFERENCES organizaciones(id),
  lead_id         uuid REFERENCES leads(id) ON DELETE CASCADE,
  titulo          text NOT NULL,
  descripcion     text,
  asignado_a      uuid REFERENCES perfiles(id),
  vencimiento     timestamptz,
  completada      boolean DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE lead_tareas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lead_tareas_policy" ON lead_tareas 
  FOR ALL USING (organization_id = get_org_id());


-- COTIZACIONES (Opcional, pero util para integrar Leads -> Ventas -> Tesorería)
CREATE TABLE IF NOT EXISTS cotizaciones (
  id                  uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id     uuid REFERENCES organizaciones(id),
  lead_id             uuid REFERENCES leads(id),
  cliente_id          uuid REFERENCES clientes(id),
  numero_cotizacion   serial,
  monto_total_usd     numeric(15,2) NOT NULL,
  estado              text CHECK (estado IN ('borrador','enviada','aprobada','rechazada')) DEFAULT 'borrador',
  notas               text,
  creado_por          uuid REFERENCES perfiles(id),
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

ALTER TABLE cotizaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cotizaciones_policy" ON cotizaciones 
  FOR ALL USING (organization_id = get_org_id());

-- Triggers for updated_at
CREATE TRIGGER upd_leads BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER upd_lead_tareas BEFORE UPDATE ON lead_tareas FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER upd_cotizaciones BEFORE UPDATE ON cotizaciones FOR EACH ROW EXECUTE FUNCTION set_updated_at();
