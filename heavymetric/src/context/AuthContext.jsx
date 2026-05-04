import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) cargarPerfil(session.user.id)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      if (session?.user) cargarPerfil(session.user.id)
      else { setPerfil(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function cargarPerfil(userId) {
    const { data } = await supabase
      .from('perfiles')
      .select('*, organizaciones(*)')
      .eq('id', userId)
      .single()
    setPerfil(data)
    setLoading(false)
  }

  // Resuelve el ID de la organización — la columna en DB se llama organization_id
  const orgId = perfil?.organization_id
    || perfil?.organizacion_id
    || perfil?.id_organizacion
    || perfil?.organizaciones?.id
    || null

  return (
    <AuthContext.Provider value={{
      user, perfil, loading, orgId,
      isOwner: perfil?.rol === 'owner',
      isSupervisor: perfil?.rol === 'supervisor',
      isOperativo: perfil?.rol === 'operativo',
      canEdit: ['owner', 'supervisor'].includes(perfil?.rol),
      canApprovePrice: perfil?.rol === 'owner',
      canViewFacturacion: ['owner', 'supervisor'].includes(perfil?.rol),
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
