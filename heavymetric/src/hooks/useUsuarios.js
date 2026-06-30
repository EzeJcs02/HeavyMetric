import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useUsuarios() {
  const { perfil, user, isOwner } = useAuth()
  const qc = useQueryClient()
  const orgId = perfil?.organization_id

  const { data: usuarios = [], isLoading: loading, error: queryError } = useQuery({
    queryKey: ['usuarios', orgId],
    queryFn: async () => {
      if (!orgId) return []

      const { data, error } = await supabase
        .from('perfiles')
        .select('id, nombre_completo, rol, area, activo, created_at, organization_id')
        .eq('organization_id', orgId)
        .order('created_at')

      if (error) throw error
      return data || []
    },
    enabled: !!orgId,
  })

  const updateRolMut = useMutation({
    mutationFn: async ({ userId, rol }) => {
      if (!orgId) throw new Error('No se pudo determinar la organización')
      if (!isOwner) throw new Error('No tenés permisos para cambiar roles')

      const { data: usuario, error: checkError } = await supabase
        .from('perfiles')
        .select('id, organization_id')
        .eq('id', userId)
        .eq('organization_id', orgId)
        .single()

      if (checkError) throw checkError
      if (!usuario) throw new Error('Usuario no encontrado en esta organización')

      const { error } = await supabase
        .from('perfiles')
        .update({ rol })
        .eq('id', userId)
        .eq('organization_id', orgId)

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios', orgId] })
    },
  })

  const desactivarMut = useMutation({
    mutationFn: async (userId) => {
      if (!orgId) throw new Error('No se pudo determinar la organización')
      if (!isOwner) throw new Error('No tenés permisos para desactivar usuarios')
      if (user?.id === userId) throw new Error('No podés desactivar tu propio usuario')

      const { data: usuario, error: checkError } = await supabase
        .from('perfiles')
        .select('id, organization_id')
        .eq('id', userId)
        .eq('organization_id', orgId)
        .single()

      if (checkError) throw checkError
      if (!usuario) throw new Error('Usuario no encontrado en esta organización')

      const { error } = await supabase
        .from('perfiles')
        .update({ activo: false })
        .eq('id', userId)
        .eq('organization_id', orgId)

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios', orgId] })
    },
  })

  return {
    usuarios,
    loading,
    error: queryError?.message ?? null,
    updateRol: (userId, rol) => updateRolMut.mutateAsync({ userId, rol }),
    desactivarUsuario: (userId) => desactivarMut.mutateAsync(userId),
  }
}