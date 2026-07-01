import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export async function fetchClientesOptions(organizationId) {
  const { data, error } = await supabase
    .from('clientes')
    .select('id, razon_social, cuit, nombre_comercial')
    .eq('organization_id', organizationId)
    .eq('activo', true)
    .order('razon_social')
  if (error) throw error
  return data
}

export function useClientesOptions() {
  const { perfil } = useAuth()
  const { data: opciones = [], isLoading: loading, error } = useQuery({
    queryKey: ['clientes_options', perfil?.organization_id],
    queryFn: () => fetchClientesOptions(perfil.organization_id),
    enabled: !!perfil?.organization_id,
  })
  return { opciones, loading, error: error?.message ?? null }
}

async function fetchClientesPaginated(organizationId, page, pageSize, search) {
  let query = supabase
    .from('clientes')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId)
    .eq('activo', true)

  if (search) {
    const q = `%${search.trim()}%`
    query = query.or(`razon_social.ilike.${q},nombre_comercial.ilike.${q},cuit.ilike.${q},email.ilike.${q},contacto_nombre.ilike.${q}`)
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to).order('razon_social')

  const { data, count, error } = await query
  if (error) throw error
  return { data, count }
}

export async function fetchClientesKpis(organizationId) {
  const baseQuery = () => supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('activo', true)
  
  const [totalRes, altaRes, cuitRes, contactoRes] = await Promise.all([
    baseQuery(),
    baseQuery().eq('propension_compra', 'A'),
    baseQuery().not('cuit', 'is', null).not('cuit', 'eq', ''),
    baseQuery().or('email.not.eq."",telefono.not.eq."",contacto_nombre.not.eq.""')
  ])
  
  return {
    total: totalRes.count || 0,
    alta: altaRes.count || 0,
    conCuit: cuitRes.count || 0,
    conContacto: contactoRes.count || 0,
  }
}

export function useClientesKpis() {
  const { perfil } = useAuth()
  const { data: kpis = { total: 0, alta: 0, conCuit: 0, conContacto: 0 }, isLoading: loading } = useQuery({
    queryKey: ['clientes_kpis', perfil?.organization_id],
    queryFn: () => fetchClientesKpis(perfil.organization_id),
    enabled: !!perfil?.organization_id,
  })
  return { kpis, loading }
}

export function useClientes(params = { page: 1, pageSize: 10, search: '' }) {
  const { perfil } = useAuth()
  const qc = useQueryClient()
  const { page, pageSize, search } = params

  const { data, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['clientes', perfil?.organization_id, page, pageSize, search],
    queryFn:  () => fetchClientesPaginated(perfil.organization_id, page, pageSize, search),
    enabled:  !!perfil?.organization_id,
  })

  const clientes = data?.data || []
  const total = data?.count || 0

  const createMut = useMutation({
    mutationFn: (payload) => {
      if (!perfil?.organization_id) {
        throw new Error('No se pudo determinar la organización. Volvé a iniciar sesión.')
      }
      return supabase
        .from('clientes')
        .insert({ ...payload, organization_id: perfil.organization_id })
        .select().single()
        .then(({ data, error }) => { if (error) throw error; return data })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clientes'] })
      qc.invalidateQueries({ queryKey: ['clientes_kpis'] })
      qc.invalidateQueries({ queryKey: ['clientes_options'] })
    },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, payload }) => supabase
      .from('clientes').update(payload).eq('id', id).eq('organization_id', perfil?.organization_id)
      .then(({ error }) => { if (error) throw error }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clientes'] })
      qc.invalidateQueries({ queryKey: ['clientes_kpis'] })
      qc.invalidateQueries({ queryKey: ['clientes_options'] })
    },
  })

  const archiveMut = useMutation({
    mutationFn: (id) => supabase
      .from('clientes').update({ activo: false }).eq('id', id).eq('organization_id', perfil?.organization_id)
      .then(({ error }) => { if (error) throw error }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clientes'] })
      qc.invalidateQueries({ queryKey: ['clientes_kpis'] })
      qc.invalidateQueries({ queryKey: ['clientes_options'] })
    },
  })

  return {
    clientes,
    total,
    loading,
    error: queryError?.message ?? null,
    createCliente:  (payload) => createMut.mutateAsync(payload),
    updateCliente:  (id, payload) => updateMut.mutateAsync({ id, payload }),
    archiveCliente: (id) => archiveMut.mutateAsync(id),
  }
}