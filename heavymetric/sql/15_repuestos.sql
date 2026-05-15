-- Catálogo de repuestos / Stock
CREATE TABLE IF NOT EXISTS repuestos (
  id              uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id uuid REFERENCES organizaciones(id) ON DELETE CASCADE,
  sku             text,
  nombre          text NOT NULL,
  descripcion     text,
  unidad          text DEFAULT 'unidad',
  costo_usd       numeric(12,2) DEFAULT 0,
  precio_usd      numeric(12,2) DEFAULT 0,
  stock_actual    numeric(12,2) DEFAULT 0,
  stock_minimo    numeric(12,2) DEFAULT 0,
  activo          boolean DEFAULT true,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE repuestos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_repuestos" ON repuestos
  USING (organization_id = get_org_id())
  WITH CHECK (organization_id = get_org_id());

-- Movimientos de stock
CREATE TABLE IF NOT EXISTS stock_movimientos (
  id              uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  repuesto_id     uuid REFERENCES repuestos(id) ON DELETE CASCADE,
  tipo            text CHECK (tipo IN ('entrada','salida','ajuste')) NOT NULL,
  cantidad        numeric(12,2) NOT NULL,
  referencia_tipo text,
  referencia_id   uuid,
  notas           text,
  creado_por      uuid REFERENCES perfiles(id),
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE stock_movimientos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_stock_movimientos" ON stock_movimientos
  USING (repuesto_id IN (SELECT id FROM repuestos WHERE organization_id = get_org_id()));

-- Repuestos utilizados en OTs
CREATE TABLE IF NOT EXISTS ot_repuestos (
  id                  uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  orden_trabajo_id    uuid REFERENCES ordenes_trabajo(id) ON DELETE CASCADE,
  repuesto_id         uuid REFERENCES repuestos(id) ON DELETE SET NULL,
  nombre              text NOT NULL,
  cantidad            numeric(12,2) NOT NULL DEFAULT 1,
  precio_unitario_usd numeric(12,2) DEFAULT 0,
  subtotal_usd        numeric(12,2) DEFAULT 0,
  created_at          timestamptz DEFAULT now()
);

ALTER TABLE ot_repuestos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_ot_repuestos" ON ot_repuestos
  USING (orden_trabajo_id IN (SELECT id FROM ordenes_trabajo WHERE organization_id = get_org_id()))
  WITH CHECK (orden_trabajo_id IN (SELECT id FROM ordenes_trabajo WHERE organization_id = get_org_id()));

-- Función atómica para registrar movimiento de stock
CREATE OR REPLACE FUNCTION registrar_movimiento_stock(
  p_repuesto_id     uuid,
  p_tipo            text,
  p_cantidad        numeric,
  p_referencia_tipo text DEFAULT NULL,
  p_referencia_id   uuid DEFAULT NULL,
  p_notas           text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO stock_movimientos(repuesto_id, tipo, cantidad, referencia_tipo, referencia_id, notas, creado_por)
  VALUES (p_repuesto_id, p_tipo, p_cantidad, p_referencia_tipo, p_referencia_id, p_notas, auth.uid());

  IF p_tipo = 'entrada' THEN
    UPDATE repuestos SET stock_actual = stock_actual + p_cantidad WHERE id = p_repuesto_id;
  ELSIF p_tipo = 'salida' THEN
    UPDATE repuestos SET stock_actual = stock_actual - p_cantidad WHERE id = p_repuesto_id;
  ELSIF p_tipo = 'ajuste' THEN
    UPDATE repuestos SET stock_actual = p_cantidad WHERE id = p_repuesto_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION registrar_movimiento_stock(uuid, text, numeric, text, uuid, text) TO authenticated;

-- Agregar alerta automática por stock mínimo en la función existente
-- (opcional: ejecutar generar_alertas_automaticas detecta stock_minimo via vista maquinas_service)
