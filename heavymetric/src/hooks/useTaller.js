import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// ────────────────────────────────────────────────────────────────
// HeavyMetric - Taller
// Seguridad multitenancy + trazabilidad operativa ISO
// Regla: ninguna OT, máquina, deuda o repuesto sin organization_id.
// ────────────────────────────────────────────────────────────────

function getOrganizationId(auth) {
  return (
    auth?.profile?.organization_id ||
    auth?.perfil?.organization_id ||
    auth?.user?.user_metadata?.organization_id ||
    auth?.organizationId ||
    null
  )
}

async function assertOTInOrganization(otId, organizationId) {
  const { data, error } = await supabase
    .from('ordenes_trabajo')
    .select('id, maquina_id, cliente_id, organization_id')
    .eq('id', otId)
    .eq('organization_id', organizationId)
    .single()

  if (error) throw error
  return data
}

export function useTaller() {
  const auth = useAuth()
  const organizationId = getOrganizationId(auth)

  const [ots, setOts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchOts = useCallback(async () => {
    if (!organizationId) {
      setOts([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

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
      setError(err.message || 'Error al cargar órdenes de trabajo')
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  const createOT = async (otData) => {
    if (!organizationId) {
      throw new Error('No se pudo determinar la organización. Volvé a iniciar sesión.')
    }

    try {
      const { id: _ignoredId, organization_id: _ignoredOrg, ...safeOtData } = otData

      const { data: cliente, error: errCliente } = await supabase
        .from('clientes')
        .select('id, organization_id')
        .eq('id', safeOtData.cliente_id)
        .eq('organization_id', organizationId)
        .single()

      if (errCliente) throw errCliente
      if (!cliente) throw new Error('Cliente no encontrado para la organización actual.')

      if (safeOtData.maquina_id) {
        const { data: maquina, error: errMaquina } = await supabase
          .from('maquinas')
          .select('id, organization_id, en_taller, en_alquiler, activa')
          .eq('id', safeOtData.maquina_id)
          .eq('organization_id', organizationId)
          .single()

        if (errMaquina) throw errMaquina
        if (!maquina?.activa) throw new Error('La máquina no está activa.')
      }

      const { data: deudas, error: errDeuda } = await supabase
        .from('transacciones')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('cliente_id', safeOtData.cliente_id)
        .eq('estado_pago', 'pendiente')
        .limit(1)

      if (errDeuda) throw errDeuda
      if (deudas && deudas.length > 0) {
        throw new Error('Bloqueo por Morosidad: El cliente tiene facturas pendientes de pago.')
      }

      const { data, error: err } = await supabase
        .from('ordenes_trabajo')
        .insert([{
          ...safeOtData,
          organization_id: organizationId,
        }])
        .select()
        .single()

      if (err) throw err

      if (safeOtData.maquina_id) {
        const { error: errMaquinaEstado } = await supabase
          .from('maquinas')
          .update({ en_taller: true })
          .eq('id', safeOtData.maquina_id)
          .eq('organization_id', organizationId)

        if (errMaquinaEstado) throw errMaquinaEstado
      }

      console.info('[HeavyMetric][Taller] OT creada con trazabilidad operativa:', {
        ot_id: data.id,
        cliente_id: safeOtData.cliente_id,
        maquina_id: safeOtData.maquina_id || null,
        organization_id: organizationId,
      })

      await fetchOts()
      return data
    } catch (err) {
      setError(err.message || 'Error al crear orden de trabajo')
      throw err
    }
  }

  const addRepuesto = async (otId, repuestoData) => {
    if (!organizationId) {
      throw new Error('No se pudo determinar la organización. Volvé a iniciar sesión.')
    }

    try {
      await assertOTInOrganization(otId, organizationId)

      const { id: _ignoredId, orden_trabajo_id: _ignoredOtId, ...safeRepuestoData } = repuestoData

      const { data: repuesto, error: errRep } = await supabase
        .from('ot_repuestos')
        .insert([{
          ...safeRepuestoData,
          orden_trabajo_id: otId,
        }])
        .select()
        .single()

      if (errRep) throw errRep

      const { data: todosRepuestos, error: errSum } = await supabase
        .from('ot_repuestos')
        .select('subtotal_usd')
        .eq('orden_trabajo_id', otId)

      if (errSum) throw errSum

      const nuevoTotalRepuestos = (todosRepuestos || []).reduce(
        (acc, curr) => acc + Number(curr.subtotal_usd || 0),
        0
      )

      const { data: otActual, error: errOT } = await supabase
        .from('ordenes_trabajo')
        .select('total_mano_obra_usd')
        .eq('id', otId)
        .eq('organization_id', organizationId)
        .single()

      if (errOT) throw errOT

      const totalManoObra = Number(otActual.total_mano_obra_usd || 0)

      const { error: errUpdate } = await supabase
        .from('ordenes_trabajo')
        .update({
          total_repuestos_usd: nuevoTotalRepuestos,
          total_usd: nuevoTotalRepuestos + totalManoObra,
        })
        .eq('id', otId)
        .eq('organization_id', organizationId)

      if (errUpdate) throw errUpdate

      console.info('[HeavyMetric][Taller] Repuesto agregado con trazabilidad operativa:', {
        ot_id: otId,
        repuesto_id: repuesto.id,
        subtotal_usd: repuesto.subtotal_usd,
        organization_id: organizationId,
      })

      await fetchOts()
      return repuesto
    } catch (err) {
      setError(err.message || 'Error al agregar repuesto a la OT')
      throw err
    }
  }

  const updateManoObra = async (otId, horas, precioHora) => {
    if (!organizationId) {
      throw new Error('No se pudo determinar la organización. Volvé a iniciar sesión.')
    }

    try {
      await assertOTInOrganization(otId, organizationId)

      const horasNum = Number(horas || 0)
      const precioHoraNum = Number(precioHora || 0)

      if (!Number.isFinite(horasNum) || horasNum < 0) {
        throw new Error('Las horas de mano de obra deben ser válidas.')
      }

      if (!Number.isFinite(precioHoraNum) || precioHoraNum < 0) {
        throw new Error('El precio por hora debe ser válido.')
      }

      const totalManoObra = horasNum * precioHoraNum

      const { data: otActual, error: errOT } = await supabase
        .from('ordenes_trabajo')
        .select('total_repuestos_usd')
        .eq('id', otId)
        .eq('organization_id', organizationId)
        .single()

      if (errOT) throw errOT

      const totalRepuestos = Number(otActual.total_repuestos_usd || 0)

      const { error: errUpdate } = await supabase
        .from('ordenes_trabajo')
        .update({
          horas_mano_obra: horasNum,
          precio_hora_usd: precioHoraNum,
          total_mano_obra_usd: totalManoObra,
          total_usd: totalManoObra + totalRepuestos,
        })
        .eq('id', otId)
        .eq('organization_id', organizationId)

      if (errUpdate) throw errUpdate

      console.info('[HeavyMetric][Taller] Mano de obra actualizada con trazabilidad operativa:', {
        ot_id: otId,
        horas_mano_obra: horasNum,
        precio_hora_usd: precioHoraNum,
        total_mano_obra_usd: totalManoObra,
        organization_id: organizationId,
      })

      await fetchOts()
    } catch (err) {
      setError(err.message || 'Error al actualizar mano de obra')
      throw err
    }
  }

  const cancelarOT = async (otId, maquinaId) => {
    if (!organizationId) {
      throw new Error('No se pudo determinar la organización. Volvé a iniciar sesión.')
    }

    try {
      const otActual = await assertOTInOrganization(otId, organizationId)
      const targetMaquinaId = maquinaId || otActual.maquina_id

      const { error: err } = await supabase
        .from('ordenes_trabajo')
        .update({ estado: 'cancelada' })
        .eq('id', otId)
        .eq('organization_id', organizationId)

      if (err) throw err

      if (targetMaquinaId) {
        const { error: errMaquina } = await supabase
          .from('maquinas')
          .update({ en_taller: false })
          .eq('id', targetMaquinaId)
          .eq('organization_id', organizationId)

        if (errMaquina) throw errMaquina
      }

      console.info('[HeavyMetric][Taller] OT cancelada con trazabilidad operativa:', {
        ot_id: otId,
        maquina_id: targetMaquinaId || null,
        organization_id: organizationId,
      })

      await fetchOts()
    } catch (err) {
      setError(err.message || 'Error al cancelar orden de trabajo')
      throw err
    }
  }

  const finalizarOT = async (otId, payload) => {
    if (!organizationId) {
      throw new Error('No se pudo determinar la organización. Volvé a iniciar sesión.')
    }

    try {
      await assertOTInOrganization(otId, organizationId)

      const { data, error: err } = await supabase.rpc('finalizar_ot', {
        p_ot_id: otId,
        p_horometro_final: Number(payload.horometro_final),
        p_horas_mano_obra: Number(payload.horas_mano_obra),
        p_precio_hora_usd: Number(payload.precio_hora_usd),
        p_estado: payload.estado || 'completada',
        p_notas_internas: payload.notas_internas || null,
        p_resetear_service: Boolean(payload.mantenimiento_completo),
      })

      if (err) throw err

      if (payload.nps_score) {
        const { error: errNps } = await supabase
          .from('ordenes_trabajo')
          .update({ nps_score: Number(payload.nps_score) })
          .eq('id', otId)
          .eq('organization_id', organizationId)

        if (errNps) throw errNps
      }

      console.info('[HeavyMetric][Taller] OT finalizada con trazabilidad operativa:', {
        ot_id: otId,
        organization_id: organizationId,
        resultado: data,
      })

      await fetchOts()
      return data
    } catch (err) {
      setError(err.message || 'Error al finalizar orden de trabajo')
      throw err
    }
  }

  useEffect(() => {
    fetchOts()
  }, [fetchOts])

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