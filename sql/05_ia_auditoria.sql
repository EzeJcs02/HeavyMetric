-- ============================================================
-- AGENTE 1: INFRAESTRUCTURA PARA AUDITORÍA DE IA (AGENTE 3)
-- ============================================================

-- 1. Crear tabla de auditoría de IA
CREATE TABLE IF NOT EXISTS ia_auditoria (
    id                uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id   uuid REFERENCES organizaciones(id),
    operacion_tipo    text NOT NULL, -- Ej: 'validacion_ot', 'analisis_precio', 'deteccion_fraude'
    input_data        jsonb,         -- Los datos que se le pasaron a la IA
    veredicto         text,          -- 'aprobado', 'rechazado', 'observado'
    motivo            text,          -- Justificación de la IA
    created_at        timestamptz DEFAULT now()
);

-- 2. Configurar Row Level Security (RLS)
ALTER TABLE ia_auditoria ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios de la organización pueden ver sus auditorías
CREATE POLICY "Lectura de auditoría IA" 
ON ia_auditoria FOR SELECT 
USING (organization_id = get_org_id());

-- Política: El Agente 3 (vía usuario autenticado) puede insertar nuevos registros
-- Esto permite que la lógica de IA en el frontend guarde los resultados
CREATE POLICY "Inserción de auditoría IA" 
ON ia_auditoria FOR INSERT 
WITH CHECK (organization_id = get_org_id());

-- Comentario para el Agente 3:
-- Tabla lista para recibir veredictos de validación de órdenes de trabajo.
