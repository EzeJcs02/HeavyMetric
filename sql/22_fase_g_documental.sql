-- FASE G — Documental 360
-- Remitos, Ítems de remito, Workflow de aprobaciones
-- Idempotente: seguro para re-ejecutar

-- ── REMITOS ──────────────────────────────────────────────────────────────────
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

-- ── WORKFLOW DE APROBACIONES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workflow_aprobaciones (
  id                  uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id     uuid REFERENCES organizaciones(id),
  tipo                text NOT NULL,
  titulo              text NOT NULL,
  subtitulo           text,
  descripcion         text,
  monto               numeric(15,2),
  solicitante_id      uuid REFERENCES perfiles(id),
  aprobador_requerido text DEFAULT 'owner',
  referencia_tipo     text,
  referencia_id       uuid,
  prioridad           text CHECK (prioridad IN ('critica','alta','media','baja')) DEFAULT 'alta',
  estado              text CHECK (estado IN ('pendiente','urgente','aprobado','rechazado')) DEFAULT 'pendiente',
  observacion         text,
  decidido_por        uuid REFERENCES perfiles(id),
  fecha_decision      timestamptz,
  created_by          uuid REFERENCES perfiles(id),
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE remitos               ENABLE ROW LEVEL SECURITY;
ALTER TABLE remito_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_aprobaciones ENABLE ROW LEVEL SECURITY;

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
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workflow_aprobaciones' AND policyname = 'org_aprobaciones') THEN
    CREATE POLICY "org_aprobaciones" ON workflow_aprobaciones
      FOR ALL USING (organization_id = get_org_id());
  END IF;
END $$;

-- ── TRIGGERS updated_at ───────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'upd_remitos') THEN
    CREATE TRIGGER upd_remitos
      BEFORE UPDATE ON remitos FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'upd_aprobaciones') THEN
    CREATE TRIGGER upd_aprobaciones
      BEFORE UPDATE ON workflow_aprobaciones FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;
