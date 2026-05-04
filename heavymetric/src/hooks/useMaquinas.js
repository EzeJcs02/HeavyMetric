import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useMaquinas() {
  const [maquinas, setMaquinas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { perfil } = useAuth()

  const fetchMaquinas = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const { data, error: err } = await supabase
        .from('maquinas_service')
        .select('*')
        .order('nombre_unidad')
      if (err) throw err
      setMaquinas(data || [])
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMaquinas() }, [fetchMaquinas])

  async function createMaquina(payload) {
    const { data, error: err } = await supabase
      .from('maquinas')
      .insert({ ...payload, organization_id: perfil?.organization_id })
      .select()
      .single()
    if (err) throw err
    await fetchMaquinas()
    return data
  }

  async function updateMaquina(id, payload) {
    const { error: err } = await supabase
      .from('maquinas')
      .update(payload)
      .eq('id', id)
    if (err) throw err
    await fetchMaquinas()
  }

  async function deactivateMaquina(id) {
    const { error: err } = await supabase
      .from('maquinas')
      .update({ activa: false })
      .eq('id', id)
    if (err) throw err
    setMaquinas(prev => prev.filter(m => m.id !== id))
  }

  return { maquinas, loading, error, createMaquina, updateMaquina, deactivateMaquina }
}
