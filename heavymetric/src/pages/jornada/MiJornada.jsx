import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { evaluateRules, buildMetrics } from '../../lib/workflowRules'
import PriorityBadge from '../../components/workflow/PriorityBadge'
import Badge from '../../components/ui/Badge'
import Card from '../../components/ui/Card'

const SECCION_HOY     = 'hoy'
const SECCION_URGENTE = 'urgente'
const SECCION_PENDING = 'pendiente'
const SECCION_7DIAS   = 'proximos'

function JornadaItem({ item, onClick }) {
  return (
    <div
      onClick={() => onClick?.(item)}
      className="flex items-start gap-3 p-4 border-b border-hm-border/40 last:border-0 hover:bg-hm-surface2/30 transition-colors cursor-pointer group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm text-hm-text">{item.titulo}</span>
          <PriorityBadge prioridad={item.prioridad} />
        </div>
        {item.descripcion && (
          <div className="text-xs text-hm-muted mt-0.5 line-clamp-2">{item.descripcion}</div>
        )}
        {item.modulo && (
          <div className="text-[10px] font-mono text-hm-muted/60 mt-1 uppercase">{item.modulo}</div>
        )}
      </div>
      <svg className="w-4 h-4 text-hm-border group-hover:text-hm-accent transition-colors shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </div>
  )
}

function SectionBlock({ title, icon, items, onClick, emptyText = 'Todo al día' }) {
  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-hm-border bg-hm-surface2/20 flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <h2 className="text-xs font-mono font-bold tracking-widest uppercase text-hm-muted flex-1">{title}</h2>
        {items.length > 0 && (
          <span className="text-xs font-mono font-bold text-hm-accent">{items.length}</span>
        )}
      </div>
      {items.length === 0 ? (
        <div className="p-6 text-center text-sm text-hm-muted">{emptyText}</div>
      ) : (
        items.map((item, i) => <JornadaItem key={item.id || i} item={item} onClick={onClick} />)
      )}
    </Card>
  )
}

// Items mock por rol — TODO: conectar con workflow real
function buildItemsByRol(rol, metrics) {
  const reglas = evaluateRules(buildMetrics(metrics))

  const base = reglas.map(r => ({
    id: r.id,
    titulo: r.titulo,
    descripcion: r.descripcion,
    prioridad: r.prioridad,
    modulo: r.modulo,
    link: r.link,
    seccion: r.prioridad === 'critica' ? SECCION_URGENTE : SECCION_HOY,
  }))

  const EXTRAS_BY_ROL = {
    owner: [
      { id: 'own_apr', titulo: 'Aprobaciones pendientes', descripcion: 'Cotizaciones, compras y OTs esperando tu decisión.', prioridad: 'alta', modulo: 'aprobaciones', link: '/app/aprobaciones', seccion: SECCION_HOY },
      { id: 'own_ceo', titulo: 'Revisar Estado de Resultados', descripcion: 'Ver flujo mensual y márgenes.', prioridad: 'baja', modulo: 'ceo', link: '/app/ceo', seccion: SECCION_7DIAS },
    ],
    supervisor: [
      { id: 'sup_compras', titulo: 'Revisar compras pendientes', descripcion: 'Órdenes de compra sin recibir.', prioridad: 'media', modulo: 'proveedores', link: '/app/proveedores', seccion: SECCION_HOY },
      { id: 'sup_leads', titulo: 'Leads sin actividad', descripcion: 'Prospectos sin contacto en más de 7 días.', prioridad: 'media', modulo: 'clientes', link: '/app/leads', seccion: SECCION_7DIAS },
    ],
    operativo: [
      { id: 'op_ots', titulo: 'OTs asignadas hoy', descripcion: 'Revisar tus órdenes de trabajo activas.', prioridad: 'alta', modulo: 'taller', link: '/app/taller', seccion: SECCION_HOY },
      { id: 'op_chk', titulo: 'Checklists pendientes', descripcion: 'Completar checklists de mantenimiento del día.', prioridad: 'media', modulo: 'taller', link: '/app/taller', seccion: SECCION_HOY },
    ],
    vendedor: [
      { id: 'vnd_leads', titulo: 'Leads por contactar hoy', descripcion: 'Prospectos con seguimiento pendiente.', prioridad: 'alta', modulo: 'clientes', link: '/app/leads', seccion: SECCION_HOY },
      { id: 'vnd_cot', titulo: 'Cotizaciones sin seguimiento', descripcion: 'Cotizaciones enviadas sin respuesta del cliente.', prioridad: 'media', modulo: 'cotizaciones', link: '/app/cotizaciones', seccion: SECCION_HOY },
      { id: 'vnd_cob', titulo: 'Cobranzas pendientes', descripcion: 'Facturas vencidas por cliente que atendés.', prioridad: 'media', modulo: 'clientes', link: '/app/clientes', seccion: SECCION_7DIAS },
    ],
  }

  const extras = EXTRAS_BY_ROL[rol] || EXTRAS_BY_ROL.operativo
  return [...base, ...extras]
}

export default function MiJornada() {
  const { perfil, orgId } = useAuth()
  const navigate = useNavigate()
  const [metrics, setMetrics] = useState({})
  const [loading, setLoading] = useState(true)
  const [seccion, setSeccion] = useState(SECCION_HOY)

  const rol = perfil?.rol || 'operativo'
  const isOwner = rol === 'owner'
  const fecha = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })

  useEffect(() => {
    if (!orgId) return
    async function loadMetrics() {
      const [
        { count: otsAbiertas },
        { count: servicesProximos },
        { count: stockCritico },
        { count: flotaDetenida },
        { count: provRiesgosos },
      ] = await Promise.all([
        supabase.from('ordenes_trabajo').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).in('estado', ['en_progreso', 'borrador']),
        supabase.from('maquinas_service').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).in('estado_service', ['urgente', 'vencido']),
        supabase.from('inventario').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).lt('stock_actual', 5),
        supabase.from('maquinas').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).in('estado_operativo', ['Fuera de servicio', 'Esperando repuesto']),
        supabase.from('proveedores').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('estado', 'riesgoso'),
      ])
      setMetrics({
        otsAbiertas:          otsAbiertas || 0,
        servicesProximos:     servicesProximos || 0,
        stockCritico:         stockCritico || 0,
        flotaDetenida:        flotaDetenida || 0,
        aprobacionesPendientes: 3, // Mock — TODO: conectar con workflow_aprobaciones
        provRiesgosos:        provRiesgosos || 0,
      })
      setLoading(false)
    }
    loadMetrics()
  }, [orgId])

  const items = loading ? [] : buildItemsByRol(rol, metrics)
  const urgentes  = items.filter(i => i.seccion === SECCION_URGENTE)
  const hoy       = items.filter(i => i.seccion === SECCION_HOY)
  const proximos  = items.filter(i => i.seccion === SECCION_7DIAS)
  // Pendientes = aprobaciones mock
  const aprobaciones = [
    { id: 'ap_1', titulo: 'Cotización con descuento alto', descripcion: 'COT-0087 — Constructora Sur S.A.', prioridad: 'alta', modulo: 'aprobaciones', link: '/app/aprobaciones', seccion: SECCION_PENDING },
    { id: 'ap_2', titulo: 'OT #0145 superó costo estimado', descripcion: 'USD 6.500 por encima del presupuesto original.', prioridad: 'critica', modulo: 'aprobaciones', link: '/app/aprobaciones', seccion: SECCION_PENDING },
  ]

  const SECCIONES = [
    { id: SECCION_HOY,     label: 'HOY',           count: hoy.length + urgentes.length },
    { id: SECCION_URGENTE, label: 'URGENTE',        count: urgentes.length },
    { id: SECCION_PENDING, label: 'APROBACIONES',   count: aprobaciones.length },
    { id: SECCION_7DIAS,   label: 'PRÓXIMOS 7D',    count: proximos.length },
  ]

  const handleItemClick = (item) => {
    if (item.link) navigate(item.link)
  }

  if (loading) return (
    <div className="animate-pulse flex flex-col gap-4 p-4">
      <div className="h-20 bg-hm-surface2 rounded-xl" />
      <div className="grid grid-cols-4 gap-3">{[1,2,3,4].map(i => <div key={i} className="h-20 bg-hm-surface2 rounded-xl" />)}</div>
      <div className="h-48 bg-hm-surface2 rounded-xl" />
      <div className="h-48 bg-hm-surface2 rounded-xl" />
    </div>
  )

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-hm-text">
            Hola, {perfil?.nombre || perfil?.full_name?.split(' ')[0] || 'equipo'} 👋
          </h1>
          <p className="text-sm text-hm-muted mt-0.5 capitalize">{fecha}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold
            ${urgentes.length > 0 ? 'bg-red-500/15 border-red-500/40 text-red-400 animate-pulse' : 'bg-green-500/15 border-green-500/40 text-green-400'}`}>
            <span className="w-2 h-2 rounded-full bg-current" />
            {urgentes.length > 0 ? `${urgentes.length} urgente(s)` : 'Sin urgentes'}
          </span>
        </div>
      </div>

      {/* KPI rápidos */}
      <div className={`grid gap-4 ${isOwner ? 'grid-cols-2 md:grid-cols-5' : 'grid-cols-2 md:grid-cols-4'}`}>
        {[
          { label: 'OTs Abiertas', value: metrics.otsAbiertas, color: metrics.otsAbiertas > 0 ? 'text-amber-400 border-l-amber-500' : 'text-green-400 border-l-green-500' },
          { label: 'Services Críticos', value: metrics.servicesProximos, color: metrics.servicesProximos > 0 ? 'text-red-400 border-l-red-500' : 'text-green-400 border-l-green-500' },
          { label: 'Stock Crítico', value: metrics.stockCritico, color: metrics.stockCritico > 0 ? 'text-orange-400 border-l-orange-500' : 'text-green-400 border-l-green-500' },
          { label: 'Flota Detenida', value: metrics.flotaDetenida, color: metrics.flotaDetenida > 0 ? 'text-red-400 border-l-red-500' : 'text-green-400 border-l-green-500' },
          ...(isOwner ? [{ label: 'Aprobaciones', value: metrics.aprobacionesPendientes, color: 'text-blue-400 border-l-blue-500' }] : []),
        ].map(({ label, value, color }) => (
          <div key={label} className={`bg-hm-surface border border-hm-border border-l-4 ${color.split(' ')[1]} rounded-xl p-4 hover:bg-hm-surface2/30 transition-colors`}>
            <div className="text-[10px] font-mono text-hm-muted mb-1 uppercase">{label}</div>
            <div className={`text-3xl font-bold ${color.split(' ')[0]}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Tabs de sección */}
      <div className="flex gap-2 border-b border-hm-border overflow-x-auto no-scrollbar">
        {SECCIONES.map(s => (
          <button key={s.id} onClick={() => setSeccion(s.id)}
            className={`px-4 py-2 text-xs font-mono font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
              seccion === s.id ? 'border-hm-accent text-hm-accent' : 'border-transparent text-hm-muted hover:text-hm-text'
            }`}>
            {s.label}
            {s.count > 0 && (
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${seccion === s.id ? 'bg-hm-accent/20 text-hm-accent' : 'bg-hm-surface2 text-hm-muted'}`}>
                {s.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Contenido por sección */}
      <div className="flex flex-col gap-4">
        {seccion === SECCION_HOY && (
          <>
            {urgentes.length > 0 && (
              <SectionBlock title="Urgente — Atención inmediata" icon="🚨" items={urgentes} onClick={handleItemClick} emptyText="Sin urgentes" />
            )}
            <SectionBlock title="Tareas del día" icon="📋" items={hoy} onClick={handleItemClick} emptyText="Sin tareas para hoy — todo al día ✅" />
          </>
        )}
        {seccion === SECCION_URGENTE && (
          <SectionBlock title="Urgente — Requiere acción inmediata" icon="🚨" items={urgentes} onClick={handleItemClick} emptyText="Sin alertas urgentes — ¡bien hecho! ✅" />
        )}
        {seccion === SECCION_PENDING && (
          <SectionBlock title="Aprobaciones esperando tu decisión" icon="✅" items={aprobaciones} onClick={handleItemClick} emptyText="Sin aprobaciones pendientes" />
        )}
        {seccion === SECCION_7DIAS && (
          <SectionBlock title="Próximos 7 días" icon="📅" items={proximos} onClick={handleItemClick} emptyText="Sin vencimientos próximos" />
        )}
      </div>
    </div>
  )
}
