const RATE_LIMIT = 10
const RATE_WINDOW_MS = 60_000
const MAX_BODY_BYTES = 6 * 1024 * 1024
const MAX_IMAGE_BYTES = 4 * 1024 * 1024
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/tiff',
])
const ALLOWED_FEATURES = new Set(['DOCUMENT_TEXT_DETECTION', 'TEXT_DETECTION'])
const rateBuckets = new Map()

function checkRateLimit(key) {
  const now = Date.now()
  const current = rateBuckets.get(key)
  if (!current || current.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }
  if (current.count >= RATE_LIMIT) return false
  current.count += 1
  return true
}

function bodySize(req) {
  const declared = Number(req.headers['content-length'] || 0)
  if (Number.isFinite(declared) && declared > 0) return declared
  return Buffer.byteLength(JSON.stringify(req.body || {}), 'utf8')
}

async function authenticateRequest(req) {
  const match = typeof req.headers.authorization === 'string'
    ? req.headers.authorization.match(/^Bearer\s+([^\s]+)$/i)
    : null

  if (!match) return { status: 401, error: 'No autorizado' }

  const supabaseUrl = process.env.SUPABASE_URL?.trim()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!supabaseUrl || !serviceRoleKey) return { status: 503, error: 'Servicio no disponible' }

  const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${match[1]}`,
    },
    signal: AbortSignal.timeout(10_000),
  })
  if (!authResponse.ok) return { status: 401, error: 'No autorizado' }
  const user = await authResponse.json()
  if (!user?.id) return { status: 401, error: 'No autorizado' }

  const profileResponse = await fetch(
    `${supabaseUrl}/rest/v1/perfiles?id=eq.${encodeURIComponent(user.id)}&select=id,organization_id,rol&limit=1`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      signal: AbortSignal.timeout(10_000),
    }
  )
  if (!profileResponse.ok) return { status: 503, error: 'Servicio no disponible' }
  const [perfil] = await profileResponse.json()
  if (!perfil?.organization_id) return { status: 403, error: 'Perfil sin organizacion' }
  if (!['owner', 'supervisor'].includes(String(perfil.rol || '').toLowerCase())) {
    return { status: 403, error: 'Permisos insuficientes' }
  }
  return { user, perfil }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (bodySize(req) > MAX_BODY_BYTES) return res.status(413).json({ error: 'Payload demasiado grande' })

  let auth
  try {
    auth = await authenticateRequest(req)
  } catch (err) {
    console.error('[OCR] Error validando autenticacion:', err.message)
    return res.status(503).json({ error: 'Servicio no disponible' })
  }
  if (auth.error) return res.status(auth.status).json({ error: auth.error })

  const rateKey = `${auth.perfil.organization_id}:${auth.user.id}`
  if (!checkRateLimit(rateKey)) return res.status(429).json({ error: 'Demasiadas solicitudes' })

  const { imageBase64, mimeType = 'image/jpeg', features } = req.body || {}
  if (
    typeof imageBase64 !== 'string'
    || imageBase64.length < 32
    || !/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)
    || imageBase64.length % 4 !== 0
  ) {
    return res.status(400).json({ error: 'Imagen base64 invalida' })
  }

  if (typeof mimeType !== 'string' || !ALLOWED_MIME_TYPES.has(mimeType.toLowerCase())) {
    return res.status(400).json({ error: 'Tipo de imagen no permitido' })
  }

  const imageBytes = Buffer.from(imageBase64, 'base64').length
  if (imageBytes < 16 || imageBytes > MAX_IMAGE_BYTES) {
    return res.status(413).json({ error: 'Imagen fuera del tamano permitido' })
  }

  const requestedFeatures = features === undefined
    ? ['DOCUMENT_TEXT_DETECTION']
    : features

  if (
    !Array.isArray(requestedFeatures)
    || requestedFeatures.length < 1
    || requestedFeatures.length > 2
    || !requestedFeatures.every((feature) => typeof feature === 'string' && ALLOWED_FEATURES.has(feature))
  ) {
    return res.status(400).json({ error: 'Features OCR invalidas' })
  }

  const apiKey = process.env.GOOGLE_CLOUD_API_KEY?.trim()
  if (!apiKey) return res.status(503).json({ error: 'Integracion OCR no configurada' })

  const t0 = Date.now()

  try {
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: imageBase64 },
            features: requestedFeatures.map((type) => ({ type })),
            imageContext: { languageHints: ['es', 'es-419'] },
          }],
        }),
        signal: AbortSignal.timeout(20_000),
      }
    )

    const result = await response.json().catch(() => ({}))
    const latencia = Date.now() - t0

    if (!response.ok || result.error) {
      console.error(`[OCR] Google Vision HTTP ${response.status} (${latencia}ms)`)
      return res.status(502).json({ error: 'Error procesando imagen' })
    }

    const annotation = result.responses?.[0]
    const textoCrudo = annotation?.fullTextAnnotation?.text
      || annotation?.textAnnotations?.[0]?.description
      || ''
    const confianza = annotation?.fullTextAnnotation?.pages?.[0]?.confidence ?? null
    const bloques = annotation?.fullTextAnnotation?.pages?.flatMap((page) =>
      page.blocks?.flatMap((block) =>
        block.paragraphs?.map((paragraph) =>
          paragraph.words?.map((word) => word.symbols?.map((symbol) => symbol.text).join('')).join(' ')
        )
      )
    ).filter(Boolean) || []

    console.log(`[OCR] OK org=${auth.perfil.organization_id} chars=${textoCrudo.length} (${latencia}ms)`)
    return res.status(200).json({
      success: true,
      data: { textoCrudo, confianza, bloques },
    })
  } catch (err) {
    console.error('[OCR] Error inesperado:', err.message)
    return res.status(500).json({ error: 'Error interno procesando OCR' })
  }
}
