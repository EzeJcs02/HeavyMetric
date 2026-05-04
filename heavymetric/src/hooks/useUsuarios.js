import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useUsuarios() {
  const { perfil } = useAuth()
  const qc = useQueryClient()
  const orgId = perfil?.organization_id

  const { data: usuarios = [], isLoading: loading, error: queryError } = useQuery({
    queryKey: ['usuarios', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('perfiles')
        .select('id, nombre_completo, rol, area, created_at')
        .eq('organization_id', orgId)
        .order('created_at')
      if (error) throw error
      return data
    },
    enabled: !!orgId,
  })

  const updateRolMut = useMutation({
    mutationFn: ({ userId, rol }) => supabase
      .from('perfiles').update({ rol }).eq('id', userId)
      .then(({ error }) => { if (error) throw error }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  })

  const desactivarMut = useMutation({
    mutationFn: (userId) => supabase
      .from('perfiles').update({ activo: false }).eq('id', userId)
      .then(({ error }) => { if (error) throw error }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  })

  return {
    usuarios,
    loading,
    error: queryError?.message ?? null,
    updateRol: (userId, rol) => updateRolMut.mutateAsync({ userId, rol }),
    desactivarUsuario: (userId) => desactivarMut.mutateAsync(userId),
  }
}
