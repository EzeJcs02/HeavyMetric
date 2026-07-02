import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export const DASHBOARD_ALERTS_QUERY_KEY = 'dashboard-alerts'

export async function fetchDashboardAlerts(organizationId) {
  const { data, error } = await supabase
    .from('alertas')
    .select('id, tipo, titulo, descripcion, prioridad, created_at')
    .eq('organization_id', organizationId)
    .eq('resuelta', false)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) throw error
  return data || []
}

const EMPTY = {
  kpis: {
    ordenesActivas: 0, alquileresActivos: 0, alquileresPorVencer: 0,
    facturadoMes: 0, alertasService: 0, alertasServiceUrgentes: 0,
    leadsActivos: 0, leadsGradoA: 0, cotizacionesPendientes: 0, cotizacionesMonto: 0,
    cobranzaPendiente: 0, npsPromedio: null,
  },
  transacciones: [],
  alertas: [],
  solicitudes: [],
  alertasService: [],
  ingresosMensuales: Array.from({ length: 12 }, (_, i) => ({ mes: MESES[i], total: 0 })),
  flota: [],
}

async function fetchDashboard(organizationId, queryClient) {
  const hoy = new Date()
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0]
  const inicioAnio = new Date(hoy.getFullYear(), 0, 1).toISOString().split('T')[0]

  const [
    { count: countOT, error: errOT },
    { data: alqData, error: errAlq },
    { data: msData, error: errMs },
    { data: ultimasTx, error: errUltTx },
    { data: alertasData, error: errAl },
    { data: solData, error: errSol },
    { data: txAnual, error: errAnual },
    { data: flotaData, error: errFlota },
    { data: leadsData, error: errLeads },
    { data: cotsData, error: errCots },
    { data: pendData, error: errPend },
    { data: npsData, error: errNps },
  ] = await Promise.all([
    supabase
      .from('ordenes_trabajo')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .in('estado', ['borrador', 'en_progreso']),

    supabase
      .from('alquileres_activos')
      .select('estado_vencimiento')
      .eq('organization_id', organizationId),

    supabase
      .from('maquinas_service')
      .select('id, nombre_unidad, cliente_nombre, estado_service, horas_restantes_service')
      .eq('organization_id', organizationId)
      .neq('estado_service', 'ok'),

    supabase
      .from('transacciones')
      .select('id, fecha_emision, numero_comprobante, tipo_documento, origen_tipo, monto_total_usd, estado_pago')
      .eq('organization_id', organizationId)
      .order('fecha_emision', { ascending: false })
      .limit(5),

    queryClient.fetchQuery({
      queryKey: [DASHBOARD_ALERTS_QUERY_KEY, organizationId],
      queryFn: () => fetchDashboardAlerts(organizationId),
      staleTime: 60 * 1000,
    }).then(
      (data) => ({ data, error: null }),
      (error) => ({ data: null, error }),
    ),

    supabase
      .from('solicitudes_edicion')
      .select('id, modulo, descripcion, estado, created_at, solicitante_id, perfiles:solicitante_id(nombre_completo)')
      .eq('organization_id', organizationId)
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false })
      .limit(5),

    supabase
      .from('transacciones')
      .select('fecha_emision, monto_total_usd')
      .eq('organization_id', organizationId)
      .gte('fecha_emision', inicioAnio)
      .order('fecha_emision'),

    supabase
      .from('maquinas')
      .select('id, nombre_unidad, activa')
      .eq('organization_id', organizationId)
      .eq('activa', true),

    supabase
      .from('leads')
      .select('lead_grade, estado')
      .eq('organization_id', organizationId)
      .not('estado', 'in', '(Ganado,Perdido)'),

    supabase
      .from('cotizaciones')
      .select('estado, total_usd')
      .eq('organization_id', organizationId)
      .in('estado', ['Borrador', 'Enviada']),

    supabase
      .from('transacciones')
      .select('monto_total_usd')
      .eq('organization_id', organizationId)
      .eq('estado_pago', 'pendiente'),

    supabase
      .from('ordenes_trabajo')
      .select('nps_score')
      .eq('organization_id', organizationId)
      .not('nps_score', 'is', null)
      .gte('created_at', new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1).toISOString()),
  ])

  const firstError = errOT || errAlq || errMs || errUltTx || errAl || errSol || errAnual || errFlota || errLeads || errCots || errPend || errNps
  if (firstError) throw firstError

  const facturado = (txAnual || [])
    .filter((tx) => tx.fecha_emision >= inicioMes)
    .reduce((acc, t) => acc + Number(t.monto_total_usd), 0)

  const ingresosPorMes = Array.from({ length: 12 }, (_, i) => ({ mes: MESES[i], total: 0 }))
  ;(txAnual || []).forEach((tx) => {
    const m = new Date(tx.fecha_emision).getMonth()
    ingresosPorMes[m].total += Number(tx.monto_total_usd)
  })

  return {
    kpis: {
      ordenesActivas: countOT || 0,
      alquileresActivos: (alqData || []).length,
      alquileresPorVencer: (alqData || []).filter((a) => a.estado_vencimiento === 'por_vencer').length,
      facturadoMes: facturado,
      alertasService: (msData || []).length,
      alertasServiceUrgentes: (msData || []).filter((m) => m.estado_service === 'urgente').length,
      leadsActivos: (leadsData || []).length,
      leadsGradoA: (leadsData || []).filter((l) => l.lead_grade === 'A').length,
      cotizacionesPendientes: (cotsData || []).length,
      cotizacionesMonto: (cotsData || []).reduce((s, c) => s + Number(c.total_usd), 0),
      cobranzaPendiente: (pendData || []).reduce((s, t) => s + Number(t.monto_total_usd), 0),
      npsPromedio: (npsData || []).length > 0
        ? Math.round((npsData.reduce((s, o) => s + o.nps_score, 0) / npsData.length) * 10) / 10
        : null,
    },
    transacciones: ultimasTx || [],
    alertas: (alertasData || []).slice(0, 5),
    alertasService: msData || [],
    solicitudes: solData || [],
    ingresosMensuales: ingresosPorMes,
    flota: flotaData || [],
  }
}

export function useDashboardData() {
  const { perfil } = useAuth()
  const organizationId = perfil?.organization_id
  const queryClient = useQueryClient()

  const { data: alertas = [] } = useQuery({
    queryKey: [DASHBOARD_ALERTS_QUERY_KEY, organizationId],
    queryFn: () => fetchDashboardAlerts(organizationId),
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000,
  })

  const { data = EMPTY, isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: ['dashboard', organizationId],
    queryFn: () => fetchDashboard(organizationId, queryClient),
    enabled: !!organizationId,
    staleTime: 60 * 1000,
    refetchInterval: () => document.visibilityState === 'visible' ? 5 * 60 * 1000 : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  })

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: [DASHBOARD_ALERTS_QUERY_KEY, organizationId] })
    return refetch()
  }

  return {
    data: { ...data, alertas: alertas.slice(0, 5) },
    loading,
    error: queryError?.message ?? null,
    refresh,
  }
}
