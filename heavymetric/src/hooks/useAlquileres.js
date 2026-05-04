import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useAlquileres() {
  const [contratos, setContratos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchContratos = async () => {
    try {
      setLoading(true)
      const { data, error: err } = await supabase
        .from('alquileres_activos')
        .select('*')
        .order('fecha_inicio', { ascending: false })

      if (err) throw err
      setContratos(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const createContrato = async (contratoData) => {
    try {
      // 0. Validación de Fechas
      const hoy = new Date().toISOString().split('T')[0]
      if (contratoData.fecha_inicio < hoy) {
        throw new Error('La fecha de inicio no puede ser anterior a la fecha actual.')
      }

      // 0b. Verificar Morosidad del Cliente
      const { data: deudas, error: errDeuda } = await supabase
        .from('transacciones')
        .select('id')
        .eq('cliente_id', contratoData.cliente_id)
        .eq('estado_pago', 'pendiente')
        .limit(1)
      
      if (errDeuda) throw errDeuda
      if (deudas && deudas.length > 0) {
        throw new Error('Bloqueo por Morosidad: El cliente tiene facturas pendientes de pago.')
      }

      // 1. Verificar disponibilidad de la máquina
      const { data: maquina, error: errMaq } = await supabase
        .from('maquinas')
        .select('en_alquiler, en_taller, activa')
        .eq('id', contratoData.maquina_id)
        .single()
      
      if (errMaq) throw errMaq
      if (!maquina.activa) throw new Error('La máquina no está activa.')
      if (maquina.en_alquiler) throw new Error('La máquina ya se encuentra alquilada.')
      if (maquina.en_taller) throw new Error('La máquina está en taller.')

      // 1b. Verificar si tiene OTs activas (no completadas ni canceladas)
      const { data: ots, error: errOT } = await supabase
        .from('ordenes_trabajo')
        .select('id')
        .eq('maquina_id', contratoData.maquina_id)
        .not('estado', 'in', '("completada","cancelada","facturada")')
      
      if (errOT) throw errOT
      if (ots && ots.length > 0) throw new Error('La máquina tiene una Orden de Trabajo activa.')

      // 2. Crear contrato
      const { data, error: err } = await supabase
        .from('contratos_alquiler')
        .insert([{ ...contratoData, estado: 'activo' }])
        .select()

      if (err) throw err

      // 3. Marcar máquina como alquilada
      await supabase
        .from('maquinas')
        .update({ en_alquiler: true })
        .eq('id', contratoData.maquina_id)

      await fetchContratos()
      return data[0]
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  const calcularTotalSugerido = (fechaInicio, fechaFin, tarifaDiaria) => {
    if (!fechaInicio || !fechaFin) return 0
    const inicio = new Date(fechaInicio)
    const fin = new Date(fechaFin)
    const dias = Math.max(1, Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24)))
    return dias * tarifaDiaria
  }

  const finalizarContrato = async (contratoId) => {
    try {
      const { data, error: err } = await supabase
        .rpc('finalizar_contrato', { p_contrato_id: contratoId })

      if (err) throw err

      // La RPC retorna un JSON con el resumen de la operación
      console.info('[HeavyMetric] Contrato finalizado:', data)

      await fetchContratos()
      return data
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  useEffect(() => {
    fetchContratos()
  }, [])

  return {
    contratos,
    loading,
    error,
    fetchContratos,
    createContrato,
    calcularTotalSugerido,
    finalizarContrato
  }
}
