import localforage from 'localforage'
import { supabase } from './supabase'

// Configurar localforage stores
const pendingMutationsStore = localforage.createInstance({
  name: 'heavymetric_field',
  storeName: 'pending_mutations' // Operaciones a sincronizar hacia el server
});

const cacheStore = localforage.createInstance({
  name: 'heavymetric_field',
  storeName: 'cache_data' // Datos cacheados desde el server (OTs, inventario)
});

const ORGANIZATION_CACHE_KEY = 'current_organization_id'
const FORBIDDEN_PAYLOAD_KEYS = new Set(['__proto__', 'prototype', 'constructor'])

// Únicas mutaciones utilizadas actualmente por la aplicación de campo.
const MUTATION_RULES = Object.freeze({
  ordenes_trabajo: {
    types: ['UPDATE'],
    fields: ['id', 'organization_id', 'estado', 'iso_cierre_campo'],
  },
  ot_tiempos: {
    types: ['INSERT'],
    fields: ['organization_id', 'orden_trabajo_id', 'tecnico_id', 'accion', 'latitud', 'longitud', 'created_at', 'iso_evento'],
  },
  ot_checklists: {
    types: ['INSERT', 'UPDATE'],
    fields: ['id', 'organization_id', 'orden_trabajo_id', 'categoria', 'item', 'estado', 'updated_at'],
  },
  ot_evidencias: {
    types: ['INSERT'],
    fields: ['organization_id', 'orden_trabajo_id', 'tecnico_id', 'descripcion', 'observaciones', 'latitud', 'longitud', 'created_at', 'origen', 'estado_sync'],
  },
  ot_firmas: {
    types: ['INSERT'],
    fields: ['organization_id', 'orden_trabajo_id', 'tipo', 'nombre_firmante', 'firma_base64', 'latitud', 'longitud', 'created_at'],
  },
})

let _organizationIdCache = null

const sanitizeValue = (value, depth = 0) => {
  if (depth > 10) return undefined
  if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) return value

  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeValue(item, depth + 1))
      .filter((item) => item !== undefined)
  }

  if (typeof value !== 'object') return undefined

  const sanitized = {}
  for (const [key, nestedValue] of Object.entries(value)) {
    if (FORBIDDEN_PAYLOAD_KEYS.has(key)) continue
    const cleanValue = sanitizeValue(nestedValue, depth + 1)
    if (cleanValue !== undefined) sanitized[key] = cleanValue
  }
  return sanitized
}

const getOrganizationFromCachedOT = async (payload = {}) => {
  const otId = payload.orden_trabajo_id || payload.id
  if (!otId) return null

  const ots = await cacheStore.getItem('my_ots')
  const ot = Array.isArray(ots)
    ? ots.find((item) => String(item?.id) === String(otId))
    : null

  return ot?.organization_id || null
}

const cacheOrganizationId = async (organizationId) => {
  if (!organizationId) return
  _organizationIdCache = organizationId
  await cacheStore.setItem(ORGANIZATION_CACHE_KEY, organizationId)
}

const getServerOrganizationId = async () => {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError
  if (!session?.user?.id) throw new Error('Usuario no autenticado')

  const { data: perfil, error: perfilError } = await supabase
    .from('perfiles')
    .select('organization_id')
    .eq('id', session.user.id)
    .single()

  if (perfilError) throw perfilError
  if (!perfil?.organization_id) throw new Error('No se pudo determinar la organización del usuario')

  await cacheOrganizationId(perfil.organization_id)
  return perfil.organization_id
}

const getOrganizationIdForQueue = async (payload) => {
  if (navigator.onLine) {
    try {
      return await getServerOrganizationId()
    } catch (error) {
      console.warn('syncQueue: no se pudo refrescar la organización desde el servidor:', error.message)
    }
  }

  const cachedOTOrganizationId = await getOrganizationFromCachedOT(payload)
  if (cachedOTOrganizationId) {
    await cacheOrganizationId(cachedOTOrganizationId)
    return cachedOTOrganizationId
  }

  if (_organizationIdCache) return _organizationIdCache
  return cacheStore.getItem(ORGANIZATION_CACHE_KEY)
}

const sanitizeMutation = (mutation, organizationId) => {
  if (!mutation || typeof mutation !== 'object' || Array.isArray(mutation)) {
    throw new Error('Formato de mutación inválido')
  }

  const table = String(mutation.table || '')
  const type = String(mutation.type || '').toUpperCase()
  const rule = MUTATION_RULES[table]

  if (!rule || !rule.types.includes(type)) {
    throw new Error(`Mutación no autorizada: ${type || 'SIN_TIPO'} ${table || 'SIN_TABLA'}`)
  }

  if (!organizationId) throw new Error('organization_id es obligatorio')
  if (!mutation.payload || typeof mutation.payload !== 'object' || Array.isArray(mutation.payload)) {
    throw new Error('Payload de mutación inválido')
  }

  const payload = {}
  for (const field of rule.fields) {
    if (field === 'organization_id' || !Object.prototype.hasOwnProperty.call(mutation.payload, field)) continue
    const cleanValue = sanitizeValue(mutation.payload[field])
    if (cleanValue !== undefined) payload[field] = cleanValue
  }

  // Nunca confiar en organization_id provisto por el llamador.
  payload.organization_id = organizationId

  if (type === 'UPDATE' && !payload.id) {
    throw new Error(`UPDATE ${table} sin id`)
  }

  return {
    type,
    table,
    ...(type === 'UPDATE' ? { pk: 'id' } : {}),
    payload,
    ...(mutation.id ? { id: sanitizeValue(mutation.id) } : {}),
    ...(mutation.timestamp ? { timestamp: sanitizeValue(mutation.timestamp) } : {}),
  }
}

// Guardar datos en caché (lectura)
export const setCache = async (key, data) => {
  try {
    await cacheStore.setItem(key, data)
  } catch (error) {
    console.error('Error al guardar en caché:', error)
  }
}

// Obtener datos de caché
export const getCache = async (key) => {
  try {
    return await cacheStore.getItem(key)
  } catch (error) {
    console.error('Error al leer de caché:', error)
    return null
  }
}

// Agregar una mutación a la cola (escritura)
// mutation = { id: uuid, type: 'INSERT|UPDATE', table: 'string', payload: object, timestamp: number }
export const queueMutation = async (mutation) => {
  try {
    const organizationId = await getOrganizationIdForQueue(mutation?.payload)
    const safeMutation = sanitizeMutation(mutation, organizationId)
    const key = `mut_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    await pendingMutationsStore.setItem(key, safeMutation)
    console.log(`Mutación encolada: ${key}`, safeMutation)

    // Intentar sincronizar inmediatamente si hay conexión.
    // Sin await: queueMutation no espera al sync completo para resolver.
    // .catch: captura errores que antes producían Unhandled Promise Rejection.
    if (navigator.onLine) {
      syncAllToSupabase().catch((err) =>
        console.warn('syncQueue: auto-sync fallido tras encolar mutación:', err)
      )
    }
  } catch (error) {
    console.error('Error al encolar mutación:', error)
  }
}

// Obtener todas las mutaciones pendientes
export const getPendingMutationsCount = async () => {
  try {
    const keys = await pendingMutationsStore.keys()
    return keys.length
  } catch {
    return 0
  }
}

// Lock interno de módulo: evita ejecuciones concurrentes de syncAllToSupabase.
// No es parte de la interfaz pública. AppCampo, OTMobileDetail y OTMobileList
// no necesitan cambios: el lock es transparente para todos los llamadores.
let _syncInProgress = false

// Sincronizar hacia Supabase
export const syncAllToSupabase = async () => {
  if (!navigator.onLine) return;

  // Si ya hay un sync corriendo, salir sin duplicar trabajo.
  if (_syncInProgress) {
    console.warn('syncQueue: sync ya en curso, se omite invocación concurrente.')
    return
  }

  _syncInProgress = true

  try {
    const keys = await pendingMutationsStore.keys()
    if (keys.length === 0) return

    // El tenant se obtiene nuevamente del servidor. Además, esto migra de
    // forma segura las mutaciones antiguas que todavía no lo almacenaban.
    const organizationId = await getServerOrganizationId()
    // Ordenar cronológicamente si es necesario, o basarse en el timestamp guardado

    for (const key of keys) {
      const mutation = await pendingMutationsStore.getItem(key)
      if (!mutation) continue;

      let success = false;

      let safeMutation
      try {
        safeMutation = sanitizeMutation(mutation, organizationId)
      } catch (error) {
        console.warn(`syncQueue: se descarta la mutación no autorizada ${key}:`, error.message)
        await pendingMutationsStore.removeItem(key)
        continue
      }

      // Dependiendo de la tabla y tipo
      if (safeMutation.type === 'INSERT') {
        const { error } = await supabase.from(safeMutation.table).insert(safeMutation.payload)
        if (!error) success = true;
        else console.error(`Sincronización fallida [INSERT ${safeMutation.table}]:`, error)
      } else if (safeMutation.type === 'UPDATE') {
        const pValue = safeMutation.payload.id

        if (pValue) {
          const { error } = await supabase
            .from(safeMutation.table)
            .update(safeMutation.payload)
            .eq('id', pValue)
            .eq('organization_id', organizationId)
          if (!error) success = true;
          else console.error(`Sincronización fallida [UPDATE ${safeMutation.table}]:`, error)
        }
      }

      if (success) {
        await pendingMutationsStore.removeItem(key)
      }
    }
  } catch (error) {
    console.error('Error general de sincronización:', error)
    throw error
  } finally {
    // Liberar el lock siempre, incluso si hubo error o throw.
    _syncInProgress = false
  }
}

// Eliminar mutaciones pendientes que coincidan con un criterio.
// Permite que saveChecklist reemplace INSERTs anteriores del mismo checklist
// en vez de acumularlos, evitando duplicación en ot_checklists.
// No afecta ninguna otra función ni ningún consumidor existente.
export const clearPendingMutationsByTable = async (table, matchFn) => {
  try {
    if (!MUTATION_RULES[table] || typeof matchFn !== 'function') {
      console.warn(`syncQueue: no se permite limpiar mutaciones de la tabla ${table}`)
      return
    }

    const keys = await pendingMutationsStore.keys()
    for (const key of keys) {
      const mutation = await pendingMutationsStore.getItem(key)
      if (mutation && mutation.table === table && matchFn(mutation)) {
        await pendingMutationsStore.removeItem(key)
      }
    }
  } catch (error) {
    console.warn('syncQueue: error al limpiar mutaciones pendientes:', error)
  }
}

// Sincronizar desde Supabase (fetch initial state para offline)
export const fetchAndCacheAssignments = async (tecnicoId) => {
  if (!navigator.onLine) return;

  try {
    // 1. OTs asignadas al técnico que no estén completadas ni facturadas
    const { data: ots, error: errorOTs } = await supabase
      .from('ordenes_trabajo')
      .select('*, maquinas(nombre_unidad, marca, modelo), clientes(razon_social)')
      .eq('operativo_id', tecnicoId)
      .not('estado', 'in', '("completada", "facturada", "cancelada")');

    if (errorOTs) throw errorOTs;
    await setCache('my_ots', ots);

    // 2. Repuestos de las OTs
    if (ots && ots.length > 0) {
      const otIds = ots.map(o => o.id);
      const { data: repuestos, error: errorRep } = await supabase
        .from('ot_repuestos')
        .select('*, inventario(nombre_repuesto, sku_codigo)')
        .in('orden_trabajo_id', otIds);

      if (!errorRep) await setCache('ot_repuestos', repuestos);

      // Checklists
      const { data: checklists, error: errorChk } = await supabase
        .from('ot_checklists')
        .select('*')
        .in('orden_trabajo_id', otIds);

      if (!errorChk) await setCache('ot_checklists', checklists);
    }

    // 3. Catálogo de Inventario (para solicitar/usar)
    // Para simplificar caché traemos todo o solo los activos
    const { data: catalogo, error: errorCat } = await supabase
      .from('inventario')
      .select('id, sku_codigo, nombre_repuesto, stock_actual, precio_base_usd')
      .eq('activo', true);

    if (!errorCat) await setCache('catalogo_inventario', catalogo);

  } catch (error) {
    console.error('Error al hacer pull de datos para offline:', error)
  }
}
