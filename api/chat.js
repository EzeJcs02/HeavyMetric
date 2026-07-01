const RATE_LIMIT = 20
const RATE_WINDOW_MS = 60_000
const MAX_BODY_BYTES = 100 * 1024
const MAX_MESSAGES = 20
const MAX_MESSAGE_CHARS = 4_000
const MAX_MODULE_CHARS = 80
const ALLOWED_MESSAGE_ROLES = new Set(['user', 'assistant', 'system'])
const ALLOWED_PROFILE_ROLES = new Set(['owner', 'supervisor', 'direccion', 'gerente'])
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
  if (!ALLOWED_PROFILE_ROLES.has(String(perfil.rol || '').toLowerCase())) {
    return { status: 403, error: 'Permisos insuficientes' }
  }

  return { user, perfil, supabaseUrl, serviceRoleKey }
}

function validatePayload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null

  const { messages, moduloActual = '' } = body
  if (!Array.isArray(messages) || messages.length < 1 || messages.length > MAX_MESSAGES) return null
  if (typeof moduloActual !== 'string' || moduloActual.length > MAX_MODULE_CHARS) return null

  const normalizedMessages = []
  const systemMessages = []

  for (const message of messages) {
    if (!message || typeof message !== 'object' || Array.isArray(message)) return null
    if (!ALLOWED_MESSAGE_ROLES.has(message.role)) return null
    if (typeof message.content !== 'string') return null

    const content = message.content.trim()
    if (!content || content.length > MAX_MESSAGE_CHARS) return null

    if (message.role === 'system') {
      systemMessages.push(content)
    } else {
      normalizedMessages.push({ role: message.role, content })
    }
  }

  if (normalizedMessages.length < 1) return null

  return {
    messages: normalizedMessages,
    systemMessages,
    moduloActual: moduloActual.trim(),
  }
}

async function getOrganizationApiKey(auth) {
  const response = await fetch(
    `${auth.supabaseUrl}/rest/v1/organizaciones?id=eq.${encodeURIComponent(auth.perfil.organization_id)}&select=api_key_ia&limit=1`,
    {
      headers: {
        apikey: auth.serviceRoleKey,
        Authorization: `Bearer ${auth.serviceRoleKey}`,
      },
      signal: AbortSignal.timeout(10_000),
    }
  )

  if (!response.ok) throw new Error('organization_config_unavailable')

  const [organization] = await response.json()
  const apiKey = organization?.api_key_ia?.trim()
  return apiKey || null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (bodySize(req) > MAX_BODY_BYTES) return res.status(413).json({ error: 'Payload demasiado grande' })

  let auth
  try {
    auth = await authenticateRequest(req)
  } catch (error) {
    console.error('[Chat] Error validando autenticacion:', error.message)
    return res.status(503).json({ error: 'Servicio no disponible' })
  }
  if (auth.error) return res.status(auth.status).json({ error: auth.error })

  const rateKey = `${auth.perfil.organization_id}:${auth.user.id}`
  if (!checkRateLimit(rateKey)) return res.status(429).json({ error: 'Demasiadas solicitudes' })

  const payload = validatePayload(req.body)
  if (!payload) return res.status(400).json({ error: 'Payload de chat invalido' })

  let apiKey
  try {
    apiKey = await getOrganizationApiKey(auth)
  } catch (error) {
    console.error('[Chat] Error leyendo configuracion:', error.message)
    return res.status(503).json({ error: 'Servicio no disponible' })
  }
  if (!apiKey) return res.status(503).json({ error: 'Integracion IA no configurada' })

  const systemParts = [
    'Eres el Asistente Inteligente de HeavyMetric ERP. Tu objetivo es ayudar al usuario con auditorias sobre su maquinaria pesada.',
  ]
  if (payload.moduloActual) systemParts.push(`Modulo actual: ${payload.moduloActual}.`)
  if (payload.systemMessages.length > 0) systemParts.push(payload.systemMessages.join('\n'))

  const startedAt = Date.now()

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        system: systemParts.join('\n'),
        messages: payload.messages,
      }),
      signal: AbortSignal.timeout(20_000),
    })

    const data = await response.json().catch(() => null)
    const content = Array.isArray(data?.content)
      ? data.content.find((item) => item?.type === 'text' && typeof item.text === 'string')?.text
      : null

    if (!response.ok || !content) {
      console.error(`[Chat] Anthropic HTTP ${response.status} (${Date.now() - startedAt}ms)`)
      return res.status(502).json({ error: 'Error procesando la consulta' })
    }

    console.log(`[Chat] OK org=${auth.perfil.organization_id} user=${auth.user.id} (${Date.now() - startedAt}ms)`)
    return res.status(200).json({ content })
  } catch (error) {
    console.error('[Chat] Error inesperado:', error.message)
    return res.status(500).json({ error: 'Error interno procesando la consulta' })
  }
}
