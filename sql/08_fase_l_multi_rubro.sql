-- ============================================================
-- FASE L: MULTI-RUBRO Y FEATURE TOGGLES
-- ============================================================

-- 1. Agregar campo 'rubro' a organizaciones
ALTER TABLE organizaciones 
ADD COLUMN IF NOT EXISTS rubro text DEFAULT 'maquinaria';

-- 2. Agregar campo 'modulos_activos' a organizaciones
ALTER TABLE organizaciones 
ADD COLUMN IF NOT EXISTS modulos_activos jsonb DEFAULT '{"taller": true, "alquileres": true, "inventario": true, "ventas": true, "crm": true, "tesoreria": true, "campo": true}'::jsonb;

-- 3. Actualizar registros existentes para tener los valores por defecto
UPDATE organizaciones 
SET rubro = 'maquinaria' 
WHERE rubro IS NULL;

UPDATE organizaciones 
SET modulos_activos = '{"taller": true, "alquileres": true, "inventario": true, "ventas": true, "crm": true, "tesoreria": true, "campo": true}'::jsonb 
WHERE modulos_activos IS NULL;
