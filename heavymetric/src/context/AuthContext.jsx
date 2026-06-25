import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

const DEFAULT_MODULES = {
  taller: true,
  alquileres: true,
  inventario: true,
  ventas: true,
  crm: true,
  tesoreria: true,
  campo: true,
}

const OWNER_ROLES = ['owner', 'admin', 'direccion', 'dirección', 'dueno', 'dueño', 'gerente_general']
const SUPERVISOR_ROLES = ['supervisor', 'gerente', 'encargado', 'administracion', 'administración', 'compras', 'ventas', 'postventa']
const OPERATIVO_ROLES = ['operativo', 'tecnico', 'técnico', 'mecanico', 'mecánico', 'vendedor', 'administrativo']
const CLIENTE_ROLES = ['cliente', 'portal_cliente']

function normalizeRole(role) {
  return String(role || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)

      if (session?.user) {
        cargarPerfil(session.user.id)
      } else {
        setPerfil(null)
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)

      if (session?.user) {
        cargarPerfil(session.user.id)
      } else {
        setPerfil(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function cargarPerfil(userId) {
    setLoading(true)

    const { data, error } = await supabase
      .from('perfiles')
      .select('*, organizaciones(*)')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error cargando perfil:', error)
      setPerfil(null)
    } else {
      setPerfil(data)
    }

    setLoading(false)
  }

  async function recargarPerfil() {
    if (user) await cargarPerfil(user.id)
  }

  const value = useMemo(() => {
    const rawRole = perfil?.rol
    const rol = normalizeRole(rawRole)

    const isOwner = OWNER_ROLES.includes(rol)
    const isSupervisor = SUPERVISOR_ROLES.includes(rol)
    const isOperativo = OPERATIVO_ROLES.includes(rol)
    const isCliente = CLIENTE_ROLES.includes(rol)

    const orgId =
      perfil?.organization_id ||
      perfil?.organizacion_id ||
      perfil?.id_organizacion ||
      perfil?.organizaciones?.id ||
      null

    const rubro = perfil?.organizaciones?.rubro || 'maquinaria'

    const modulos_activos = {
      ...DEFAULT_MODULES,
      ...(perfil?.organizaciones?.modulos_activos || {}),
    }

    const hasModule = (modulo) => {
      if (isOwner) return true
      return modulos_activos?.[modulo] !== false
    }

    const canEdit = isOwner || isSupervisor
    const canApprovePrice = isOwner
    const canViewFacturacion = isOwner || isSupervisor

    return {
      user,
      perfil,
      loading,
      orgId,
      recargarPerfil,

      rol,
      rawRole,
      rubro,
      modulos_activos,
      hasModule,

      isOwner,
      isSupervisor,
      isOperativo,
      isCliente,

      clienteId: perfil?.cliente_id || null,

      canEdit,
      canApprovePrice,
      canViewFacturacion,
    }
  }, [user, perfil, loading])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)