const RATE_LIMIT = 30
const RATE_WINDOW_MS = 60_000
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
  if (req.method !== 'GET') return res.status(405).end()

  let auth
  try {
    auth = await authenticateRequest(req)
  } catch (err) {
    console.error('[ARCA] Error validando autenticacion:', err.message)
    return res.status(503).json({ error: 'Servicio no disponible' })
  }
  if (auth.error) return res.status(auth.status).json({ error: auth.error })

  const rateKey = `${auth.perfil.organization_id}:${auth.user.id}`
  if (!checkRateLimit(rateKey)) return res.status(429).json({ error: 'Demasiadas solicitudes' })

  const { cuit } = req.query
  if (typeof cuit !== 'string') return res.status(400).json({ error: 'Parametro "cuit" requerido' })

  const cuitLimpio = cuit.replace(/[- ]/g, '')
  if (!/^\d{11}$/.test(cuitLimpio)) {
    return res.status(400).json({ error: 'CUIT invalido: debe tener 11 digitos' })
  }

  const apiUrl = process.env.ARCA_API_URL?.trim()
  const apiKey = process.env.ARCA_API_KEY?.trim()
  const hasCert = Boolean(process.env.ARCA_CERT?.trim() && process.env.ARCA_CUIT?.trim())

  if (!apiUrl && !hasCert) {
    return res.status(503).json({ error: 'Integracion ARCA no configurada' })
  }

  const t0 = Date.now()

  try {
    if (apiUrl) {
      let url
      try {
        url = new URL(`${apiUrl.replace(/\/$/, '')}/persona/${cuitLimpio}`)
      } catch {
        return res.status(503).json({ error: 'Integracion ARCA no configurada' })
      }

      if (url.protocol !== 'https:') {
        console.error('[ARCA] ARCA_API_URL debe usar HTTPS')
        return res.status(503).json({ error: 'Integracion ARCA no configurada' })
      }

      const headers = { Accept: 'application/json' }
      if (apiKey) headers.Authorization = `Bearer ${apiKey}`

      const response = await fetch(url, {
        headers,
        redirect: 'error',
        signal: AbortSignal.timeout(15_000),
      })
      const latencia = Date.now() - t0

      if (!response.ok) {
        console.error(`[ARCA] Proveedor HTTP ${response.status} (${latencia}ms)`)
        return res.status(502).json({ error: 'Error consultando ARCA' })
      }

      const raw = await response.json()
      const data = normalizarRespuesta(raw)
      console.log(`[ARCA] OK org=${auth.perfil.organization_id} cuit=*******${cuitLimpio.slice(-4)} (${latencia}ms)`)
      return res.status(200).json({ success: true, data })
    }

    return res.status(501).json({
      error: 'Autenticacion WSAA con certificado aun no implementada en esta instancia.',
    })
  } catch (err) {
    console.error('[ARCA] Error inesperado:', err.message)
    return res.status(500).json({ error: 'Error interno consultando ARCA' })
  }
}

function normalizarRespuesta(raw) {
  if (raw?.persona) {
    const persona = raw.persona
    const esMonotributo = Array.isArray(persona.categoriasMonotributo) && persona.categoriasMonotributo.length > 0
    const esResponsableInscripto = Array.isArray(persona.impuesto)
      && persona.impuesto.some((impuesto) => impuesto.idImpuesto === 30)

    return {
      razonSocial: persona.razonSocial || persona.apellidoNombre || '',
      tipoPersona: persona.tipoClave === 'CUIL' ? 'FISICA' : 'JURIDICA',
      estado: persona.estadoClave || 'ACTIVO',
      condicionIVA: esMonotributo ? 'Monotributista' : esResponsableInscripto ? 'Responsable Inscripto' : 'Exento',
      actividadPrincipal: persona.actividades?.[0]
        ? `${persona.actividades[0].idActividad} - ${persona.actividades[0].descripcionActividad}`
        : '',
    }
  }

  return {
    razonSocial: String(raw?.razonSocial || raw?.razon_social || '').slice(0, 300),
    tipoPersona: String(raw?.tipoPersona || raw?.tipo_persona || '').slice(0, 50),
    estado: String(raw?.estado || '').slice(0, 50),
    condicionIVA: String(raw?.condicionIVA || raw?.condicion_iva || '').slice(0, 100),
    actividadPrincipal: String(raw?.actividadPrincipal || raw?.actividad_principal || '').slice(0, 500),
  }
}
