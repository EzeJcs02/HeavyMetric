import { isIntegrationEnabled } from '../../config/integrations'

/**
 * Simula la subida de un documento, firma o foto al Storage
 * @param {File|Blob|string} file - Archivo a subir
 * @param {string} path - Ruta de destino (ej. 'firmas/ot-123.png')
 */
export const uploadDocument = async (file, path) => {
  if (!isIntegrationEnabled('storage')) {
    console.log(`[MOCK STORAGE] Subiendo archivo a ruta: ${path}...`)
    
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          success: true,
          url: `https://mock-storage.heavymetric.com/${path}`,
          path: path
        })
      }, 700)
    })
  }

  // TODO: Implementar llamada real a Supabase Storage o AWS S3
  console.warn('La integración real con Storage aún no está implementada.')
  return { success: false, error: 'Integración no implementada' }
}

/**
 * Simula la obtención de la URL pública de un archivo
 */
export const getFileUrl = (path) => {
  if (!isIntegrationEnabled('storage')) {
    return `https://mock-storage.heavymetric.com/${path}`
  }
  return null
}
