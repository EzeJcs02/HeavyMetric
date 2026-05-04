import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

async function fetchClientes() {
  const { data, error } = await supabase
    .from('clientes')
    .select('id, razon_social, nombre_comercial, cuit, condicion_iva, email, telefono, direccion, contacto_nombre, activo')
    .eq('activo', true)
    .order('razon_social')
  if (error) throw error
  return data
}

export function useClientes() {
  const { perfil } = useAuth()
  const qc = useQueryClient()

  const { data: clientes = [], isLoading: loading, error: queryError } = useQuery({
    queryKey: ['clientes', perfil?.organization_id],
    queryFn:  fetchClientes,
    enabled:  !!perfil?.organization_id,
  })

  const createMut = useMutation({
    mutationFn: (payload) => supabase
      .from('clientes')
      .insert({ ...payload, organization_id: perfil?.organization_id })
      .select().single()
      .then(({ data, error }) => { if (error) throw error; return data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clientes'] }),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, payload }) => supabase
      .from('clientes').update(payload).eq('id', id)
      .then(({ error }) => { if (error) throw error }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clientes'] }),
  })

  const archiveMut = useMutation({
    mutationFn: (id) => supabase
      .from('clientes').update({ activo: false }).eq('id', id)
      .then(({ error }) => { if (error) throw error }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clientes'] }),
  })

  return {
    clientes,
    loading,
    error: queryError?.message ?? null,
    createCliente:  (payload) => createMut.mutateAsync(payload),
    updateCliente:  (id, payload) => updateMut.mutateAsync({ id, payload }),
    archiveCliente: (id) => archiveMut.mutateAsync(id),
  }
}
