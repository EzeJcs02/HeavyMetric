-- FASE G — Patch workflow_aprobaciones (tabla ya existente)
-- Agrega columnas faltantes sin tocar datos existentes

ALTER TABLE workflow_aprobaciones
  ADD COLUMN IF NOT EXISTS solicitante_id      uuid REFERENCES perfiles(id),
  ADD COLUMN IF NOT EXISTS aprobador_requerido text DEFAULT 'owner',
  ADD COLUMN IF NOT EXISTS referencia_tipo     text,
  ADD COLUMN IF NOT EXISTS referencia_id       uuid,
  ADD COLUMN IF NOT EXISTS decidido_por        uuid REFERENCES perfiles(id),
  ADD COLUMN IF NOT EXISTS fecha_decision      timestamptz,
  ADD COLUMN IF NOT EXISTS created_by          uuid REFERENCES perfiles(id),
  ADD COLUMN IF NOT EXISTS subtitulo           text,
  ADD COLUMN IF NOT EXISTS observacion         text;

ALTER TABLE workflow_aprobaciones ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workflow_aprobaciones' AND policyname = 'org_aprobaciones') THEN
    CREATE POLICY "org_aprobaciones" ON workflow_aprobaciones
      FOR ALL USING (organization_id = get_org_id());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'upd_aprobaciones') THEN
    CREATE TRIGGER upd_aprobaciones
      BEFORE UPDATE ON workflow_aprobaciones FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;
