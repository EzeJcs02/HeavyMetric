-- FASE G — Remitos (tablas nuevas, seguro para ejecutar)

CREATE TABLE IF NOT EXISTS remitos (
  id               uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id  uuid REFERENCES organizaciones(id),
  numero_remito    serial,
  tipo             text CHECK (tipo IN ('salida','entrada','interno')) DEFAULT 'salida',
  cliente_id       uuid REFERENCES clientes(id),
  proveedor_id     uuid REFERENCES proveedores(id),
  orden_trabajo_id uuid REFERENCES ordenes_trabajo(id),
  fecha            date DEFAULT CURRENT_DATE,
  estado           text CHECK (estado IN ('borrador','emitido','entregado','cancelado')) DEFAULT 'borrador',
  destino          text,
  observaciones    text,
  created_by       uuid REFERENCES perfiles(id),
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS remito_items (
  id          uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  remito_id   uuid REFERENCES remitos(id) ON DELETE CASCADE,
  codigo      text,
  descripcion text NOT NULL,
  cantidad    numeric(10,3) NOT NULL DEFAULT 1,
  unidad      text DEFAULT 'u',
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE remitos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE remito_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'remitos' AND policyname = 'org_remitos') THEN
    CREATE POLICY "org_remitos" ON remitos
      FOR ALL USING (organization_id = get_org_id());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'remito_items' AND policyname = 'org_remito_items') THEN
    CREATE POLICY "org_remito_items" ON remito_items
      FOR ALL USING (
        remito_id IN (SELECT id FROM remitos WHERE organization_id = get_org_id())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'upd_remitos') THEN
    CREATE TRIGGER upd_remitos
      BEFORE UPDATE ON remitos FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;
