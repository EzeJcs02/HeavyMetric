import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Calcula estado de service en base a horómetro (sin depender de la vista maquinas_service)
export function calcServiceState(m) {
  if (!m.frecuencia_service || !m.horometro_actual) return null
  const proximo = (m.ultimo_service_horas || 0) + (m.frecuencia_service || 250)
  const restantes = proximo - m.horometro_actual
  const pct = ((m.horometro_actual - (m.ultimo_service_horas || 0)) / m.frecuencia_service) * 100
  if (pct >= 100) return { estado: 'vencido',  restantes, pct: Math.min(pct, 120), color: 'red' }
  if (pct >= 90)  return { estado: 'urgente',  restantes, pct, color: 'red' }
  if (pct >= 80)  return { estado: 'proximo',  restantes, pct, color: 'yellow' }
  return { estado: 'ok', restantes, pct, color: 'green' }
}

// Predice días hasta próximo service usando historial de horómetros
export function predecirService(m, historial) {
  const service = calcServiceState(m)
  if (!service || service.estado === 'vencido') return null
  if (!historial || historial.length < 2) return null

  // Calcular ritmo de uso: horas por día promedio (últimas 2 lecturas)
  const sorted = [...historial].sort((a, b) => new Date(b.fecha_lectura) - new Date(a.fecha_lectura))
  const ultima  = sorted[0]
  const penultima = sorted[1]
  const dias = Math.max(1, Math.round((new Date(ultima.fecha_lectura) - new Date(penultima.fecha_lectura)) / 86400000))
  const deltaHoras = ultima.lectura_horas - penultima.lectura_horas
  if (deltaHoras <= 0) return null

  const horasPorDia = deltaHoras / dias
  const diasRestantes = Math.round(service.restantes / horasPorDia)

  return {
    diasRestantes,
    horasPorDia: Math.round(horasPorDia * 10) / 10,
    label: diasRestantes <= 0 ? 'Vencido' : diasRestantes === 1 ? 'mañana' : `en ${diasRestantes}d`,
    alerta: diasRestantes <= 7,
  }
}

export function useCliente360(clienteId, isOpen) {
  const [data, setData] = useState({
    flota:         [],
    leads:         [],
    cotizaciones:  [],
    ots:           [],
    transacciones: [],
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (!clienteId || !isOpen) return
    let cancelled = false

    const fetchAll = async () => {
      setLoading(true)
      setError(null)
      try {
        const [
          { data: flota,         error: e1 },
          { data: leads,         error: e2 },
          { data: cotizaciones,  error: e3 },
          { data: ots,           error: e4 },
          { data: transacciones, error: e5 },
        ] = await Promise.all([
          supabase
            .from('maquinas')
            .select('id, nombre_unidad, marca, modelo, tipo, estado_operativo, horometro_actual, ultimo_service_horas, frecuencia_service, comunicacion_service, en_taller, en_alquiler, patente, anio')
            .eq('cliente_id', clienteId)
            .eq('activa', true)
            .order('nombre_unidad'),

          supabase
            .from('leads')
            .select('id, nombre, empresa, estado, lead_grade, lead_score, pipeline, ultimo_contacto, created_at')
            .eq('cliente_id', clienteId)
            .order('created_at', { ascending: false })
            .limit(20),

          supabase
            .from('cotizaciones')
            .select('id, numero_cotizacion, estado, total_usd, created_at, updated_at')
            .eq('cliente_id', clienteId)
            .order('created_at', { ascending: false })
            .limit(30),

          supabase
            .from('ordenes_trabajo')
            .select('id, numero_ot, estado, fecha_ingreso, total_usd, total_repuestos_usd, total_mano_obra_usd, maquina:maquinas(nombre_unidad)')
            .eq('cliente_id', clienteId)
            .order('fecha_ingreso', { ascending: false })
            .limit(30),

          supabase
            .from('transacciones')
            .select('id, numero_comprobante, tipo_documento, fecha_emision, monto_total_usd, estado_pago')
            .eq('cliente_id', clienteId)
            .order('fecha_emision', { ascending: false })
            .limit(30),
        ])

        const firstError = e1 || e2 || e3 || e4 || e5
        if (firstError) throw firstError
        if (cancelled) return

        setData({
          flota:         flota         || [],
          leads:         leads         || [],
          cotizaciones:  cotizaciones  || [],
          ots:           ots           || [],
          transacciones: transacciones || [],
        })
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchAll()
    return () => { cancelled = true }
  }, [clienteId, isOpen])

  // KPIs derivados
  const kpis = {
    flotaCount:       data.flota.length,
    flotaDetenidos:   data.flota.filter(m => ['En taller','Fuera de servicio','Esperando repuesto'].includes(m.estado_operativo)).length,
    leadsActivos:     data.leads.filter(l => !['Ganado','Perdido','Facturado'].includes(l.estado)).length,
    cotsPendientes:   data.cotizaciones.filter(c => ['Borrador','Enviada'].includes(c.estado)).length,
    cotsMontoTotal:   data.cotizaciones.filter(c => ['Borrador','Enviada'].includes(c.estado)).reduce((s, c) => s + Number(c.total_usd || 0), 0),
    otsAbiertas:      data.ots.filter(o => ['borrador','en_progreso'].includes(o.estado)).length,
    deudaPendiente:   data.transacciones.filter(t => t.estado_pago === 'pendiente').reduce((s, t) => s + Number(t.monto_total_usd || 0), 0),
    facturadoTotal:   data.transacciones.reduce((s, t) => s + Number(t.monto_total_usd || 0), 0),
  }

  return { ...data, kpis, loading, error }
}
