import { isIntegrationEnabled } from '../../config/integrations'
import { supabase } from '../supabase'

const MOCK_ECHEQS = [
  { id: 'CHK-100', banco: 'Galicia', monto: 1_500_000, fecha_pago: '2026-06-15', estado: 'en_cartera', tipo: 'recibido', tipo_cheque: 'echeq', emisor: 'Constructora Sur S.A.', moneda: 'ARS' },
  { id: 'CHK-101', banco: 'Santander', monto: 850_000, fecha_pago: '2026-06-20', estado: 'en_cartera', tipo: 'recibido', tipo_cheque: 'echeq', emisor: 'Vialidad Provincial', moneda: 'ARS' },
  { id: 'CHK-102', banco: 'Macro', monto: 180_000, fecha_pago: '2026-06-10', estado: 'emitido', tipo: 'emitido', tipo_cheque: 'comun', beneficiario: 'Repuestos Sur S.A.', moneda: 'ARS' },
]

const ESTADOS_VALIDOS = new Set([
  'en_cartera',
  'emitido',
  'depositado',
  'cobrado',
  'rechazado',
  'anulado',
  'vencido',
])

const TIPOS_VALIDOS = new Set(['recibido', 'emitido'])
const TIPOS_CHEQUE_VALIDOS = new Set(['echeq', 'comun'])

async function getOrganizationId() {
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError) throw authError

  const user = authData?.user
  if (!user?.id) throw new Error('Usuario no autenticado')

  const { data: perfil, error: perfilError } = await supabase
    .from('perfiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (perfilError) throw perfilError
  if (!perfil?.organization_id) throw new Error('No se pudo determinar la organización')

  return perfil.organization_id
}

function sanitizeChequePayload(cheque, orgId) {
  if (!cheque || typeof cheque !== 'object' || Array.isArray(cheque)) {
    throw new Error('Datos de cheque inválidos')
  }

  const monto = Number(cheque.monto || 0)
  if (!Number.isFinite(monto) || monto <= 0) {
    throw new Error('El monto del cheque debe ser mayor a cero')
  }

  const tipo = cheque.tipo || 'recibido'
  const tipoCheque = cheque.tipo_cheque || 'echeq'
  const estado = cheque.estado || 'en_cartera'

  if (!TIPOS_VALIDOS.has(tipo)) throw new Error('Tipo de cheque inválido')
  if (!TIPOS_CHEQUE_VALIDOS.has(tipoCheque)) throw new Error('Tipo de documento inválido')
  if (!ESTADOS_VALIDOS.has(estado)) throw new Error('Estado de cheque inválido')

  return {
    org_id: orgId,
    tipo,
    tipo_cheque: tipoCheque,
    banco: cheque.banco || null,
    numero: cheque.numero || null,
    monto,
    moneda: cheque.moneda || 'ARS',
    fecha_emision: cheque.fecha_emision || null,
    fecha_pago: cheque.fecha_pago || null,
    estado,
    emisor: cheque.emisor || null,
    beneficiario: cheque.beneficiario || null,
    echeq_id: cheque.echeq_id || null,
    cuenta_id: cheque.cuenta_id || null,
    cliente_id: cheque.cliente_id || null,
    proveedor_id: cheque.proveedor_id || null,
    notas: cheque.notas || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

/**
 * Sincroniza e-cheques desde el banco.
 */
export const syncEcheqs = async () => {
  if (!isIntegrationEnabled('bancos')) {
    console.log('[MOCK BANCOS] Sincronizando E-Cheqs...')
    return new Promise((resolve) =>
      setTimeout(() => resolve({ success: true, nuevosCheques: MOCK_ECHEQS }), 1_500)
    )
  }

  try {
    const orgId = await getOrganizationId()

    const { data, error } = await supabase
      .from('cheques')
      .select('*')
      .eq('org_id', orgId)
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
    const filtrados = MOCK_ECHEQS.filter((c) =>
      (!tipo || c.tipo === tipo) &&
      (!estado || c.estado === estado)
    )
    return { success: true, cheques: filtrados }
  }

  try {
    const orgId = await getOrganizationId()

    let query = supabase
      .from('cheques')
      .select('*')
      .eq('org_id', orgId)
      .order('fecha_pago', { ascending: true })

    if (tipo) query = query.eq('tipo', tipo)
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
    return new Promise((resolve) =>
      setTimeout(() => resolve({ success: true, id: `CHK-MOCK-${Date.now()}` }), 400)
    )
  }

  try {
    const orgId = await getOrganizationId()
    const payload = sanitizeChequePayload(cheque, orgId)

    const { data, error } = await supabase
      .from('cheques')
      .insert([payload])
      .select()
      .single()

    if (error) throw error
    return { success: true, cheque: data }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

/**
 * Actualiza el estado de un cheque.
 */
export const actualizarEstadoCheque = async (id, estado) => {
  if (!isIntegrationEnabled('bancos')) {
    console.log(`[MOCK BANCOS] Cheque ${id} → ${estado}`)
    return { success: true }
  }

  try {
    if (!id) throw new Error('ID de cheque inválido')
    if (!ESTADOS_VALIDOS.has(estado)) throw new Error('Estado de cheque inválido')

    const orgId = await getOrganizationId()

    const { data, error } = await supabase
      .from('cheques')
      .update({ estado, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('org_id', orgId)
      .select('id')
      .single()

    if (error) throw error
    if (!data?.id) throw new Error('No se pudo actualizar el cheque')

    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

/**
 * Conciliación bancaria — matching entre movimientos y cheques registrados.
 */
export const matchReconciliation = async (movimientos) => {
  if (!isIntegrationEnabled('bancos')) {
    console.log('[MOCK BANCOS] Conciliando movimientos...')
    return new Promise((resolve) =>
      setTimeout(() => resolve({ success: true, conciliados: movimientos.length, pendientes: 0 }), 1_000)
    )
  }

  return {
    success: false,
    error: 'Conciliación automática pendiente de configuración con proveedor bancario',
  }
}