CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ORGANIZACIONES
CREATE TABLE organizaciones (
  id                  uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  nombre_comercial    text NOT NULL,
  razon_social        text,
  cuit                text,
  condicion_fiscal    text DEFAULT 'Responsable Inscripto',
  config_moneda_base  text DEFAULT 'USD',
  created_at          timestamptz DEFAULT now()
);
INSERT INTO organizaciones (nombre_comercial, razon_social, cuit)
VALUES ('Knock S.A.', 'Knock Sociedad Anónima', '30-12345678-9');

-- PERFILES (extiende auth.users)
CREATE TABLE perfiles (
  id                uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  organization_id   uuid REFERENCES organizaciones(id),
  nombre_completo   text,
  rol               text CHECK (rol IN ('owner', 'supervisor', 'operativo')) NOT NULL DEFAULT 'operativo',
  area              text CHECK (area IN ('taller', 'alquileres', 'ventas', 'general')),
  avatar_url        text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- TIPO DE CAMBIO BNA
CREATE TABLE tipo_cambio (
  id         uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  fecha      date NOT NULL DEFAULT CURRENT_DATE,
  compra     numeric(12,2),
  venta      numeric(12,2) NOT NULL,
  fuente     text DEFAULT 'dolarapi.com',
  created_at timestamptz DEFAULT now(),
  UNIQUE (fecha)
);

-- CLIENTES
CREATE TABLE clientes (
  id                  uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id     uuid REFERENCES organizaciones(id),
  razon_social        text NOT NULL,
  nombre_comercial    text,
  cuit                text,
  condicion_iva       text CHECK (condicion_iva IN ('Responsable Inscripto','Monotributista','Exento','Consumidor Final')) DEFAULT 'Responsable Inscripto',
  email               text,
  telefono            text,
  direccion           text,
  contacto_nombre     text,
  activo              boolean DEFAULT true,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- INVENTARIO
CREATE TABLE inventario (
  id                uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id   uuid REFERENCES organizaciones(id),
  sku_codigo        text NOT NULL,
  nombre_repuesto   text NOT NULL,
  descripcion       text,
  marca_compatible  text,
  modelo_compatible text,
  stock_actual      integer DEFAULT 0,
  stock_minimo      integer DEFAULT 3,
  precio_base_usd   numeric(15,2) NOT NULL,
  qr_codigo         text,
  activo            boolean DEFAULT true,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  UNIQUE (organization_id, sku_codigo)
);

-- MÁQUINAS
CREATE TABLE maquinas (
  id                    uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id       uuid REFERENCES organizaciones(id),
  cliente_id            uuid REFERENCES clientes(id),
  nombre_unidad         text NOT NULL,
  marca                 text,
  modelo                text,
  patente               text,
  anio                  integer,
  numero_serie          text,
  horometro_actual      integer DEFAULT 0,
  ultimo_service_horas  integer DEFAULT 0,
  frecuencia_service    integer DEFAULT 250,
  en_taller             boolean DEFAULT false,
  en_alquiler           boolean DEFAULT false,
  activa                boolean DEFAULT true,
  notas                 text,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

-- VISTA: estado de service por máquina
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

-- ÓRDENES DE TRABAJO
CREATE TABLE ordenes_trabajo (
  id                  uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id     uuid REFERENCES organizaciones(id),
  numero_ot           serial,
  maquina_id          uuid REFERENCES maquinas(id),
  cliente_id          uuid REFERENCES clientes(id),
  operativo_id        uuid REFERENCES perfiles(id),
  supervisor_id       uuid REFERENCES perfiles(id),
  descripcion_trabajo text,
  estado              text CHECK (estado IN ('borrador','en_progreso','pausada','completada','facturada','cancelada')) DEFAULT 'borrador',
  fecha_ingreso       date DEFAULT CURRENT_DATE,
  fecha_estimada      date,
  fecha_egreso        date,
  horas_mano_obra     numeric(8,2) DEFAULT 0,
  precio_hora_usd     numeric(10,2) DEFAULT 45,
  total_repuestos_usd numeric(15,2) DEFAULT 0,
  total_mano_obra_usd numeric(15,2) GENERATED ALWAYS AS (horas_mano_obra * precio_hora_usd) STORED,
  total_usd           numeric(15,2) DEFAULT 0,
  notas_internas      text,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- REPUESTOS USADOS EN OT
CREATE TABLE ot_repuestos (
  id               uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  orden_trabajo_id uuid REFERENCES ordenes_trabajo(id) ON DELETE CASCADE,
  inventario_id    uuid REFERENCES inventario(id),
  cantidad         integer NOT NULL,
  precio_usd       numeric(15,2) NOT NULL,
  subtotal_usd     numeric(15,2) GENERATED ALWAYS AS (cantidad * precio_usd) STORED,
  created_at       timestamptz DEFAULT now()
);

-- CONTRATOS DE ALQUILER
CREATE TABLE contratos_alquiler (
  id                uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id   uuid REFERENCES organizaciones(id),
  numero_contrato   serial,
  maquina_id        uuid REFERENCES maquinas(id),
  cliente_id        uuid REFERENCES clientes(id),
  supervisor_id     uuid REFERENCES perfiles(id),
  fecha_inicio      date NOT NULL,
  fecha_fin         date NOT NULL,
  tarifa_diaria_usd numeric(12,2) NOT NULL,
  deposito_usd      numeric(12,2) DEFAULT 0,
  estado            text CHECK (estado IN ('borrador','activo','pausado','finalizado','cancelado')) DEFAULT 'borrador',
  condiciones       text,
  notas             text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- VISTA: alquileres activos con vencimiento calculado
CREATE OR REPLACE VIEW alquileres_activos AS
SELECT
  ca.*,
  m.nombre_unidad, m.marca, m.modelo,
  c.razon_social AS cliente_nombre,
  (ca.fecha_fin - CURRENT_DATE) AS dias_restantes,
  ((ca.fecha_fin - ca.fecha_inicio) * ca.tarifa_diaria_usd) AS total_contrato_usd,
  CASE
    WHEN ca.fecha_fin < CURRENT_DATE THEN 'vencido'
    WHEN (ca.fecha_fin - CURRENT_DATE) <= 7 THEN 'por_vencer'
    ELSE 'activo'
  END AS estado_vencimiento
FROM contratos_alquiler ca
JOIN maquinas m ON ca.maquina_id = m.id
JOIN clientes c ON ca.cliente_id = c.id
WHERE ca.estado IN ('activo','borrador');

-- TRANSACCIONES / FACTURACIÓN ARCA
CREATE TABLE transacciones (
  id                     uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id        uuid REFERENCES organizaciones(id),
  numero_comprobante     text,
  tipo_documento         text CHECK (tipo_documento IN ('Factura A','Factura B','Factura C','Nota de Crédito A','Nota de Crédito B','Remito Interno','Presupuesto')) NOT NULL,
  origen_tipo            text CHECK (origen_tipo IN ('taller','alquiler','venta_repuesto','otro')),
  orden_trabajo_id       uuid REFERENCES ordenes_trabajo(id),
  contrato_alquiler_id   uuid REFERENCES contratos_alquiler(id),
  cliente_id             uuid REFERENCES clientes(id),
  condicion_iva_cliente  text,
  monto_neto_usd         numeric(15,2) NOT NULL,
  monto_iva_usd          numeric(15,2) DEFAULT 0,
  monto_total_usd        numeric(15,2) NOT NULL,
  tipo_cambio_bna        numeric(12,2),
  monto_total_ars        numeric(18,2),
  cae                    text,
  fecha_vencimiento_cae  date,
  punto_venta            integer DEFAULT 1,
  estado_pago            text CHECK (estado_pago IN ('pendiente','cobrado','vencido','anulado')) DEFAULT 'pendiente',
  fecha_emision          date DEFAULT CURRENT_DATE,
  fecha_vencimiento_pago date,
  fecha_cobro            date,
  medio_pago             text,
  notas                  text,
  created_by             uuid REFERENCES perfiles(id),
  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now()
);

-- SOLICITUDES DE EDICIÓN (flujo Operativo → Supervisor → Owner)
CREATE TABLE solicitudes_edicion (
  id               uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id  uuid REFERENCES organizaciones(id),
  solicitante_id   uuid REFERENCES perfiles(id),
  aprobador_id     uuid REFERENCES perfiles(id),
  modulo           text CHECK (modulo IN ('taller','alquileres','ventas','precios','inventario')),
  tabla_afectada   text,
  registro_id      uuid,
  descripcion      text NOT NULL,
  valor_anterior   jsonb,
  valor_propuesto  jsonb,
  estado           text CHECK (estado IN ('pendiente','aprobada','rechazada')) DEFAULT 'pendiente',
  motivo_rechazo   text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- ALERTAS
CREATE TABLE alertas (
  id              uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id uuid REFERENCES organizaciones(id),
  tipo            text CHECK (tipo IN ('service_urgente','service_proximo','alquiler_vencimiento','stock_minimo','deuda_cliente','precio_desactualizado')),
  titulo          text NOT NULL,
  descripcion     text,
  entidad_tipo    text,
  entidad_id      uuid,
  prioridad       text CHECK (prioridad IN ('alta','media','baja')) DEFAULT 'media',
  leida           boolean DEFAULT false,
  resuelta        boolean DEFAULT false,
  created_at      timestamptz DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE organizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE maquinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes_trabajo ENABLE ROW LEVEL SECURITY;
ALTER TABLE ot_repuestos ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos_alquiler ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes_edicion ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipo_cambio ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION get_org_id() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT organization_id FROM perfiles WHERE id = auth.uid() $$;
CREATE OR REPLACE FUNCTION get_rol() RETURNS text LANGUAGE sql STABLE AS $$ SELECT rol FROM perfiles WHERE id = auth.uid() $$;
CREATE OR REPLACE FUNCTION get_area() RETURNS text LANGUAGE sql STABLE AS $$ SELECT area FROM perfiles WHERE id = auth.uid() $$;

CREATE POLICY "org_clientes" ON clientes FOR ALL USING (organization_id = get_org_id());
CREATE POLICY "org_inventario" ON inventario FOR ALL USING (organization_id = get_org_id());
CREATE POLICY "org_maquinas" ON maquinas FOR ALL USING (organization_id = get_org_id());
CREATE POLICY "org_alertas" ON alertas FOR ALL USING (organization_id = get_org_id());
CREATE POLICY "tc_public" ON tipo_cambio FOR SELECT USING (true);
CREATE POLICY "ot_policy" ON ordenes_trabajo FOR ALL USING (organization_id = get_org_id() AND (get_rol() IN ('owner','supervisor') OR operativo_id = auth.uid()));
CREATE POLICY "alq_policy" ON contratos_alquiler FOR ALL USING (organization_id = get_org_id() AND (get_rol() = 'owner' OR (get_rol() = 'supervisor' AND get_area() IN ('alquileres','general')) OR supervisor_id = auth.uid()));
CREATE POLICY "tx_policy" ON transacciones FOR ALL USING (organization_id = get_org_id() AND get_rol() IN ('owner','supervisor'));
CREATE POLICY "sol_policy" ON solicitudes_edicion FOR ALL USING (organization_id = get_org_id() AND (get_rol() IN ('owner','supervisor') OR solicitante_id = auth.uid()));
CREATE POLICY "perfiles_policy" ON perfiles FOR ALL USING (id = auth.uid() OR get_rol() = 'owner');

-- TRIGGER: auto-crear perfil al registrarse
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO perfiles (id, nombre_completo, rol)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 'operativo');
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- TRIGGER: updated_at automático
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER upd_clientes BEFORE UPDATE ON clientes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER upd_maquinas BEFORE UPDATE ON maquinas FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER upd_ot BEFORE UPDATE ON ordenes_trabajo FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER upd_alq BEFORE UPDATE ON contratos_alquiler FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER upd_tx BEFORE UPDATE ON transacciones FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER upd_sol BEFORE UPDATE ON solicitudes_edicion FOR EACH ROW EXECUTE FUNCTION set_updated_at();
