CREATE TABLE IF NOT EXISTS invitaciones (
  id            uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  token         uuid DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
  email         text,
  nombre        text,
  rol           text DEFAULT 'operativo' CHECK (rol IN ('owner','supervisor','operativo')),
  organization_id uuid REFERENCES organizaciones(id) ON DELETE CASCADE,
  created_by    uuid REFERENCES perfiles(id),
  used_at       timestamptz,
  expires_at    timestamptz DEFAULT (now() + interval '7 days'),
  created_at    timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION usar_invitacion(p_token uuid, p_user_id uuid, p_nombre text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_inv invitaciones;
BEGIN
  SELECT * INTO v_inv FROM invitaciones
  WHERE token = p_token AND used_at IS NULL AND expires_at > now();
  IF NOT FOUND THEN RAISE EXCEPTION 'Invitación inválida o expirada'; END IF;

  UPDATE perfiles SET
    organization_id = v_inv.organization_id,
    rol = v_inv.rol,
    nombre_completo = COALESCE(NULLIF(p_nombre,''), v_inv.nombre, nombre_completo)
  WHERE id = p_user_id;

  UPDATE invitaciones SET used_at = now() WHERE id = v_inv.id;
END;
$$;

GRANT EXECUTE ON FUNCTION usar_invitacion(uuid, uuid, text) TO authenticated;
