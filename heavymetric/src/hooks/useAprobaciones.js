import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useAprobaciones() {
  const { perfil } = useAuth()
  const [aprobaciones, setAprobaciones] = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)

  const fetchAprobaciones = async () => {
    try {
      setLoading(true)
      setError(null)
      const { data, error: err } = await supabase
        .from('workflow_aprobaciones')
        .select(`
          *,
          solicitante:perfiles!solicitante_id(nombre_completo),
          decidido:perfiles!decidido_por(nombre_completo)
        `)
        .order('created_at', { ascending: false })
      if (err) throw err
      setAprobaciones(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const decidir = async (id, estado, observacion = '') => {
    const { error: err } = await supabase
      .from('workflow_aprobaciones')
      .update({
        estado,
        observacion,
        decidido_por:   perfil?.id,
        fecha_decision: new Date().toISOString(),
      })
      .eq('id', id)
    if (err) throw err
    await fetchAprobaciones()
  }

  const crearAprobacion = async (payload) => {
    const { data, error: err } = await supabase
      .from('workflow_aprobaciones')
      .insert([{
        ...payload,
        organization_id: perfil?.organization_id,
        solicitante_id:  perfil?.id,
        created_by:      perfil?.id,
      }])
      .select()
      .single()
    if (err) throw err
    await fetchAprobaciones()
    return data
  }

  useEffect(() => { fetchAprobaciones() }, [])

  return { aprobaciones, loading, error, fetchAprobaciones, decidir, crearAprobacion }
}

export async function countAprobacionesPendientes(orgId) {
  const { count } = await supabase
    .from('workflow_aprobaciones')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .in('estado', ['pendiente', 'urgente'])
  return count || 0
}
