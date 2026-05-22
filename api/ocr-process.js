// OCR processor via Google Cloud Vision — Vercel serverless function
//
// Env vars (server-side):
//   GOOGLE_CLOUD_API_KEY — API Key con Cloud Vision API habilitada
//
// Body: { imageBase64: string, mimeType?: string, features?: string[] }
//   imageBase64 — imagen codificada en base64 (sin prefijo "data:...")
//   mimeType    — default "image/jpeg"
//   features    — array de feature types de Vision API, default ["DOCUMENT_TEXT_DETECTION"]
//
// Retorna: { success, data: { textoCrudo, confianza, bloques } }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { imageBase64, mimeType = 'image/jpeg', features } = req.body || {}

  if (!imageBase64) {
    return res.status(400).json({ error: 'Campo "imageBase64" requerido' })
  }

  const apiKey = process.env.GOOGLE_CLOUD_API_KEY

  if (!apiKey) {
    return res.status(503).json({
      error: 'Integración OCR no configurada',
      instrucciones: [
        'Agregar GOOGLE_CLOUD_API_KEY con Cloud Vision API habilitada.',
        'Habilitar en: console.cloud.google.com → APIs → Cloud Vision API.',
      ],
    })
  }

  const t0 = Date.now()

  try {
    const requestedFeatures = Array.isArray(features) && features.length > 0
      ? features
      : ['DOCUMENT_TEXT_DETECTION']

    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          requests: [{
            image:        { content: imageBase64 },
            features:     requestedFeatures.map(type => ({ type })),
            imageContext: { languageHints: ['es', 'es-419'] },
          }],
        }),
      }
    )

    const result   = await response.json()
    const latencia = Date.now() - t0

    if (!response.ok || result.error) {
      const msg = result.error?.message || 'Error procesando imagen'
      console.error(`[OCR] Google Vision error (${latencia}ms):`, msg)
      return res.status(500).json({ error: msg })
    }

    const annotation = result.responses?.[0]
    const textoCrudo = annotation?.fullTextAnnotation?.text
      || annotation?.textAnnotations?.[0]?.description
      || ''

    const confianza = annotation?.fullTextAnnotation?.pages?.[0]?.confidence ?? null

    // Extraer bloques de texto (párrafos)
    const bloques = annotation?.fullTextAnnotation?.pages?.flatMap(page =>
      page.blocks?.flatMap(block =>
        block.paragraphs?.map(par =>
          par.words?.map(w => w.symbols?.map(s => s.text).join('')).join(' ')
        )
      )
    ).filter(Boolean) || []

    console.log(`[OCR] OK — ${textoCrudo.length} chars, ${bloques.length} bloques (${latencia}ms)`)

    return res.status(200).json({
      success: true,
      data: { textoCrudo, confianza, bloques },
    })
  } catch (err) {
    console.error('[OCR] Error inesperado:', err.message)
    return res.status(500).json({ error: 'Error interno procesando OCR' })
  }
}
