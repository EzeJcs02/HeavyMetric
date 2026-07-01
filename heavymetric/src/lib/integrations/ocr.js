import { isIntegrationEnabled } from '../../config/integrations'
import { supabase } from '../supabase'

const MOCK_RESULT = {
  tipoDocumento:   'REMITO',
  numero:          '0001-00004567',
  fecha:           new Date().toISOString().split('T')[0],
  entidad:         'PROVEEDOR MOCK S.A.',
  itemsDetectados: 3,
  textoCrudo:      'REMITO 0001-00004567\nFECHA: HOY\nPROVEEDOR MOCK S.A.\n1x FILTRO ACEITE\n2x CORREA ALTERNADOR\n1x BATERIA 12V 110AH',
}

// Convierte un File/Blob a base64 sin el prefijo data:...
const toBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.readAsDataURL(file)
  reader.onload  = () => resolve(reader.result.split(',')[1])
  reader.onerror = reject
})

/**
 * Lee un documento con OCR.
 *
 * Modo mock: retorna datos de prueba después de 2s.
 * Modo real: envía la imagen a /api/ocr-process → Google Cloud Vision
 *            y aplica un parser heurístico sobre el texto resultante.
 *
 * @param {File|Blob|string} imageFile - Imagen o base64 ya codificado
 */
export const readDocumentWithOCR = async (imageFile) => {
  if (!isIntegrationEnabled('ocr')) {
    console.log('[MOCK OCR] Procesando imagen...')
    return new Promise(resolve =>
      setTimeout(() => resolve({ success: true, data: MOCK_RESULT }), 2_000)
    )
  }

  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw sessionError

    const accessToken = session?.access_token
    if (!accessToken) throw new Error('No hay una sesion autenticada activa')

    const imageBase64 = typeof imageFile === 'string'
      ? imageFile
      : await toBase64(imageFile)

    const res = await fetch('/api/ocr-process', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body:    JSON.stringify({
        imageBase64,
        mimeType: imageFile?.type || 'image/jpeg',
      }),
    })

    const result = await res.json()
    if (!res.ok) return { success: false, error: result.error || 'Error en OCR' }

    // Aplicar parser heurístico al texto crudo
    const parsed = parsearTextoDocumento(result.data.textoCrudo)
    return { success: true, data: { ...result.data, ...parsed } }
  } catch (err) {
    console.error('[OCR] Error:', err.message)
    return { success: false, error: err.message }
  }
}

// Extrae campos estructurados del texto OCR usando heurísticas de documentos argentinos
function parsearTextoDocumento(texto = '') {
  const upper = texto.toUpperCase()

  const tipoDocumento =
    upper.includes('REMITO')         ? 'REMITO'         :
    upper.includes('FACTURA A')      ? 'FACTURA A'      :
    upper.includes('FACTURA B')      ? 'FACTURA B'      :
    upper.includes('FACTURA C')      ? 'FACTURA C'      :
    upper.includes('PRESUPUESTO')    ? 'PRESUPUESTO'    :
    upper.includes('ORDEN DE COMPRA')? 'ORDEN DE COMPRA':
    upper.includes('NOTA DE CREDITO')? 'NOTA DE CRÉDITO':
    'DOCUMENTO'

  // Número tipo 0001-00004567 o 0001-4567
  const numeroMatch = texto.match(/\b(\d{4}-\d{4,8})\b/)

  // Fecha formatos: DD/MM/AAAA, DD-MM-AAAA, AAAA-MM-DD
  const fechaMatch = texto.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{2,4})/)
  let fecha = ''
  if (fechaMatch) {
    const [, a, b, c] = fechaMatch
    const anio = c.length === 2 ? `20${c}` : c
    fecha = `${anio}-${b}-${a}`
  }

  // Primer línea en MAYÚSCULAS con más de 5 chars que no sea el tipo de doc → posible entidad
  const lineas = texto.split('\n').map(l => l.trim()).filter(Boolean)
  const entidad = lineas.find(l =>
    l.toUpperCase() === l &&
    l.length > 5 &&
    !['REMITO', 'FACTURA', 'PRESUPUESTO', 'ORDEN DE COMPRA'].some(t => l.includes(t))
  ) || ''

  // Contar líneas con patrón "Nx " como ítems detectados
  const itemsDetectados = (texto.match(/^\s*\d+\s*[xX]\s+/gm) || []).length

  return { tipoDocumento, numero: numeroMatch?.[0] || '', fecha, entidad, itemsDetectados }
}
