import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

function getAuthScope(auth) {
  const perfil = auth?.perfil || auth?.profile || null

  return {
    userId: perfil?.id || auth?.user?.id || null,
    organizationId:
      perfil?.organization_id ||
      auth?.user?.user_metadata?.organization_id ||
      auth?.organizationId ||
      null,
  }
}

export function useRemitos() {
  const auth = useAuth()
  const { userId, organizationId } = getAuthScope(auth)

  const [remitos, setRemitos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchRemitos = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      if (!organizationId) {
        setRemitos([])
        return
      }

      const { data, error: err } = await supabase
        .from('remitos')
        .select(`
          *,
          cliente:clientes(razon_social, cuit),
          proveedor:proveedores(empresa),
          items:remito_items(*),
          creado_por:perfiles(nombre_completo)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (err) throw err
      setRemitos(data || [])
    } catch (err) {
      setError(err.message || 'Error al cargar remitos')
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  const crearRemito = async (payload, items = []) => {
    if (!organizationId) throw new Error('No se pudo determinar la organización')

    const { id: _ignoredId, organization_id: _ignoredOrg, created_by: _ignoredCreatedBy, ...safePayload } = payload

    const { data: remito, error: errR } = await supabase
      .from('remitos')
      .insert([{
        ...safePayload,
        organization_id: organizationId,
        created_by: userId,
      }])
      .select()
      .single()

    if (errR) throw errR

    if (items.length > 0) {
      const safeItems = items.map(({ id: _id, remito_id: _remitoId, ...item }) => ({
        ...item,
        remito_id: remito.id,
      }))

      const { error: errI } = await supabase
        .from('remito_items')
        .insert(safeItems)

      if (errI) throw errI
    }

    console.info('[HeavyMetric][Remitos] Remito creado con trazabilidad operativa:', {
      remito_id: remito.id,
      organization_id: organizationId,
      created_by: userId,
      items: items.length,
    })

    await fetchRemitos()
    return remito
  }

  const actualizarEstado = async (id, estado) => {
    if (!organizationId) throw new Error('No se pudo determinar la organización')

    const { data: remitoActual, error: getError } = await supabase
      .from('remitos')
      .select('id, estado, organization_id')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single()

    if (getError) throw getError

    const { error: err } = await supabase
      .from('remitos')
      .update({ estado })
      .eq('id', id)
      .eq('organization_id', organizationId)

    if (err) throw err

    console.info('[HeavyMetric][Remitos] Estado actualizado con trazabilidad operativa:', {
      remito_id: id,
      estado_anterior: remitoActual.estado,
      estado_nuevo: estado,
      organization_id: organizationId,
    })

    await fetchRemitos()
  }

  useEffect(() => {
    fetchRemitos()
  }, [fetchRemitos])

  return {
    remitos,
    loading,
    error,
    fetchRemitos,
    crearRemito,
    actualizarEstado,
  }
}