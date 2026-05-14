-- ================================================================
-- 11 — Portal Cliente: campo cliente_id en perfiles + rol cliente
-- Ejecutar en Supabase SQL Editor
-- ================================================================

ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS cliente_id uuid REFERENCES clientes(id);
