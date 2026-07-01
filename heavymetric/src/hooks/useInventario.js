import { useState, useEffect, useCallback } from 'react'
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

export function useInventario({ page = 1, pageSize = 12, search = '' } = {}) {
  const auth = useAuth()
  const organizationId = getOrganizationId(auth)

  const [items, setItems] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      if (!organizationId) {
        setItems([])
        setTotalCount(0)
        return
      }

      let query = supabase
        .from('repuestos')
        .select('*', { count: 'exact' })
        .eq('organization_id', organizationId)
        .eq('activo', true)

      if (search && search.trim() !== '') {
        const q = search.trim()
        query = query.or(`nombre.ilike.%${q}%,sku.ilike.%${q}%`)
      }

      // Pagination
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to).order('nombre')

      const { data, count, error: err } = await query

      if (err) throw err
      setItems(data || [])
      setTotalCount(count || 0)
    } catch (err) {
      setError(err.message || 'Error al cargar inventario')
    } finally {
      setLoading(false)
    }
  }, [organizationId, page, pageSize, search])

  const ajustarStock = async (itemId, cantidad, tipo) => {
    try {
      if (!organizationId) throw new Error('No se pudo determinar la organización')
      if (!['entrada', 'salida'].includes(tipo)) {
        throw new Error('Tipo de movimiento inválido')
      }

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

      if (nuevoStock < 0) {
        throw new Error('Stock insuficiente para registrar la salida.')
      }

      const { error: err } = await supabase
        .from('repuestos')
        .update({ stock_actual: nuevoStock })
        .eq('id', itemId)
        .eq('organization_id', organizationId)

      if (err) throw err

      console.info('[HeavyMetric][Inventario] Ajuste de stock con trazabilidad operativa:', {
        item_id: itemId,
        repuesto: item.nombre,
        tipo,
        cantidad: cantidadNumerica,
        stock_anterior: stockActual,
        stock_nuevo: nuevoStock,
        organization_id: organizationId,
      })

      await fetchItems()
    } catch (err) {
      setError(err.message || 'Error al ajustar stock')
      throw err
    }
  }

  const updatePrecio = async (itemId, nuevoPrecio) => {
    try {
      if (!organizationId) throw new Error('No se pudo determinar la organización')

      const precioNumerico = Number(nuevoPrecio)
      if (!Number.isFinite(precioNumerico) || precioNumerico < 0) {
        throw new Error('El precio debe ser un número válido')
      }

      const { error: err } = await supabase
        .from('repuestos')
        .update({ precio_usd: precioNumerico })
        .eq('id', itemId)
        .eq('organization_id', organizationId)

      if (err) throw err

      console.info('[HeavyMetric][Inventario] Precio actualizado con trazabilidad operativa:', {
        item_id: itemId,
        precio_usd: precioNumerico,
        organization_id: organizationId,
      })

      await fetchItems()
    } catch (err) {
      setError(err.message || 'Error al actualizar precio')
      throw err
    }
  }

  const crearItem = async (itemData) => {
    try {
      if (!organizationId) throw new Error('No se pudo determinar la organización')

      const { id: _ignoredId, organization_id: _ignoredOrg, ...safeItemData } = itemData

      const { data, error: err } = await supabase
        .from('repuestos')
        .insert([{
          ...safeItemData,
          organization_id: organizationId,
          activo: safeItemData.activo ?? true,
        }])
        .select()
        .single()

      if (err) throw err

      console.info('[HeavyMetric][Inventario] Item creado con trazabilidad operativa:', {
        item_id: data.id,
        repuesto: data.nombre,
        organization_id: organizationId,
      })

      await fetchItems()
      return data
    } catch (err) {
      setError(err.message || 'Error al crear item de inventario')
      throw err
    }
  }
  
  const updateItem = async (id, payload) => {
    try {
      if (!organizationId) throw new Error('No se pudo determinar la organización')

      const { error: err } = await supabase
        .from('repuestos')
        .update(payload)
        .eq('id', id)
        .eq('organization_id', organizationId)

      if (err) throw err

      await fetchItems()
    } catch (err) {
      setError(err.message || 'Error al actualizar item')
      throw err
    }
  }

  const archivarItem = async (itemId) => {
    try {
      if (!organizationId) throw new Error('No se pudo determinar la organización')

      const { error: err } = await supabase
        .from('repuestos')
        .update({ activo: false })
        .eq('id', itemId)
        .eq('organization_id', organizationId)

      if (err) throw err

      console.info('[HeavyMetric][Inventario] Item archivado con trazabilidad operativa:', {
        item_id: itemId,
        organization_id: organizationId,
      })

      await fetchItems()
    } catch (err) {
      setError(err.message || 'Error al archivar item de inventario')
      throw err
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchItems()
    }, 400)
    return () => clearTimeout(timer)
  }, [fetchItems])

  return {
    items,
    totalCount,
    loading,
    error,
    fetchItems,
    ajustarStock,
    updatePrecio,
    crearItem,
    updateItem,
    archivarItem,
  }
}

export function useInventarioKpis() {
  const auth = useAuth()
  const organizationId = getOrganizationId(auth)
  
  const [kpis, setKpis] = useState({ total: 0, sin_disponibilidad: 0, bajo_minimo: 0 })
  const [loading, setLoading] = useState(true)

  const fetchKpis = useCallback(async () => {
    if (!organizationId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      const baseQuery = () => supabase.from('repuestos').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('activo', true)

      // Workaround for comparing two columns (stock_actual <= stock_minimo) without RPC is difficult in Supabase head queries unless we use raw sql or rpc. 
      // But we can just fetch the minimal data and count it if RPC is not an option.
      // Since we need `stock_actual <= stock_minimo`, let's just do a lightweight fetch of those two columns.
      
      const [
        { count: total },
        { count: sin_disponibilidad },
        { data: allItems }
      ] = await Promise.all([
        baseQuery(),
        baseQuery().lte('stock_actual', 0),
        supabase.from('repuestos').select('stock_actual, stock_minimo').eq('organization_id', organizationId).eq('activo', true).gt('stock_actual', 0)
      ])

      const bajo_minimo = allItems?.filter(i => Number(i.stock_actual) <= Number(i.stock_minimo)).length || 0

      setKpis({
        total: total || 0,
        sin_disponibilidad: sin_disponibilidad || 0,
        bajo_minimo: bajo_minimo || 0,
      })
    } catch (error) {
      console.error('Error fetching Inventario KPIs:', error)
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    fetchKpis()
  }, [fetchKpis])

  return { kpis, loading, fetchKpis }
}

export function useInventarioOptions() {
  const auth = useAuth()
  const organizationId = getOrganizationId(auth)

  const [opciones, setOpciones] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchOptions = useCallback(async () => {
    if (!organizationId) {
      setOpciones([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('repuestos')
        .select('id, nombre, sku, stock_actual, precio_usd, costo_usd, unidad')
        .eq('organization_id', organizationId)
        .eq('activo', true)
        .order('nombre')

      if (error) throw error
      setOpciones(data || [])
    } catch (error) {
      console.error('Error fetching inventario options:', error)
      setOpciones([])
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    fetchOptions()
  }, [fetchOptions])

  return { opciones, loading, fetchOptions }
}