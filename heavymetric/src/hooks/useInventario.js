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

export function useInventario() {
  const auth = useAuth()
  const organizationId = getOrganizationId(auth)

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      if (!organizationId) {
        setItems([])
        return
      }

      const { data, error: err } = await supabase
        .from('inventario')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('activo', true)
        .order('nombre_repuesto')

      if (err) throw err
      setItems(data || [])
    } catch (err) {
      setError(err.message || 'Error al cargar inventario')
    } finally {
      setLoading(false)
    }
  }, [organizationId])

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
        .from('inventario')
        .select('id, organization_id, nombre_repuesto, stock_actual')
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
        .from('inventario')
        .update({ stock_actual: nuevoStock })
        .eq('id', itemId)
        .eq('organization_id', organizationId)

      if (err) throw err

      console.info('[HeavyMetric][Inventario] Ajuste de stock con trazabilidad operativa:', {
        item_id: itemId,
        repuesto: item.nombre_repuesto,
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
        .from('inventario')
        .update({ precio_base_usd: precioNumerico })
        .eq('id', itemId)
        .eq('organization_id', organizationId)

      if (err) throw err

      console.info('[HeavyMetric][Inventario] Precio actualizado con trazabilidad operativa:', {
        item_id: itemId,
        precio_base_usd: precioNumerico,
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
        .from('inventario')
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
        repuesto: data.nombre_repuesto,
        organization_id: organizationId,
      })

      await fetchItems()
      return data
    } catch (err) {
      setError(err.message || 'Error al crear item de inventario')
      throw err
    }
  }

  const archivarItem = async (itemId) => {
    try {
      if (!organizationId) throw new Error('No se pudo determinar la organización')

      const { error: err } = await supabase
        .from('inventario')
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
    fetchItems()
  }, [fetchItems])

  return {
    items,
    loading,
    error,
    fetchItems,
    ajustarStock,
    updatePrecio,
    crearItem,
    archivarItem,
  }
}