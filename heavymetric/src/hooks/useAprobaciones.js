import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const ESTADOS_DECISION_VALIDOS = ['aprobado', 'rechazado']
const ESTADOS_PENDIENTES = ['pendiente', 'urgente']

const normalizeText = (value) => String(value || '').trim()

export function useAprobaciones() {
  const { perfil, orgId } = useAuth()
  const queryClient = useQueryClient()

  const organizationId = orgId || perfil?.organization_id || perfil?.organizacion_id || null
  const userId = perfil?.id || null

  const {
    data: aprobaciones = [],
    isLoading: loading,
    error: queryError,
    refetch: fetchAprobaciones,
  } = useQuery({
    queryKey: ['aprobaciones', organizationId],
    queryFn: async () => {
      if (!organizationId) return []

      const { data, error: err } = await supabase
        .from('workflow_aprobaciones')
        .select(`
          *,
          solicitante:perfiles!solicitante_id(nombre_completo),
          decidido:perfiles!decidido_por(nombre_completo)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (err) throw err
      return data || []
    },
    enabled: !!organizationId,
    staleTime: 1000 * 30, // 30 segundos
  })

  const decidirMutation = useMutation({
    mutationFn: async ({ id, estado, observacion = '' }) => {
      if (!id) throw new Error('Falta el ID de la aprobación')
      if (!userId) throw new Error('No se pudo identificar el usuario que decide')
      if (!ESTADOS_DECISION_VALIDOS.includes(estado)) {
        throw new Error('Estado de decisión inválido')
      }

      const { data, error: err } = await supabase
        .from('workflow_aprobaciones')
        .update({
          estado,
          observacion: normalizeText(observacion),
          decidido_por: userId,
          fecha_decision: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single()

      if (err) throw err
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aprobaciones', organizationId] })
    },
  })

  const crearAprobacionMutation = useMutation({
    mutationFn: async (payload = {}) => {
      if (!organizationId) throw new Error('No se pudo identificar la organización')
      if (!userId) throw new Error('No se pudo identificar el solicitante')

      const cleanPayload = {
        ...payload,
        organization_id: organizationId,
        solicitante_id: userId,
        created_by: userId,
        estado: payload.estado || 'pendiente',
      }

      const { data, error: err } = await supabase
        .from('workflow_aprobaciones')
        .insert([cleanPayload])
        .select()
        .single()

      if (err) throw err
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aprobaciones', organizationId] })
    },
  })

  const decidir = async (id, estado, observacion = '') => {
    return decidirMutation.mutateAsync({ id, estado, observacion })
  }

  const crearAprobacion = async (payload = {}) => {
    return crearAprobacionMutation.mutateAsync(payload)
  }

  return {
    aprobaciones,
    loading,
    error: queryError ? queryError.message : null,
    fetchAprobaciones,
    decidir,
    crearAprobacion,
  }
}

export async function countAprobacionesPendientes(orgId) {
  if (!orgId) return 0

  const { count, error } = await supabase
    .from('workflow_aprobaciones')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .in('estado', ESTADOS_PENDIENTES)

  if (error) {
    console.warn('countAprobacionesPendientes:', error.message)
    return 0
  }

  return count || 0
}