-- Trigger: regenerar alertas automáticas al registrar un horómetro
CREATE OR REPLACE FUNCTION trigger_alertas_on_horometro()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_org_id uuid;
BEGIN
  SELECT organization_id INTO v_org_id FROM maquinas WHERE id = NEW.maquina_id;
  IF v_org_id IS NOT NULL THEN
    PERFORM generar_alertas_automaticas(v_org_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_alertas_horometro ON historial_horometros;
CREATE TRIGGER trg_alertas_horometro
  AFTER INSERT ON historial_horometros
  FOR EACH ROW EXECUTE FUNCTION trigger_alertas_on_horometro();
