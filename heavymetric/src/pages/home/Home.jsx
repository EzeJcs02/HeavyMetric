import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import ModuleCard from '../../components/home/ModuleCard'

const SVG = ({ d }) => (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={d} />
  </svg>
)

const SVG2 = ({ d1, d2 }) => (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    {d1 && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={d1} />}
    {d2 && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={d2} />}
  </svg>
)

const emptyMetrics = {
  otsAbiertas: 0,
  servicesProximos: 0,
  stockCritico: 0,
  leadsActivos: 0,
  alquilados: 0,
  activosCriticos: 0,
  aprobacionesPendientes: 0,
}

const safeCount = (result) => {
  if (result?.error) {
    console.warn('Home metric warning:', result.error.message)
    return 0
  }

  return result?.count || 0
}

const HeavyMetricMark = () => (
  <div className="relative h-12 w-12 shrink-0 rounded-2xl border border-neutral-700/70 bg-neutral-950/80 overflow-hidden">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,245,160,0.18),transparent_35%),radial-gradient(circle_at_80%_70%,rgba(37,99,235,0.20),transparent_40%)]" />
    <div className="absolute inset-x-2 top-1/2 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent animate-pulse" />
    <div className="relative flex h-full w-full items-center justify-center">
      <div className="font-mono text-[23px] font-black tracking-tighter bg-gradient-to-br from-zinc-100 via-zinc-400 to-zinc-600 bg-clip-text text-transparent">
        ∞
      </div>
    </div>
  </div>
)

const SystemBadge = ({ label, active }) => (
  <div
    className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-mono uppercase tracking-[0.22em] ${
      active
        ? 'border-cyan-400/30 bg-cyan-400/5 text-cyan-200'
        : 'border-neutral-700/70 bg-neutral-900/50 text-neutral-400'
    }`}
  >
    <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-[#00f5a0] animate-pulse' : 'bg-neutral-500'}`} />
    {label}
  </div>
)

const SectionLabel = ({ children }) => (
  <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.28em] text-neutral-500">
    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-800 to-neutral-800/40" />
    <span>{children}</span>
    <div className="h-px flex-1 bg-gradient-to-l from-transparent via-neutral-800 to-neutral-800/40" />
  </div>
)

const CommandCard = ({ label, value, description, tone = 'neutral', delay = '0ms' }) => {
  const toneClass = {
    orange: 'group-hover:border-orange-400/50 text-orange-300',
    red: 'group-hover:border-red-400/50 text-red-300',
    blue: 'group-hover:border-blue-400/50 text-blue-300',
    cyan: 'group-hover:border-cyan-300/50 text-cyan-200',
    green: 'group-hover:border-emerald-300/50 text-emerald-200',
    neutral: 'group-hover:border-neutral-500/70 text-neutral-100',
  }[tone]

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-neutral-800/70 bg-neutral-950/45 p-4 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-neutral-900/60"
      style={{ animationDelay: delay }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-neutral-500 transition-colors group-hover:text-neutral-300">
        {label}
      </div>
      <div className={`mt-3 font-mono text-2xl font-black tracking-tight ${toneClass}`}>
        {value}
      </div>
      <div className="mt-1 text-xs text-neutral-500">{description}</div>
    </div>
  )
}

const KpiCard = ({ label, value, toneClass = 'text-neutral-100' }) => (
  <div className="relative overflow-hidden rounded-2xl border border-neutral-800/70 bg-neutral-950/35 p-4 text-center backdrop-blur-md">
    <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-neutral-600/50 to-transparent" />
    <div className="mb-2 text-[10px] font-mono uppercase tracking-[0.22em] text-neutral-500">{label}</div>
    <div className={`font-mono text-xl font-black ${toneClass}`}>{value}</div>
  </div>
)

export default function Home() {
  const { perfil, orgId } = useAuth()
  const [data, setData] = useState(emptyMetrics)
  const [loading, setLoading] = useState(true)
  const [dataMode, setDataMode] = useState('BASE_PREPARADA')

  useEffect(() => {
    let isMounted = true

    async function fetchMetrics() {
      if (!orgId) {
        if (isMounted) {
          setData(emptyMetrics)
          setDataMode('SIN_ORG')
          setLoading(false)
        }
        return
      }

      setLoading(true)

      try {
        const results = await Promise.all([
          supabase.from('ordenes_trabajo').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).in('estado', ['en_progreso', 'borrador']),
          supabase.from('maquinas_service').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).in('estado_service', ['urgente', 'vencido', 'proximo']),
          supabase.from('inventario').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).lt('stock_actual', 5),
          supabase.from('leads').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).in('estado', ['nuevo', 'contactado', 'en_negociacion']),
          supabase.from('maquinas').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('en_alquiler', true),
          supabase.from('maquinas').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).in('estado_operativo', ['Fuera de servicio', 'Esperando repuesto']),
          supabase.from('cotizaciones').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('estado', 'Enviada'),
        ])

        if (isMounted) {
          setData({
            otsAbiertas: safeCount(results[0]),
            servicesProximos: safeCount(results[1]),
            stockCritico: safeCount(results[2]),
            leadsActivos: safeCount(results[3]),
            alquilados: safeCount(results[4]),
            activosCriticos: safeCount(results[5]),
            aprobacionesPendientes: safeCount(results[6]),
          })
          setDataMode('REAL')
        }
      } catch (error) {
        console.error('Error fetching home metrics:', error)

        if (isMounted) {
          setData(emptyMetrics)
          setDataMode('BASE_PREPARADA')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchMetrics()

    return () => {
      isMounted = false
    }
  }, [orgId])

  const rol = perfil?.rol
  const isOwner = rol === 'owner'
  const isSupervisor = rol === 'supervisor' || isOwner
  const isOperativo = rol === 'operativo'

  const hasOperationalRisk = data.activosCriticos > 0 || data.servicesProximos > 0 || data.stockCritico > 0
  const estadoGeneral = data.activosCriticos > 2 ? 'CRÍTICO' : hasOperationalRisk ? 'ATENCIÓN' : 'OPERATIVO'

  const estadoGeneralClass =
    estadoGeneral === 'CRÍTICO'
      ? 'text-red-400'
      : estadoGeneral === 'ATENCIÓN'
        ? 'text-amber-300'
        : 'text-[#00f5a0]'

  const dataModeLabel = {
    REAL: 'Datos reales',
    BASE_PREPARADA: 'Base preparada',
    SIN_ORG: 'Sin organización activa',
  }[dataMode]

  const modules = [
    {
      id: 'ventas',
      title: 'Ventas / CRM',
      description: 'Gestión comercial y prospectos',
      colorClass: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30 text-yellow-400',
      icon: <SVG d="M13 10V3L4 14h7v7l9-11h-7z" />,
      to: '/app/leads',
      show: isSupervisor,
      metrics: [
        { label: 'Leads activos', value: data.leadsActivos },
        { label: 'Pipeline USD', value: 'Base preparada', isPlaceholder: true },
      ],
    },
    {
      id: 'postventa',
      title: 'Postventa / Servicios',
      description: 'Atención al cliente y reclamos',
      colorClass: 'from-teal-500/20 to-teal-600/10 border-teal-500/30 text-teal-400',
      icon: (
        <SVG2 d1="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      ),
      to: '/app/taller',
      show: isSupervisor,
      metrics: [
        {
          label: 'Services próximos',
          value: data.servicesProximos,
          color: data.servicesProximos > 0 ? 'text-red-400' : 'text-green-400',
        },
        { label: 'Garantías activas', value: 'Base preparada', isPlaceholder: true },
      ],
    },
    {
      id: 'taller',
      title: 'Taller / Activos',
      description: 'Mantenimiento y estado de flota',
      colorClass: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400',
      icon: <SVG d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />,
      to: '/app/taller',
      show: true,
      metrics: [
        {
          label: 'OTs abiertas',
          value: data.otsAbiertas,
          color: data.otsAbiertas > 0 ? 'text-amber-400' : 'text-green-400',
        },
        { label: 'Risk Score Medio', value: 'Base preparada', isPlaceholder: true },
      ],
    },
    {
      id: 'stock',
      title: 'Stock / Repuestos',
      description: 'Inventario y almacén',
      colorClass: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400',
      icon: <SVG d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />,
      to: '/app/repuestos',
      show: true,
      metrics: [
        {
          label: 'Stock crítico',
          value: data.stockCritico,
          color: data.stockCritico > 0 ? 'text-red-400' : 'text-green-400',
        },
        { label: 'Sugerencia de compra', value: 'Base preparada', isPlaceholder: true },
      ],
    },
    {
      id: 'compras',
      title: 'Proveedores / Compras',
      description: 'Abastecimiento y riesgos',
      colorClass: 'from-rose-500/20 to-rose-600/10 border-rose-500/30 text-rose-400',
      icon: <SVG d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />,
      to: '/app/proveedores',
      show: isSupervisor,
      metrics: [
        { label: 'Riesgo proveedores', value: 'Base preparada', isPlaceholder: true },
        { label: 'Órdenes de Compra', value: 'Base preparada', isPlaceholder: true },
      ],
    },
    {
      id: 'alquileres',
      title: 'Alquileres / Contratos',
      description: 'Gestión de renta de equipos',
      colorClass: 'from-violet-500/20 to-violet-600/10 border-violet-500/30 text-violet-400',
      icon: <SVG d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
      to: '/app/alquileres',
      show: isSupervisor,
      metrics: [
        { label: 'Activos alquilados', value: data.alquilados },
        { label: 'Vencimientos próximos', value: 'Base preparada', isPlaceholder: true },
      ],
    },
    {
      id: 'admin',
      title: 'Administración / Facturas',
      description: 'Finanzas, cobros y fiscal',
      colorClass: 'from-green-500/20 to-green-600/10 border-green-500/30 text-green-400',
      icon: <SVG d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
      to: '/app/facturacion',
      show: isSupervisor,
      metrics: [
        { label: 'Cobranzas pendientes', value: 'Base preparada', isPlaceholder: true },
        { label: 'Facturación ARCA', value: 'Base preparada', isPlaceholder: true },
      ],
    },
    {
      id: 'gerencia',
      title: 'CEO / BI / Gerencia',
      description: 'Inteligencia de negocio',
      colorClass: 'from-orange-500/20 to-orange-600/10 border-orange-500/30 text-orange-400',
      icon: <SVG d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
      to: '/app/ceo',
      show: isOwner,
      metrics: [
        { label: 'Estado de Resultados', value: 'Base preparada', isPlaceholder: true },
        { label: 'Análisis IA', value: 'Base preparada', isPlaceholder: true },
      ],
    },
    {
      id: 'jornada',
      title: 'Mi Jornada',
      description: 'Tareas y seguimiento diario',
      colorClass: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30 text-cyan-400',
      icon: <SVG d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
      to: '/app/mi-jornada',
      show: true,
      metrics: [
        { label: 'Mis OTs asignadas', value: isOperativo ? data.otsAbiertas : 'Ver detalle' },
        { label: 'Aprobaciones', value: data.aprobacionesPendientes },
      ],
    },
  ]

  const visibleModules = modules.filter((module) => module.show)

  return (
    <div className="relative min-h-full overflow-hidden bg-[#0b0c0e] px-4 py-4 text-neutral-100 md:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(37,99,235,0.14),transparent_28%),radial-gradient(circle_at_85%_12%,rgba(0,245,160,0.08),transparent_28%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/40 to-transparent" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="relative overflow-hidden rounded-3xl border border-neutral-800/70 bg-neutral-950/60 p-5 backdrop-blur-md md:p-6">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00f5a0]/40 to-transparent" />
          <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-blue-600/10 blur-3xl" />

          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <HeavyMetricMark />

              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <SystemBadge label="Live system" active={dataMode === 'REAL'} />
                  <SystemBadge label={dataModeLabel} active={dataMode === 'REAL'} />
                </div>

                <h1 className="bg-gradient-to-br from-zinc-100 via-zinc-300 to-zinc-500 bg-clip-text text-3xl font-black tracking-tight text-transparent md:text-4xl">
                  Centro de Operaciones
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-400">
                  Vista ejecutiva del estado operativo, financiero y comercial de la PyME.
                  Diseñado para detectar riesgo, continuidad y acción inmediata.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-2xl border border-neutral-800/70 bg-neutral-900/35 p-2 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
              <div className="rounded-xl bg-neutral-950/60 p-3">
                <div>ORG</div>
                <div className="mt-1 text-neutral-200">{orgId ? 'ONLINE' : 'SIN ORG'}</div>
              </div>
              <div className="rounded-xl bg-neutral-950/60 p-3">
                <div>ROL</div>
                <div className="mt-1 text-neutral-200">{rol || '—'}</div>
              </div>
              <div className="rounded-xl bg-neutral-950/60 p-3">
                <div>OPS</div>
                <div className={`mt-1 ${estadoGeneralClass}`}>{estadoGeneral}</div>
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-32 rounded-2xl border border-neutral-800/60 bg-neutral-900/50 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <CommandCard
                label="Qué hacer hoy"
                value={`${data.otsAbiertas} OTs`}
                description="Tareas en progreso o borrador"
                tone="orange"
              />

              <CommandCard
                label="Riesgo operativo"
                value={`${data.activosCriticos} Equipos`}
                description="Fuera de servicio o esperando repuesto"
                tone={data.activosCriticos > 0 ? 'red' : 'green'}
                delay="60ms"
              />

              <CommandCard
                label="Aprobaciones"
                value={`${data.aprobacionesPendientes} Solicitudes`}
                description="Cotizaciones enviadas sin respuesta"
                tone="blue"
                delay="120ms"
              />

              <CommandCard
                label="Continuidad operativa"
                value={hasOperationalRisk ? 'Atención' : 'Normal'}
                description="Servicios, stock y activos críticos"
                tone={hasOperationalRisk ? 'orange' : 'cyan'}
                delay="180ms"
              />
            </section>

            <section className="flex flex-col gap-4">
              <SectionLabel>Indicadores clave</SectionLabel>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <KpiCard label="Modo de datos" value={dataModeLabel} />
                <KpiCard label="Estado general" value={estadoGeneral} toneClass={estadoGeneralClass} />
                <KpiCard
                  label="Stock crítico"
                  value={`${data.stockCritico} Ítems`}
                  toneClass={data.stockCritico > 0 ? 'text-red-400' : 'text-[#00f5a0]'}
                />
                <KpiCard
                  label="Activos críticos"
                  value={`${data.activosCriticos} ${data.activosCriticos === 1 ? 'Equipo' : 'Equipos'}`}
                  toneClass={data.activosCriticos > 0 ? 'text-red-400' : 'text-[#00f5a0]'}
                />
              </div>
            </section>

            <section className="flex flex-col gap-4">
              <SectionLabel>Accesos directos</SectionLabel>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visibleModules.map((module) => (
                  <ModuleCard
                    key={module.id}
                    title={module.title}
                    description={module.description}
                    colorClass={module.colorClass}
                    icon={module.icon}
                    to={module.to}
                    metrics={module.metrics}
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}