-- ================================================================
-- FASE J: Integraciones — tablas de soporte
-- cheques, cuentas_bancarias, documentos, ocr_resultados, integraciones_log
-- ================================================================

-- Cuentas bancarias de la organización
create table if not exists public.cuentas_bancarias (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid references public.organizaciones(id) on delete cascade not null,
  banco         text not null,
  tipo_cuenta   text not null check (tipo_cuenta in ('cc', 'ca', 'virtual')),
  numero        text not null,
  cbu           text,
  alias         text,
  moneda        text not null default 'ARS',
  saldo_ultimo  numeric(14,2),
  saldo_fecha   date,
  activa        boolean default true,
  created_at    timestamptz default now()
);

-- Cheques recibidos y emitidos (incluye E-Cheq)
create table if not exists public.cheques (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid references public.organizaciones(id) on delete cascade not null,
  tipo            text not null check (tipo in ('recibido', 'emitido')),
  tipo_cheque     text not null default 'comun' check (tipo_cheque in ('comun', 'echeq')),
  banco           text not null,
  numero          text not null,
  monto           numeric(12,2) not null,
  moneda          text not null default 'ARS',
  fecha_emision   date,
  fecha_pago      date not null,
  estado          text not null default 'en_cartera'
                  check (estado in ('en_cartera', 'depositado', 'rechazado', 'endosado',
                                    'emitido', 'por_debitar', 'anulado')),
  emisor          text,       -- para cheques recibidos
  beneficiario    text,       -- para cheques emitidos
  echeq_id        text,       -- ID en plataforma BCRA para e-cheqs
  cuenta_id       uuid references public.cuentas_bancarias(id),
  cliente_id      uuid references public.clientes(id),
  proveedor_id    uuid references public.proveedores(id),
  notas           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Documentos subidos a Supabase Storage
create table if not exists public.documentos (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid references public.organizaciones(id) on delete cascade not null,
  entidad_tipo    text not null, -- 'ot', 'cliente', 'maquina', 'proveedor', 'contrato', 'cheque'
  entidad_id      uuid not null,
  nombre          text not null,
  storage_path    text not null,
  url_publica     text,
  tipo_doc        text check (tipo_doc in ('firma', 'foto', 'factura', 'remito',
                                           'manual', 'seguro', 'contrato', 'otro')),
  mime_type       text,
  tamano_bytes    integer,
  subido_por      uuid references auth.users(id),
  created_at      timestamptz default now()
);

-- Resultados de OCR sobre documentos
create table if not exists public.ocr_resultados (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid references public.organizaciones(id) on delete cascade not null,
  documento_id      uuid references public.documentos(id) on delete cascade,
  tipo_documento    text,
  numero            text,
  fecha             date,
  entidad           text,
  texto_crudo       text,
  items_detectados  integer,
  confianza         numeric(4,3),
  procesado_por     uuid references auth.users(id),
  created_at        timestamptz default now()
);

-- Log de llamadas a integraciones externas (auditoría no bloqueante)
create table if not exists public.integraciones_log (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid references public.organizaciones(id) on delete cascade,
  integracion text not null check (integracion in ('arca', 'whatsapp', 'email', 'storage', 'bancos', 'ocr')),
  operacion   text not null,
  estado      text not null check (estado in ('ok', 'error', 'mock')),
  latencia_ms integer,
  payload     jsonb,
  respuesta   jsonb,
  error_msg   text,
  usuario_id  uuid references auth.users(id),
  created_at  timestamptz default now()
);

-- ── RLS ────────────────────────────────────────────────────────
alter table public.cuentas_bancarias  enable row level security;
alter table public.cheques            enable row level security;
alter table public.documentos         enable row level security;
alter table public.ocr_resultados     enable row level security;
alter table public.integraciones_log  enable row level security;

create policy "org_access_cuentas_bancarias" on public.cuentas_bancarias
  using (org_id = (select organization_id from public.perfiles where id = auth.uid()));

create policy "org_access_cheques" on public.cheques
  using (org_id = (select organization_id from public.perfiles where id = auth.uid()));

create policy "org_access_documentos" on public.documentos
  using (org_id = (select organization_id from public.perfiles where id = auth.uid()));

create policy "org_access_ocr_resultados" on public.ocr_resultados
  using (org_id = (select organization_id from public.perfiles where id = auth.uid()));

create policy "org_access_integraciones_log" on public.integraciones_log
  using (org_id = (select organization_id from public.perfiles where id = auth.uid()));

-- ── Índices ────────────────────────────────────────────────────
create index if not exists idx_cheques_org_estado     on public.cheques(org_id, estado);
create index if not exists idx_cheques_fecha_pago     on public.cheques(fecha_pago);
create index if not exists idx_cheques_tipo           on public.cheques(org_id, tipo);
create index if not exists idx_documentos_entidad     on public.documentos(entidad_tipo, entidad_id);
create index if not exists idx_documentos_org         on public.documentos(org_id);
create index if not exists idx_integraciones_log_org  on public.integraciones_log(org_id, created_at desc);
create index if not exists idx_ocr_resultados_doc     on public.ocr_resultados(documento_id);

-- ── Trigger updated_at en cheques ──────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_cheques_updated_at'
  ) then
    create trigger trg_cheques_updated_at
      before update on public.cheques
      for each row execute function public.set_updated_at();
  end if;
end;
$$;
