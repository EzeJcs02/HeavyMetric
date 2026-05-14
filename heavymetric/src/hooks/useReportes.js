import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useReportes(desde = null, hasta = null) {
  const [rentabilidad, setRentabilidad] = useState([])
  const [utilizacion, setUtilizacion] = useState([])
  const [servicePendiente, setServicePendiente] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchReportes = async () => {
    try {
      setLoading(true)
      setError(null)

      let txQuery = supabase
        .from('transacciones')
        .select('monto_total_usd, estado_pago, cliente:clientes(id, razon_social)')
        .neq('estado_pago', 'anulado')
      if (desde) txQuery = txQuery.gte('fecha_emision', desde)
      if (hasta) txQuery = txQuery.lte('fecha_emision', hasta)

      let ctrQuery = supabase
        .from('contratos_alquiler')
        .select('maquina_id, tarifa_diaria_usd, fecha_inicio, fecha_fin, estado')
        .in('estado', ['finalizado', 'activo'])
      if (desde) ctrQuery = ctrQuery.gte('fecha_inicio', desde)
      if (hasta) ctrQuery = ctrQuery.lte('fecha_fin', hasta)

      const [txRes, maqRes, contratosRes] = await Promise.all([
        txQuery,
        supabase
          .from('maquinas_service')
          .select('id, nombre_unidad, marca, modelo, horometro_actual, horas_restantes_service, estado_service, en_alquiler, en_taller')
          .eq('activa', true),
        ctrQuery,
      ])

      if (txRes.error) throw txRes.error
      if (maqRes.error) throw maqRes.error
      if (contratosRes.error) throw contratosRes.error

      const porCliente = {}
      for (const tx of txRes.data || []) {
        const id = tx.cliente?.id
        if (!id) continue
        if (!porCliente[id]) {
          porCliente[id] = { id, razon_social: tx.cliente.razon_social, total_facturado: 0, total_cobrado: 0, total_pendiente: 0 }
        }
        const monto = Number(tx.monto_total_usd)
        porCliente[id].total_facturado += monto
        if (tx.estado_pago === 'cobrado') porCliente[id].total_cobrado += monto
        else if (tx.estado_pago === 'pendiente') porCliente[id].total_pendiente += monto
      }
      setRentabilidad(Object.values(porCliente).sort((a, b) => b.total_facturado - a.total_facturado))

      const diasPorMaquina = {}
      for (const c of contratosRes.data || []) {
        const inicio = new Date(c.fecha_inicio)
        const fin = new Date(c.fecha_fin)
        const dias = Math.max(0, Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24)))
        if (!diasPorMaquina[c.maquina_id]) diasPorMaquina[c.maquina_id] = 0
        diasPorMaquina[c.maquina_id] += dias
      }
      setUtilizacion((maqRes.data || []).map(m => ({ ...m, dias_alquilados: diasPorMaquina[m.id] || 0 })).sort((a, b) => b.dias_alquilados - a.dias_alquilados))

      setServicePendiente((maqRes.data || []).filter(m => ['urgente','vencido','proximo'].includes(m.estado_service)).sort((a, b) => a.horas_restantes_service - b.horas_restantes_service))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchReportes() }, [desde, hasta])

  return { rentabilidad, utilizacion, servicePendiente, loading, error, fetchReportes }
}
