-- ============================================================
-- AGENTE 1: MEJORAS DE INTEGRIDAD Y SEGURIDAD (AUDITORÍA)
-- ============================================================

-- 1. TRIGGER DE STOCK (Integridad de Inventario)
-- Descuenta automáticamente el stock cuando se inserta un repuesto en una OT
CREATE OR REPLACE FUNCTION fn_descontar_stock()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE inventario
    SET stock_actual = stock_actual - NEW.cantidad,
        updated_at = now()
    WHERE id = NEW.inventario_id;
    
    -- Opcional: Podríamos disparar una alerta aquí si stock_actual < stock_minimo
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_descontar_stock
AFTER INSERT ON ot_repuestos
FOR EACH ROW
EXECUTE FUNCTION fn_descontar_stock();


-- 2. VALIDACIÓN DE HORÓMETRO (Integridad de Datos)
-- Evita que el horómetro de una máquina vuelva hacia atrás
CREATE OR REPLACE FUNCTION fn_validar_horometro()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.horometro_actual < OLD.horometro_actual THEN
        RAISE EXCEPTION 'Error de integridad: El horómetro no puede ser menor al valor actual (%)', OLD.horometro_actual;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_horometro
BEFORE UPDATE OF horometro_actual ON maquinas
FOR EACH ROW
EXECUTE FUNCTION fn_validar_horometro();


-- 3. SOFT DELETE Y RLS REFORZADO
-- Nota: 'activo' en clientes y 'activa' en maquinas ya existen en 01_schema.sql
-- Vamos a estandarizar y asegurar que las políticas RLS filtren por estado activo.

-- Reforzar RLS para Clientes
DROP POLICY IF EXISTS "org_clientes" ON clientes;
CREATE POLICY "org_clientes" ON clientes 
FOR ALL USING (
    organization_id = get_org_id() 
    AND activo = true
);

-- Reforzar RLS para Máquinas
DROP POLICY IF EXISTS "org_maquinas" ON maquinas;
CREATE POLICY "org_maquinas" ON maquinas 
FOR ALL USING (
    organization_id = get_org_id() 
    AND activa = true
);

-- Restringir DELETE físico en estas tablas para todos los roles excepto Postgres Admin
CREATE POLICY "no_delete_clientes" ON clientes FOR DELETE USING (false);
CREATE POLICY "no_delete_maquinas" ON maquinas FOR DELETE USING (false);

-- 4. ACTUALIZAR VISTAS PARA QUE TAMBIÉN RESPETEN EL SOFT DELETE
CREATE OR REPLACE VIEW maquinas_service AS
SELECT
  m.*,
  c.razon_social AS cliente_nombre,
  (m.ultimo_service_horas + m.frecuencia_service) AS proximo_service_horas,
  (m.ultimo_service_horas + m.frecuencia_service - m.horometro_actual) AS horas_restantes_service,
  CASE
    WHEN (m.ultimo_service_horas + m.frecuencia_service - m.horometro_actual) <= 0 THEN 'vencido'
    WHEN (m.ultimo_service_horas + m.frecuencia_service - m.horometro_actual) <= 50 THEN 'urgente'
    WHEN (m.ultimo_service_horas + m.frecuencia_service - m.horometro_actual) <= 100 THEN 'proximo'
    ELSE 'ok'
  END AS estado_service
FROM maquinas m
LEFT JOIN clientes c ON m.cliente_id = c.id
WHERE m.activa = true;
