import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Banknote,
  Boxes,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Layers3,
  MapPinned,
  Plus,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Truck,
  Wrench,
  Zap,
  ArrowUpRight,
  Gauge,
} from 'lucide-react'
import { useAuth }          from '../../context/AuthContext'
import { useDolar }         from '../../context/DolarContext'
import { useDashboardData } from '../../hooks/useDashboardData'

// ─── helpers ──────────────────────────────────────────────────────────────────

function greet(name) {
  const h = new Date().getHours()
  const saludo = h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches'
  const first = (name || '').split(' ')[0]
  return first ? `${saludo}, ${first}` : saludo
}

function Skel({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-white/[0.04] ${className}`} />
}

function StatusDot({ color = 'bg-emerald-400' }) {
  return <span className={`h-2 w-2 shrink-0 rounded-full ${color} shadow-[0_0_8px_currentColor]`} />
}

function Eyebrow({ text }) {
  return (
    <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-cyan-300/60">
      <span className="h-px w-6 bg-cyan-300/30" />
      {text}
    </div>
  )
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, detail, tone, icon: Icon, loading }) {
  return (
    <div className="group rounded-2xl border border-white/5 bg-[#0d1016]/90 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-300/20 hover:bg-[#11151c]">
      <div className="mb-4 flex items-center justify-between">
        <div className="rounded-xl border border-white/5 bg-black/30 p-2 text-neutral-500 transition-colors group-hover:text-cyan-300">
          <Icon className="h-4 w-4" />
        </div>
        <StatusDot color={tone.replace('text-', 'bg-')} />
      </div>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-600">{label}</div>
      {loading
        ? <Skel className="mt-2 h-9 w-24" />
        : <div className={`mt-2 font-mono text-3xl font-black tabular-nums ${tone}`}>{value}</div>
      }
      <p className="mt-1.5 text-sm text-neutral-600">{detail}</p>
    </div>
  )
}

// ─── command module ────────────────────────────────────────────────────────────

function CommandModule({ item }) {
  const Icon = item.icon
  return (
    <Link
      to={item.route}
      className="group rounded-2xl border border-white/5 bg-[#0d1016]/85 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-300/20 hover:bg-[#11151c]"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="rounded-xl border border-white/5 bg-black/30 p-2 text-cyan-300/60 transition-colors group-hover:text-cyan-300">
          <Icon className="h-4 w-4" />
        </div>
        <ChevronRight className="h-4 w-4 text-neutral-700 transition-transform group-hover:translate-x-0.5 group-hover:text-cyan-300" />
      </div>
      <h3 className="text-sm font-black text-white">{item.title}</h3>
      <p className="mt-1.5 min-h-[36px] text-xs leading-relaxed text-neutral-500">{item.description}</p>
      <div className="mt-4 inline-flex rounded-full border border-white/5 bg-black/25 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-600">
        {item.status}
      </div>
    </Link>
  )
}

// ─── alert row ────────────────────────────────────────────────────────────────

function AlertRow({ alerta }) {
  const TONE = {
    critica: 'border-red-300/25 text-red-300',
    alta:    'border-amber-300/25 text-amber-300',
    media:   'border-cyan-300/20 text-cyan-300',
    baja:    'border-neutral-700/40 text-neutral-500',
  }
  const tone = TONE[alerta.prioridad] || TONE.media
  return (
    <div className={`flex items-start gap-3 rounded-2xl border bg-black/20 p-3.5 ${tone}`}>
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-bold leading-snug text-white">{alerta.titulo || alerta.nombre || 'Alerta'}</p>
        {alerta.descripcion && (
          <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">{alerta.descripcion}</p>
        )}
      </div>
    </div>
  )
}

// ─── transaction row ──────────────────────────────────────────────────────────

const TIPO_LABEL = {
  factura:      'Factura',
  nota_credito: 'NC',
  nota_debito:  'ND',
  recibo:       'Recibo',
  presupuesto:  'Presupuesto',
}

function TxRow({ tx, formatUSD }) {
  const isPaid = tx.estado_pago === 'pagado'
  return (
    <div className="flex items-center gap-3 border-b border-white/[0.04] py-3 last:border-0">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-black/30">
        <ArrowUpRight className="h-3 w-3 text-cyan-300/50" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-xs font-semibold text-neutral-200">
            {TIPO_LABEL[tx.tipo_documento] || tx.tipo_documento} {tx.numero_comprobante}
          </span>
          <span className={`shrink-0 rounded-full px-1.5 py-px font-mono text-[9px] uppercase tracking-wide ${
            isPaid ? 'bg-emerald-300/10 text-emerald-300' : 'bg-amber-300/10 text-amber-400'
          }`}>
            {isPaid ? 'cobrado' : 'pendiente'}
          </span>
        </div>
        <div className="mt-0.5 font-mono text-[10px] text-neutral-700">
          {new Date(tx.fecha_emision).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
        </div>
      </div>
      <div className="shrink-0 font-mono text-sm font-bold tabular-nums text-neutral-200">
        {formatUSD(tx.monto_total_usd)}
      </div>
    </div>
  )
}

// ─── quick action ─────────────────────────────────────────────────────────────

function QuickAction({ label, route, icon: Icon }) {
  return (
    <Link
      to={route}
      className="group flex items-center gap-2 rounded-xl border border-white/5 bg-black/20 px-3.5 py-2 text-sm text-neutral-400 transition-all hover:border-cyan-300/20 hover:bg-[#11151c] hover:text-white"
    >
      <Icon className="h-4 w-4 shrink-0 text-cyan-300/60 transition-colors group-hover:text-cyan-300" />
      {label}
    </Link>
  )
}

// ─── static data ──────────────────────────────────────────────────────────────

const commandItems = [
  { title: 'Cliente 360',   description: 'Historial comercial, deuda, activos, OTs y oportunidades.',     route: '/app/clientes',  icon: Layers3,          status: 'Operativo'       },
  { title: 'Activo 360',    description: 'Máquinas, horómetros, disponibilidad y continuidad operativa.',  route: '/app/activo360', icon: Truck,            status: 'Operativo'       },
  { title: 'OT 360',        description: 'Taller, técnicos, repuestos, garantías y estados de servicio.',  route: '/app/taller',    icon: Wrench,           status: 'Operativo'       },
  { title: 'Tesorería',     description: 'Caja, bancos, pagos, cobranzas, mora y flujo proyectado.',       route: '/app/tesoreria', icon: CircleDollarSign, status: 'En control'      },
  { title: 'Stock',         description: 'Mínimos, rotación, inmovilizado y alertas de reposición.',       route: '/app/repuestos', icon: Boxes,            status: 'Alertas activas' },
  { title: 'App Campo',     description: 'Operación offline-first, partes, fotos, GPS y firma digital.',   route: '/campo',         icon: MapPinned,        status: 'Base preparada'  },
]

// ─── component ────────────────────────────────────────────────────────────────

export default function Home() {
  const { perfil }      = useAuth()
  const { formatUSD }   = useDolar()
  const { data, loading, refresh } = useDashboardData()

  const k = data.kpis

  const saludo = useMemo(() => greet(perfil?.nombre_completo || ''), [perfil?.nombre_completo])

  const kpis = [
    {
      label:  'OT activas',
      value:  String(k.ordenesActivas),
      detail: 'En curso o borrador',
      tone:   k.ordenesActivas > 5 ? 'text-amber-300' : 'text-emerald-300',
      icon:   ClipboardList,
    },
    {
      label:  'Service urgente',
      value:  String(k.alertasServiceUrgentes),
      detail: `${k.alertasService} máquinas en alerta`,
      tone:   k.alertasServiceUrgentes > 0 ? 'text-red-300' : 'text-emerald-300',
      icon:   Gauge,
    },
    {
      label:  'Facturado mes',
      value:  formatUSD(k.facturadoMes),
      detail: 'Ingresos del mes actual',
      tone:   'text-cyan-300',
      icon:   TrendingUp,
    },
    {
      label:  'Cobranza pendiente',
      value:  formatUSD(k.cobranzaPendiente),
      detail: 'Facturas sin cobrar',
      tone:   k.cobranzaPendiente > 0 ? 'text-red-300' : 'text-emerald-300',
      icon:   Banknote,
    },
  ]

  const alertas        = data.alertas.slice(0, 5)
  const alertasService = data.alertasService.slice(0, 3)
  const transacciones  = data.transacciones

  return (
    <div className="relative min-h-full">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_15%_10%,rgba(0,212,255,0.07),transparent_35%),radial-gradient(circle_at_85%_20%,rgba(0,245,160,0.04),transparent_35%)]" />

      <div className="space-y-6">

        {/* ── HERO ──────────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-[28px] border border-white/5 bg-[#07090d] p-6 md:p-8">
          {/* grid overlay */}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.016)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.016)_1px,transparent_1px)] bg-[size:48px_48px]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(0,212,255,0.055),transparent_45%),radial-gradient(ellipse_at_bottom_right,rgba(0,245,160,0.035),transparent_45%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.75)_100%)]" />

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            {/* Text + quick actions */}
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-2.5">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-300">
                  <StatusDot color="bg-emerald-400" />
                  Sistema activo
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-white/5 bg-black/25 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                  <ShieldCheck className="h-3 w-3" />
                  Centro de operaciones
                </div>
              </div>

              <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">
                {saludo}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-neutral-500">
                Seguimiento ejecutivo de activos, taller, stock y tesorería.
                Detectá riesgos, priorizá el trabajo y sostené la operación diaria.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <QuickAction label="Nueva OT"          route="/app/taller"        icon={Plus} />
                <QuickAction label="Nueva cotización"  route="/app/cotizaciones"  icon={Plus} />
                <QuickAction label="Aprobaciones"      route="/app/aprobaciones"  icon={CheckCircle2} />
                <QuickAction label="CEO Dashboard"     route="/app/ceo"           icon={Zap} />
              </div>
            </div>

            {/* Live pulse */}
            <div className="shrink-0 rounded-2xl border border-white/5 bg-black/25 p-5 lg:w-56">
              <div className="mb-4 flex items-center justify-between">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-500">Pulso operativo</div>
                <button
                  onClick={refresh}
                  className="text-neutral-700 transition-colors hover:text-cyan-300"
                  title="Actualizar"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="space-y-3">
                {loading ? (
                  <>
                    <Skel className="h-5" />
                    <Skel className="h-5" />
                    <Skel className="h-5" />
                    <Skel className="h-5" />
                  </>
                ) : (
                  [
                    ['Flota activa',    String(data.flota.length),    'text-cyan-300'],
                    ['OTs abiertas',    String(k.ordenesActivas),      k.ordenesActivas > 5 ? 'text-amber-300' : 'text-emerald-300'],
                    ['Leads activos',   String(k.leadsActivos),        'text-neutral-300'],
                    ['Alertas activas', String(data.alertas.length),   data.alertas.length > 0 ? 'text-red-300' : 'text-emerald-300'],
                  ].map(([label, value, color]) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-600">{label}</span>
                      <span className={`font-mono text-sm font-black tabular-nums ${color}`}>{value}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── KPI ROW ───────────────────────────────────────── */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((item) => (
            <KpiCard key={item.label} {...item} loading={loading} />
          ))}
        </section>

        {/* ── MAIN GRID ─────────────────────────────────────── */}
        <section className="grid gap-6 xl:grid-cols-[1fr_0.72fr]">

          {/* ── Left: module map ──────────────────────────── */}
          <div className="rounded-[24px] border border-white/5 bg-[#080b10] p-6">
            <div className="mb-5">
              <Eyebrow text="Módulos críticos" />
              <h2 className="text-xl font-black tracking-tight text-white">Mapa operativo</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Accesos principales para ejecutar y controlar la operación.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {commandItems.map((item) => (
                <CommandModule key={item.title} item={item} />
              ))}
            </div>
          </div>

          {/* ── Right: alerts + transactions ──────────────── */}
          <div className="flex flex-col gap-5">

            {/* Alerts panel */}
            <div className="rounded-[24px] border border-white/5 bg-[#080b10] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <Eyebrow text="Riesgo operativo" />
                  <h2 className="text-base font-black text-white">Alertas prioritarias</h2>
                </div>
                {!loading && alertas.length > 0 && (
                  <span className="rounded-full border border-red-300/20 bg-red-300/10 px-2 py-0.5 font-mono text-[10px] font-bold text-red-300">
                    {alertas.length}
                  </span>
                )}
              </div>

              {loading ? (
                <div className="space-y-3">
                  <Skel className="h-16" />
                  <Skel className="h-14" />
                  <Skel className="h-14" />
                </div>
              ) : alertas.length > 0 ? (
                <div className="space-y-2.5">
                  {alertas.map((a) => <AlertRow key={a.id} alerta={a} />)}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/5 bg-black/10 py-8 text-center">
                  <CheckCircle2 className="h-6 w-6 text-emerald-300/60" />
                  <span className="text-sm text-neutral-600">Sin alertas activas</span>
                </div>
              )}

              {/* Service alerts */}
              {!loading && alertasService.length > 0 && (
                <div className="mt-4">
                  <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-amber-300/60">
                    Service próximo
                  </div>
                  <div className="space-y-2">
                    {alertasService.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between rounded-xl border border-amber-300/15 bg-black/15 px-3.5 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-neutral-200">{m.nombre_unidad}</p>
                          {m.cliente_nombre && (
                            <p className="mt-0.5 truncate font-mono text-[10px] text-neutral-600">{m.cliente_nombre}</p>
                          )}
                        </div>
                        <div className="ml-3 shrink-0 text-right">
                          <div className="font-mono text-xs font-black text-amber-300">
                            {m.horas_restantes_service != null ? `${m.horas_restantes_service} h` : '—'}
                          </div>
                          <div className="font-mono text-[9px] uppercase tracking-wider text-neutral-700">restantes</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Recent transactions */}
            <div className="rounded-[24px] border border-white/5 bg-[#080b10] p-5">
              <div className="mb-4">
                <Eyebrow text="Actividad reciente" />
                <h2 className="text-base font-black text-white">Últimas transacciones</h2>
              </div>

              {loading ? (
                <div className="space-y-3">
                  <Skel className="h-12" />
                  <Skel className="h-12" />
                  <Skel className="h-12" />
                </div>
              ) : transacciones.length > 0 ? (
                <div>
                  {transacciones.map((tx) => (
                    <TxRow key={tx.id} tx={tx} formatUSD={formatUSD} />
                  ))}
                  <Link
                    to="/app/facturacion"
                    className="mt-4 flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-cyan-300/50 transition-colors hover:text-cyan-300"
                  >
                    Ver todas <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-neutral-600">Sin transacciones registradas aún.</p>
              )}
            </div>

          </div>
        </section>

      </div>
    </div>
  )
}
