DO $$
DECLARE org_id uuid;
BEGIN
  SELECT id INTO org_id FROM organizaciones WHERE nombre_comercial = 'Knock S.A.' LIMIT 1;

  INSERT INTO clientes (organization_id, razon_social, cuit, condicion_iva, email, telefono) VALUES
    (org_id, 'Canteras del Sur S.A.', '30-98765432-1', 'Responsable Inscripto', 'admin@canterasdelsur.com', '0387-4123456'),
    (org_id, 'Vial Sur S.A.', '30-11223344-5', 'Responsable Inscripto', 'compras@vialsur.com.ar', '0387-4234567'),
    (org_id, 'Minera Patagonia S.R.L.', '30-55667788-9', 'Responsable Inscripto', 'operaciones@minerapatagonia.com', '0387-4345678'),
    (org_id, 'Constructora Norte S.A.', '30-99887766-3', 'Responsable Inscripto', 'admin@constructoranorte.com.ar', '0387-4456789');

  INSERT INTO inventario (organization_id, sku_codigo, nombre_repuesto, marca_compatible, modelo_compatible, stock_actual, stock_minimo, precio_base_usd) VALUES
    (org_id, 'KOM-FIL-001', 'Filtro aceite motor WA320', 'Komatsu', 'WA320', 2, 5, 48.00),
    (org_id, 'KOM-KIT-001', 'Kit filtros completo WA320', 'Komatsu', 'WA320', 4, 3, 280.00),
    (org_id, 'CAT-HID-022', 'Manguera hidráulica 320D', 'Caterpillar', '320D', 5, 4, 120.00),
    (org_id, 'VOL-FIL-011', 'Filtro combustible EC210', 'Volvo', 'EC210', 18, 5, 35.00),
    (org_id, 'HIT-SEL-003', 'Sello cilindro ZX200', 'Hitachi', 'ZX200', 1, 3, 95.00);
END $$;
