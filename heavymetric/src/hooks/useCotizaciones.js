import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useCotizaciones() {
  const { perfil } = useAuth()
  const organizationId = perfil?.organization_id

  const [cotizaciones, setCotizaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchCotizaciones = async () => {
    if (!organizationId) {
      setCotizaciones([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: err } = await supabase
        .from('cotizaciones')
        .select(`
          *,
          cliente:clientes(id, razon_social, nombre_comercial, cuit, email, telefono),
          lead:leads(id, nombre, empresa, email, telefono, estado),
          items:cotizacion_items(*)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (err) throw err

      setCotizaciones(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const calcularTotales = (items = []) => {
    const subtotal = items.reduce(
      (s, i) => s + Number(i.cantidad || 0) * Number(i.precio_usd || 0),
      0
    )

    const iva = items.reduce(
      (s, i) =>
        s +
        Number(i.cantidad || 0) *
          Number(i.precio_usd || 0) *
          Number(i.tasa_iva || 0),
      0
    )

    return {
      subtotal,
      iva,
      total: subtotal + iva,
    }
  }

  const normalizarItems = (items = [], cotizacionId) => {
    return items.map((i) => ({
      cotizacion_id: cotizacionId,
      tipo_item: i.tipo_item,
      descripcion: i.descripcion,
      cantidad: Number(i.cantidad || 0),
      precio_usd: Number(i.precio_usd || 0),
      tasa_iva: Number(i.tasa_iva || 0),
    }))
  }

  const crearCotizacion = async (payload, items) => {
    if (!organizationId) {
      throw new Error('No se pudo determinar la organización. Volvé a iniciar sesión.')
    }

    const { subtotal, iva, total } = calcularTotales(items)

    const { data: cot, error: errC } = await supabase
      .from('cotizaciones')
      .insert([
        {
          ...payload,
          organization_id: organizationId,
          subtotal_usd: subtotal,
          iva_usd: iva,
          total_usd: total,
        },
      ])
      .select()
      .single()

    if (errC) throw errC

    if (items.length > 0) {
      const { error: errI } = await supabase
        .from('cotizacion_items')
        .insert(normalizarItems(items, cot.id))

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
      .eq('organization_id', organizationId)

    if (err) throw err

    await fetchCotizaciones()
  }

  const actualizarCotizacion = async (id, payload, items) => {
    // Verificar primero que la cotización pertenece a esta organización
    // antes de borrar cotizacion_items (que no tiene organization_id propio)
    const { data: cotCheck, error: errCheck } = await supabase
      .from('cotizaciones')
      .select('id')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single()

    if (errCheck || !cotCheck) {
      throw new Error('Acceso denegado: la cotización no pertenece a tu organización.')
    }

    const { subtotal, iva, total } = calcularTotales(items)

    const { error: errU } = await supabase
      .from('cotizaciones')
      .update({
        ...payload,
        subtotal_usd: subtotal,
        iva_usd: iva,
        total_usd: total,
      })
      .eq('id', id)
      .eq('organization_id', organizationId)

    if (errU) throw errU

    const { error: errDelete } = await supabase
      .from('cotizacion_items')
      .delete()
      .eq('cotizacion_id', id)

    if (errDelete) throw errDelete

    if (items.length > 0) {
      const { error: errI } = await supabase
        .from('cotizacion_items')
        .insert(normalizarItems(items, id))

      if (errI) throw errI
    }

    await fetchCotizaciones()
  }

  useEffect(() => {
    fetchCotizaciones()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId])

  return {
    cotizaciones,
    loading,
    error,
    fetchCotizaciones,
    crearCotizacion,
    actualizarCotizacion,
    actualizarEstado,
  }
}