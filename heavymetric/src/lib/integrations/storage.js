import { isIntegrationEnabled } from '../../config/integrations'
import { supabase } from '../supabase'

const BUCKET = 'documentos'
const FORBIDDEN_SEGMENTS = new Set(['', '.', '..'])

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

function sanitizePath(path) {
  const clean = String(path || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/')
    .trim()

  const parts = clean.split('/')

  if (!clean || parts.some((part) => FORBIDDEN_SEGMENTS.has(part))) {
    throw new Error('Ruta de archivo inválida')
  }

  return clean
}

function scopedPath(path, organizationId) {
  const cleanPath = sanitizePath(path)
  const orgPrefix = `organizations/${organizationId}/`

  if (cleanPath.startsWith(orgPrefix)) return cleanPath

  return `${orgPrefix}${cleanPath}`
}

/**
 * Sube un archivo a Supabase Storage.
 */
export const uploadDocument = async (file, path) => {
  try {
    const organizationId = await getOrganizationId()
    const finalPath = scopedPath(path, organizationId)

    if (!isIntegrationEnabled('storage')) {
      console.log(`[MOCK STORAGE] Subiendo a: ${finalPath}`)
      return new Promise((resolve) =>
        setTimeout(() => resolve({
          success: true,
          url: `https://mock-storage.heavymetric.com/${finalPath}`,
          path: finalPath,
        }), 700)
      )
    }

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(finalPath, file, {
        upsert: true,
        contentType: file?.type || 'application/octet-stream',
      })

    if (error) {
      console.error('[Storage] Upload error:', error.message)
      return { success: false, error: error.message }
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path)
    return { success: true, url: urlData.publicUrl, path: data.path }
  } catch (error) {
    console.error('[Storage] Upload error:', error.message)
    return { success: false, error: error.message }
  }
}

/**
 * Retorna la URL pública de un archivo ya subido.
 * Nota: si el bucket contiene documentos sensibles, conviene migrar a signed URLs.
 */
export const getFileUrl = (path) => {
  try {
    const cleanPath = sanitizePath(path)

    if (!isIntegrationEnabled('storage')) {
      return `https://mock-storage.heavymetric.com/${cleanPath}`
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(cleanPath)
    return data?.publicUrl ?? null
  } catch {
    return null
  }
}

/**
 * Elimina un archivo del storage.
 */
export const deleteDocument = async (path) => {
  try {
    const organizationId = await getOrganizationId()
    const finalPath = scopedPath(path, organizationId)

    if (!isIntegrationEnabled('storage')) {
      console.log(`[MOCK STORAGE] Eliminando: ${finalPath}`)
      return { success: true }
    }

    const { error } = await supabase.storage.from(BUCKET).remove([finalPath])
    if (error) return { success: false, error: error.message }

    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * Lista archivos bajo un prefijo de ruta.
 */
export const listDocuments = async (prefix = '') => {
  try {
    const organizationId = await getOrganizationId()
    const finalPrefix = scopedPath(prefix || 'root', organizationId).replace(/\/root$/, '')

    if (!isIntegrationEnabled('storage')) {
      return { success: true, files: [] }
    }

    const { data, error } = await supabase.storage.from(BUCKET).list(finalPrefix)
    if (error) return { success: false, error: error.message }

    return { success: true, files: data || [] }
  } catch (error) {
    return { success: false, error: error.message, files: [] }
  }
}

// Rutas estándar para cada tipo de entidad
export const storagePaths = {
  firma: (otId) => `firmas/ot-${otId}.png`,
  fotoOT: (otId, n) => `fotos/ot-${otId}-${n}.jpg`,
  fotoMaq: (maqId, n) => `maquinas/${maqId}/foto-${n}.jpg`,
  remito: (provId, n) => `remitos/${provId}/${n}.pdf`,
  factura: (factId) => `facturas/${factId}.pdf`,
  contrato: (contratoId) => `contratos/${contratoId}.pdf`,
}