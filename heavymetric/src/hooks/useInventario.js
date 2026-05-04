import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useInventario() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchItems = async () => {
    try {
      setLoading(true)
      setError(null)
      const { data, error: err } = await supabase
        .from('inventario')
        .select('*')
        .eq('activo', true)
        .order('nombre_repuesto')
      if (err) throw err
      setItems(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const ajustarStock = async (itemId, cantidad, tipo) => {
    // tipo: 'entrada' | 'salida'
    try {
      const item = items.find(i => i.id === itemId)
      if (!item) throw new Error('Item no encontrado')

      const nuevoStock = tipo === 'entrada'
        ? item.stock_actual + Number(cantidad)
        : item.stock_actual - Number(cantidad)

      if (nuevoStock < 0) throw new Error('Stock insuficiente para registrar la salida.')

      const { error: err } = await supabase
        .from('inventario')
        .update({ stock_actual: nuevoStock })
        .eq('id', itemId)

      if (err) throw err
      await fetchItems()
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  const updatePrecio = async (itemId, nuevoPrecio) => {
    try {
      const { error: err } = await supabase
        .from('inventario')
        .update({ precio_base_usd: Number(nuevoPrecio) })
        .eq('id', itemId)
      if (err) throw err
      await fetchItems()
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  const crearItem = async (itemData) => {
    try {
      const { error: err } = await supabase
        .from('inventario')
        .insert([itemData])
      if (err) throw err
      await fetchItems()
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  const archivarItem = async (itemId) => {
    try {
      const { error: err } = await supabase
        .from('inventario')
        .update({ activo: false })
        .eq('id', itemId)
      if (err) throw err
      await fetchItems()
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  useEffect(() => { fetchItems() }, [])

  return { items, loading, error, fetchItems, ajustarStock, updatePrecio, crearItem, archivarItem }
}
