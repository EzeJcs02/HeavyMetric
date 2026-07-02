import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth }          from '../../context/AuthContext'
import { useDolar }         from '../../context/DolarContext'
import { useDashboardData } from '../../hooks/useDashboardData'
import KpiCard              from '../../components/ui/KpiCard'

// ─── Mock sparkline seeds (replace with real hook data when available) ────────
const SPARK_OT  = [8, 6, 9, 7, 10, 8, 7, 9, 7]
const SPARK_OV  = [3, 5, 4, 7, 6, 8, 10, 9, 12]
const SPARK_STK = [15, 13, 14, 11, 10, 8, 9, 7, 6]
const SPARK_USD = [40, 42, 45, 43, 50, 52, 55, 58, 62]

// ─── Priority Item ────────────────────────────────────────────────────────────
function PriorityRow({ category, title, description, borderColor }) {
  return (
    <a
      href="#"
      className={`flex items-center gap-3 px-4 py-3 border-b border-hm-border/50 hover:bg-hm-surface2/60 transition-colors border-l-2`}
      style={{ borderLeftColor: borderColor }}
    >
      <div className="flex-1 min-w-0">
        <div className="font-mono text-[9px] tracking-[0.14em] uppercase font-semibold mb-1" style={{ color: borderColor }}>
          {category}
        </div>
        <div className="text-[13px] font-semibold text-hm-text">{title}</div>
        <div className="text-[11px] text-hm-muted mt-0.5">{description}</div>
      </div>
      <svg className="h-3.5 w-3.5 shrink-0 text-hm-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 18l6-6-6-6" />
      </svg>
    </a>
  )
}

// ─── Stepper ──────────────────────────────────────────────────────────────────
function StepperItem({ n, title, description, isLast }) {
  return (
    <div className="flex items-start gap-3 relative">
      {!isLast && (
        <div className="absolute left-[11px] top-6 bottom-0 w-px bg-hm-border" />
      )}
      <div className="relative z-10 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border border-hm-accent/40 bg-hm-surface font-mono text-[9px] font-semibold text-hm-accent">
        {n}
      </div>
      <a href="#" className="flex-1 flex items-center justify-between rounded-md border border-hm-border/60 px-3 py-2 mb-3 hover:bg-hm-surface2/60 transition-colors">
        <div>
          <div className="text-[12.5px] font-semibold text-hm-text">{title}</div>
          <div className="text-[11px] text-hm-muted mt-0.5">{description}</div>
        </div>
        <svg className="h-3 w-3 shrink-0 text-hm-muted ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 18l6-6-6-6" />
        </svg>
      </a>
    </div>
  )
}

// ─── Module shortcut card ─────────────────────────────────────────────────────
function ModuleCard({ to, label, code, description, accentColor }) {
  return (
    <Link to={to}
      className="block bg-hm-surface border border-hm-border rounded-lg p-3.5 hover:border-hm-accent/40 hover:bg-hm-surface2/40 transition-colors relative overflow-hidden group">
      <div className="absolute top-0 left-0 right-0 h-0.5 opacity-70 group-hover:opacity-100 transition-opacity"
        style={{ background: accentColor }} />
      <div className="flex items-center justify-between mb-2.5">
        <span className="font-mono text-[9px] tracking-[0.14em] uppercase text-hm-muted">{label}</span>
        <svg className="h-3 w-3 text-hm-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 18l6-6-6-6" />
        </svg>
      </div>
      <div className="font-mono text-[26px] font-bold leading-none tracking-tight" style={{ color: accentColor }}>
        {code}
      </div>
      <div className="text-[11px] text-hm-muted mt-1.5">{description}</div>
    </Link>
  )
}

// ─── Activity row ─────────────────────────────────────────────────────────────
function ActivityRow({ title, description }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-hm-border/50 last:border-0">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-semibold text-hm-text">{title}</div>
        <div className="text-[11px] text-hm-muted">{description}</div>
      </div>
      <span className="font-mono text-[9px] text-emerald-600 shrink-0">OK</span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const { perfil }    = useAuth()
  const { formatUSD } = useDolar()
  const { data, loading } = useDashboardData()
  const k = data.kpis

  const saludo = useMemo(() => {
    const h = new Date().getHours()
    const s = h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches'
    const first = (perfil?.nombre_completo || '').split(' ')[0]
    return first ? `${s}, ${first}` : s
  }, [perfil?.nombre_completo])

  return (
    <div className="flex flex-col gap-4 p-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[9px] tracking-[0.14em] uppercase text-hm-muted mb-1">
            APP / CENTRO DE OPERACIONES
          </div>
          <h1 className="text-xl font-bold tracking-tight text-hm-text">{saludo}</h1>
          <p className="text-[12px] text-hm-muted mt-1">Operación consolidada · {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 pt-1">
          <Link to="/app/taller"
            className="flex items-center gap-1.5 rounded-md border border-hm-border bg-hm-surface px-3 py-1.5 text-xs font-semibold text-hm-muted hover:border-hm-accent/40 hover:text-hm-text transition-colors">
            + Nueva OT
          </Link>
          <Link to="/app/ceo"
            className="flex items-center gap-1.5 rounded-md bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 transition-colors">
            ⚡ CEO Dashboard
          </Link>
        </div>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Órdenes de Venta"
          value={loading ? '—' : String(k.ordenesActivas ?? 0)}
          subtext="pendientes de firma"
          delta="+18%"
          deltaType="up"
          accent="amber"
          sparkData={SPARK_OV}
        />
        <KpiCard
          label="Trabajos Abiertos"
          value={loading ? '—' : String(k.alertasService ?? 0)}
          subtext={`${k.alertasServiceUrgentes ?? 0} urgentes`}
          delta={k.alertasServiceUrgentes > 0 ? `${k.alertasServiceUrgentes} urgentes` : 'OK'}
          deltaType={k.alertasServiceUrgentes > 0 ? 'warn' : 'up'}
          accent="blue"
          sparkData={SPARK_OT}
        />
        <KpiCard
          label="Facturado mes"
          value={loading ? '—' : formatUSD(k.facturadoMes)}
          subtext="ingresos del mes"
          delta="+12%"
          deltaType="up"
          accent="green"
          sparkData={SPARK_USD}
        />
        <KpiCard
          label="Cobranza pendiente"
          value={loading ? '—' : formatUSD(k.cobranzaPendiente)}
          subtext="sin cobrar"
          delta={k.cobranzaPendiente > 0 ? '6 facturas' : 'Al día'}
          deltaType={k.cobranzaPendiente > 0 ? 'warn' : 'up'}
          accent={k.cobranzaPendiente > 0 ? 'amber' : 'green'}
          sparkData={SPARK_STK}
        />
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">

        {/* Left: Priority */}
        <div className="bg-hm-surface border border-hm-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-hm-border flex items-center justify-between">
            <div>
              <div className="font-mono text-[9px] tracking-[0.14em] uppercase text-hm-muted mb-0.5">PRIORIDAD</div>
              <div className="text-[14px] font-bold text-hm-text">Atención Requerida</div>
              <div className="text-[11px] text-hm-muted">Accesos directos a los frentes que conviene revisar primero.</div>
            </div>
            <span className="flex items-center gap-1 rounded border border-red-200 bg-red-50 px-2 py-1 font-mono text-[9px] text-red-600">
              ⚠ OPERACIÓN
            </span>
          </div>
          <PriorityRow category="VENTA" title="Órdenes de Venta pendientes de firma"
            description="Revisar ventas en preparación y confirmar aceptación del cliente."
            borderColor="#D97706" />
          <PriorityRow category="COBRANZA" title="Documentos pendientes de cobro"
            description="Facturas y recibos con seguimiento financiero abierto."
            borderColor="#3B82F6" />
          <PriorityRow category="INVENTARIO" title="Stock bajo o pendiente de reposición"
            description="Revisar mínimos, movimientos y necesidades de compra."
            borderColor="#DC2626" />
          <PriorityRow category="SERVICIO" title="Trabajos y servicios en curso"
            description="Órdenes de trabajo, activos y tareas operativas pendientes."
            borderColor="#94A3B8" />
        </div>

        {/* Right: Activity + analytics */}
        <div className="flex flex-col gap-4">
          <div className="bg-hm-surface border border-hm-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-hm-border">
              <div className="font-mono text-[9px] tracking-[0.14em] uppercase text-hm-muted mb-0.5">ACTIVIDAD</div>
              <div className="text-[14px] font-bold text-hm-text">Últimas Mejoras</div>
            </div>
            <ActivityRow title="Ventas" description="Base real de Órdenes de Venta habilitada" />
            <ActivityRow title="Usuarios" description="Permisos de owner y roles normalizados" />
            <ActivityRow title="Proveedores" description="Lenguaje profesional e ISO aplicado" />
            <ActivityRow title="Facturación" description="Documentos y Cobranzas consolidado" />
            <ActivityRow title="Stock / Inventario" description="Mínimos y gestión de reposición" />
          </div>
        </div>
      </div>

      {/* ── Module shortcuts ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ModuleCard to="/app/ventas"       label="Órdenes de Venta"  code="OV"  description="Ventas, firmas y facturación"  accentColor="#D97706" />
        <ModuleCard to="/app/taller"       label="Trabajos Abiertos" code="OT"  description="Taller y servicio"             accentColor="#3B82F6" />
        <ModuleCard to="/app/repuestos"    label="Inventario"        code="STK" description="Stock, mínimos y reposición"   accentColor="#DC2626" />
        <ModuleCard to="/app/tesoreria"    label="Tesorería"         code="$"   description="Caja, bancos y pagos"          accentColor="#10B981" />
      </div>

      {/* ── Bottom grid ── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">

        {/* Quick actions */}
        <div className="bg-hm-surface border border-hm-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-hm-border">
            <div className="font-mono text-[9px] tracking-[0.14em] uppercase text-hm-muted mb-0.5">ACCIONES</div>
            <div className="text-[14px] font-bold text-hm-text">Accesos Rápidos</div>
          </div>
          {[
            { to: '/app/ventas',      label: 'Crear Orden de Venta',    sub: 'Generar una OV comercial.',            accent: '#D97706' },
            { to: '/app/cotizaciones',label: 'Cotizaciones',             sub: 'Revisar y convertir cotizaciones.',    accent: null },
            { to: '/app/clientes',    label: 'Ver clientes',             sub: 'Historial, deuda y actividad.',        accent: null },
            { to: '/app/repuestos',   label: 'Revisar inventario',       sub: 'Stock, movimientos y reposición.',     accent: null },
            { to: '/app/facturacion', label: 'Documentos y Cobranzas',   sub: 'Facturas, recibos, remitos y cobros.', accent: null },
            { to: '/app/tesoreria',   label: 'Tesorería',                sub: 'Flujo de fondos, bancos y pagos.',     accent: null },
          ].map(item => (
            <Link key={item.to} to={item.to}
              className="flex items-center gap-3 px-4 py-2.5 border-b border-hm-border/50 last:border-0 hover:bg-hm-surface2/60 transition-colors"
              style={{ borderLeftWidth: 2, borderLeftColor: item.accent || 'transparent' }}>
              <div className="flex-1">
                <div className="text-[12.5px] font-semibold text-hm-text">{item.label}</div>
                <div className="text-[11px] text-hm-muted">{item.sub}</div>
              </div>
              <svg className="h-3 w-3 shrink-0 text-hm-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 18l6-6-6-6" />
              </svg>
            </Link>
          ))}
        </div>

        {/* Pipeline stepper */}
        <div className="bg-hm-surface border border-hm-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-hm-border">
            <div className="font-mono text-[9px] tracking-[0.14em] uppercase text-hm-muted mb-0.5">FLUJO COMERCIAL</div>
            <div className="text-[14px] font-bold text-hm-text">Cotización a Cobranza</div>
            <div className="text-[11px] text-hm-muted">Circuito comercial preparado para operación real.</div>
          </div>
          <div className="p-4">
            <StepperItem n={1} title="Cotización"      description="Presupuesto comercial enviado al cliente" />
            <StepperItem n={2} title="Orden de Venta"  description="Condiciones aceptadas y operación confirmada" />
            <StepperItem n={3} title="Firma"           description="Evidencia de aceptación del comprador" />
            <StepperItem n={4} title="Factura / Cobranza" description="Documento emitido y seguimiento financiero" isLast />
          </div>
        </div>
      </div>

      {/* ── Status strip ── */}
      <div className="flex items-center gap-3 bg-hm-surface border border-hm-border rounded-lg px-4 py-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50">
          <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="text-[11.5px] font-bold text-hm-text">BASE OPERATIVA CONSOLIDADA</div>
          <div className="text-[11px] text-hm-muted mt-0.5">
            Navegación profesional, roles normalizados, ventas con OV real, gestión de proveedores, inventario y documentos de cobranza.
          </div>
        </div>
        <Link to="/app/ventas"
          className="flex items-center gap-1.5 rounded-md bg-zinc-950 px-3 py-1.5 text-[11px] font-bold text-white tracking-wide hover:bg-zinc-800 transition-colors shrink-0 whitespace-nowrap">
          IR A VENTAS
        </Link>
      </div>

    </div>
  )
}
