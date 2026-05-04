import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useClientes() {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { perfil } = useAuth()

  const fetchClientes = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error: err } = await supabase
        .from('clientes')
        .select('id, razon_social, nombre_comercial, cuit, condicion_iva, email, telefono, direccion, contacto_nombre, activo')
        .eq('activo', true)
        .order('razon_social')
      if (err) throw err
      setClientes(data || [])
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchClientes() }, [fetchClientes])

  async function createCliente(payload) {
    const { data, error: err } = await supabase
      .from('clientes')
      .insert({ ...payload, organization_id: perfil?.organization_id })
      .select()
      .single()
    if (err) throw err
    await fetchClientes()
    return data
  }

  async function updateCliente(id, payload) {
    const { error: err } = await supabase
      .from('clientes')
      .update(payload)
      .eq('id', id)
    if (err) throw err
    await fetchClientes()
  }

  return { clientes, loading, error, createCliente, updateCliente }
}
