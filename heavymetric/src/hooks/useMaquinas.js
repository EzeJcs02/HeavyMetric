import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

async function fetchMaquinas(organizationId) {
  const { data, error } = await supabase
    .from('maquinas_service')
    .select('*')
    .eq('organization_id', organizationId)
    .order('nombre_unidad')
  if (error) throw error
  return data
}

export function useMaquinas() {
  const { perfil } = useAuth()
  const qc = useQueryClient()

  const { data: maquinas = [], isLoading: loading, error: queryError } = useQuery({
    queryKey: ['maquinas', perfil?.organization_id],
    queryFn:  () => fetchMaquinas(perfil.organization_id),
    enabled:  !!perfil?.organization_id,
  })

  const createMut = useMutation({
    mutationFn: (payload) => {
      if (!perfil?.organization_id) {
        throw new Error('No se pudo determinar la organización. Volvé a iniciar sesión.')
      }
      return supabase
        .from('maquinas')
        .insert({ ...payload, organization_id: perfil.organization_id })
        .select().single()
        .then(({ data, error }) => { if (error) throw error; return data })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['maquinas'] }),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, payload }) => supabase
      .from('maquinas').update(payload).eq('id', id).eq('organization_id', perfil?.organization_id)
      .then(({ error }) => { if (error) throw error }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['maquinas'] }),
  })

  const deactivateMut = useMutation({
    mutationFn: (id) => supabase
      .from('maquinas').update({ activa: false }).eq('id', id).eq('organization_id', perfil?.organization_id)
      .then(({ error }) => { if (error) throw error }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['maquinas'] }),
  })

  return {
    maquinas,
    loading,
    error: queryError?.message ?? null,
    createMaquina:     (payload) => createMut.mutateAsync(payload),
    updateMaquina:     (id, payload) => updateMut.mutateAsync({ id, payload }),
    deactivateMaquina: (id) => deactivateMut.mutateAsync(id),
  }
}