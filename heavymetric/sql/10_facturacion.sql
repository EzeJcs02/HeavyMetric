-- ================================================================
-- 10 — Facturación: tabla transacciones + tipo_cambio + RPC facturar_ot
-- Ejecutar en Supabase SQL Editor
-- ================================================================

-- ── Tipo de cambio ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tipo_cambio (
  id          uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  fecha       date NOT NULL DEFAULT CURRENT_DATE,
  compra      numeric NOT NULL DEFAULT 0,
  venta       numeric NOT NULL DEFAULT 0,
  fuente      text DEFAULT 'BNA',
  created_at  timestamptz DEFAULT now(),
  UNIQUE(fecha, fuente)
);
ALTER TABLE tipo_cambio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tipo_cambio_read" ON tipo_cambio FOR SELECT USING (true);
CREATE POLICY "tipo_cambio_write" ON tipo_cambio FOR INSERT WITH CHECK (true);

-- ── Transacciones (facturación) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS transacciones (
  id                    uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id       uuid REFERENCES organizations(id),
  tipo_documento        text NOT NULL DEFAULT 'Factura B',
  numero_comprobante    text,
  origen_tipo           text CHECK (origen_tipo IN ('taller','alquiler','venta','manual')) DEFAULT 'manual',
  ot_id                 uuid REFERENCES ordenes_trabajo(id),
  contrato_alquiler_id  uuid REFERENCES contratos_alquiler(id),
  cliente_id            uuid REFERENCES clientes(id),
  condicion_iva_cliente text DEFAULT 'Consumidor Final',
  monto_neto_usd        numeric DEFAULT 0,
  monto_iva_usd         numeric DEFAULT 0,
  monto_total_usd       numeric NOT NULL DEFAULT 0,
  tipo_cambio_bna       numeric DEFAULT 0,
  monto_total_ars       numeric DEFAULT 0,
  estado_pago           text CHECK (estado_pago IN ('pendiente','cobrado','anulado')) DEFAULT 'pendiente',
  medio_pago            text,
  fecha_emision         date NOT NULL DEFAULT CURRENT_DATE,
  fecha_cobro           date,
  notas                 text,
  created_at            timestamptz DEFAULT now()
);
ALTER TABLE transacciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transacciones_org" ON transacciones FOR ALL
  USING (organization_id = get_org_id())
  WITH CHECK (organization_id = get_org_id());

-- ── Índice para queries por cliente y estado ─────────────────────
CREATE INDEX IF NOT EXISTS idx_transacciones_cliente ON transacciones(cliente_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_estado ON transacciones(estado_pago);

-- ── RPC: facturar_ot ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION facturar_ot(p_ot_id uuid, p_tipo_documento text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ot        ordenes_trabajo%ROWTYPE;
  v_cliente   clientes%ROWTYPE;
  v_tipo_doc  text;
  v_tx_id     uuid;
BEGIN
  SELECT * INTO v_ot FROM ordenes_trabajo WHERE id = p_ot_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'OT no encontrada: %', p_ot_id; END IF;

  SELECT * INTO v_cliente FROM clientes WHERE id = v_ot.cliente_id;

  IF p_tipo_documento IS NOT NULL THEN
    v_tipo_doc := p_tipo_documento;
  ELSIF v_cliente.condicion_iva = 'Responsable Inscripto' THEN
    v_tipo_doc := 'Factura A';
  ELSE
    v_tipo_doc := 'Factura B';
  END IF;

  INSERT INTO transacciones (
    organization_id, tipo_documento, origen_tipo, ot_id, cliente_id,
    condicion_iva_cliente, monto_neto_usd, monto_iva_usd, monto_total_usd,
    estado_pago, fecha_emision
  ) VALUES (
    v_ot.organization_id,
    v_tipo_doc,
    'taller',
    p_ot_id,
    v_ot.cliente_id,
    COALESCE(v_cliente.condicion_iva, 'Consumidor Final'),
    ROUND(v_ot.total_usd / 1.21, 2),
    ROUND(v_ot.total_usd * 0.21 / 1.21, 2),
    v_ot.total_usd,
    'pendiente',
    CURRENT_DATE
  ) RETURNING id INTO v_tx_id;

  UPDATE ordenes_trabajo SET estado = 'facturada' WHERE id = p_ot_id;

  RETURN v_tx_id;
END;
$$;

GRANT EXECUTE ON FUNCTION facturar_ot(uuid, text) TO authenticated;
