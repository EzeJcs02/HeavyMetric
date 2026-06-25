import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

async function fetchCEOData(organizationId) {
  const hoy    = new Date()
  const inicioMes  = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0]
  const inicioAnio = new Date(hoy.getFullYear(), 0, 1).toISOString().split('T')[0]
  const hace30  = new Date(hoy - 30 * 86400000).toISOString()
  const hace90  = new Date(hoy - 90 * 86400000).toISOString()

  const [
    { data: txMes,     error: e1  },
    { data: txPend,    error: e2  },
    { data: txAnual,   error: e3  },
    { data: txTopCli,  error: e4  },
    { data: otData,    error: e5  },
    { data: flotaData, error: e6  },
    { data: leadsData, error: e7  },
    { data: cotsData,  error: e8  },
    { data: alertData, error: e9  },
    { data: repData,   error: e10 },
    { data: provData,  error: e11 },
    { data: compData,  error: e12 },
  ] = await Promise.all([
    // Ingresos del mes actual
    supabase.from('transacciones').select('monto_total_usd, origen_tipo').eq('organization_id', organizationId).gte('fecha_emision', inicioMes),

    // Cobranza pendiente
    supabase.from('transacciones').select('monto_total_usd, cliente_id, clientes(razon_social)').eq('organization_id', organizationId).eq('estado_pago', 'pendiente'),

    // Ingresos anuales por mes
    supabase.from('transacciones').select('fecha_emision, monto_total_usd').eq('organization_id', organizationId).gte('fecha_emision', inicioAnio),

    // Top clientes por facturación (últimos 90 días)
    supabase.from('transacciones').select('cliente_id, monto_total_usd, clientes(razon_social)').eq('organization_id', organizationId).gte('fecha_emision', hace90),

    // OTs por estado
    supabase.from('ordenes_trabajo').select('estado, total_usd, total_repuestos_usd, total_mano_obra_usd, numero_ot, maquina:maquinas(nombre_unidad), created_at').eq('organization_id', organizationId).gte('created_at', inicioAnio),

    // Flota por estado_operativo
    supabase.from('maquinas').select('estado_operativo, activa').eq('organization_id', organizationId).eq('activa', true),

    // Leads activos + pipeline
    supabase.from('leads').select('estado, lead_grade, pipeline').eq('organization_id', organizationId).not('estado', 'in', '(Ganado,Perdido,Facturado)'),

    // Cotizaciones pendientes + monto
    supabase.from('cotizaciones').select('estado, total_usd').eq('organization_id', organizationId).in('estado', ['Borrador','Enviada']),

    // Alertas sin resolver
    supabase.from('alertas').select('tipo, prioridad').eq('organization_id', organizationId).eq('resuelta', false),

    // Repuestos en stock crítico
    supabase.from('repuestos').select('nombre, stock_actual, stock_minimo').eq('organization_id', organizationId).filter('stock_actual', 'lte', 'stock_minimo').eq('activo', true),

    // Proveedores por estado
    supabase.from('proveedores').select('estado').eq('organization_id', organizationId).eq('activo', true),

    // Compras del año
    supabase.from('compras').select('total_usd, estado, proveedor_id, proveedores(empresa)').eq('organization_id', organizationId).gte('created_at', inicioAnio),
  ])

  // Ignorar errores no críticos (tablas que pueden no existir aún)
  const criticalError = e1 || e2 || e3 || e7
  if (criticalError) throw criticalError

  // ── Comercial / Ingresos Reales del Mes ──
  const ingresosMes   = (txMes || []).reduce((s, t) => s + Number(t.monto_total_usd || 0), 0)
  
  // Desglose de ingresos reales
  const ingresosAlquileres = (txMes || []).filter(t => t.origen_tipo === 'alquiler').reduce((s, t) => s + Number(t.monto_total_usd || 0), 0)
  const ingresosServicios  = (txMes || []).filter(t => t.origen_tipo === 'ot').reduce((s, t) => s + Number(t.monto_total_usd || 0), 0)
  const ingresosVentas     = (txMes || []).filter(t => t.origen_tipo === 'cotizacion').reduce((s, t) => s + Number(t.monto_total_usd || 0), 0)
  const ingresosOtros      = (txMes || []).filter(t => !['alquiler','ot','cotizacion'].includes(t.origen_tipo)).reduce((s, t) => s + Number(t.monto_total_usd || 0), 0)

  const cobranzaPend  = (txPend || []).reduce((s, t) => s + Number(t.monto_total_usd || 0), 0)
  const pipelineVal   = (cotsData || []).reduce((s, c) => s + Number(c.total_usd || 0), 0)

  // Top clientes (últimos 90 días)
  const clienteMap = {}
  ;(txTopCli || []).forEach(t => {
    const id = t.cliente_id
    if (!id) return
    if (!clienteMap[id]) clienteMap[id] = { nombre: t.clientes?.razon_social || 'Sin nombre', total: 0 }
    clienteMap[id].total += Number(t.monto_total_usd)
  })
  const topClientes = Object.values(clienteMap).sort((a,b) => b.total - a.total).slice(0, 5)

  // Morosidad: top deudores
  const deudorMap = {}
  ;(txPend || []).forEach(t => {
    const id = t.cliente_id
    if (!id) return
    if (!deudorMap[id]) deudorMap[id] = { nombre: t.clientes?.razon_social || 'Sin nombre', total: 0 }
    deudorMap[id].total += Number(t.monto_total_usd)
  })
  const topDeudores = Object.values(deudorMap).sort((a,b) => b.total - a.total).slice(0, 5)

  // ── Operaciones ──
  const otsPorEstado = { borrador: 0, en_progreso: 0, completada: 0, facturada: 0, cancelada: 0 }
  ;(otData || []).forEach(o => { if (otsPorEstado[o.estado] !== undefined) otsPorEstado[o.estado]++ })
  const otsCompletadas = (otData || []).filter(o => ['completada','facturada'].includes(o.estado))
  
  const costoMantenimiento = otsCompletadas.reduce((s, o) => s + Number(o.total_usd || 0), 0)
  const costoRepuestosOT = otsCompletadas.reduce((s, o) => s + Number(o.total_repuestos_usd || 0), 0)
  const costoManoObraOT = otsCompletadas.reduce((s, o) => s + Number(o.total_mano_obra_usd || 0), 0)
  
  // OTs con pérdida (costo > ingreso) -- como es difícil sin saber lo facturado exacto vs costo, 
  // simularemos basado en margen bajo (o costo mayor a un umbral si lo tenemos).
  // Por ahora devolvemos las 3 OTs más costosas para la lista "OTs Sin Rentabilidad"
  const otsCriticas = [...otsCompletadas].sort((a,b) => Number(b.total_usd||0) - Number(a.total_usd||0)).slice(0, 3)

  const flotaPorEstado = {}
  ;(flotaData || []).forEach(m => {
    const e = m.estado_operativo || 'Operativo'
    flotaPorEstado[e] = (flotaPorEstado[e] || 0) + 1
  })
  const flotaTotal     = (flotaData || []).length
  const flotaOperativa = flotaPorEstado['Operativo'] || 0
  const uptime         = flotaTotal > 0 ? Math.round((flotaOperativa / flotaTotal) * 100) : 100
  const flotaDetenida  = flotaTotal - flotaOperativa

  // ── Alertas ──
  const alertasCriticas = (alertData || []).filter(a => a.prioridad === 'alta').length
  const alertasTotal    = (alertData || []).length
  const stockCritico    = (repData || []).length

  // ── Proveedores ──
  const provRiesgosos  = (provData || []).filter(p => p.estado === 'riesgoso').length
  const provPreferidos = (provData || []).filter(p => p.estado === 'preferido').length

  // Top proveedores por gasto
  const provMap = {}
  ;(compData || []).filter(c => c.estado === 'recibido').forEach(c => {
    const id = c.proveedor_id
    if (!id) return
    if (!provMap[id]) provMap[id] = { nombre: c.proveedores?.empresa || '—', total: 0 }
    provMap[id].total += Number(c.total_usd || 0)
  })
  const topProveedores = Object.values(provMap).sort((a,b) => b.total - a.total).slice(0, 5)
  const gastoProveedores = (compData || []).filter(c => c.estado === 'recibido').reduce((s, c) => s + Number(c.total_usd || 0), 0)

  // ── Gráfico ingresos anuales ──
  const ingresosPorMes = Array.from({ length: 12 }, (_, i) => ({ mes: MESES[i], total: 0 }))
  ;(txAnual || []).forEach(tx => {
    const m = new Date(tx.fecha_emision).getMonth()
    ingresosPorMes[m].total += Number(tx.monto_total_usd)
  })

  return {
    kpis: {
      ingresosMes, ingresosAlquileres, ingresosServicios, ingresosVentas, ingresosOtros,
      cobranzaPend, pipelineVal,
      otAbiertas:     otsPorEstado.en_progreso + otsPorEstado.borrador,
      costoMantenimiento, costoRepuestosOT, costoManoObraOT, otsCriticas,
      flotaTotal, flotaOperativa, flotaDetenida, uptime,
      leadsActivos:   (leadsData || []).length,
      leadsGradoA:    (leadsData || []).filter(l => l.lead_grade === 'A').length,
      alertasCriticas, alertasTotal, stockCritico,
      provRiesgosos, provPreferidos, gastoProveedores,
    },
    topClientes,
    topDeudores,
    topProveedores,
    otsPorEstado,
    flotaPorEstado,
    ingresosPorMes,
  }
}

export function useCEODashboard() {
  const { perfil } = useAuth()
  const organizationId = perfil?.organization_id ?? null

  const { data, isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: ['ceo-dashboard', organizationId],
    queryFn:  () => fetchCEOData(organizationId),
    enabled:  !!organizationId,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  })

  return {
    data: data ?? null,
    loading,
    error: queryError?.message ?? null,
    refresh: refetch,
  }
}