-- ============================================================
-- FASE I: APP CAMPO / TÉCNICOS
-- ============================================================

-- 1. MODIFICAR ot_repuestos para soportar estado (solicitado, usado)
ALTER TABLE ot_repuestos
ADD COLUMN estado text CHECK (estado IN ('solicitado', 'usado')) DEFAULT 'usado';

-- 2. TABLA: ot_tiempos (Trazabilidad de inicio/pausa/cierre en terreno)
CREATE TABLE ot_tiempos (
  id               uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  orden_trabajo_id uuid REFERENCES ordenes_trabajo(id) ON DELETE CASCADE,
  tecnico_id       uuid REFERENCES perfiles(id),
  accion           text CHECK (accion IN ('abrir', 'iniciar', 'pausar', 'cerrar')),
  latitud          numeric(10,8),
  longitud         numeric(11,8),
  created_at       timestamptz DEFAULT now()
);

-- 3. TABLA: ot_checklists
CREATE TABLE ot_checklists (
  id               uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  orden_trabajo_id uuid REFERENCES ordenes_trabajo(id) ON DELETE CASCADE,
  categoria        text CHECK (categoria IN ('seguridad', 'niveles', 'fugas', 'calibracion', 'limpieza')),
  item             text NOT NULL,
  estado           text CHECK (estado IN ('ok', 'falla', 'na')) DEFAULT 'na',
  observaciones    text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- 4. TABLA: ot_evidencias (Fotos y observaciones)
CREATE TABLE ot_evidencias (
  id               uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  orden_trabajo_id uuid REFERENCES ordenes_trabajo(id) ON DELETE CASCADE,
  tecnico_id       uuid REFERENCES perfiles(id),
  tipo             text CHECK (tipo IN ('foto', 'observacion')),
  archivo_url      text,
  descripcion      text,
  latitud          numeric(10,8),
  longitud         numeric(11,8),
  created_at       timestamptz DEFAULT now()
);

-- 5. TABLA: ot_firmas (Firma final de OT)
CREATE TABLE ot_firmas (
  id               uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  orden_trabajo_id uuid REFERENCES ordenes_trabajo(id) ON DELETE CASCADE,
  tipo             text CHECK (tipo IN ('cliente', 'tecnico')),
  nombre_firmante  text NOT NULL,
  firma_base64     text, -- Puede ser base64 o URL del storage
  latitud          numeric(10,8),
  longitud         numeric(11,8),
  created_at       timestamptz DEFAULT now()
);

-- ============================================================
-- RLS POLICIES Y TRIGGERS
-- ============================================================

ALTER TABLE ot_tiempos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ot_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE ot_evidencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE ot_firmas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tiempos_policy" ON ot_tiempos FOR ALL USING (
  orden_trabajo_id IN (SELECT id FROM ordenes_trabajo WHERE organization_id = get_org_id())
);

CREATE POLICY "checklists_policy" ON ot_checklists FOR ALL USING (
  orden_trabajo_id IN (SELECT id FROM ordenes_trabajo WHERE organization_id = get_org_id())
);

CREATE POLICY "evidencias_policy" ON ot_evidencias FOR ALL USING (
  orden_trabajo_id IN (SELECT id FROM ordenes_trabajo WHERE organization_id = get_org_id())
);

CREATE POLICY "firmas_policy" ON ot_firmas FOR ALL USING (
  orden_trabajo_id IN (SELECT id FROM ordenes_trabajo WHERE organization_id = get_org_id())
);

-- Trigger para updated_at en checklist
CREATE TRIGGER upd_ot_checklists BEFORE UPDATE ON ot_checklists FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Nota sobre Storage: 
-- Para usar `ot_evidencias` con Supabase Storage de manera óptima, 
-- se debe asegurar la existencia de un bucket público o privado llamado "evidencias_ot".
