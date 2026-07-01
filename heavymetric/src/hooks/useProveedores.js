import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { logAudit } from '../lib/auditLog'

function getOrganizationId(auth) {
  return (
    auth?.profile?.organization_id ||
    auth?.perfil?.organization_id ||
    auth?.user?.user_metadata?.organization_id ||
    auth?.organizationId ||
    null
  )
}

function waitForQuery(ms, signal) {
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer)
      const error = new Error('Query cancelada')
      error.name = 'AbortError'
      reject(error)
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)

    if (signal?.aborted) onAbort()
    else signal?.addEventListener('abort', onAbort, { once: true })
  })
}

async function getCurrentAuthScope() {
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError) throw authError

  const user = authData?.user
  if (!user) throw new Error('Usuario no autenticado')

  const { data: perfil, error: perfilError } = await supabase
    .from('perfiles')
    .select('id, organization_id')
    .eq('id', user.id)
    .single()

  if (perfilError) throw perfilError
  if (!perfil?.organization_id) throw new Error('No se pudo determinar la organización del usuario')

  return {
    userId: perfil.id || user.id,
    organizationId: perfil.organization_id,
  }
}

async function assertProveedorInOrganization(proveedorId, organizationId) {
  const { data, error } = await supabase
    .from('proveedores')
    .select('id, organization_id')
    .eq('id', proveedorId)
    .eq('organization_id', organizationId)
    .single()

  if (error) throw error
  return data
}

async function assertMaquinaInOrganization(maquinaId, organizationId) {
  const { data, error } = await supabase
    .from('maquinas')
    .select('id, organization_id')
    .eq('id', maquinaId)
    .eq('organization_id', organizationId)
    .single()

  if (error) throw error
  return data
}

async function assertCompraInOrganization(compraId, organizationId) {
  const { data, error } = await supabase
    .from('compras')
    .select('id, proveedor_id, organization_id')
    .eq('id', compraId)
    .eq('organization_id', organizationId)
    .single()

  if (error) throw error
  return data
}

export function useProveedores({ page = 1, pageSize = 12, search = '', estado = 'todos' } = {}) {
  const auth = useAuth()
  const organizationId = getOrganizationId(auth)
  const queryClient = useQueryClient()

  const {
    data = { proveedores: [], totalCount: 0 },
    isLoading: loading,
    error: queryError,
    refetch: fetchProveedores,
  } = useQuery({
    queryKey: ['proveedores', organizationId, page, pageSize, search, estado],
    queryFn: async ({ signal }) => {
      await waitForQuery(400, signal)

      let query = supabase
        .from('proveedores')
        .select(`
          *,
          compras(count),
          proveedor_repuestos(count)
        `, { count: 'exact' })
        .eq('organization_id', organizationId)
        .eq('activo', true)

      if (search && search.trim() !== '') {
        const q = search.trim()
        query = query.or(`empresa.ilike.%${q}%,rubro.ilike.%${q}%,contacto_nombre.ilike.%${q}%`)
      }

      if (estado !== 'todos') {
        query = query.eq('estado', estado)
      }

      // Pagination
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to).order('empresa')

      const { data, count, error: err } = await query

      if (err) throw err

      return {
        proveedores: data || [],
        totalCount: count || 0,
      }
    },
    enabled: !!organizationId,
  })

  const invalidateProveedorQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['proveedores', organizationId] }),
      queryClient.invalidateQueries({ queryKey: ['proveedores_kpis', organizationId] }),
      queryClient.invalidateQueries({ queryKey: ['proveedores_options', organizationId] }),
    ])
  }

  const createProveedor = async (payload) => {
    if (!organizationId) {
      throw new Error('No se pudo determinar la organización. Volvé a iniciar sesión.')
    }

    const { id: _ignoredId, organization_id: _ignoredOrg, ...safePayload } = payload

    const { data, error: err } = await supabase
      .from('proveedores')
      .insert([{ ...safePayload, organization_id: organizationId }])
      .select()
      .single()

    if (err) throw err

    await logAudit({
      tabla: 'proveedores',
      registroId: data.id,
      accion: 'INSERT',
      datosDespues: { ...safePayload, organization_id: organizationId },
      descripcion: `Proveedor creado: ${safePayload.empresa}`,
    })

    await invalidateProveedorQueries()
    return data
  }

  const updateProveedor = async (id, payload) => {
    if (!organizationId) {
      throw new Error('No se pudo determinar la organización. Volvé a iniciar sesión.')
    }

    const antes = await assertProveedorInOrganization(id, organizationId)
    const { id: _ignoredId, organization_id: _ignoredOrg, ...safePayload } = payload

    const { error: err } = await supabase
      .from('proveedores')
      .update({ ...safePayload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', organizationId)

    if (err) throw err

    await logAudit({
      tabla: 'proveedores',
      registroId: id,
      accion: 'UPDATE',
      datosAntes: antes,
      datosDespues: safePayload,
      descripcion: `Proveedor actualizado: ${safePayload.empresa || antes?.empresa || id}`,
    })

    await invalidateProveedorQueries()
  }

  const deactivateProveedor = async (id) => {
    if (!organizationId) {
      throw new Error('No se pudo determinar la organización. Volvé a iniciar sesión.')
    }

    const antes = await assertProveedorInOrganization(id, organizationId)

    const { error: err } = await supabase
      .from('proveedores')
      .update({ activo: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', organizationId)

    if (err) throw err

    await logAudit({
      tabla: 'proveedores',
      registroId: id,
      accion: 'UPDATE',
      datosAntes: antes,
      datosDespues: { activo: false },
      descripcion: `Proveedor desactivado: ${antes?.empresa || id}`,
    })

    await invalidateProveedorQueries()
  }

  return {
    proveedores: data.proveedores,
    totalCount: data.totalCount,
    loading,
    error: queryError ? (queryError.message || 'Error al cargar proveedores') : null,
    fetchProveedores,
    createProveedor,
    updateProveedor,
    deactivateProveedor,
  }
}

export function useProveedoresKpis() {
  const auth = useAuth()
  const organizationId = getOrganizationId(auth)

  const {
    data: kpis = { total: 0, preferidos: 0, riesgosos: 0 },
    isLoading: loading,
    refetch: fetchKpis,
  } = useQuery({
    queryKey: ['proveedores_kpis', organizationId],
    queryFn: async () => {
      const baseQuery = () => supabase.from('proveedores').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('activo', true)

      const [
        { count: total, error: totalError },
        { count: preferidos, error: preferidosError },
        { count: riesgosos, error: riesgososError },
      ] = await Promise.all([
        baseQuery(),
        baseQuery().eq('estado', 'preferido'),
        baseQuery().eq('estado', 'riesgoso'),
      ])

      const error = totalError || preferidosError || riesgososError
      if (error) throw error

      return {
        total: total || 0,
        preferidos: preferidos || 0,
        riesgosos: riesgosos || 0,
      }
    },
    enabled: !!organizationId,
  })

  return { kpis, loading, fetchKpis }
}

export function useProveedoresOptions() {
  const auth = useAuth()
  const organizationId = getOrganizationId(auth)

  const {
    data: opciones = [],
    isLoading: loading,
    refetch: fetchOptions,
  } = useQuery({
    queryKey: ['proveedores_options', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proveedores')
        .select('id, empresa, cuit')
        .eq('organization_id', organizationId)
        .eq('activo', true)
        .order('empresa')

      if (error) throw error
      return data || []
    },
    enabled: !!organizationId,
  })

  return { opciones, loading, fetchOptions }
}

// ── Compras de un proveedor ──────────────────────────────────────
export async function fetchComprasProveedor(proveedorId, organizationIdParam = null) {
  const scope = organizationIdParam
    ? { organizationId: organizationIdParam }
    : await getCurrentAuthScope()

  await assertProveedorInOrganization(proveedorId, scope.organizationId)

  const { data, error } = await supabase
    .from('compras')
    .select('*, items:compra_items(*)')
    .eq('organization_id', scope.organizationId)
    .eq('proveedor_id', proveedorId)
    .order('fecha', { ascending: false })
    .limit(30)

  if (error) throw error
  return data || []
}

// ── Repuestos vinculados a un proveedor ──────────────────────────
export async function fetchRepuestosProveedor(proveedorId, organizationIdParam = null) {
  const scope = organizationIdParam
    ? { organizationId: organizationIdParam }
    : await getCurrentAuthScope()

  await assertProveedorInOrganization(proveedorId, scope.organizationId)

  const { data, error } = await supabase
    .from('proveedor_repuestos')
    .select('*, repuesto:repuestos(nombre, sku, unidad, stock_actual)')
    .eq('organization_id', scope.organizationId)
    .eq('proveedor_id', proveedorId)

  if (error) throw error
  return data || []
}

// ── Crear/recibir compra ─────────────────────────────────────────
export async function crearCompra(proveedorId, orgId, items, notas = '', extra = {}) {
  const { organizationId } = await getCurrentAuthScope()
  const scopedOrgId = organizationId

  if (orgId && orgId !== scopedOrgId) {
    throw new Error('Acceso denegado: la organización informada no coincide con la sesión actual.')
  }

  await assertProveedorInOrganization(proveedorId, scopedOrgId)

  const total = items.reduce(
    (s, i) => s + Number(i.cantidad || 0) * Number(i.precio_unitario_usd || 0),
    0
  )

  if (!Number.isFinite(total) || total < 0) {
    throw new Error('El total de la compra no es válido.')
  }

  const { data: compra, error: errC } = await supabase
    .from('compras')
    .insert([{
      proveedor_id: proveedorId,
      organization_id: scopedOrgId,
      total_usd: total,
      notas,
      categoria: extra.categoria || 'repuesto',
      centro_costo_id: extra.centro_costo_id || null,
    }])
    .select()
    .single()

  if (errC) throw errC

  if (items.length > 0) {
    const safeItems = items.map(({ id: _ignoredId, compra_id: _ignoredCompraId, organization_id: _ignoredOrg, ...item }) => ({
      compra_id: compra.id,
      ...item,
    }))

    const { error: errI } = await supabase
      .from('compra_items')
      .insert(safeItems)

    if (errI) throw errI
  }

  console.info('[HeavyMetric][Proveedores] Compra creada con trazabilidad operativa:', {
    compra_id: compra.id,
    proveedor_id: proveedorId,
    total_usd: total,
    organization_id: scopedOrgId,
  })

  return compra
}

export async function recibirCompra(compraId, organizationIdParam = null) {
  const scope = organizationIdParam
    ? { organizationId: organizationIdParam }
    : await getCurrentAuthScope()

  await assertCompraInOrganization(compraId, scope.organizationId)

  const { error } = await supabase.rpc('recibir_compra', { p_compra_id: compraId })
  if (error) throw error

  console.info('[HeavyMetric][Proveedores] Compra recibida con trazabilidad operativa:', {
    compra_id: compraId,
    organization_id: scope.organizationId,
  })
}

// ── Risk score (calculado en cliente, no persiste) ───────────────
export function calcRiskScore(p) {
  let score = 100
  if (p.estado === 'riesgoso') score -= 40
  else if (p.estado === 'inactivo') score -= 20

  score -= (5 - (p.rating ?? 3)) * 10

  const totalEnt = (p.entregas_a_tiempo ?? 0) + (p.entregas_tarde ?? 0)
  if (totalEnt > 0) score -= Math.round((p.entregas_tarde / totalEnt) * 30)

  score -= Math.min(30, (p.incidencias ?? 0) * 10)
  return Math.max(0, Math.min(100, score))
}

export function riskLabel(score) {
  if (score >= 75) return { label: 'Bajo', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' }
  if (score >= 45) return { label: 'Medio', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' }
  return { label: 'Alto', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' }
}

// ── Activos vinculados a un proveedor ────────────────────────────
export async function fetchActivosProveedor(proveedorId, organizationIdParam = null) {
  const scope = organizationIdParam
    ? { organizationId: organizationIdParam }
    : await getCurrentAuthScope()

  await assertProveedorInOrganization(proveedorId, scope.organizationId)

  const { data, error } = await supabase
    .from('proveedor_activos')
    .select('*, maquina:maquinas(id, nombre_unidad, tipo, marca, modelo, estado_operativo)')
    .eq('organization_id', scope.organizationId)
    .eq('proveedor_id', proveedorId)

  if (error) throw error
  return data || []
}

export async function vincularActivo(proveedorId, maquinaId, tipoRelacion = 'service', notas = '', organizationIdParam = null) {
  const scope = organizationIdParam
    ? { organizationId: organizationIdParam }
    : await getCurrentAuthScope()

  await assertProveedorInOrganization(proveedorId, scope.organizationId)
  await assertMaquinaInOrganization(maquinaId, scope.organizationId)

  const { error } = await supabase
    .from('proveedor_activos')
    .upsert(
      {
        organization_id: scope.organizationId,
        proveedor_id: proveedorId,
        maquina_id: maquinaId,
        tipo_relacion: tipoRelacion,
        notas,
      },
      { onConflict: 'proveedor_id,maquina_id' }
    )

  if (error) throw error
}

export async function desvincularActivo(proveedorId, maquinaId, organizationIdParam = null) {
  const scope = organizationIdParam
    ? { organizationId: organizationIdParam }
    : await getCurrentAuthScope()

  await assertProveedorInOrganization(proveedorId, scope.organizationId)
  await assertMaquinaInOrganization(maquinaId, scope.organizationId)

  const { error } = await supabase
    .from('proveedor_activos')
    .delete()
    .eq('organization_id', scope.organizationId)
    .eq('proveedor_id', proveedorId)
    .eq('maquina_id', maquinaId)

  if (error) throw error
}

// ── Centros de costo ─────────────────────────────────────────────
export async function fetchCentrosCosto(organizationIdParam = null) {
  const scope = organizationIdParam
    ? { organizationId: organizationIdParam }
    : await getCurrentAuthScope()

  const { data, error } = await supabase
    .from('centros_costo')
    .select('id, nombre')
    .eq('organization_id', scope.organizationId)
    .eq('activo', true)
    .order('nombre')

  if (error) throw error
  return data || []
}
