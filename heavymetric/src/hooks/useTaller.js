import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useTaller() {
  const [ots, setOts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchOts = async () => {
    try {
      setLoading(true)
      const { data, error: err } = await supabase
        .from('ordenes_trabajo')
        .select(`
          *,
          maquina:maquinas(nombre_unidad, marca, modelo),
          cliente:clientes(razon_social),
          repuestos:ot_repuestos(*)
        `)
        .order('created_at', { ascending: false })

      if (err) throw err
      setOts(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const createOT = async (otData) => {
    try {
      // 1. Verificar Morosidad del Cliente
      const { data: deudas, error: errDeuda } = await supabase
        .from('transacciones')
        .select('id')
        .eq('cliente_id', otData.cliente_id)
        .eq('estado_pago', 'pendiente')
        .limit(1)
      
      if (errDeuda) throw errDeuda
      if (deudas && deudas.length > 0) {
        throw new Error('Bloqueo por Morosidad: El cliente tiene facturas pendientes de pago.')
      }

      // 2. Crear OT
      const { data, error: err } = await supabase
        .from('ordenes_trabajo')
        .insert([otData])
        .select()

      if (err) throw err
      await fetchOts()
      return data[0]
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  const addRepuesto = async (otId, repuestoData) => {
    try {
      // 1. Insertar repuesto en ot_repuestos
      const { data: repuesto, error: errRep } = await supabase
        .from('ot_repuestos')
        .insert([{ ...repuestoData, orden_trabajo_id: otId }])
        .select()
      
      if (errRep) throw errRep

      // 2. Obtener el nuevo total de repuestos para esa OT
      const { data: todosRepuestos, error: errSum } = await supabase
        .from('ot_repuestos')
        .select('subtotal_usd')
        .eq('orden_trabajo_id', otId)
      
      if (errSum) throw errSum

      const nuevoTotalRepuestos = todosRepuestos.reduce((acc, curr) => acc + Number(curr.subtotal_usd), 0)

      // 3. Actualizar la OT con el nuevo total de repuestos y recalcular total_usd
      // Nota: total_mano_obra_usd se calcula solo en DB. 
      // Necesitamos obtener la OT actual para saber la mano de obra
      const { data: otActual, error: errOT } = await supabase
        .from('ordenes_trabajo')
        .select('total_mano_obra_usd')
        .eq('id', otId)
        .single()
      
      if (errOT) throw errOT

      const { error: errUpdate } = await supabase
        .from('ordenes_trabajo')
        .update({ 
          total_repuestos_usd: nuevoTotalRepuestos,
          total_usd: nuevoTotalRepuestos + Number(otActual.total_mano_obra_usd)
        })
        .eq('id', otId)

      if (errUpdate) throw errUpdate
      
      await fetchOts()
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  const updateManoObra = async (otId, horas, precioHora) => {
    try {
      // Actualizamos horas y precio
      const { error: errUpdate } = await supabase
        .from('ordenes_trabajo')
        .update({ 
          horas_mano_obra: horas,
          precio_hora_usd: precioHora
        })
        .eq('id', otId)

      if (errUpdate) throw errUpdate

      // Recalculamos total_usd después de que la DB calculó total_mano_obra_usd
      const { data: otRefreshed, error: errRef } = await supabase
        .from('ordenes_trabajo')
        .select('total_mano_obra_usd, total_repuestos_usd')
        .eq('id', otId)
        .single()
      
      if (errRef) throw errRef

      await supabase
        .from('ordenes_trabajo')
        .update({ 
          total_usd: Number(otRefreshed.total_mano_obra_usd) + Number(otRefreshed.total_repuestos_usd)
        })
        .eq('id', otId)

      await fetchOts()
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  // payload: { horometro_final, horas_mano_obra, precio_hora_usd, estado, notas_internas, mantenimiento_completo }
  const finalizarOT = async (otId, payload) => {
    try {
      const { data, error: err } = await supabase.rpc('finalizar_ot', {
        p_ot_id:            otId,
        p_horometro_final:  Number(payload.horometro_final),
        p_horas_mano_obra:  Number(payload.horas_mano_obra),
        p_precio_hora_usd:  Number(payload.precio_hora_usd),
        p_estado:           payload.estado || 'completada',
        p_notas_internas:   payload.notas_internas || null,
        p_resetear_service: Boolean(payload.mantenimiento_completo)
      })

      if (err) throw err

      console.info('[HeavyMetric] OT finalizada:', data)
      await fetchOts()
      return data
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  useEffect(() => {
    fetchOts()
  }, [])

  return {
    ots,
    loading,
    error,
    fetchOts,
    createOT,
    addRepuesto,
    updateManoObra,
    finalizarOT
  }
}
