import { Link } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  Banknote,
  Boxes,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Factory,
  Gauge,
  Layers3,
  MapPinned,
  ShieldCheck,
  Sparkles,
  Truck,
  Wrench,
} from 'lucide-react'

const kpis = [
  {
    label: 'Estado operativo',
    value: 'ONLINE',
    detail: 'Sistema activo y sincronizado',
    tone: 'text-emerald-300',
    icon: Activity,
  },
  {
    label: 'OT críticas',
    value: '3',
    detail: 'Requieren seguimiento hoy',
    tone: 'text-amber-300',
    icon: ClipboardList,
  },
  {
    label: 'Stock crítico',
    value: '4',
    detail: 'Ítems bajo mínimo',
    tone: 'text-red-300',
    icon: Boxes,
  },
  {
    label: 'Caja operativa',
    value: '$ 12.4M',
    detail: 'Flujo proyectado 7 días',
    tone: 'text-cyan-300',
    icon: Banknote,
  },
]

const commandItems = [
  {
    title: 'Cliente 360',
    description: 'Historial comercial, deuda, activos, OTs y oportunidades.',
    route: '/app/clientes',
    icon: Layers3,
    status: 'Base preparada',
  },
  {
    title: 'Activo 360',
    description: 'Máquinas, horómetros, disponibilidad y continuidad operativa.',
    route: '/app/activos',
    icon: Truck,
    status: 'Operativo',
  },
  {
    title: 'OT 360',
    description: 'Taller, técnicos, repuestos, garantías y estados de servicio.',
    route: '/app/taller',
    icon: Wrench,
    status: 'Operativo',
  },
  {
    title: 'Tesorería',
    description: 'Caja, bancos, pagos, cobranzas, mora y flujo proyectado.',
    route: '/app/tesoreria',
    icon: CircleDollarSign,
    status: 'En control',
  },
  {
    title: 'Stock Inteligente',
    description: 'Mínimos, rotación, inmovilizado y alertas de reposición.',
    route: '/app/repuestos',
    icon: Boxes,
    status: 'Alertas activas',
  },
  {
    title: 'App Campo',
    description: 'Operación offline-first, partes, fotos, GPS y firma.',
    route: '/campo',
    icon: MapPinned,
    status: 'Base preparada',
  },
]

const alerts = [
  {
    title: 'Filtro aceite bajo mínimo',
    detail: 'Stock actual: 2 u. · mínimo sugerido: 5 u.',
    tone: 'border-amber-300/30 text-amber-300',
  },
  {
    title: 'OT #2847 en proceso',
    detail: 'Cambio de filtros + aceite motor · técnico asignado.',
    tone: 'border-cyan-300/30 text-cyan-300',
  },
  {
    title: 'Activo con mantenimiento próximo',
    detail: '179 horas restantes para próximo servicio.',
    tone: 'border-emerald-300/30 text-emerald-300',
  },
]

const operations = [
  ['Activos monitoreados', '24', 'text-cyan-300'],
  ['OT abiertas hoy', '7', 'text-emerald-300'],
  ['Alertas de stock', '4', 'text-amber-300'],
  ['Riesgos críticos', '1', 'text-red-300'],
]

function StatusDot({ className = 'bg-emerald-300' }) {
  return <span className={`h-2 w-2 rounded-full ${className} shadow-[0_0_14px_currentColor]`} />
}

function SectionTitle({ eyebrow, title, description }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-cyan-300/70">
        <span className="h-px w-8 bg-cyan-300/40" />
        {eyebrow}
      </div>
      <h2 className="text-xl font-black tracking-tight text-white">{title}</h2>
      {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
    </div>
  )
}

function KpiCard({ item }) {
  const Icon = item.icon

  return (
    <div className="group rounded-2xl border border-white/5 bg-[#0d1016]/90 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-300/25 hover:bg-[#11151c]">
      <div className="mb-5 flex items-center justify-between">
        <div className="rounded-xl border border-white/5 bg-black/30 p-2 text-neutral-500 group-hover:text-cyan-300">
          <Icon className="h-4 w-4" />
        </div>
        <StatusDot className={item.tone.replace('text-', 'bg-')} />
      </div>

      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-600">
        {item.label}
      </div>
      <div className={`mt-2 font-mono text-3xl font-black ${item.tone}`}>
        {item.value}
      </div>
      <p className="mt-2 text-sm text-neutral-500">{item.detail}</p>
    </div>
  )
}

function CommandModule({ item }) {
  const Icon = item.icon

  return (
    <Link
      to={item.route}
      className="group rounded-2xl border border-white/5 bg-[#0d1016]/85 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-300/25 hover:bg-[#11151c]"
    >
      <div className="mb-5 flex items-center justify-between">
        <div className="rounded-xl border border-white/5 bg-black/30 p-2 text-cyan-300/70">
          <Icon className="h-4 w-4" />
        </div>
        <ChevronRight className="h-4 w-4 text-neutral-700 transition-transform group-hover:translate-x-1 group-hover:text-cyan-300" />
      </div>

      <h3 className="text-base font-black text-white">{item.title}</h3>
      <p className="mt-2 min-h-[44px] text-sm leading-relaxed text-neutral-500">
        {item.description}
      </p>

      <div className="mt-5 inline-flex rounded-full border border-white/5 bg-black/25 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">
        {item.status}
      </div>
    </Link>
  )
}

export default function Home() {
  return (
    <div className="relative min-h-full overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_10%,rgba(0,212,255,0.08),transparent_30%),radial-gradient(circle_at_85%_20%,rgba(0,245,160,0.045),transparent_30%)]" />

      <div className="space-y-8">
        <section className="relative overflow-hidden rounded-[28px] border border-white/5 bg-[#07090d] p-6 shadow-[0_0_90px_rgba(0,212,255,0.05)] md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.022)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.022)_1px,transparent_1px)] bg-[size:48px_48px] opacity-40" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.68)_100%)]" />

          <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div>
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-300">
                  <StatusDot />
                  Live System
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-black/25 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                  <ShieldCheck className="h-3 w-3" />
                  Centro de Operaciones
                </div>
              </div>

              <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight text-white md:text-5xl">
                Control operativo para decisiones reales.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-relaxed text-neutral-500">
                Seguimiento ejecutivo de activos, taller, stock, tesorería y continuidad operativa.
                Diseñado para detectar riesgos, priorizar trabajo y sostener la operación diaria.
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-black/25 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-500">
                  Operational Pulse
                </div>
                <Sparkles className="h-4 w-4 text-cyan-300/70" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {operations.map(([label, value, color]) => (
                  <div key={label} className="rounded-xl border border-white/5 bg-[#0d1016] p-4">
                    <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-600">
                      {label}
                    </div>
                    <div className={`mt-2 font-mono text-2xl font-black ${color}`}>
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {kpis.map((item) => (
            <KpiCard key={item.label} item={item} />
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_0.72fr]">
          <div className="rounded-[24px] border border-white/5 bg-[#080b10] p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <SectionTitle
                eyebrow="Módulos críticos"
                title="Mapa operativo"
                description="Accesos principales para ejecutar y controlar la operación."
              />
              <div className="hidden rounded-full border border-white/5 bg-black/25 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-600 md:block">
                Real / Base preparada / Demo
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {commandItems.map((item) => (
                <CommandModule key={item.title} item={item} />
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[24px] border border-white/5 bg-[#080b10] p-6">
              <SectionTitle
                eyebrow="Riesgo operativo"
                title="Alertas prioritarias"
                description="Eventos que requieren acción o seguimiento."
              />

              <div className="mt-6 space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.title}
                    className={`rounded-2xl border bg-black/20 p-4 ${alert.tone}`}
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-4 w-4" />
                      <div>
                        <h3 className="text-sm font-bold text-white">{alert.title}</h3>
                        <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                          {alert.detail}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-white/5 bg-[#080b10] p-6">
              <SectionTitle
                eyebrow="Continuidad"
                title="Estado de la operación"
                description="Resumen rápido del frente operativo."
              />

              <div className="mt-6 space-y-4">
                {[
                  ['Taller', '72%', 'bg-cyan-300'],
                  ['Stock disponible', '84%', 'bg-emerald-300'],
                  ['Cobranza semanal', '61%', 'bg-amber-300'],
                ].map(([label, value, color]) => (
                  <div key={label}>
                    <div className="mb-2 flex items-center justify-between font-mono text-xs">
                      <span className="text-neutral-500">{label}</span>
                      <span className="text-neutral-300">{value}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                      <div className={`h-full rounded-full ${color}`} style={{ width: value }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-white/5 bg-[#080b10] p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <SectionTitle
              eyebrow="Próxima fase"
              title="IA silenciosa y continuidad operativa"
              description="La plataforma debe anticipar riesgos sin saturar al usuario."
            />

            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Roadmap activo
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}