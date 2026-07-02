import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// ────────────────────────────────────────────────────────────────
// HeavyMetric - Leads
// Seguridad multitenancy + trazabilidad operativa ISO
// Regla: ninguna operación sensible sin organization_id.
// ────────────────────────────────────────────────────────────────

function getOrganizationId(auth) {
  return (
    auth?.profile?.organization_id ||
    auth?.perfil?.organization_id ||
    auth?.user?.user_metadata?.organization_id ||
    auth?.organizationId ||
    null
  )
}

async function getCurrentAuthScope() {
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError) throw authError

  const user = authData?.user
  if (!user) throw new Error('Usuario no autenticado')

  const { data: perfil, error: perfilError } = await supabase
    .from('perfiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (perfilError) throw perfilError
  if (!perfil?.organization_id) {
    throw new Error('No se pudo determinar la organización del usuario')
  }

  return {
    userId: user.id,
    organizationId: perfil.organization_id,
  }
}

async function assertLeadInOrganization(leadId, organizationId) {
  const { data, error } = await supabase
    .from('leads')
    .select('id, organization_id')
    .eq('id', leadId)
    .eq('organization_id', organizationId)
    .single()

  if (error) throw error
  return data
}

// ── Scoring ──────────────────────────────────────────────────────
export function calcularScore(rubro, origen, mensaje, empresa) {
  const rubroScore = {
    Mineria: 35,
    Vial: 30,
    Construccion: 25,
    Agro: 20,
    Industrial: 15,
    Municipio: 10,
  }

  const origenScore = {
    Licitacion: 25,
    Referido: 22,
    Web: 18,
    Meta: 15,
    WhatsApp: 12,
    Manual: 5,
  }

  let score = 0
  score += rubroScore[rubro] || 0
  score += origenScore[origen] || 0

  const texto = `${mensaje || ''} ${empresa || ''}`.toLowerCase()

  if (/compra|licitac|urgen|inmedia/.test(texto)) score += 25
  else if (/alquil|renta|arrend/.test(texto)) score += 20
  else if (/servic|manten|repar/.test(texto)) score += 15
  else score += 10

  if (empresa && empresa.trim()) score += 15

  const grade = score >= 70 ? 'A' : score >= 40 ? 'B' : 'C'
  return { score, grade }
}

export function useLeads({ page = 1, pageSize = 50, search = '', estado = 'todos' } = {}) {
  const auth = useAuth()
  const organizationId = getOrganizationId(auth)
  const queryClient = useQueryClient()

  const {
    data = { leads: [], totalCount: 0 },
    isLoading: loading,
    error: queryError,
    refetch: fetchLeads,
  } = useQuery({
    queryKey: ['leads', organizationId, page, pageSize, search, estado],
    queryFn: async ({ signal }) => {
      await waitForQuery(400, signal)

      let query = supabase
        .from('leads')
        .select(`
          *,
          asignado:responsable_id(nombre_completo),
          cliente:clientes(razon_social),
          cotizaciones(count)
        `, { count: 'exact' })
        .eq('organization_id', organizationId)

      if (search && search.trim() !== '') {
        const q = search.trim()
        query = query.or(`nombre.ilike.%${q}%,empresa.ilike.%${q}%,telefono.ilike.%${q}%,email.ilike.%${q}%,origen.ilike.%${q}%,rubro.ilike.%${q}%,producto_interes.ilike.%${q}%`)
      }

      if (estado !== 'todos') {
        query = query.eq('estado', estado)
      }

      // Pagination
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to).order('created_at', { ascending: false })

      const { data: leads, count, error } = await query
      if (error) throw error

      return { leads: leads || [], totalCount: count || 0 }
    },
    enabled: !!organizationId,
  })

  const invalidateLeads = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['leads', organizationId] }),
      queryClient.invalidateQueries({ queryKey: ['leads_kpis', organizationId] }),
      queryClient.invalidateQueries({ queryKey: ['leads_options', organizationId] }),
    ])
  }

  const invalidateClientes = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['clientes', organizationId] }),
      queryClient.invalidateQueries({ queryKey: ['clientes_kpis', organizationId] }),
      queryClient.invalidateQueries({ queryKey: ['clientes_options', organizationId] }),
    ])
  }

  const crearLead = async (payload) => {
    if (!organizationId) throw new Error('No se pudo determinar la organización')

    const { score, grade } = calcularScore(
      payload.rubro,
      payload.origen,
      payload.mensaje,
      payload.empresa
    )

    const { id: _ignoredId, organization_id: _ignoredOrg, created_by: _ignoredCreatedBy, ...safePayload } = payload

    const userId = auth?.user?.id || auth?.perfil?.id

    const { data, error: err } = await supabase
      .from('leads')
      .insert([{
        ...safePayload,
        organization_id: organizationId,
        created_by: userId,
        lead_score: score,
        lead_grade: grade,
      }])
      .select()
      .single()

    if (err) throw err
    await invalidateLeads()
    return data
  }

  const actualizarLead = async (id, payload) => {
    if (!organizationId) throw new Error('No se pudo determinar la organización')

    const { score, grade } = calcularScore(
      payload.rubro,
      payload.origen,
      payload.mensaje,
      payload.empresa
    )

    const { id: _ignoredId, organization_id: _ignoredOrg, created_by: _ignoredCreatedBy, ...safePayload } = payload

    const { error: err } = await supabase
      .from('leads')
      .update({
        ...safePayload,
        lead_score: score,
        lead_grade: grade,
      })
      .eq('id', id)
      .eq('organization_id', organizationId)

    if (err) throw err
    await invalidateLeads()
  }

  const avanzarEstado = async (id, nuevoEstado, estadoAnterior) => {
    if (!organizationId) throw new Error('No se pudo determinar la organización')

    await assertLeadInOrganization(id, organizationId)

    const { error: err } = await supabase
      .from('leads')
      .update({ estado: nuevoEstado })
      .eq('id', id)
      .eq('organization_id', organizationId)

    if (err) throw err

    if (estadoAnterior) {
      const { error: actividadError } = await supabase
        .from('lead_actividades')
        .insert({
          organization_id: organizationId,
          lead_id: id,
          tipo: 'cambio_estado',
          descripcion: `Estado cambiado de "${estadoAnterior}" a "${nuevoEstado}"`,
          datos: { de: estadoAnterior, a: nuevoEstado },
        })

      if (actividadError) throw actividadError
    }

    await invalidateLeads()
  }

  const registrarContacto = async (id) => {
    if (!organizationId) throw new Error('No se pudo determinar la organización')

    await assertLeadInOrganization(id, organizationId)

    const ahora = new Date().toISOString()

    const { error: err } = await supabase
      .from('leads')
      .update({ ultimo_contacto: ahora })
      .eq('id', id)
      .eq('organization_id', organizationId)

    if (err) throw err

    const { error: actividadError } = await supabase
      .from('lead_actividades')
      .insert({
        organization_id: organizationId,
        lead_id: id,
        tipo: 'contacto',
        descripcion: 'Contacto registrado manualmente',
      })

    if (actividadError) throw actividadError

    await invalidateLeads()
  }

  const convertirACliente = async (lead) => {
    if (!organizationId) throw new Error('No se pudo determinar la organización')
    await assertLeadInOrganization(lead.id, organizationId)

    const { data: cliente, error: errC } = await supabase
      .from('clientes')
      .insert([{
        organization_id: organizationId,
        razon_social: lead.empresa || lead.nombre,
        nombre_comercial: lead.empresa || lead.nombre,
        email: lead.email,
        telefono: lead.telefono,
        rubro: lead.rubro,
        propension_compra: lead.lead_grade,
      }])
      .select()
      .single()

    if (errC) throw errC

    const { error: errL } = await supabase
      .from('leads')
      .update({
        estado: 'Ganado',
        cliente_id: cliente.id,
      })
      .eq('id', lead.id)
      .eq('organization_id', organizationId)

    if (errL) throw errL

    const { error: actividadError } = await supabase
      .from('lead_actividades')
      .insert({
        organization_id: organizationId,
        lead_id: lead.id,
        tipo: 'sistema',
        descripcion: 'Lead convertido a cliente',
      })

    if (actividadError) throw actividadError

    await Promise.all([invalidateLeads(), invalidateClientes()])
    return cliente
  }

  const convertirAVenta = async (lead) => {
    if (!organizationId) throw new Error('No se pudo determinar la organización')
    await assertLeadInOrganization(lead.id, organizationId)

    if (!lead.cliente_id) throw new Error('Debe ser cliente primero')
    if (!lead.monto_estimado_usd || lead.monto_estimado_usd <= 0) {
      throw new Error('El monto estimado debe ser mayor a 0')
    }

    const { data: tx, error: errTx } = await supabase
      .from('transacciones')
      .insert([{
        organization_id: organizationId,
        tipo_documento: 'Presupuesto',
        origen_tipo: 'otro',
        cliente_id: lead.cliente_id,
        monto_neto_usd: lead.monto_estimado_usd,
        monto_total_usd: lead.monto_estimado_usd,
        estado_pago: 'pendiente',
        notas: `Venta generada desde Lead: ${lead.producto_interes || 'N/A'}`,
      }])
      .select()
      .single()

    if (errTx) throw errTx

    const { error: actividadError } = await supabase
      .from('lead_actividades')
      .insert({
        organization_id: organizationId,
        lead_id: lead.id,
        tipo: 'sistema',
        descripcion: `Venta generada (Presupuesto) por USD ${lead.monto_estimado_usd}`,
      })

    if (actividadError) throw actividadError

    await invalidateLeads()
    return tx
  }

  const generarPostventa = async (lead) => {
    if (!organizationId) throw new Error('No se pudo determinar la organización')
    await assertLeadInOrganization(lead.id, organizationId)

    const { data: newLead, error: err } = await supabase
      .from('leads')
      .insert([{
        organization_id: organizationId,
        pipeline: 'postventa',
        estado: 'Reclamo',
        nombre: lead.nombre,
        empresa: lead.empresa,
        telefono: lead.telefono,
        email: lead.email,
        rubro: lead.rubro,
        cliente_id: lead.cliente_id,
        origen: 'Sistema',
        prioridad: lead.prioridad,
        notas: `Generado desde venta ganada. Lead Origen: ${lead.id}`,
      }])
      .select()
      .single()

    if (err) throw err

    const { error: actividadError } = await supabase
      .from('lead_actividades')
      .insert({
        organization_id: organizationId,
        lead_id: lead.id,
        tipo: 'sistema',
        descripcion: 'Lead derivado a Postventa',
      })

    if (actividadError) throw actividadError

    await invalidateLeads()
    return newLead
  }

  return {
    leads: data.leads,
    totalCount: data.totalCount,
    loading,
    error: queryError ? (queryError.message || 'Error al cargar leads') : null,
    fetchLeads,
    crearLead,
    actualizarLead,
    avanzarEstado,
    registrarContacto,
    convertirACliente,
    convertirAVenta,
    generarPostventa,
  }
}

export function useLeadsKpis() {
  const auth = useAuth()
  const organizationId = getOrganizationId(auth)

  const {
    data: kpis = { total: 0, abiertos: 0, cotizados: 0, ganados: 0, sinSeguimiento: 0 },
    isLoading: loading,
    refetch: fetchKpis,
  } = useQuery({
    queryKey: ['leads_kpis', organizationId],
    queryFn: async () => {
      const baseQuery = () => supabase.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId)

      const [
        { count: total, error: totalError },
        { count: abiertos, error: abiertosError },
        { count: ganados, error: ganadosError },
        { count: cotizados, error: cotizadosError },
        { count: sinSeguimiento, error: seguimientoError }
      ] = await Promise.all([
        baseQuery(),
        baseQuery().not('estado', 'in', '("Ganado","Perdido")'),
        baseQuery().eq('estado', 'Ganado'),
        baseQuery().eq('estado', 'Cotizado'),
        baseQuery().is('proximo_seguimiento', null).not('estado', 'in', '("Ganado","Perdido")')
      ])

      const error = totalError || abiertosError || ganadosError || cotizadosError || seguimientoError
      if (error) throw error

      return {
        total: total || 0,
        abiertos: abiertos || 0,
        ganados: ganados || 0,
        cotizados: cotizados || 0,
        sinSeguimiento: sinSeguimiento || 0,
      }
    },
    enabled: !!organizationId,
  })

  return { kpis, loading, fetchKpis }
}

export function useLeadsOptions() {
  const auth = useAuth()
  const organizationId = getOrganizationId(auth)

  const {
    data: opciones = [],
    isLoading: loading,
    refetch: fetchOptions,
  } = useQuery({
    queryKey: ['leads_options', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, nombre, empresa, telefono, email')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!organizationId,
  })

  return { opciones, loading, fetchOptions }
}

// ── Actividades usadas en LeadDetalle ────────────────────────────
export async function fetchActividades(leadId, organizationIdParam = null) {
  const scope = organizationIdParam
    ? { organizationId: organizationIdParam }
    : await getCurrentAuthScope()

  await assertLeadInOrganization(leadId, scope.organizationId)

  const { data, error } = await supabase
    .from('lead_actividades')
    .select('*, creado_por:perfiles(nombre_completo)')
    .eq('lead_id', leadId)
    .eq('organization_id', scope.organizationId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return data || []
}

export async function agregarActividad(
  leadId,
  tipo,
  descripcion,
  datos = null,
  organizationIdParam = null
) {
  const scope = organizationIdParam
    ? { organizationId: organizationIdParam }
    : await getCurrentAuthScope()

  await assertLeadInOrganization(leadId, scope.organizationId)

  const { error } = await supabase
    .from('lead_actividades')
    .insert({
      organization_id: scope.organizationId,
      lead_id: leadId,
      tipo,
      descripcion,
      datos,
    })

  if (error) throw error
}

// ── Tareas usadas en LeadDetalle ─────────────────────────────────
export async function fetchTareas(leadId, organizationIdParam = null) {
  const scope = organizationIdParam
    ? { organizationId: organizationIdParam }
    : await getCurrentAuthScope()

  await assertLeadInOrganization(leadId, scope.organizationId)

  const { data, error } = await supabase
    .from('lead_tareas')
    .select('*, asignado_a:perfiles(nombre_completo)')
    .eq('lead_id', leadId)
    .eq('organization_id', scope.organizationId)
    .order('vencimiento', { ascending: true, nullsFirst: false })

  if (error) throw error
  return data || []
}

export async function crearTarea(leadId, payload, organizationIdParam = null) {
  const scope = organizationIdParam
    ? { organizationId: organizationIdParam }
    : await getCurrentAuthScope()

  await assertLeadInOrganization(leadId, scope.organizationId)

  const { id: _ignoredId, organization_id: _ignoredOrg, ...safePayload } = payload

  const { error } = await supabase
    .from('lead_tareas')
    .insert({
      ...safePayload,
      organization_id: scope.organizationId,
      lead_id: leadId,
    })

  if (error) throw error

  await agregarActividad(
    leadId,
    'tarea_creada',
    `Tarea creada: "${payload.titulo}"`,
    null,
    scope.organizationId
  )
}

export async function completarTarea(tareaId, leadId, organizationIdParam = null) {
  const scope = organizationIdParam
    ? { organizationId: organizationIdParam }
    : await getCurrentAuthScope()

  await assertLeadInOrganization(leadId, scope.organizationId)

  const { error } = await supabase
    .from('lead_tareas')
    .update({ completada: true })
    .eq('id', tareaId)
    .eq('lead_id', leadId)
    .eq('organization_id', scope.organizationId)

  if (error) throw error

  await agregarActividad(
    leadId,
    'sistema',
    'Tarea completada',
    null,
    scope.organizationId
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
