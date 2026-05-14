import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useCotizaciones() {
  const [cotizaciones, setCotizaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchCotizaciones = async () => {
    try {
      setLoading(true)
      setError(null)
      const { data, error: err } = await supabase
        .from('cotizaciones')
        .select(`
          *,
          cliente:clientes(razon_social, nombre_comercial),
          lead:leads(nombre, empresa),
          items:cotizacion_items(*),
          creado_por:perfiles(nombre_completo)
        `)
        .order('created_at', { ascending: false })
      if (err) throw err
      setCotizaciones(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const crearCotizacion = async (payload, items) => {
    // Calcular totales
    const subtotal = items.reduce((s, i) => s + Number(i.cantidad) * Number(i.precio_usd), 0)
    const iva      = items.reduce((s, i) => s + Number(i.cantidad) * Number(i.precio_usd) * Number(i.tasa_iva), 0)
    const total    = subtotal + iva

    const { data: cot, error: errC } = await supabase
      .from('cotizaciones')
      .insert([{ ...payload, subtotal_usd: subtotal, iva_usd: iva, total_usd: total }])
      .select()
      .single()
    if (errC) throw errC

    if (items.length > 0) {
      const { error: errI } = await supabase
        .from('cotizacion_items')
        .insert(items.map(i => ({ ...i, cotizacion_id: cot.id })))
      if (errI) throw errI
    }

    await fetchCotizaciones()
    return cot
  }

  const actualizarEstado = async (id, estado) => {
    const { error: err } = await supabase
      .from('cotizaciones')
      .update({ estado })
      .eq('id', id)
    if (err) throw err
    await fetchCotizaciones()
  }

  const actualizarCotizacion = async (id, payload, items) => {
    const subtotal = items.reduce((s, i) => s + Number(i.cantidad) * Number(i.precio_usd), 0)
    const iva      = items.reduce((s, i) => s + Number(i.cantidad) * Number(i.precio_usd) * Number(i.tasa_iva), 0)
    const total    = subtotal + iva

    const { error: errU } = await supabase
      .from('cotizaciones')
      .update({ ...payload, subtotal_usd: subtotal, iva_usd: iva, total_usd: total })
      .eq('id', id)
    if (errU) throw errU

    // Reemplazar items
    await supabase.from('cotizacion_items').delete().eq('cotizacion_id', id)
    if (items.length > 0) {
      const { error: errI } = await supabase
        .from('cotizacion_items')
        .insert(items.map(i => ({ ...i, cotizacion_id: id })))
      if (errI) throw errI
    }

    await fetchCotizaciones()
  }

  useEffect(() => { fetchCotizaciones() }, [])

  return { cotizaciones, loading, error, fetchCotizaciones, crearCotizacion, actualizarCotizacion, actualizarEstado }
}
