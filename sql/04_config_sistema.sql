-- ============================================================
-- AGENTE 1: CONFIGURACIÓN GLOBAL DEL SISTEMA (FASE 2)
-- ============================================================

-- 1. Crear tabla de configuración
CREATE TABLE IF NOT EXISTS config_sistema (
    clave text PRIMARY KEY,
    valor jsonb NOT NULL,
    updated_at timestamptz DEFAULT now()
);

-- 2. Insertar registro inicial para cotización del dólar
-- Esto permite que el sistema tenga un valor por defecto antes del primer cron job
INSERT INTO config_sistema (clave, valor)
VALUES ('cotizacion_dolar', '{"oficial": 0, "ultima_actualizacion": null}')
ON CONFLICT (clave) DO NOTHING;

-- 3. Configurar Row Level Security (RLS)
ALTER TABLE config_sistema ENABLE ROW LEVEL SECURITY;

-- Política: Todos los usuarios autenticados pueden leer la configuración
CREATE POLICY "Lectura pública de configuración" 
ON config_sistema FOR SELECT 
TO authenticated 
USING (true);

-- Política: La función serverless (service_role) puede actualizar los valores
-- Nota: En Supabase, la 'service_role' key salta RLS por defecto, 
-- pero definimos la política por claridad y seguridad futura.
CREATE POLICY "Update service_role" 
ON config_sistema FOR UPDATE 
TO service_role 
USING (true)
WITH CHECK (true);

-- Trigger para mantener actualizado el campo updated_at
CREATE TRIGGER set_updated_at_config
BEFORE UPDATE ON config_sistema
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
