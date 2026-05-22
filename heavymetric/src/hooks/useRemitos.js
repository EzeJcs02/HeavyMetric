import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useRemitos() {
  const { perfil } = useAuth()
  const [remitos, setRemitos]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  const fetchRemitos = async () => {
    try {
      setLoading(true)
      setError(null)
      const { data, error: err } = await supabase
        .from('remitos')
        .select(`
          *,
          cliente:clientes(razon_social, cuit),
          proveedor:proveedores(empresa),
          items:remito_items(*),
          creado_por:perfiles(nombre_completo)
        `)
        .order('created_at', { ascending: false })
      if (err) throw err
      setRemitos(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const crearRemito = async (payload, items) => {
    const { data: remito, error: errR } = await supabase
      .from('remitos')
      .insert([{ ...payload, organization_id: perfil?.organization_id, created_by: perfil?.id }])
      .select()
      .single()
    if (errR) throw errR

    if (items.length > 0) {
      const { error: errI } = await supabase
        .from('remito_items')
        .insert(items.map(i => ({ ...i, remito_id: remito.id })))
      if (errI) throw errI
    }

    await fetchRemitos()
    return remito
  }

  const actualizarEstado = async (id, estado) => {
    const { error: err } = await supabase
      .from('remitos')
      .update({ estado })
      .eq('id', id)
    if (err) throw err
    await fetchRemitos()
  }

  useEffect(() => { fetchRemitos() }, [])

  return { remitos, loading, error, fetchRemitos, crearRemito, actualizarEstado }
}
