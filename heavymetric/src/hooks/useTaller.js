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

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export function useTaller({ page = 1, pageSize = 10, search = '' } = {}) {
  const auth = useAuth()
  const organizationId = getOrganizationId(auth)
  const queryClient = useQueryClient()

  const { data, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['ordenes_trabajo', organizationId, page, pageSize, search],
    queryFn: async () => {
      if (!organizationId) return { data: [], count: 0 }

      let query = supabase
        .from('ordenes_trabajo')
        .select(`
          *,
          maquina:maquinas(nombre_unidad, marca, modelo),
          cliente:clientes(razon_social),
          repuestos:ot_repuestos(*)
        `, { count: 'exact' })
        .eq('organization_id', organizationId)

      if (search && search.trim() !== '') {
        const q = search.trim()
        const isNum = !isNaN(Number(q))

        const [clientesRes, maquinasRes] = await Promise.all([
          supabase.from('clientes').select('id').ilike('razon_social', `%${q}%`).eq('organization_id', organizationId),
          supabase.from('maquinas').select('id').ilike('nombre_unidad', `%${q}%`).eq('organization_id', organizationId)
        ])
        
        const clienteIds = (clientesRes.data || []).map(c => c.id)
        const maquinaIds = (maquinasRes.data || []).map(m => m.id)
        
        const filters = []
        if (isNum) filters.push(`numero_ot.eq.${Number(q)}`)
        if (clienteIds.length > 0) filters.push(`cliente_id.in.(${clienteIds.join(',')})`)
        if (maquinaIds.length > 0) filters.push(`maquina_id.in.(${maquinaIds.join(',')})`)
        
        if (filters.length > 0) {
           query = query.or(filters.join(','))
        } else {
           query = query.eq('id', '00000000-0000-0000-0000-000000000000') // force empty
        }
      }

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to).order('created_at', { ascending: false })

      const { data, count, error: err } = await query
      if (err) throw err
      return { data: data || [], count: count || 0 }
    },
    staleTime: 1000 * 30, // 30 seconds
  })

  const ots = data?.data || []
  const totalCount = data?.count || 0
  const error = queryError?.message || null

  const invalidateOts = () => {
    queryClient.invalidateQueries({ queryKey: ['ordenes_trabajo', organizationId] })
  }

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

      invalidateOts()
      return data
    } catch (err) {
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

      invalidateOts()
      return repuesto
    } catch (err) {
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

      invalidateOts()
    } catch (err) {
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

      invalidateOts()
    } catch (err) {
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

      invalidateOts()
      return data
    } catch (err) {
      throw err
    }
  }

  return {
    ots,
    totalCount,
    loading,
    error,
    createOT,
    addRepuesto,
    updateManoObra,
    finalizarOT,
    cancelarOT,
    refetchOts: invalidateOts
  }
}

export function useTallerKpis() {
  const auth = useAuth()
  const organizationId = getOrganizationId(auth)

  const { data, isLoading: loading } = useQuery({
    queryKey: ['taller_kpis', organizationId],
    queryFn: async () => {
      if (!organizationId) return { abiertas: 0, costoPromedio: 0 }

      const baseQuery = () => supabase.from('ordenes_trabajo').select('id, total_usd').eq('organization_id', organizationId)

      const { data: abiertasData } = await baseQuery().not('estado', 'in', '("completada","facturada","cerrada","cancelada")')
      const { data: todasData } = await baseQuery()

      const abiertas = abiertasData?.length || 0
      
      const totalCosto = (todasData || []).reduce((acc, ot) => acc + Number(ot.total_usd || 0), 0)
      const costoPromedio = todasData?.length > 0 ? totalCosto / todasData.length : 0

      return { abiertas, costoPromedio }
    },
    staleTime: 1000 * 60,
  })

  return { 
    kpis: data || { abiertas: 0, costoPromedio: 0 }, 
    loading 
  }
}

export function useOrdenesTrabajoOptions() {
  const auth = useAuth()
  const organizationId = getOrganizationId(auth)

  const { data: opciones, isLoading: loading } = useQuery({
    queryKey: ['ordenes_trabajo_options', organizationId],
    queryFn: async () => {
      if (!organizationId) return []

      const { data, error } = await supabase
        .from('ordenes_trabajo')
        .select(`
          id,
          numero_ot,
          estado,
          cliente:clientes(razon_social)
        `)
        .eq('organization_id', organizationId)
        .order('numero_ot', { ascending: false })

      if (error) throw error
      return data || []
    },
    staleTime: 1000 * 60, // 1 min cache
  })

  return { opciones: opciones || [], loading }
}