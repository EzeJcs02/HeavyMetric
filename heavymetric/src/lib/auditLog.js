import { supabase } from './supabase'

/**
 * Registra un evento en el audit_log.
 * Es silencioso — nunca rompe el flujo principal.
 *
 * @param {object} params
 * @param {string} params.tabla       - Nombre de la tabla afectada
 * @param {string} params.registroId  - UUID del registro afectado
 * @param {'INSERT'|'UPDATE'|'DELETE'} params.accion
 * @param {object} [params.datosAntes]   - Estado previo (UPDATE/DELETE)
 * @param {object} [params.datosDespues] - Estado nuevo (INSERT/UPDATE)
 * @param {string} [params.descripcion]  - Texto legible del cambio
 */
export async function logAudit({ tabla, registroId, accion, datosAntes, datosDespues, descripcion }) {
  try {
    await supabase.from('audit_log').insert({
      tabla,
      registro_id:    registroId || null,
      accion,
      datos_antes:    datosAntes    ?? null,
      datos_despues:  datosDespues  ?? null,
      descripcion:    descripcion   ?? null,
    })
  } catch (err) {
    // Audit never crashes the app
    console.warn('[audit]', err.message)
  }
}
