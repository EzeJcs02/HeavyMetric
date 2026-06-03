import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Banknote,
  Boxes,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Clock,
  Truck,
  UserRound,
  Wrench,
} from 'lucide-react'

const attentionItems = [
  {
    priority: 'Crítico',
    title: 'Equipo detenido esperando repuesto',
    detail: 'OT #2847 · filtro hidráulico pendiente · cliente PROCON',
    route: '/app/taller',
    tone: 'border-red-400/25 bg-red-500/10 text-red-300',
    icon: Wrench,
  },
  {
    priority: 'Hoy',
    title: 'Cobro pendiente por vencer',
    detail: 'Factura pendiente · revisar seguimiento de cobranza',
    route: '/app/facturacion',
    tone: 'border-amber-400/25 bg-amber-500/10 text-amber-300',
    icon: CircleDollarSign,
  },
  {
    priority: 'Stock',
    title: 'Repuestos bajo mínimo',
    detail: '4 ítems requieren reposición o revisión de compra',
    route: '/app/repuestos',
    tone: 'border-orange-400/25 bg-orange-500/10 text-orange-300',
    icon: Boxes,
  },
  {
    priority: 'Service',
    title: 'Mantenimiento próximo',
    detail: 'Activo con service próximo por horas de uso',
    route: '/app/activo360',
    tone: 'border-cyan-400/25 bg-cyan-500/10 text-cyan-300',
    icon: Truck,
  },
]

const workSummary = [
  {
    label: 'Trabajos abiertos',
    value: '7',
    detail: 'Taller y servicio',
    route: '/app/taller',
    icon: ClipboardList,
  },
  {
    label: 'Activos con alerta',
    value: '3',
    detail: 'Revisión operativa',
    route: '/app/activo360',
    icon: Truck,
  },
  {
    label: 'Stock crítico',
    value: '4',
    detail: 'Reposición sugerida',
    route: '/app/repuestos',
    icon: Boxes,
  },
  {
    label: 'Caja 7 días',
    value: '$12.4M',
    detail: 'Flujo proyectado',
    route: '/app/tesoreria',
    icon: Banknote,
  },
]

const quickActions = [
  {
    title: 'Crear trabajo',
    detail: 'Abrir una orden de taller o servicio.',
    route: '/app/taller',
    icon: Wrench,
  },
  {
    title: 'Ver clientes',
    detail: 'Consultar historial, deuda y actividad.',
    route: '/app/clientes',
    icon: UserRound,
  },
  {
    title: 'Revisar inventario',
    detail: 'Stock, movimientos y reposición.',
    route: '/app/repuestos',
    icon: Boxes,
  },
  {
    title: 'Ver cobranzas',
    detail: 'Facturación, pendientes y recibos.',
    route: '/app/facturacion',
    icon: CircleDollarSign,
  },
]

const recentActivity = [
  ['OT #2847', 'Cambio de filtros y aceite motor', 'Hace 24 min'],
  ['Inventario', 'Movimiento de salida registrado', 'Hace 1 h'],
  ['Cliente', 'Actualización de datos comerciales', 'Hoy'],
  ['Tesorería', 'Cobro registrado en facturación', 'Hoy'],
]

function SectionHeader({ eyebrow, title, description }) {
  return (
    <div>
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-600">
        {eyebrow}
      </div>
      <h2 className="text-lg font-black tracking-tight text-white">{title}</h2>
      {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
    </div>
  )
}

function AttentionCard({ item }) {
  const Icon = item.icon

  return (
    <Link
      to={item.route}
      className={`group block rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:bg-opacity-20 ${item.tone}`}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-xl border border-current/20 bg-black/20 p-2">
          <Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] opacity-80">
            {item.priority}
          </div>
          <h3 className="text-sm font-bold text-white">{item.title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-neutral-400">{item.detail}</p>
        </div>

        <ChevronRight className="mt-1 h-4 w-4 shrink-0 opacity-40 transition-transform group-hover:translate-x-1 group-hover:opacity-100" />
      </div>
    </Link>
  )
}

function SummaryCard({ item }) {
  const Icon = item.icon

  return (
    <Link
      to={item.route}
      className="group rounded-2xl border border-white/5 bg-[#0d1016]/85 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-300/20 hover:bg-[#11151c]"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="rounded-xl border border-white/5 bg-black/25 p-2 text-neutral-500 group-hover:text-cyan-300">
          <Icon className="h-4 w-4" />
        </div>
        <ChevronRight className="h-4 w-4 text-neutral-700 transition-transform group-hover:translate-x-1 group-hover:text-cyan-300" />
      </div>

      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-600">
        {item.label}
      </div>
      <div className="mt-2 font-mono text-2xl font-black text-white">{item.value}</div>
      <p className="mt-1 text-xs text-neutral-500">{item.detail}</p>
    </Link>
  )
}

function QuickAction({ item }) {
  const Icon = item.icon

  return (
    <Link
      to={item.route}
      className="group flex items-center justify-between rounded-2xl border border-white/5 bg-black/20 p-4 transition-all duration-200 hover:border-cyan-300/20 hover:bg-white/[0.03]"
    >
      <div className="flex items-center gap-3">
        <div className="rounded-xl border border-white/5 bg-[#0d1016] p-2 text-neutral-500 group-hover:text-cyan-300">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">{item.title}</h3>
          <p className="mt-0.5 text-xs text-neutral-500">{item.detail}</p>
        </div>
      </div>

      <ChevronRight className="h-4 w-4 text-neutral-700 transition-transform group-hover:translate-x-1 group-hover:text-cyan-300" />
    </Link>
  )
}

export default function Home() {
  return (
    <div className="relative min-h-full overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_10%,rgba(0,212,255,0.07),transparent_30%),radial-gradient(circle_at_85%_20%,rgba(0,245,160,0.035),transparent_30%)]" />

      <div className="space-y-7">
        <section className="relative overflow-hidden rounded-[28px] border border-white/5 bg-[#07090d] p-6 shadow-[0_0_90px_rgba(0,212,255,0.04)] md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.018)_1px,transparent_1px)] bg-[size:48px_48px] opacity-35" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.68)_100%)]" />

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                Sistema activo
              </div>

              <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight text-white md:text-5xl">
                Qué requiere atención hoy.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-relaxed text-neutral-500">
                Vista diaria para priorizar trabajos, activos, clientes, stock, cobros y pagos sin perder tiempo buscando en cada módulo.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-2xl border border-white/5 bg-black/25 p-4 md:min-w-[360px]">
              <div className="rounded-xl border border-white/5 bg-[#0d1016] p-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-600">
                  Pendientes hoy
                </div>
                <div className="mt-2 font-mono text-2xl font-black text-amber-300">8</div>
              </div>

              <div className="rounded-xl border border-white/5 bg-[#0d1016] p-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-600">
                  Riesgos críticos
                </div>
                <div className="mt-2 font-mono text-2xl font-black text-red-300">1</div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_0.72fr]">
          <div className="rounded-[24px] border border-white/5 bg-[#080b10] p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <SectionHeader
                eyebrow="Prioridad"
                title="Atención requerida"
                description="Situaciones que conviene resolver o revisar primero."
              />

              <div className="hidden items-center gap-2 rounded-full border border-white/5 bg-black/25 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-600 md:flex">
                <AlertTriangle className="h-3.5 w-3.5" />
                4 eventos
              </div>
            </div>

            <div className="grid gap-3">
              {attentionItems.map((item) => (
                <AttentionCard key={item.title} item={item} />
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-white/5 bg-[#080b10] p-6">
            <SectionHeader
              eyebrow="Actividad"
              title="Últimos movimientos"
              description="Registro reciente de operación."
            />

            <div className="mt-6 space-y-3">
              {recentActivity.map(([module, detail, time]) => (
                <div
                  key={`${module}-${detail}`}
                  className="rounded-2xl border border-white/5 bg-black/20 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-lg border border-white/5 bg-[#0d1016] p-2 text-neutral-500">
                      <Clock className="h-3.5 w-3.5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-bold text-white">{module}</h3>
                        <span className="shrink-0 font-mono text-[10px] text-neutral-600">{time}</span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-neutral-500">{detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {workSummary.map((item) => (
            <SummaryCard key={item.label} item={item} />
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.82fr_1fr]">
          <div className="rounded-[24px] border border-white/5 bg-[#080b10] p-6">
            <SectionHeader
              eyebrow="Acciones"
              title="Accesos rápidos"
              description="Atajos para operar sin pasar por todo el menú."
            />

            <div className="mt-6 grid gap-3">
              {quickActions.map((item) => (
                <QuickAction key={item.title} item={item} />
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-white/5 bg-[#080b10] p-6">
            <SectionHeader
              eyebrow="Semana"
              title="Frentes a seguir"
              description="Indicadores simples para revisar durante la jornada."
            />

            <div className="mt-6 space-y-4">
              {[
                ['Taller y servicio', '72%', 'Trabajos en curso y pendientes de cierre'],
                ['Inventario disponible', '84%', 'Stock útil frente a mínimos definidos'],
                ['Cobranza semanal', '61%', 'Cobros previstos vs registrados'],
              ].map(([label, value, detail]) => (
                <div key={label}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-white">{label}</div>
                      <div className="mt-0.5 text-xs text-neutral-500">{detail}</div>
                    </div>
                    <span className="font-mono text-xs font-bold text-neutral-300">{value}</span>
                  </div>

                  <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-cyan-300" style={{ width: value }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-white/5 bg-[#080b10] p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-2 text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
              </div>

              <div>
                <h2 className="text-base font-black text-white">Operación preparada para escalar</h2>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-neutral-500">
                  La estructura actual ya permite avanzar hacia aprobaciones, órdenes de venta, órdenes de compra y home por rol.
                </p>
              </div>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">
              <CalendarClock className="h-3.5 w-3.5" />
              Próxima fase
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}