import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useTaller() {
  const [ots, setOts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { perfil } = useAuth()
  const organizationId = perfil?.organization_id

  const fetchOts = async () => {
    if (!organizationId) {
      setOts([])
      setLoading(false)
      return
    }

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
        .eq('organization_id', organizationId)
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
    if (!organizationId) {
      throw new Error('No se pudo determinar la organización. Volvé a iniciar sesión.')
    }

    try {
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

      const { data, error: err } = await supabase
        .from('ordenes_trabajo')
        .insert([{ ...otData, organization_id: organizationId }])
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
    if (!organizationId) {
      throw new Error('No se pudo determinar la organización. Volvé a iniciar sesión.')
    }

    try {
      const { data: repuesto, error: errRep } = await supabase
        .from('ot_repuestos')
        .insert([{ ...repuestoData, orden_trabajo_id: otId }])
        .select()

      if (errRep) throw errRep

      const { data: todosRepuestos, error: errSum } = await supabase
        .from('ot_repuestos')
        .select('subtotal_usd')
        .eq('orden_trabajo_id', otId)

      if (errSum) throw errSum

      const nuevoTotalRepuestos = todosRepuestos.reduce((acc, curr) => acc + Number(curr.subtotal_usd), 0)

      const { data: otActual, error: errOT } = await supabase
        .from('ordenes_trabajo')
        .select('total_mano_obra_usd')
        .eq('id', otId)
        .eq('organization_id', organizationId)
        .single()

      if (errOT) throw errOT

      const { error: errUpdate } = await supabase
        .from('ordenes_trabajo')
        .update({
          total_repuestos_usd: nuevoTotalRepuestos,
          total_usd: nuevoTotalRepuestos + Number(otActual.total_mano_obra_usd),
        })
        .eq('id', otId)
        .eq('organization_id', organizationId)

      if (errUpdate) throw errUpdate

      await fetchOts()
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  const updateManoObra = async (otId, horas, precioHora) => {
    if (!organizationId) {
      throw new Error('No se pudo determinar la organización. Volvé a iniciar sesión.')
    }

    try {
      const { error: errUpdate } = await supabase
        .from('ordenes_trabajo')
        .update({
          horas_mano_obra: horas,
          precio_hora_usd: precioHora,
        })
        .eq('id', otId)
        .eq('organization_id', organizationId)

      if (errUpdate) throw errUpdate

      const { data: otRefreshed, error: errRef } = await supabase
        .from('ordenes_trabajo')
        .select('total_mano_obra_usd, total_repuestos_usd')
        .eq('id', otId)
        .eq('organization_id', organizationId)
        .single()

      if (errRef) throw errRef

      const { error: errTotal } = await supabase
        .from('ordenes_trabajo')
        .update({
          total_usd: Number(otRefreshed.total_mano_obra_usd) + Number(otRefreshed.total_repuestos_usd),
        })
        .eq('id', otId)
        .eq('organization_id', organizationId)

      if (errTotal) throw errTotal

      await fetchOts()
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  const cancelarOT = async (otId, maquinaId) => {
    if (!organizationId) {
      throw new Error('No se pudo determinar la organización. Volvé a iniciar sesión.')
    }

    try {
      const { error: err } = await supabase
        .from('ordenes_trabajo')
        .update({ estado: 'cancelada' })
        .eq('id', otId)
        .eq('organization_id', organizationId)

      if (err) throw err

      const { error: errMaquina } = await supabase
        .from('maquinas')
        .update({ en_taller: false })
        .eq('id', maquinaId)
        .eq('organization_id', organizationId)

      if (errMaquina) throw errMaquina

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
        p_resetear_service: Boolean(payload.mantenimiento_completo),
      })

      if (err) throw err

      if (payload.nps_score) {
        await supabase.from('ordenes_trabajo')
          .update({ nps_score: Number(payload.nps_score) })
          .eq('id', otId)
      }

      await fetchOts()
      return data
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  useEffect(() => {
    fetchOts()
  }, [organizationId])

  return {
    ots,
    loading,
    error,
    fetchOts,
    createOT,
    addRepuesto,
    updateManoObra,
    finalizarOT,
    cancelarOT,
  }
}