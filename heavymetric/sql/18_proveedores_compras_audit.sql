-- ================================================================
-- 18 — Proveedores + Compras + Audit Log
-- ================================================================

-- ── Proveedores ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proveedores (
  id               uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id  uuid REFERENCES organizaciones(id) ON DELETE CASCADE,
  empresa          text NOT NULL,
  rubro            text,
  contacto_nombre  text,
  telefono         text,
  email            text,
  condicion_pago   text DEFAULT 'contado',
  tiempo_entrega_dias integer DEFAULT 0,
  rating           integer DEFAULT 3 CHECK (rating BETWEEN 1 AND 5),
  estado           text DEFAULT 'activo'
    CHECK (estado IN ('activo','inactivo','preferido','riesgoso')),
  observaciones    text,
  activo           boolean DEFAULT true,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_proveedores" ON proveedores
  USING (organization_id = get_org_id())
  WITH CHECK (organization_id = get_org_id());

-- ── Proveedor ↔ Repuesto (precio por proveedor por ítem) ────────
CREATE TABLE IF NOT EXISTS proveedor_repuestos (
  id               uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  proveedor_id     uuid NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
  repuesto_id      uuid NOT NULL REFERENCES repuestos(id)   ON DELETE CASCADE,
  precio_usd       numeric(12,2),
  tiempo_entrega_dias integer,
  es_principal     boolean DEFAULT false,
  notas            text,
  updated_at       timestamptz DEFAULT now(),
  UNIQUE (proveedor_id, repuesto_id)
);
ALTER TABLE proveedor_repuestos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_proveedor_repuestos" ON proveedor_repuestos
  USING (proveedor_id IN (
    SELECT id FROM proveedores WHERE organization_id = get_org_id()
  ));

-- ── Órdenes de compra ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS compras (
  id               uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id  uuid REFERENCES organizaciones(id) ON DELETE CASCADE,
  proveedor_id     uuid REFERENCES proveedores(id),
  numero_compra    text,
  fecha            date DEFAULT CURRENT_DATE,
  estado           text DEFAULT 'pendiente'
    CHECK (estado IN ('borrador','pendiente','recibido_parcial','recibido','cancelado')),
  total_usd        numeric(12,2) DEFAULT 0,
  notas            text,
  created_by       uuid REFERENCES perfiles(id),
  created_at       timestamptz DEFAULT now()
);
ALTER TABLE compras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_compras" ON compras
  USING (organization_id = get_org_id())
  WITH CHECK (organization_id = get_org_id());

CREATE TABLE IF NOT EXISTS compra_items (
  id                    uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  compra_id             uuid NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
  repuesto_id           uuid REFERENCES repuestos(id),
  descripcion           text NOT NULL,
  cantidad              numeric(10,2) NOT NULL DEFAULT 1,
  precio_unitario_usd   numeric(12,2) NOT NULL DEFAULT 0,
  subtotal_usd          numeric(12,2) GENERATED ALWAYS AS (cantidad * precio_unitario_usd) STORED
);
ALTER TABLE compra_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_compra_items" ON compra_items
  USING (compra_id IN (
    SELECT id FROM compras WHERE organization_id = get_org_id()
  ));

-- ── Audit log de trazabilidad ────────────────────────────────────
-- Solo lectura por owner. Las escrituras vienen de la app (no triggers).
CREATE TABLE IF NOT EXISTS audit_log (
  id              uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id uuid,
  tabla           text NOT NULL,
  registro_id     uuid,
  accion          text NOT NULL CHECK (accion IN ('INSERT','UPDATE','DELETE')),
  datos_antes     jsonb,
  datos_despues   jsonb,
  descripcion     text,
  usuario_id      uuid REFERENCES perfiles(id),
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_org_read" ON audit_log
  FOR SELECT USING (organization_id = get_org_id());
CREATE POLICY "audit_org_insert" ON audit_log
  FOR INSERT WITH CHECK (organization_id = get_org_id());

-- ── RPC: recibir compra y actualizar stock ───────────────────────
CREATE OR REPLACE FUNCTION recibir_compra(p_compra_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE item RECORD;
BEGIN
  -- Marcar compra como recibida
  UPDATE compras SET estado = 'recibido' WHERE id = p_compra_id;

  -- Actualizar stock de cada ítem que tiene repuesto_id
  FOR item IN
    SELECT ci.repuesto_id, ci.cantidad
    FROM compra_items ci
    WHERE ci.compra_id = p_compra_id AND ci.repuesto_id IS NOT NULL
  LOOP
    UPDATE repuestos
    SET stock_actual = stock_actual + item.cantidad
    WHERE id = item.repuesto_id;

    INSERT INTO stock_movimientos (repuesto_id, tipo, cantidad, motivo)
    VALUES (item.repuesto_id, 'entrada', item.cantidad, 'Recepción de compra #' || p_compra_id);
  END LOOP;
END;
$$;
