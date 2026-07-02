import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// ────────────────────────────────────────────────────────────────
// HeavyMetric - Inventario
// Seguridad multitenancy + trazabilidad operativa ISO
// Regla: ningún repuesto/ítem sin organization_id.
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

export function useInventario({ page = 1, pageSize = 12, search = '' } = {}) {
  const auth = useAuth()
  const organizationId = getOrganizationId(auth)
  const queryClient = useQueryClient()

  const {
    data = { items: [], totalCount: 0 },
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: ['inventario', organizationId, page, pageSize, search],
    queryFn: async ({ signal }) => {
      await waitForQuery(400, signal)

      let query = supabase
        .from('repuestos')
        .select('*', { count: 'exact' })
        .eq('organization_id', organizationId)
        .eq('activo', true)

      if (search && search.trim() !== '') {
        const q = search.trim()
        query = query.or(`nombre.ilike.%${q}%,sku.ilike.%${q}%`)
      }

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to).order('nombre')

      const { data: items, count, error } = await query
      if (error) throw error

      return { items: items || [], totalCount: count || 0 }
    },
    enabled: !!organizationId,
    placeholderData: keepPreviousData,
  })

  const invalidateInventario = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['inventario', organizationId] }),
      queryClient.invalidateQueries({ queryKey: ['inventario_kpis', organizationId] }),
      queryClient.invalidateQueries({ queryKey: ['inventario_options', organizationId] }),
    ])
  }

  const ajustarStockMutation = useMutation({
    mutationFn: async ({ itemId, cantidad, tipo }) => {
      if (!organizationId) throw new Error('No se pudo determinar la organización')
      if (!['entrada', 'salida'].includes(tipo)) throw new Error('Tipo de movimiento inválido')

      const cantidadNumerica = Number(cantidad)
      if (!Number.isFinite(cantidadNumerica) || cantidadNumerica <= 0) {
        throw new Error('La cantidad debe ser mayor a cero')
      }

      const { data: item, error: errItem } = await supabase
        .from('repuestos')
        .select('id, organization_id, nombre, stock_actual')
        .eq('id', itemId)
        .eq('organization_id', organizationId)
        .single()

      if (errItem) throw errItem
      if (!item) throw new Error('Item no encontrado')

      const stockActual = Number(item.stock_actual || 0)
      const nuevoStock = tipo === 'entrada'
        ? stockActual + cantidadNumerica
        : stockActual - cantidadNumerica

      if (nuevoStock < 0) throw new Error('Stock insuficiente para registrar la salida.')

      const { error } = await supabase
        .from('repuestos')
        .update({ stock_actual: nuevoStock })
        .eq('id', itemId)
        .eq('organization_id', organizationId)

      if (error) throw error

      console.info('[HeavyMetric][Inventario] Ajuste de stock con trazabilidad operativa:', {
        item_id: itemId,
        repuesto: item.nombre,
        tipo,
        cantidad: cantidadNumerica,
        stock_anterior: stockActual,
        stock_nuevo: nuevoStock,
        organization_id: organizationId,
      })
    },
    onSuccess: invalidateInventario,
  })

  const updatePrecioMutation = useMutation({
    mutationFn: async ({ itemId, nuevoPrecio }) => {
      if (!organizationId) throw new Error('No se pudo determinar la organización')

      const precioNumerico = Number(nuevoPrecio)
      if (!Number.isFinite(precioNumerico) || precioNumerico < 0) {
        throw new Error('El precio debe ser un número válido')
      }

      const { error } = await supabase
        .from('repuestos')
        .update({ precio_usd: precioNumerico })
        .eq('id', itemId)
        .eq('organization_id', organizationId)

      if (error) throw error

      console.info('[HeavyMetric][Inventario] Precio actualizado con trazabilidad operativa:', {
        item_id: itemId,
        precio_usd: precioNumerico,
        organization_id: organizationId,
      })
    },
    onSuccess: invalidateInventario,
  })

  const crearItemMutation = useMutation({
    mutationFn: async (itemData) => {
      if (!organizationId) throw new Error('No se pudo determinar la organización')

      const { id: _ignoredId, organization_id: _ignoredOrg, ...safeItemData } = itemData
      const { data: item, error } = await supabase
        .from('repuestos')
        .insert([{
          ...safeItemData,
          organization_id: organizationId,
          activo: safeItemData.activo ?? true,
        }])
        .select()
        .single()

      if (error) throw error

      console.info('[HeavyMetric][Inventario] Item creado con trazabilidad operativa:', {
        item_id: item.id,
        repuesto: item.nombre,
        organization_id: organizationId,
      })

      return item
    },
    onSuccess: invalidateInventario,
  })

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      if (!organizationId) throw new Error('No se pudo determinar la organización')

      const { error } = await supabase
        .from('repuestos')
        .update(payload)
        .eq('id', id)
        .eq('organization_id', organizationId)

      if (error) throw error
    },
    onSuccess: invalidateInventario,
  })

  const archivarItemMutation = useMutation({
    mutationFn: async (itemId) => {
      if (!organizationId) throw new Error('No se pudo determinar la organización')

      const { error } = await supabase
        .from('repuestos')
        .update({ activo: false })
        .eq('id', itemId)
        .eq('organization_id', organizationId)

      if (error) throw error

      console.info('[HeavyMetric][Inventario] Item archivado con trazabilidad operativa:', {
        item_id: itemId,
        organization_id: organizationId,
      })
    },
    onSuccess: invalidateInventario,
  })

  const error = queryError
    ? (queryError.message || 'Error al cargar inventario')
    : ajustarStockMutation.error
      ? (ajustarStockMutation.error.message || 'Error al ajustar stock')
      : updatePrecioMutation.error
        ? (updatePrecioMutation.error.message || 'Error al actualizar precio')
        : crearItemMutation.error
          ? (crearItemMutation.error.message || 'Error al crear item de inventario')
          : updateItemMutation.error
            ? (updateItemMutation.error.message || 'Error al actualizar item')
            : archivarItemMutation.error
              ? (archivarItemMutation.error.message || 'Error al archivar item de inventario')
              : null

  return {
    items: data.items,
    totalCount: data.totalCount,
    loading,
    error,
    fetchItems: invalidateInventario,
    ajustarStock: (itemId, cantidad, tipo) => ajustarStockMutation.mutateAsync({ itemId, cantidad, tipo }),
    updatePrecio: (itemId, nuevoPrecio) => updatePrecioMutation.mutateAsync({ itemId, nuevoPrecio }),
    crearItem: (itemData) => crearItemMutation.mutateAsync(itemData),
    updateItem: (id, payload) => updateItemMutation.mutateAsync({ id, payload }),
    archivarItem: (itemId) => archivarItemMutation.mutateAsync(itemId),
  }
}

export function useInventarioKpis() {
  const auth = useAuth()
  const organizationId = getOrganizationId(auth)

  const {
    data: kpis = { total: 0, sin_disponibilidad: 0, bajo_minimo: 0 },
    isLoading: loading,
    refetch: fetchKpis,
  } = useQuery({
    queryKey: ['inventario_kpis', organizationId],
    queryFn: async () => {
      const baseQuery = () => supabase
        .from('repuestos')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('activo', true)

      const [totalResult, disponibilidadResult, itemsResult] = await Promise.all([
        baseQuery(),
        baseQuery().lte('stock_actual', 0),
        supabase
          .from('repuestos')
          .select('stock_actual, stock_minimo')
          .eq('organization_id', organizationId)
          .eq('activo', true)
          .gt('stock_actual', 0),
      ])

      const error = totalResult.error || disponibilidadResult.error || itemsResult.error
      if (error) throw error

      const bajo_minimo = (itemsResult.data || [])
        .filter(item => Number(item.stock_actual) <= Number(item.stock_minimo)).length

      return {
        total: totalResult.count || 0,
        sin_disponibilidad: disponibilidadResult.count || 0,
        bajo_minimo,
      }
    },
    enabled: !!organizationId,
  })

  return { kpis, loading, fetchKpis }
}

export function useInventarioOptions() {
  const auth = useAuth()
  const organizationId = getOrganizationId(auth)

  const {
    data: opciones = [],
    isLoading: loading,
    refetch: fetchOptions,
  } = useQuery({
    queryKey: ['inventario_options', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('repuestos')
        .select('id, nombre, sku, stock_actual, precio_usd, costo_usd, unidad')
        .eq('organization_id', organizationId)
        .eq('activo', true)
        .order('nombre')

      if (error) throw error
      return data || []
    },
    enabled: !!organizationId,
  })

  return { opciones, loading, fetchOptions }
}
