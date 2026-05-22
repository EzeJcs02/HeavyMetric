import { isIntegrationEnabled } from '../../config/integrations'

/**
 * Simula el envío de un mensaje de WhatsApp
 * @param {string} phone - Número de teléfono
 * @param {string} type - Tipo de mensaje (alerta, cobranza, service, vencimiento)
 * @param {object} data - Datos del mensaje
 */
export const sendWhatsAppMessage = async (phone, type, data) => {
  if (!isIntegrationEnabled('whatsapp')) {
    console.log(`[MOCK WHATSAPP] Enviando mensaje a ${phone}...`)
    console.log(`[MOCK WHATSAPP] Tipo: ${type}`)
    console.log(`[MOCK WHATSAPP] Datos:`, data)
    
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({ success: true, messageId: `WA-${Date.now()}` })
      }, 500)
    })
  }

  // TODO: Implementar llamada real (ej. Meta Cloud API, Twilio, etc.)
  console.warn('La integración real con WhatsApp aún no está implementada.')
  return { success: false, error: 'Integración no implementada' }
}
