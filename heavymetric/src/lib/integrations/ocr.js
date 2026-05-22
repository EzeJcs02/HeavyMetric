import { isIntegrationEnabled } from '../../config/integrations'

/**
 * Simula la lectura de un documento por OCR (Remito, DNI, Factura)
 * @param {File|string} imageFile - Imagen del documento
 */
export const readDocumentWithOCR = async (imageFile) => {
  if (!isIntegrationEnabled('ocr')) {
    console.log(`[MOCK OCR] Procesando imagen para OCR...`)
    
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          success: true,
          data: {
            tipoDocumento: 'REMITO',
            numero: '0001-00004567',
            fecha: new Date().toISOString().split('T')[0],
            entidad: 'PROVEEDOR MOCK S.A.',
            itemsDetectados: 3,
            textoCrudo: "REMITO 0001-00004567\nFECHA: HOY\nPROVEEDOR MOCK S.A.\n1x FILTRO ACEITE\n2x CORREA ALTERNADOR\n1x BATERIA 12V 110AH"
          }
        })
      }, 2000)
    })
  }

  // TODO: Implementar API real (ej. AWS Textract, Google Cloud Vision, etc.)
  console.warn('La integración real con OCR aún no está implementada.')
  return { success: false, error: 'Integración no implementada' }
}
