import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import ModuleCard from '../../components/home/ModuleCard'

// Iconos Reutilizables
const SVG = ({ d }) => (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={d} />
  </svg>
)
const SVG2 = ({ d1, d2 }) => (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={d1} />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={d2} />
  </svg>
)

export default function Home() {
  const { perfil, orgId } = useAuth()
  const [data, setData] = useState({
    otsAbiertas: 0,
    servicesProximos: 0,
    stockCritico: 0,
    leadsActivos: 0,
    alquilados: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orgId) return
    async function fetchMetrics() {
      try {
        const [
          { count: otsAbiertas },
          { count: servicesProximos },
          { count: stockCritico },
          { count: leadsActivos },
          { count: alquilados }
        ] = await Promise.all([
          supabase.from('ordenes_trabajo').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).in('estado', ['en_progreso', 'borrador']),
          supabase.from('maquinas_service').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).in('estado_service', ['urgente', 'vencido', 'proximo']),
          supabase.from('inventario').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).lt('stock_actual', 5),
          supabase.from('leads').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).in('estado', ['nuevo', 'contactado', 'en_negociacion']),
          supabase.from('maquinas').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('en_alquiler', true)
        ])

        setData({
          otsAbiertas: otsAbiertas || 0,
          servicesProximos: servicesProximos || 0,
          stockCritico: stockCritico || 0,
          leadsActivos: leadsActivos || 0,
          alquilados: alquilados || 0
        })
      } catch (e) {
        console.error("Error fetching home metrics", e)
      } finally {
        setLoading(false)
      }
    }
    fetchMetrics()
  }, [orgId])

  const rol = perfil?.rol
  const isOwner = rol === 'owner'
  const isSupervisor = rol === 'supervisor' || isOwner
  const isOperativo = rol === 'operativo'

  const MODULES = [
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
        { label: 'Pipeline USD', value: 'Próximamente', isPlaceholder: true }
      ]
    },
    {
      id: 'postventa',
      title: 'Postventa / Servicios',
      description: 'Atención al cliente y reclamos',
      colorClass: 'from-teal-500/20 to-teal-600/10 border-teal-500/30 text-teal-400',
      icon: <SVG2 d1="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" d2="" />,
      to: '/app/taller',
      show: isSupervisor,
      metrics: [
        { label: 'Services Próximos', value: data.servicesProximos, color: data.servicesProximos > 0 ? 'text-red-400' : 'text-green-400' },
        { label: 'Garantías activas', value: 'Próximamente', isPlaceholder: true }
      ]
    },
    {
      id: 'taller',
      title: 'Taller / Activos',
      description: 'Mantenimiento y estado de flota',
      colorClass: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400',
      icon: <SVG d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />,
      to: '/app/taller',
      show: true, // todos ven taller
      metrics: [
        { label: 'OTs Abiertas', value: data.otsAbiertas, color: data.otsAbiertas > 0 ? 'text-amber-400' : 'text-green-400' },
        { label: 'Risk Score Medio', value: 'Base preparada', isPlaceholder: true }
      ]
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
        { label: 'Stock crítico', value: data.stockCritico, color: data.stockCritico > 0 ? 'text-red-400' : 'text-green-400' },
        { label: 'Sugerencia de compra', value: 'Próximamente', isPlaceholder: true }
      ]
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
        { label: 'Riesgo proveedores', value: 'Próximamente', isPlaceholder: true },
        { label: 'Órdenes de Compra', value: 'Próximamente', isPlaceholder: true }
      ]
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
        { label: 'Vencimientos próximos', value: 'Próximamente', isPlaceholder: true }
      ]
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
        { label: 'Cobranzas pendientes', value: 'Próximamente', isPlaceholder: true },
        { label: 'Facturación ARCA', value: 'Base preparada', isPlaceholder: true }
      ]
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
        { label: 'Estado de Resultados', value: 'Próximamente', isPlaceholder: true },
        { label: 'Análisis IA', value: 'Base preparada', isPlaceholder: true }
      ]
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
        { label: 'Aprobaciones', value: '0' }
      ]
    }
  ]

  const visibleModules = MODULES.filter(m => m.show)

  return (
    <div className="min-h-full flex flex-col px-4 md:px-8 py-3 md:py-4 w-full max-w-7xl mx-auto overflow-hidden gap-6">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-hm-text tracking-tight">Centro de Operaciones</h1>
        <p className="text-hm-muted mt-0.5 text-xs">Vista general del estado de la PyME y accesos rápidos.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-hm-surface2 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* SECCIÓN ARRIBA: Urgencias */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl flex flex-col gap-1">
              <div className="text-[10px] font-mono text-orange-400 uppercase tracking-widest flex items-center justify-between">
                Qué hacer hoy <span className="bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded border border-orange-500/30">ACTIVO</span>
              </div>
              <div className="text-2xl font-bold text-hm-text mt-1">{data.otsAbiertas} OTs</div>
              <div className="text-xs text-hm-muted">Tareas en progreso o borrador</div>
            </div>

            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex flex-col gap-1">
              <div className="text-[10px] font-mono text-red-400 uppercase tracking-widest flex items-center justify-between">
                Riesgos <span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded border border-red-500/30">MOCK</span>
              </div>
              <div className="text-2xl font-bold text-hm-text mt-1">2 Críticos</div>
              <div className="text-xs text-hm-muted">Flota detenida por repuestos</div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex flex-col gap-1">
              <div className="text-[10px] font-mono text-blue-400 uppercase tracking-widest flex items-center justify-between">
                Aprobaciones <span className="bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30">MOCK</span>
              </div>
              <div className="text-2xl font-bold text-hm-text mt-1">5 Solicitudes</div>
              <div className="text-xs text-hm-muted">Esperando revisión gerencial</div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl flex flex-col gap-1">
              <div className="text-[10px] font-mono text-yellow-400 uppercase tracking-widest flex items-center justify-between">
                Alertas <span className="bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded border border-yellow-500/30">MOCK</span>
              </div>
              <div className="text-2xl font-bold text-hm-text mt-1">1 Financiera</div>
              <div className="text-xs text-hm-muted">Cheque rechazado / Mora</div>
            </div>
          </div>

          {/* SECCIÓN CENTRO: KPIs */}
          <div>
            <div className="text-[11px] font-mono text-hm-muted uppercase tracking-widest mb-3 flex items-center gap-2">
              <div className="h-px bg-hm-border/50 flex-1" />
              Indicadores Clave
              <div className="h-px bg-hm-border/50 flex-1" />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-hm-surface2/20 border border-hm-border/40 p-4 rounded-xl text-center">
                <div className="text-[10px] font-mono text-hm-muted uppercase mb-1">Flujo 7 días</div>
                <div className="text-xl font-bold text-green-400">ESTABLE</div>
              </div>
              <div className="bg-hm-surface2/20 border border-hm-border/40 p-4 rounded-xl text-center">
                <div className="text-[10px] font-mono text-hm-muted uppercase mb-1">Estado General</div>
                <div className="text-xl font-bold text-hm-text">OPERATIVO</div>
              </div>
              <div className="bg-hm-surface2/20 border border-hm-border/40 p-4 rounded-xl text-center">
                <div className="text-[10px] font-mono text-hm-muted uppercase mb-1">Stock Inmovilizado</div>
                <div className="text-xl font-bold text-orange-400">USD 12k</div>
              </div>
              <div className="bg-hm-surface2/20 border border-hm-border/40 p-4 rounded-xl text-center">
                <div className="text-[10px] font-mono text-hm-muted uppercase mb-1">Carga de Taller</div>
                <div className="text-xl font-bold text-hm-text">{data.otsAbiertas} OTs</div>
              </div>
            </div>
          </div>

          {/* SECCIÓN ABAJO: Accesos Rápidos */}
          <div>
            <div className="text-[11px] font-mono text-hm-muted uppercase tracking-widest mb-3 flex items-center gap-2">
              <div className="h-px bg-hm-border/50 flex-1" />
              Accesos Directos
              <div className="h-px bg-hm-border/50 flex-1" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleModules.map(mod => (
                <ModuleCard
                  key={mod.id}
                  title={mod.title}
                  description={mod.description}
                  colorClass={mod.colorClass}
                  icon={mod.icon}
                  to={mod.to}
                  metrics={mod.metrics}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
