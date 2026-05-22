import { isIntegrationEnabled } from '../../config/integrations'
import { supabase } from '../supabase'

const MOCK_ECHEQS = [
  { id: 'CHK-100', banco: 'Galicia',   monto: 1_500_000, fecha_pago: '2026-06-15', estado: 'en_cartera', tipo: 'recibido', tipo_cheque: 'echeq',  emisor: 'Constructora Sur S.A.', moneda: 'ARS' },
  { id: 'CHK-101', banco: 'Santander', monto:   850_000, fecha_pago: '2026-06-20', estado: 'en_cartera', tipo: 'recibido', tipo_cheque: 'echeq',  emisor: 'Vialidad Provincial',   moneda: 'ARS' },
  { id: 'CHK-102', banco: 'Macro',     monto:   180_000, fecha_pago: '2026-06-10', estado: 'emitido',    tipo: 'emitido',  tipo_cheque: 'comun', beneficiario: 'Repuestos Sur S.A.', moneda: 'ARS' },
]

/**
 * Sincroniza e-cheques desde el banco.
 *
 * Modo mock: retorna datos de prueba.
 * Modo real: consulta la tabla `cheques` en Supabase (la sincronización bancaria
 *            real se realiza manualmente o vía integración bancaria configurada externamente).
 */
export const syncEcheqs = async () => {
  if (!isIntegrationEnabled('bancos')) {
    console.log('[MOCK BANCOS] Sincronizando E-Cheqs...')
    return new Promise(resolve =>
      setTimeout(() => resolve({ success: true, nuevosCheques: MOCK_ECHEQS }), 1_500)
    )
  }

  try {
    const { data, error } = await supabase
      .from('cheques')
      .select('*')
      .eq('tipo_cheque', 'echeq')
      .order('fecha_pago', { ascending: true })

    if (error) throw error
    return { success: true, nuevosCheques: data || [] }
  } catch (err) {
    console.error('[Bancos] syncEcheqs error:', err.message)
    return { success: false, error: err.message }
  }
}

/**
 * Obtiene cheques filtrados por tipo y/o estado.
 */
export const getCheques = async ({ tipo, estado } = {}) => {
  if (!isIntegrationEnabled('bancos')) {
    const filtrados = MOCK_ECHEQS.filter(c =>
      (!tipo   || c.tipo   === tipo) &&
      (!estado || c.estado === estado)
    )
    return { success: true, cheques: filtrados }
  }

  try {
    let query = supabase.from('cheques').select('*').order('fecha_pago', { ascending: true })
    if (tipo)   query = query.eq('tipo',   tipo)
    if (estado) query = query.eq('estado', estado)

    const { data, error } = await query
    if (error) throw error
    return { success: true, cheques: data || [] }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

/**
 * Registra un cheque nuevo.
 */
export const registrarCheque = async (cheque) => {
  if (!isIntegrationEnabled('bancos')) {
    console.log('[MOCK BANCOS] Registrando cheque:', cheque)
    return new Promise(resolve =>
      setTimeout(() => resolve({ success: true, id: `CHK-MOCK-${Date.now()}` }), 400)
    )
  }

  try {
    const { data, error } = await supabase
      .from('cheques')
      .insert([{ ...cheque, created_at: new Date().toISOString() }])
      .select()
      .single()

    if (error) throw error
    return { success: true, cheque: data }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

/**
 * Actualiza el estado de un cheque (en_cartera → depositado, rechazado, etc.).
 */
export const actualizarEstadoCheque = async (id, estado) => {
  if (!isIntegrationEnabled('bancos')) {
    console.log(`[MOCK BANCOS] Cheque ${id} → ${estado}`)
    return { success: true }
  }

  try {
    const { error } = await supabase
      .from('cheques')
      .update({ estado, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

/**
 * Conciliación bancaria — matching entre movimientos y cheques registrados.
 * Integración bancaria directa pendiente de configuración con proveedor bancario.
 */
export const matchReconciliation = async (movimientos) => {
  if (!isIntegrationEnabled('bancos')) {
    console.log('[MOCK BANCOS] Conciliando movimientos...')
    return new Promise(resolve =>
      setTimeout(() => resolve({ success: true, conciliados: movimientos.length, pendientes: 0 }), 1_000)
    )
  }

  return { success: false, error: 'Conciliación automática pendiente de configuración con proveedor bancario' }
}
