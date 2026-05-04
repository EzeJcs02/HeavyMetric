import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

async function fetchMaquinas() {
  const { data, error } = await supabase
    .from('maquinas_service')
    .select('*')
    .order('nombre_unidad')
  if (error) throw error
  return data
}

export function useMaquinas() {
  const { perfil } = useAuth()
  const qc = useQueryClient()

  const { data: maquinas = [], isLoading: loading, error: queryError } = useQuery({
    queryKey: ['maquinas'],
    queryFn:  fetchMaquinas,
    enabled:  !!perfil?.organization_id,
  })

  const createMut = useMutation({
    mutationFn: (payload) => supabase
      .from('maquinas')
      .insert({ ...payload, organization_id: perfil?.organization_id })
      .select().single()
      .then(({ data, error }) => { if (error) throw error; return data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['maquinas'] }),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, payload }) => supabase
      .from('maquinas').update(payload).eq('id', id)
      .then(({ error }) => { if (error) throw error }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['maquinas'] }),
  })

  const deactivateMut = useMutation({
    mutationFn: (id) => supabase
      .from('maquinas').update({ activa: false }).eq('id', id)
      .then(({ error }) => { if (error) throw error }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['maquinas'] }),
  })

  return {
    maquinas,
    loading,
    error: queryError?.message ?? null,
    createMaquina:    (payload) => createMut.mutateAsync(payload),
    updateMaquina:    (id, payload) => updateMut.mutateAsync({ id, payload }),
    deactivateMaquina: (id) => deactivateMut.mutateAsync(id),
  }
}
