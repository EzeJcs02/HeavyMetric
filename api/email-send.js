const RATE_LIMIT = 10
const RATE_WINDOW_MS = 60_000
const MAX_BODY_BYTES = 4 * 1024 * 1024
const MAX_CONTENT_CHARS = 200_000
const MAX_ATTACHMENTS = 5
const MAX_ATTACHMENT_BASE64_CHARS = 3 * 1024 * 1024
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

function isValidEmail(value) {
  return typeof value === 'string'
    && value.length <= 254
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
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
    console.error('[Email] Error validando autenticacion:', err.message)
    return res.status(503).json({ error: 'Servicio no disponible' })
  }
  if (auth.error) return res.status(auth.status).json({ error: auth.error })

  const rateKey = `${auth.perfil.organization_id}:${auth.user.id}`
  if (!checkRateLimit(rateKey)) return res.status(429).json({ error: 'Demasiadas solicitudes' })

  const { to, subject, html, text, attachments } = req.body || {}
  const recipients = Array.isArray(to) ? to : [to]

  if (
    recipients.length < 1
    || recipients.length > 10
    || !recipients.every(isValidEmail)
    || typeof subject !== 'string'
    || !subject.trim()
    || subject.length > 200
    || (typeof html !== 'string' && typeof text !== 'string')
  ) {
    return res.status(400).json({ error: 'Payload de email invalido' })
  }

  const content = typeof html === 'string' ? html : text
  if (!content.trim() || content.length > MAX_CONTENT_CHARS) {
    return res.status(400).json({ error: 'Contenido de email invalido' })
  }

  if (attachments !== undefined && !Array.isArray(attachments)) {
    return res.status(400).json({ error: 'Adjuntos invalidos' })
  }
  if ((attachments?.length || 0) > MAX_ATTACHMENTS) {
    return res.status(413).json({ error: 'Demasiados adjuntos' })
  }

  let totalAttachmentChars = 0
  for (const attachment of attachments || []) {
    if (
      !attachment
      || typeof attachment.filename !== 'string'
      || !attachment.filename.trim()
      || attachment.filename.length > 200
      || /[\\/\0]/.test(attachment.filename)
      || typeof attachment.content !== 'string'
      || !/^[A-Za-z0-9+/]*={0,2}$/.test(attachment.content)
    ) {
      return res.status(400).json({ error: 'Adjunto invalido' })
    }
    totalAttachmentChars += attachment.content.length
  }
  if (totalAttachmentChars > MAX_ATTACHMENT_BASE64_CHARS) {
    return res.status(413).json({ error: 'Adjuntos demasiado grandes' })
  }

  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) return res.status(503).json({ error: 'Integracion Email no configurada' })

  const from = process.env.RESEND_FROM || 'HeavyMetric <notificaciones@heavymetric.com>'
  const t0 = Date.now()

  try {
    const payload = {
      from,
      to: recipients,
      subject: subject.trim(),
      ...(typeof html === 'string' ? { html } : { text }),
    }

    if (attachments?.length) {
      payload.attachments = attachments.map(({ filename, content: attachmentContent }) => ({
        filename,
        content: attachmentContent,
      }))
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    })

    const data = await response.json().catch(() => ({}))
    const latencia = Date.now() - t0

    if (!response.ok) {
      console.error(`[Email] Resend HTTP ${response.status} (${latencia}ms)`)
      return res.status(502).json({ error: 'Error enviando email' })
    }

    console.log(`[Email] OK org=${auth.perfil.organization_id} destinatarios=${recipients.length} (${latencia}ms)`)
    return res.status(200).json({ success: true, messageId: data.id })
  } catch (err) {
    console.error('[Email] Error inesperado:', err.message)
    return res.status(500).json({ error: 'Error interno enviando email' })
  }
}
