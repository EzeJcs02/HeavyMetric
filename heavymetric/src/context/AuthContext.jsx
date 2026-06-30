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

const ROLE_ALIASES = {
  direccion: 'owner',
  dirección: 'owner',
  dueno: 'owner',
  dueño: 'owner',
  gerente_general: 'owner',
  admin: 'owner',

  gerente: 'supervisor',
  encargado: 'supervisor',
  administracion: 'supervisor',
  administración: 'supervisor',
  compras: 'supervisor',
  ventas: 'supervisor',
  postventa: 'supervisor',

  tecnico: 'operativo',
  técnico: 'operativo',
  mecanico: 'operativo',
  mecánico: 'operativo',
  vendedor: 'operativo',
  administrativo: 'operativo',

  portal_cliente: 'cliente',
}

const OWNER_PERMISSIONS = ['*']

const SUPERVISOR_PERMISSIONS = [
  'home.view',
  'dashboard.view',
  'mi_jornada.view',
  'activo.view',
  'activo.create',
  'activo.edit',
  'taller.view',
  'taller.create',
  'taller.edit',
  'taller.finalizar',
  'taller.cancelar',
  'postventa.view',
  'inventario.view',
  'inventario.create',
  'inventario.edit',
  'crm.view',
  'crm.create',
  'crm.edit',
  'crm.convertir',
  'clientes.view',
  'clientes.create',
  'clientes.edit',
  'cotizaciones.view',
  'cotizaciones.create',
  'cotizaciones.edit',
  'ventas.view',
  'ventas.create',
  'ventas.edit',
  'facturacion.view',
  'facturacion.create',
  'tesoreria.view',
  'tesoreria.create',
  'tesoreria.edit',
  'proveedores.view',
  'proveedores.create',
  'proveedores.edit',
  'aprobaciones.view',
  'aprobaciones.approve',
  'reportes.view',
  'remitos.view',
  'remitos.create',
  'remitos.edit',
  'campo.view',
]

const OPERATIVO_PERMISSIONS = [
  'home.view',
  'mi_jornada.view',
  'activo.view',
  'taller.view',
  'taller.edit',
  'inventario.view',
  'campo.view',
  'remitos.view',
]

const CLIENTE_PERMISSIONS = [
  'portal.view',
]

const ROLE_PERMISSIONS = {
  owner: OWNER_PERMISSIONS,
  supervisor: SUPERVISOR_PERMISSIONS,
  operativo: OPERATIVO_PERMISSIONS,
  cliente: CLIENTE_PERMISSIONS,
}

function normalizeRole(role) {
  return String(role || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
}

function canonicalRole(role) {
  const normalized = normalizeRole(role)
  return ROLE_ALIASES[normalized] || normalized || 'operativo'
}

function normalizePermissions(value) {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean).map(String)
  if (typeof value === 'string') return value.split(',').map((p) => p.trim()).filter(Boolean)
  if (typeof value === 'object') {
    return Object.entries(value)
      .filter(([, enabled]) => enabled === true)
      .map(([permission]) => permission)
  }
  return []
}

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      setUser(session?.user ?? null)

      if (session?.user) {
        cargarPerfil(session.user.id)
      } else {
        setPerfil(null)
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setUser(session?.user ?? null)

      if (session?.user) {
        cargarPerfil(session.user.id)
      } else {
        setPerfil(null)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
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
    const rolCanonico = canonicalRole(rawRole)

    const isOwner = OWNER_ROLES.includes(rol) || rolCanonico === 'owner'
    const isSupervisor = SUPERVISOR_ROLES.includes(rol) || rolCanonico === 'supervisor'
    const isOperativo = OPERATIVO_ROLES.includes(rol) || rolCanonico === 'operativo'
    const isCliente = CLIENTE_ROLES.includes(rol) || rolCanonico === 'cliente'

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

    const basePermissions = isOwner
      ? OWNER_PERMISSIONS
      : ROLE_PERMISSIONS[rolCanonico] || ROLE_PERMISSIONS.operativo

    const perfilPermissions = normalizePermissions(
      perfil?.permisos || perfil?.permissions || perfil?.permisos_extra
    )

    const blockedPermissions = normalizePermissions(
      perfil?.permisos_bloqueados || perfil?.blocked_permissions
    )

    const permissions = unique([...basePermissions, ...perfilPermissions])

    const hasModule = (modulo) => {
      if (isOwner) return true
      return modulos_activos?.[modulo] !== false
    }

    const hasPermission = (permission) => {
      if (!permission) return false
      if (permissions.includes('*')) return !blockedPermissions.includes(permission)
      if (blockedPermissions.includes(permission)) return false
      return permissions.includes(permission)
    }

    const can = hasPermission

    const canAny = (permissionList = []) => permissionList.some((permission) => hasPermission(permission))
    const canAll = (permissionList = []) => permissionList.every((permission) => hasPermission(permission))

    const canEdit = isOwner || isSupervisor || hasPermission('global.edit')
    const canApprovePrice = isOwner || hasPermission('precios.approve')
    const canViewFacturacion = isOwner || hasPermission('facturacion.view')

    return {
      user,
      perfil,
      loading,
      orgId,
      organizationId: orgId,
      recargarPerfil,

      rol,
      rolCanonico,
      rawRole,
      rubro,
      modulos_activos,
      hasModule,

      permissions,
      blockedPermissions,
      hasPermission,
      can,
      canAny,
      canAll,

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
