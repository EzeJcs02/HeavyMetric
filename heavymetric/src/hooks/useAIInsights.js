import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  detectFallasRepetidas,
  suggestStock,
  evaluateClientRisk,
  evaluateProviderRisk,
  detectActivoCritico,
  detectOTNoRentable,
  predictDowntime,
  detectAnomalias,
} from '../lib/aiEngines'

async function fetchAIData(organizationId) {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const [
    { data: ots, error: errOts },
    { data: repuestos, error: errRepuestos },
    { data: clientes, error: errClientes },
    { data: proveedores, error: errProveedores },
    { data: maquinas, error: errMaquinas },
    { data: transacciones, error: errTransacciones },
  ] = await Promise.all([
    supabase
      .from('ordenes_trabajo')
      .select('id, activo_id, estado, prioridad, fecha_ingreso, created_at, costo_materiales, costo_hh, total_facturado, presupuesto, total_repuestos_usd, total_mano_obra_usd')
      .eq('organization_id', organizationId)
      .not('estado', 'in', '(cancelada,finalizada)')
      .order('fecha_ingreso', { ascending: false })
      .limit(300),

    supabase
      .from('repuestos')
      .select('id, nombre, sku, stock_actual, stock_minimo, costo_usd')
      .eq('organization_id', organizationId)
      .eq('activo', true),

    supabase
      .from('clientes')
      .select('id, razon_social, nombre_comercial, estado_financiero, deuda_total, ultima_actividad')
      .eq('organization_id', organizationId)
      .eq('activo', true),

    supabase
      .from('proveedores')
      .select('id, empresa, estado, rating, tiempo_entrega_dias, incidencias, entregas_a_tiempo, entregas_tarde')
      .eq('organization_id', organizationId)
      .eq('activo', true),

    supabase
      .from('maquinas')
      .select('id, nombre_unidad, estado_operativo, horas_uso, prox_mantenimiento, km_actual, valor_adquisicion, costo_mantenimiento_acumulado, downtime_acumulado')
      .eq('organization_id', organizationId)
      .eq('activa', true),

    supabase
      .from('transacciones')
      .select('id, monto_total_usd, aprobada_gerencia, fecha_emision, estado_pago')
      .eq('organization_id', organizationId)
      .gte('fecha_emision', sevenDaysAgo.toISOString().split('T')[0])
      .gt('monto_total_usd', 3000000),
  ])

  const firstError =
    errOts ||
    errRepuestos ||
    errClientes ||
    errProveedores ||
    errMaquinas ||
    errTransacciones

  if (firstError) throw firstError

  return {
    ots: ots || [],
    repuestos: repuestos || [],
    clientes: clientes || [],
    proveedores: proveedores || [],
    maquinas: maquinas || [],
    transacciones: transacciones || [],
  }
}

function computeInsights({ ots, repuestos, clientes, proveedores, maquinas, transacciones }) {
  const byModule = {
    stock: [],
    clientes: [],
    proveedores: [],
    taller: [],
    activos: [],
    tesoreria: [],
  }

  repuestos.forEach((r) => {
    const s = suggestStock(r)
    if (s) byModule.stock.push({ ...s, id: r.id, nombre: r.nombre })
  })

  clientes.forEach((c) => {
    const r = evaluateClientRisk(c)
    if (r) byModule.clientes.push({ ...r, id: c.id, nombre: c.razon_social || c.nombre_comercial })
  })

  proveedores.forEach((p) => {
    const r = evaluateProviderRisk(p)
    if (r) byModule.proveedores.push({ ...r, id: p.id, nombre: p.empresa })
  })

  const activoIds = [...new Set(ots.map((o) => o.activo_id).filter(Boolean))]
  activoIds.forEach((activoId) => {
    const falla = detectFallasRepetidas(ots, activoId)
    if (falla) byModule.taller.push({ ...falla, activoId, subtype: 'fallas_repetidas' })
  })

  ots.forEach((ot) => {
    const nr = detectOTNoRentable(ot)
    if (nr) byModule.taller.push({ ...nr, otId: ot.id, subtype: 'no_rentable' })
  })

  const cutoff7d = new Date(Date.now() - 7 * 86400000)
  const otsDemoradas = ots.filter((ot) => {
    const fecha = new Date(ot.fecha_ingreso || ot.created_at)
    return fecha < cutoff7d && ['borrador', 'en_progreso'].includes(ot.estado)
  })

  if (otsDemoradas.length > 0) {
    byModule.taller.push({
      type: 'warning',
      message: `${otsDemoradas.length} OT(s) sin movimiento en más de 7 días`,
      subtype: 'demoradas',
      count: otsDemoradas.length,
      ids: otsDemoradas.map((o) => o.id),
    })
  }

  maquinas.forEach((m) => {
    const critico = detectActivoCritico(m, ots)
    if (critico) byModule.activos.push({ ...critico, id: m.id, nombre: m.nombre_unidad, subtype: 'critico' })

    const downtime = predictDowntime(m)
    if (downtime) byModule.activos.push({ ...downtime, id: m.id, nombre: m.nombre_unidad, subtype: 'downtime' })
  })

  transacciones.forEach((tx) => {
    const anomalia = detectAnomalias(tx)
    if (anomalia) byModule.tesoreria.push({ ...anomalia, id: tx.id, subtype: 'anomalia' })
  })

  return byModule
}

const EMPTY = {
  stock: [],
  clientes: [],
  proveedores: [],
  taller: [],
  activos: [],
  tesoreria: [],
}

export function useAIInsights() {
  const { perfil } = useAuth()
  const organizationId = perfil?.organization_id

  const { data, isLoading } = useQuery({
    queryKey: ['ai_insights', organizationId],
    queryFn: () => fetchAIData(organizationId),
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    select: computeInsights,
  })

  const ins = data || EMPTY

  return {
    insights: ins,
    loading: isLoading,

    prioridadOT: (ot, cliente) => {
      let score = 0
      if (ot.prioridad === 'emergencia') score += 70
      else if (ot.prioridad === 'alta') score += 50

      if (cliente?.propension_compra === 'A') score += 30

      const dias = (Date.now() - new Date(ot.fecha_ingreso || ot.created_at)) / 86400000
      score += Math.min(dias * 2, 30)

      if (detectOTNoRentable(ot)) score += 20

      return Math.round(score)
    },

    clienteRisk: (id) => ins.clientes.find((i) => i.id === id) ?? null,
    proveedorRisk: (id) => ins.proveedores.find((i) => i.id === id) ?? null,
    stockAlert: (id) => ins.stock.find((i) => i.id === id) ?? null,
    activoAlerts: (id) => ins.activos.filter((i) => i.id === id),
    otAlert: (id) => ins.taller.find((i) => i.otId === id) ?? null,
    otsDemoradas: () => ins.taller.find((i) => i.subtype === 'demoradas') ?? null,

    counts: {
      stock: ins.stock.length,
      clientes: ins.clientes.length,
      proveedores: ins.proveedores.length,
      activos: ins.activos.filter((i) => i.subtype === 'critico').length,
      tesoreria: ins.tesoreria.length,
      otsDemoradas: ins.taller.find((i) => i.subtype === 'demoradas')?.count ?? 0,
      noRentables: ins.taller.filter((i) => i.subtype === 'no_rentable').length,
    },
  }
}