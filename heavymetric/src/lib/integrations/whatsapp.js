import { integrationDisabledResult, isIntegrationEnabled, isIntegrationMockAllowed } from '../../config/integrations'
import { supabase } from '../supabase'

// Textos de preview para modo mock — espejo de los templates de Meta
const MOCK_TEXTOS = {
  alerta:     (d) => `⚠️ ALERTA — ${d.maquina || '?'}\n${d.descripcion || 'Situación que requiere atención.'}`,
  service:    (d) => `🔧 Service próximo — ${d.maquina || '?'}\nFaltan ${d.horasRestantes || '?'}hs (cada 250hs). Coordinemos.`,
  cobranza:   (d) => `💰 Aviso de cobro — ${d.cliente || '?'}\nMonto: $${d.monto?.toLocaleString('es-AR') || '?'}\nVencimiento: ${d.vencimiento || '?'}`,
  vencimiento:(d) => `📋 Vencimiento contrato — ${d.contrato || '?'}\nFecha: ${d.fechaVencimiento || '?'}. Contactanos para renovar.`,
}

/**
 * Envía un mensaje de WhatsApp.
 *
 * Modo mock (VITE_ENABLE_WHATSAPP=false): loguea en consola con el texto del template.
 * Modo real: llama a /api/whatsapp-send → Meta Cloud API con template pre-aprobado.
 *
 * @param {string} phone  - Número con código de país, sin + (ej: 5491112345678)
 * @param {string} type   - 'alerta' | 'service' | 'cobranza' | 'vencimiento'
 * @param {object} data   - Campos del template
 */
export const sendWhatsAppMessage = async (phone, type, data) => {
  if (!isIntegrationEnabled('whatsapp')) {
    if (!isIntegrationMockAllowed()) return integrationDisabledResult('WhatsApp')

    const texto = MOCK_TEXTOS[type]?.(data) ?? `Notificación HeavyMetric: ${type}`
    console.log(`[MOCK WA → ${phone}]\n${texto}`)
    return new Promise(resolve =>
      setTimeout(() => resolve({ success: true, messageId: `WA-MOCK-${Date.now()}` }), 500)
    )
  }

  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw sessionError

    const accessToken = session?.access_token
    if (!accessToken) throw new Error('No hay una sesion autenticada activa')

    const res = await fetch('/api/whatsapp-send', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body:    JSON.stringify({ phone, type, data }),
    })
    const result = await res.json()
    if (!res.ok) return { success: false, error: result.error || 'Error enviando WhatsApp' }
    return result
  } catch (err) {
    return { success: false, error: err.message }
  }
}

// Wrappers con firma explícita para los casos de uso más comunes
export const alertarService = (phone, maquina, horasRestantes, cliente) =>
  sendWhatsAppMessage(phone, 'service', { maquina, horasRestantes, cliente })

export const notificarCobranza = (phone, cliente, monto, vencimiento) =>
  sendWhatsAppMessage(phone, 'cobranza', { cliente, monto, vencimiento })

export const notificarVencimientoContrato = (phone, contrato, fechaVencimiento) =>
  sendWhatsAppMessage(phone, 'vencimiento', { contrato, fechaVencimiento })

export const enviarAlertaOperativa = (phone, maquina, descripcion) =>
  sendWhatsAppMessage(phone, 'alerta', { maquina, descripcion })
