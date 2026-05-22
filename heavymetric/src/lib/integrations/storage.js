import { isIntegrationEnabled } from '../../config/integrations'
import { supabase } from '../supabase'

const BUCKET = 'documentos'

/**
 * Sube un archivo a Supabase Storage.
 *
 * Modo mock: simula la respuesta con una URL falsa.
 * Modo real: sube al bucket "documentos" con la ruta dada.
 *
 * @param {File|Blob} file  - Archivo a subir
 * @param {string}    path  - Ruta dentro del bucket, ej: 'firmas/ot-123.png'
 */
export const uploadDocument = async (file, path) => {
  if (!isIntegrationEnabled('storage')) {
    console.log(`[MOCK STORAGE] Subiendo a: ${path}`)
    return new Promise(resolve =>
      setTimeout(() => resolve({
        success:  true,
        url:      `https://mock-storage.heavymetric.com/${path}`,
        path,
      }), 700)
    )
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      upsert:      true,
      contentType: file.type || 'application/octet-stream',
    })

  if (error) {
    console.error('[Storage] Upload error:', error.message)
    return { success: false, error: error.message }
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path)
  return { success: true, url: urlData.publicUrl, path: data.path }
}

/**
 * Retorna la URL pública de un archivo ya subido.
 */
export const getFileUrl = (path) => {
  if (!isIntegrationEnabled('storage')) {
    return `https://mock-storage.heavymetric.com/${path}`
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data?.publicUrl ?? null
}

/**
 * Elimina un archivo del storage.
 */
export const deleteDocument = async (path) => {
  if (!isIntegrationEnabled('storage')) {
    console.log(`[MOCK STORAGE] Eliminando: ${path}`)
    return { success: true }
  }

  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) return { success: false, error: error.message }
  return { success: true }
}

/**
 * Lista archivos bajo un prefijo de ruta.
 */
export const listDocuments = async (prefix) => {
  if (!isIntegrationEnabled('storage')) {
    return { success: true, files: [] }
  }

  const { data, error } = await supabase.storage.from(BUCKET).list(prefix)
  if (error) return { success: false, error: error.message }
  return { success: true, files: data || [] }
}

// Rutas estándar para cada tipo de entidad
export const storagePaths = {
  firma:    (otId)      => `firmas/ot-${otId}.png`,
  fotoOT:   (otId, n)   => `fotos/ot-${otId}-${n}.jpg`,
  fotoMaq:  (maqId, n)  => `maquinas/${maqId}/foto-${n}.jpg`,
  remito:   (provId, n) => `remitos/${provId}/${n}.pdf`,
  factura:  (factId)    => `facturas/${factId}.pdf`,
  contrato: (contratoId)=> `contratos/${contratoId}.pdf`,
}
