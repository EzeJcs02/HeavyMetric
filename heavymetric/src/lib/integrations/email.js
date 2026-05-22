import { isIntegrationEnabled } from '../../config/integrations'

/**
 * Simula el envío de un correo electrónico
 * @param {string} to - Destinatario
 * @param {string} subject - Asunto
 * @param {string} body - Cuerpo del mensaje
 * @param {Array} attachments - Archivos adjuntos (ej. PDFs)
 */
export const sendEmail = async (to, subject, body, attachments = []) => {
  if (!isIntegrationEnabled('email')) {
    console.log(`[MOCK EMAIL] Enviando correo a ${to}...`)
    console.log(`[MOCK EMAIL] Asunto: ${subject}`)
    if (attachments.length > 0) {
      console.log(`[MOCK EMAIL] Adjuntos: ${attachments.length} archivo(s)`)
    }
    
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({ success: true, messageId: `EMAIL-${Date.now()}` })
      }, 600)
    })
  }

  // TODO: Implementar llamada real (ej. Resend, SendGrid, etc.)
  console.warn('La integración real con Email aún no está implementada.')
  return { success: false, error: 'Integración no implementada' }
}
