import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { logAudit } from '../lib/auditLog'

export function useProveedores() {
  const { perfil } = useAuth()
  const organizationId = perfil?.organization_id
  const [proveedores, setProveedores]   = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)

  const fetchProveedores = async () => {
    if (!organizationId) {
      setProveedores([])
      setLoading(false)
      return
    }

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
        .eq('organization_id', organizationId)
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
    if (!organizationId) {
      throw new Error('No se pudo determinar la organización. Volvé a iniciar sesión.')
    }

    const { data, error: err } = await supabase
      .from('proveedores')
      .insert([{ ...payload, organization_id: organizationId }])
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
      .eq('organization_id', organizationId)
    if (err) throw err
    logAudit({ tabla: 'proveedores', registroId: id, accion: 'UPDATE', datosAntes: antes, datosDespues: payload, descripcion: `Proveedor actualizado: ${payload.empresa}` })
    await fetchProveedores()
  }

  const deactivateProveedor = async (id) => {
    const antes = proveedores.find(p => p.id === id)
    const { error: err } = await supabase
      .from('proveedores')
      .update({ activo: false })
      .eq('id', id)
      .eq('organization_id', organizationId)
    if (err) throw err
    logAudit({ tabla: 'proveedores', registroId: id, accion: 'UPDATE', datosAntes: antes, datosDespues: { activo: false }, descripcion: `Proveedor desactivado: ${antes?.empresa}` })
    await fetchProveedores()
  }

  useEffect(() => {
    fetchProveedores()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId])

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
export async function crearCompra(proveedorId, orgId, items, notas = '', extra = {}) {
  const total = items.reduce((s, i) => s + Number(i.cantidad) * Number(i.precio_unitario_usd), 0)
  const { data: compra, error: errC } = await supabase
    .from('compras')
    .insert([{
      proveedor_id: proveedorId,
      organization_id: orgId,
      total_usd: total,
      notas,
      categoria:       extra.categoria       || 'repuesto',
      centro_costo_id: extra.centro_costo_id || null,
    }])
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

// ── Risk score (calculado en cliente, no persiste) ───────────────
// 100 = riesgo cero / 0 = riesgo máximo
export function calcRiskScore(p) {
  let score = 100
  if (p.estado === 'riesgoso')  score -= 40
  else if (p.estado === 'inactivo') score -= 20
  // Rating: 5★=0 penalidad, 1★=-40
  score -= (5 - (p.rating ?? 3)) * 10
  // Entregas tarde
  const totalEnt = (p.entregas_a_tiempo ?? 0) + (p.entregas_tarde ?? 0)
  if (totalEnt > 0) score -= Math.round((p.entregas_tarde / totalEnt) * 30)
  // Incidencias (cada una resta 10, máx 30)
  score -= Math.min(30, (p.incidencias ?? 0) * 10)
  return Math.max(0, Math.min(100, score))
}

export function riskLabel(score) {
  if (score >= 75) return { label: 'Bajo',  color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' }
  if (score >= 45) return { label: 'Medio', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' }
  return              { label: 'Alto',  color: 'text-red-400',   bg: 'bg-red-500/10 border-red-500/30' }
}

// ── Activos vinculados a un proveedor ────────────────────────────
export async function fetchActivosProveedor(proveedorId) {
  const { data } = await supabase
    .from('proveedor_activos')
    .select('*, maquina:maquinas(id, nombre_unidad, tipo, marca, modelo, estado_operativo)')
    .eq('proveedor_id', proveedorId)
  return data || []
}

export async function vincularActivo(proveedorId, maquinaId, tipoRelacion = 'service', notas = '') {
  const { error } = await supabase
    .from('proveedor_activos')
    .upsert({ proveedor_id: proveedorId, maquina_id: maquinaId, tipo_relacion: tipoRelacion, notas },
      { onConflict: 'proveedor_id,maquina_id' })
  if (error) throw error
}

export async function desvincularActivo(proveedorId, maquinaId) {
  const { error } = await supabase
    .from('proveedor_activos')
    .delete()
    .eq('proveedor_id', proveedorId)
    .eq('maquina_id', maquinaId)
  if (error) throw error
}

// ── Centros de costo ─────────────────────────────────────────────
export async function fetchCentrosCosto() {
  const { data } = await supabase
    .from('centros_costo')
    .select('id, nombre')
    .eq('activo', true)
    .order('nombre')
  return data || []
}