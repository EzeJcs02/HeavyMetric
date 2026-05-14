-- Campos adicionales para la tabla organizaciones
ALTER TABLE organizaciones
  ADD COLUMN IF NOT EXISTS cuit         text,
  ADD COLUMN IF NOT EXISTS direccion    text,
  ADD COLUMN IF NOT EXISTS telefono     text,
  ADD COLUMN IF NOT EXISTS email_contacto text,
  ADD COLUMN IF NOT EXISTS logo_url     text;
