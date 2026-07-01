import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// ────────────────────────────────────────────────────────────────
// HeavyMetric - Alquileres
// Seguridad multitenancy + trazabilidad operativa ISO
// Regla: ningún contrato, máquina, OT o deuda sin organization_id.
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

async function assertContratoInOrganization(contratoId, organizationId) {
  const { data, error } = await supabase
    .from('contratos_alquiler')
    .select('id, maquina_id, organization_id')
    .eq('id', contratoId)
    .eq('organization_id', organizationId)
    .single()

  if (error) throw error
  return data
}

export function useAlquileres() {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const organizationId = getOrganizationId(auth)

  const {
    data: contratos = [],
    isLoading: loading,
    error: queryError,
    refetch: fetchContratos,
  } = useQuery({
    queryKey: ['contratos_alquiler', organizationId],
    queryFn: async () => {
      if (!organizationId) return []

      const { data, error: err } = await supabase
        .from('alquileres_activos')
        .select('*')
        .eq('organization_id', organizationId)
        .order('fecha_inicio', { ascending: false })

      if (err) throw err
      return data || []
    },
    enabled: !!organizationId,
    staleTime: 1000 * 30, // 30 segundos
  })

  const createContratoMutation = useMutation({
    mutationFn: async (contratoData) => {
      if (!organizationId) throw new Error('No se pudo determinar la organización')

      const hoy = new Date().toISOString().split('T')[0]
      if (contratoData.fecha_inicio < hoy) {
        throw new Error('La fecha de inicio no puede ser anterior a la fecha actual.')
      }

      const { id: _ignoredId, organization_id: _ignoredOrg, ...safeContratoData } = contratoData

      // 0b. Verificar morosidad del cliente dentro de la misma organización
      const { data: deudas, error: errDeuda } = await supabase
        .from('transacciones')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('cliente_id', safeContratoData.cliente_id)
        .eq('estado_pago', 'pendiente')
        .limit(1)

      if (errDeuda) throw errDeuda
      if (deudas && deudas.length > 0) {
        throw new Error('Bloqueo por Morosidad: El cliente tiene facturas pendientes de pago.')
      }

      // 1. Verificar disponibilidad de la máquina dentro de la misma organización
      const { data: maquina, error: errMaq } = await supabase
        .from('maquinas')
        .select('id, organization_id, en_alquiler, en_taller, activa')
        .eq('id', safeContratoData.maquina_id)
        .eq('organization_id', organizationId)
        .single()

      if (errMaq) throw errMaq
      if (!maquina.activa) throw new Error('La máquina no está activa.')
      if (maquina.en_alquiler) throw new Error('La máquina ya se encuentra alquilada.')
      if (maquina.en_taller) throw new Error('La máquina está en taller.')

      // 1b. Verificar OTs activas de la máquina dentro de la misma organización
      const { data: ots, error: errOT } = await supabase
        .from('ordenes_trabajo')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('maquina_id', safeContratoData.maquina_id)
        .not('estado', 'in', '("completada","cancelada","facturada")')

      if (errOT) throw errOT
      if (ots && ots.length > 0) {
        throw new Error('La máquina tiene una Orden de Trabajo activa.')
      }

      // 2. Crear contrato con organization_id controlado desde sesión
      const { data, error: err } = await supabase
        .from('contratos_alquiler')
        .insert([{
          ...safeContratoData,
          organization_id: organizationId,
          estado: 'activo',
        }])
        .select()
        .single()

      if (err) throw err

      // 3. Marcar máquina como alquilada, protegida por id + organization_id
      const { error: errUpdateMaq } = await supabase
        .from('maquinas')
        .update({ en_alquiler: true })
        .eq('id', safeContratoData.maquina_id)
        .eq('organization_id', organizationId)

      if (errUpdateMaq) throw errUpdateMaq

      console.info('[HeavyMetric][Alquileres] Contrato creado con trazabilidad operativa:', {
        contrato_id: data.id,
        maquina_id: safeContratoData.maquina_id,
        organization_id: organizationId,
      })

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos_alquiler', organizationId] })
    },
  })

  const calcularTotalSugerido = (fechaInicio, fechaFin, tarifaDiaria) => {
    if (!fechaInicio || !fechaFin) return 0

    const inicio = new Date(fechaInicio)
    const fin = new Date(fechaFin)
    const dias = Math.max(1, Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24)))

    return dias * tarifaDiaria
  }

  const cancelarContratoMutation = useMutation({
    mutationFn: async (contratoId) => {
      if (!organizationId) throw new Error('No se pudo determinar la organización')

      const contrato = await assertContratoInOrganization(contratoId, organizationId)

      const { error: err } = await supabase
        .from('contratos_alquiler')
        .update({ estado: 'cancelado' })
        .eq('id', contratoId)
        .eq('organization_id', organizationId)

      if (err) throw err

      const { error: errUpdateMaq } = await supabase
        .from('maquinas')
        .update({ en_alquiler: false })
        .eq('id', contrato.maquina_id)
        .eq('organization_id', organizationId)

      if (errUpdateMaq) throw errUpdateMaq

      console.info('[HeavyMetric][Alquileres] Contrato cancelado con trazabilidad operativa:', {
        contrato_id: contratoId,
        maquina_id: contrato.maquina_id,
        organization_id: organizationId,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos_alquiler', organizationId] })
    },
  })

  const finalizarContratoMutation = useMutation({
    mutationFn: async (contratoId) => {
      if (!organizationId) throw new Error('No se pudo determinar la organización')

      const contrato = await assertContratoInOrganization(contratoId, organizationId)

      const { data, error: err } = await supabase
        .rpc('finalizar_contrato', { p_contrato_id: contratoId })

      if (err) throw err

      console.info('[HeavyMetric][Alquileres] Contrato finalizado con trazabilidad operativa:', {
        contrato_id: contratoId,
        maquina_id: contrato.maquina_id,
        organization_id: organizationId,
        resultado: data,
      })

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos_alquiler', organizationId] })
    },
  })

  const createContrato = async (contratoData) => {
    return createContratoMutation.mutateAsync(contratoData)
  }

  const cancelarContrato = async (contratoId) => {
    return cancelarContratoMutation.mutateAsync(contratoId)
  }

  const finalizarContrato = async (contratoId) => {
    return finalizarContratoMutation.mutateAsync(contratoId)
  }

  return {
    contratos,
    loading,
    error: queryError ? queryError.message : (
      createContratoMutation.error?.message ||
      cancelarContratoMutation.error?.message ||
      finalizarContratoMutation.error?.message || null
    ),
    fetchContratos,
    createContrato,
    calcularTotalSugerido,
    finalizarContrato,
    cancelarContrato,
  }
}