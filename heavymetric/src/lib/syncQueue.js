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
    const key = `mut_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    await pendingMutationsStore.setItem(key, mutation)
    console.log(`Mutación encolada: ${key}`, mutation)

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
  } catch (error) {
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
    // Ordenar cronológicamente si es necesario, o basarse en el timestamp guardado

    for (const key of keys) {
      const mutation = await pendingMutationsStore.getItem(key)
      if (!mutation) continue;

      let success = false;

      // Dependiendo de la tabla y tipo
      if (mutation.type === 'INSERT') {
        const { error } = await supabase.from(mutation.table).insert(mutation.payload)
        if (!error) success = true;
        else console.error(`Sincronización fallida [INSERT ${mutation.table}]:`, error)
      } else if (mutation.type === 'UPDATE') {
        // Necesitamos saber la primary key para hacer el match
        const pKey = mutation.pk || 'id'
        const pValue = mutation.payload[pKey]

        if (pValue) {
          const { error } = await supabase.from(mutation.table).update(mutation.payload).eq(pKey, pValue)
          if (!error) success = true;
          else console.error(`Sincronización fallida [UPDATE ${mutation.table}]:`, error)
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