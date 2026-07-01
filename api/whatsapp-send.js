const TEMPLATES = {
  alerta: 'hm_alerta',
  service: 'hm_service',
  cobranza: 'hm_cobranza',
  vencimiento: 'hm_vencimiento',
}

const TEMPLATE_FIELDS = {
  alerta: ['maquina', 'descripcion'],
  service: ['maquina', 'horasRestantes'],
  cobranza: ['cliente', 'monto', 'vencimiento'],
  vencimiento: ['contrato', 'fechaVencimiento'],
}

const RATE_LIMIT = 20
const RATE_WINDOW_MS = 60_000
const MAX_BODY_BYTES = 32 * 1024
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

function validateTemplateData(type, data) {
  if (!Object.prototype.hasOwnProperty.call(TEMPLATES, type) || !data || typeof data !== 'object' || Array.isArray(data)) {
    return false
  }

  return TEMPLATE_FIELDS[type].every((field) => {
    const value = data[field]
    return (typeof value === 'string' || typeof value === 'number')
      && String(value).trim().length > 0
      && String(value).length <= 500
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (bodySize(req) > MAX_BODY_BYTES) return res.status(413).json({ error: 'Payload demasiado grande' })

  let auth
  try {
    auth = await authenticateRequest(req)
  } catch (err) {
    console.error('[WhatsApp] Error validando autenticacion:', err.message)
    return res.status(503).json({ error: 'Servicio no disponible' })
  }
  if (auth.error) return res.status(auth.status).json({ error: auth.error })

  const rateKey = `${auth.perfil.organization_id}:${auth.user.id}`
  if (!checkRateLimit(rateKey)) return res.status(429).json({ error: 'Demasiadas solicitudes' })

  const { phone, type, data, message } = req.body || {}
  if (typeof phone !== 'string') return res.status(400).json({ error: 'Campo "phone" invalido' })

  const phoneNorm = phone.replace(/[\s\-()+]/g, '')
  if (!/^\d{10,15}$/.test(phoneNorm)) {
    return res.status(400).json({ error: 'Numero de telefono invalido. Incluir codigo de pais.' })
  }

  const hasMessage = typeof message === 'string' && message.trim().length > 0
  if (hasMessage && message.length > 4096) {
    return res.status(400).json({ error: 'Mensaje demasiado largo' })
  }
  if (!hasMessage && !validateTemplateData(type, data)) {
    return res.status(400).json({ error: 'Template o datos invalidos' })
  }

  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim()
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
  if (!token || !phoneId || !/^\d+$/.test(phoneId)) {
    return res.status(503).json({ error: 'Integracion WhatsApp no configurada' })
  }

  const t0 = Date.now()

  try {
    let payload

    if (hasMessage) {
      payload = {
        messaging_product: 'whatsapp',
        to: phoneNorm,
        type: 'text',
        text: { body: message.trim() },
      }
    } else {
      payload = {
        messaging_product: 'whatsapp',
        to: phoneNorm,
        type: 'template',
        template: {
          name: TEMPLATES[type],
          language: { code: 'es_AR' },
          components: buildComponents(type, data),
        },
      }
    }

    const response = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    })

    const result = await response.json().catch(() => ({}))
    const latencia = Date.now() - t0

    if (!response.ok) {
      console.error(`[WhatsApp] Meta HTTP ${response.status} (${latencia}ms)`)
      return res.status(502).json({ error: 'Error enviando WhatsApp' })
    }

    console.log(`[WhatsApp] OK org=${auth.perfil.organization_id} tipo=${type || 'text'} (${latencia}ms)`)
    return res.status(200).json({ success: true, messageId: result.messages?.[0]?.id })
  } catch (err) {
    console.error('[WhatsApp] Error inesperado:', err.message)
    return res.status(500).json({ error: 'Error interno enviando WhatsApp' })
  }
}

function buildComponents(type, data) {
  const param = (value) => ({ type: 'text', text: String(value) })

  switch (type) {
    case 'alerta':
      return [{ type: 'body', parameters: [param(data.maquina), param(data.descripcion)] }]
    case 'service':
      return [{ type: 'body', parameters: [param(data.maquina), param(data.horasRestantes)] }]
    case 'cobranza':
      return [{ type: 'body', parameters: [param(data.cliente), param(data.monto), param(data.vencimiento)] }]
    case 'vencimiento':
      return [{ type: 'body', parameters: [param(data.contrato), param(data.fechaVencimiento)] }]
    default:
      return []
  }
}
