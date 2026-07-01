import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { DASHBOARD_ALERTS_QUERY_KEY, fetchDashboardAlerts } from '../../hooks/useDashboardData'

const TIPO_COLOR = {
  service_urgente:            'red',
  service_proximo:            'red',
  stock_minimo:               'yellow',
  alquiler_vencimiento:       'orange',
  lead_sin_contacto:          'orange',
  cotizacion_sin_seguimiento: 'yellow',
  cotizacion_critica:         'red',
  seguimiento_vencido:        'orange',
  oportunidad_sin_movimiento: 'yellow',
  activo_detenido:            'orange',
  ot_demorada:                'yellow',
  flujo_negativo:             'red',
  mora_cliente:               'red',
  proveedor_riesgoso:         'orange',
}

const COLOR_STYLES = {
  red:    { bg: 'bg-red-500/10 border-red-500/30',       dot: 'bg-red-500',    text: 'text-red-300',    label: 'text-red-400' },
  yellow: { bg: 'bg-yellow-500/10 border-yellow-500/30', dot: 'bg-yellow-500', text: 'text-yellow-300', label: 'text-yellow-400' },
  orange: { bg: 'bg-orange-500/10 border-orange-500/30', dot: 'bg-orange-500', text: 'text-orange-300', label: 'text-orange-400' },
}

async function fetchDynamicAlerts(organizationId) {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const [repResult, maqResult, otResult, clientesResult, proveedoresResult] = await Promise.all([
    supabase
      .from('repuestos')
      .select('id, nombre, stock_actual, stock_minimo')
      .eq('organization_id', organizationId)
      .eq('activo', true),

    supabase
      .from('maquinas')
      .select('id, nombre_unidad, estado_operativo')
      .eq('organization_id', organizationId)
      .in('estado_operativo', ['Fuera de servicio', 'Esperando repuesto'])
      .eq('activa', true),

    supabase
      .from('ordenes_trabajo')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .in('estado', ['borrador', 'en_progreso'])
      .lt('fecha_ingreso', sevenDaysAgo.toISOString().split('T')[0]),

    supabase
      .from('clientes')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('estado_financiero', 'moroso')
      .eq('activo', true),

    supabase
      .from('proveedores')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('estado', 'riesgoso')
      .eq('activo', true),
  ])

  const failedQueries = [repResult, maqResult, otResult, clientesResult, proveedoresResult]
    .map((result) => result.error)
    .filter(Boolean)
  if (failedQueries.length > 0) {
    console.warn('AlertasBanner: algunas consultas no pudieron completarse', failedQueries)
  }

  const repBajos = (repResult.data || []).filter(
    (repuesto) => Number(repuesto.stock_actual) <= Number(repuesto.stock_minimo),
  )
  const dinamicas = []

  repBajos.forEach(r => dinamicas.push({
    id: `dyn_rep_${r.id}`,
    tipo: 'stock_minimo',
    titulo: `Reponer urgente: "${r.nombre}"`,
    prioridad: 'media',
  }))

  ;(maqResult.data || []).forEach(m => dinamicas.push({
    id: `dyn_maq_${m.id}`,
    tipo: 'activo_detenido',
    titulo: `"${m.nombre_unidad}" — ${m.estado_operativo.toLowerCase()}`,
    prioridad: 'alta',
  }))

  if ((otResult.count || 0) > 0) {
    dinamicas.push({
      id: 'dyn_ots_demoradas',
      tipo: 'ot_demorada',
      titulo: `${otResult.count} OT(s) sin movimiento hace más de 7 días`,
      prioridad: 'media',
    })
  }

  if ((clientesResult.count || 0) > 0) {
    dinamicas.push({
      id: 'dyn_mora_clientes',
      tipo: 'mora_cliente',
      titulo: `${clientesResult.count} cliente(s) con mora — gestionar cobranza`,
      prioridad: 'alta',
    })
  }

  if ((proveedoresResult.count || 0) > 0) {
    dinamicas.push({
      id: 'dyn_prov_riesgosos',
      tipo: 'proveedor_riesgoso',
      titulo: `${proveedoresResult.count} proveedor(es) con riesgo alto`,
      prioridad: 'media',
    })
  }

  return dinamicas
}

export default function AlertasBanner() {
  const [idx, setIdx]             = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const { perfil }                = useAuth()
  const organizationId            = perfil?.organization_id ?? null

  const { data: dbAlertas = [], error: alertsError } = useQuery({
    queryKey: [DASHBOARD_ALERTS_QUERY_KEY, organizationId],
    queryFn: () => fetchDashboardAlerts(organizationId),
    enabled: !!organizationId,
    staleTime: 60 * 1000,
    refetchInterval: () => document.visibilityState === 'visible' ? 5 * 60 * 1000 : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  })

  const { data: dinamicas = [] } = useQuery({
    queryKey: ['dashboard-dynamic-alerts', organizationId],
    queryFn: () => fetchDynamicAlerts(organizationId),
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000,
    refetchInterval: () => document.visibilityState === 'visible' ? 5 * 60 * 1000 : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  })

  const alertas = useMemo(() => {
    const ORDER = { critica: 0, alta: 1, media: 2, baja: 3 }
    return [...dbAlertas.slice(0, 10), ...dinamicas]
      .sort((a, b) => (ORDER[a.prioridad] ?? 9) - (ORDER[b.prioridad] ?? 9))
  }, [dbAlertas, dinamicas])

  const alertIds = alertas.map((alerta) => alerta.id).join('|')
  useEffect(() => {
    if (alertsError) console.warn('AlertasBanner: no se pudieron cargar las alertas persistidas', alertsError)
  }, [alertsError])

  useEffect(() => {
    setIdx(0)
    setDismissed(false)
  }, [organizationId, alertIds])

  if (!alertas.length || dismissed) return null

  const safeIdx = Math.min(idx, alertas.length - 1)
  const alerta = alertas[safeIdx]
  const color  = TIPO_COLOR[alerta.tipo] || 'yellow'
  const styles = COLOR_STYLES[color]
  const total  = alertas.length

  return (
    <div className={`border-b px-4 md:px-6 py-2 flex items-center justify-between gap-4 shrink-0 ${styles.bg}`}>
      <div className="flex items-center gap-2 min-w-0">
        <div className={`w-2 h-2 rounded-full animate-pulse shrink-0 ${styles.dot}`} />
        <span className={`text-xs font-mono font-bold shrink-0 ${styles.label}`}>
          {total > 1 ? `${safeIdx + 1}/${total} ALERTAS —` : 'ALERTA —'}
        </span>
        <span className={`text-xs truncate ${styles.text}`}>{alerta.titulo}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {total > 1 && (
          <button
            onClick={() => setIdx(i => (i + 1) % total)}
            className={`text-xs font-mono px-2 py-0.5 rounded border transition-colors ${styles.label} border-current/30 hover:bg-white/5`}
          >
            ›
          </button>
        )}
        <button
          onClick={() => setDismissed(true)}
          className={`transition-colors hover:opacity-60 ${styles.label}`}
          aria-label="Descartar"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
