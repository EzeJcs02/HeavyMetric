import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useDashboardData() {
  const [data, setData] = useState({
    kpis: {
      ordenesActivas: 0,
      alquileresActivos: 0,
      alquileresPorVencer: 0,
      facturadoMes: 0,
      alertasService: 0,
      alertasServiceUrgentes: 0
    },
    transacciones: [],
    alertas: [],
    solicitudes: [],
    alertasService: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [
        { count: countOT,  error: errOT  },
        { data: alqData,   error: errAlq },
        { data: txData,    error: errTx  },
        { data: msData,    error: errMs  },
        { data: ultimasTx, error: errUltTx },
        { data: alertasData, error: errAlertas },
        { data: solData,   error: errSol }
      ] = await Promise.all([
        supabase.from('ordenes_trabajo').select('*', { count: 'exact', head: true }).in('estado', ['borrador', 'en_progreso']),
        supabase.from('alquileres_activos').select('estado_vencimiento'),
        supabase.from('transacciones').select('monto_total_usd').gte('fecha_emision', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]),
        supabase.from('maquinas_service').select('id, nombre_unidad, cliente_nombre, estado_service, horas_restantes_service').neq('estado_service', 'ok'),
        supabase.from('transacciones').select('id, fecha_emision, numero_comprobante, tipo_documento, origen_tipo, monto_total_usd, estado_pago').order('fecha_emision', { ascending: false }).limit(5),
        supabase.from('alertas').select('*').eq('resuelta', false).order('created_at', { ascending: false }).limit(5),
        supabase.from('solicitudes_edicion').select('id, modulo, descripcion, estado, created_at, solicitante_id, perfiles:solicitante_id(nombre_completo)').eq('estado', 'pendiente').order('created_at', { ascending: false }).limit(5)
      ])

      const firstError = errOT || errAlq || errTx || errMs || errUltTx || errAlertas || errSol
      if (firstError) throw firstError

      const facturado = (txData || []).reduce((acc, curr) => acc + Number(curr.monto_total_usd), 0)

      setData({
        kpis: {
          ordenesActivas:           countOT || 0,
          alquileresActivos:        (alqData || []).length,
          alquileresPorVencer:      (alqData || []).filter(a => a.estado_vencimiento === 'por_vencer').length,
          facturadoMes:             facturado,
          alertasService:           (msData || []).length,
          alertasServiceUrgentes:   (msData || []).filter(m => m.estado_service === 'urgente').length
        },
        transacciones:  ultimasTx  || [],
        alertas:        alertasData || [],
        alertasService: msData     || [],
        solicitudes:    solData    || []
      })
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [fetchData])

  return { data, loading, error, refresh: fetchData }
}
