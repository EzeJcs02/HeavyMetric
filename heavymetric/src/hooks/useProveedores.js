import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { logAudit } from '../lib/auditLog'

export function useProveedores() {
  const { perfil } = useAuth()
  const [proveedores, setProveedores]   = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)

  const fetchProveedores = async () => {
    try {
      setLoading(true)
      setError(null)
      const { data, error: err } = await supabase
        .from('proveedores')
        .select(`
          *,
          compras(count),
          proveedor_repuestos(count)
        `)
        .eq('activo', true)
        .order('empresa')
      if (err) throw err
      setProveedores(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const createProveedor = async (payload) => {
    const { data, error: err } = await supabase
      .from('proveedores')
      .insert([{ ...payload, organization_id: perfil?.organization_id }])
      .select().single()
    if (err) throw err
    logAudit({ tabla: 'proveedores', registroId: data.id, accion: 'INSERT', datosDespues: payload, descripcion: `Proveedor creado: ${payload.empresa}` })
    await fetchProveedores()
    return data
  }

  const updateProveedor = async (id, payload) => {
    const antes = proveedores.find(p => p.id === id)
    const { error: err } = await supabase
      .from('proveedores')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (err) throw err
    logAudit({ tabla: 'proveedores', registroId: id, accion: 'UPDATE', datosAntes: antes, datosDespues: payload, descripcion: `Proveedor actualizado: ${payload.empresa}` })
    await fetchProveedores()
  }

  const deactivateProveedor = async (id) => {
    const antes = proveedores.find(p => p.id === id)
    const { error: err } = await supabase
      .from('proveedores').update({ activo: false }).eq('id', id)
    if (err) throw err
    logAudit({ tabla: 'proveedores', registroId: id, accion: 'UPDATE', datosAntes: antes, datosDespues: { activo: false }, descripcion: `Proveedor desactivado: ${antes?.empresa}` })
    await fetchProveedores()
  }

  useEffect(() => { fetchProveedores() }, [])

  return { proveedores, loading, error, fetchProveedores, createProveedor, updateProveedor, deactivateProveedor }
}

// ── Compras de un proveedor ──────────────────────────────────────
export async function fetchComprasProveedor(proveedorId) {
  const { data } = await supabase
    .from('compras')
    .select('*, items:compra_items(*)')
    .eq('proveedor_id', proveedorId)
    .order('fecha', { ascending: false })
    .limit(30)
  return data || []
}

// ── Repuestos vinculados a un proveedor ──────────────────────────
export async function fetchRepuestosProveedor(proveedorId) {
  const { data } = await supabase
    .from('proveedor_repuestos')
    .select('*, repuesto:repuestos(nombre, sku, unidad, stock_actual)')
    .eq('proveedor_id', proveedorId)
  return data || []
}

// ── Crear/recibir compra ─────────────────────────────────────────
export async function crearCompra(proveedorId, orgId, items, notas = '') {
  const total = items.reduce((s, i) => s + Number(i.cantidad) * Number(i.precio_unitario_usd), 0)
  const { data: compra, error: errC } = await supabase
    .from('compras')
    .insert([{ proveedor_id: proveedorId, organization_id: orgId, total_usd: total, notas }])
    .select().single()
  if (errC) throw errC

  if (items.length > 0) {
    const { error: errI } = await supabase
      .from('compra_items')
      .insert(items.map(i => ({ compra_id: compra.id, ...i })))
    if (errI) throw errI
  }
  return compra
}

export async function recibirCompra(compraId) {
  const { error } = await supabase.rpc('recibir_compra', { p_compra_id: compraId })
  if (error) throw error
}
