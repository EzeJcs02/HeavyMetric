-- ================================================================
-- 19 — Fase C extensión: centros de costo, clasificación compras,
--       risk score proveedor, proveedor ↔ activo
-- ================================================================

-- ── Centros de costo ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS centros_costo (
  id              uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id uuid REFERENCES organizaciones(id) ON DELETE CASCADE,
  nombre          text NOT NULL,
  descripcion     text,
  activo          boolean DEFAULT true,
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE centros_costo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_centros_costo" ON centros_costo
  USING (organization_id = get_org_id())
  WITH CHECK (organization_id = get_org_id());

-- ── Extender compras: categoria + centro de costo ────────────────
ALTER TABLE compras
  ADD COLUMN IF NOT EXISTS categoria text DEFAULT 'repuesto'
    CHECK (categoria IN ('repuesto','activo','servicio','combustible','lubricante','herramienta','otro')),
  ADD COLUMN IF NOT EXISTS centro_costo_id uuid REFERENCES centros_costo(id);

-- ── Extender transacciones: centro de costo ──────────────────────
ALTER TABLE transacciones
  ADD COLUMN IF NOT EXISTS centro_costo_id uuid REFERENCES centros_costo(id);

-- ── Extender proveedores: risk inputs ────────────────────────────
-- risk_score = calculado en app a partir de estos campos + estado + rating
ALTER TABLE proveedores
  ADD COLUMN IF NOT EXISTS incidencias        integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS entregas_a_tiempo  integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS entregas_tarde     integer DEFAULT 0;
-- Nota: risk_score se calcula en JS — no se persiste para evitar triggers.
-- Si querés persistirlo: ALTER TABLE proveedores ADD COLUMN risk_score integer DEFAULT 50;

-- ── Proveedor ↔ Activo (maquina) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS proveedor_activos (
  id             uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  proveedor_id   uuid NOT NULL REFERENCES proveedores(id)   ON DELETE CASCADE,
  maquina_id     uuid NOT NULL REFERENCES maquinas(id)      ON DELETE CASCADE,
  tipo_relacion  text DEFAULT 'service'
    CHECK (tipo_relacion IN ('fabricante','distribuidor','service','garantia','repuestos')),
  notas          text,
  created_at     timestamptz DEFAULT now(),
  UNIQUE (proveedor_id, maquina_id)
);
ALTER TABLE proveedor_activos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_proveedor_activos" ON proveedor_activos
  USING (proveedor_id IN (
    SELECT id FROM proveedores WHERE organization_id = get_org_id()
  ));
