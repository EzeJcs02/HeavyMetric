// WhatsApp sender via Meta Cloud API — Vercel serverless function
//
// Env vars (server-side, sin prefijo VITE_):
//   WHATSAPP_ACCESS_TOKEN      — User Access Token o System User Token de Meta Business
//   WHATSAPP_PHONE_NUMBER_ID   — ID del número de teléfono en Meta Business
//
// Tipos de mensaje:
//   - Con campo "message" (string): envía texto libre (solo válido en ventana de 24hs de respuesta)
//   - Con campo "type" + "data": envía template pre-aprobado en Meta Business Manager
//
// Templates requeridos en Meta (nombre → parámetros del body):
//   hm_alerta      → {{maquina}}, {{descripcion}}
//   hm_service     → {{maquina}}, {{horasRestantes}}
//   hm_cobranza    → {{cliente}}, {{monto}}, {{vencimiento}}
//   hm_vencimiento → {{contrato}}, {{fechaVencimiento}}

const TEMPLATES = {
  alerta:     'hm_alerta',
  service:    'hm_service',
  cobranza:   'hm_cobranza',
  vencimiento:'hm_vencimiento',
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { phone, type, data, message } = req.body || {}

  if (!phone) return res.status(400).json({ error: 'Campo "phone" requerido' })

  const token   = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID

  if (!token || !phoneId) {
    return res.status(503).json({
      error: 'Integración WhatsApp no configurada',
      instrucciones: [
        'Agregar WHATSAPP_ACCESS_TOKEN y WHATSAPP_PHONE_NUMBER_ID en variables de entorno.',
        'Obtener en: Meta Business Manager → WhatsApp → Getting Started.',
        'Los templates deben ser aprobados en Meta antes de poder usarlos.',
      ],
    })
  }

  // Normalizar teléfono: quitar +, espacios y guiones; debe incluir código de país
  const phoneNorm = phone.replace(/[\s\-\(\)\+]/g, '')
  if (!/^\d{10,15}$/.test(phoneNorm)) {
    return res.status(400).json({ error: 'Número de teléfono inválido. Incluir código de país (ej: 5491112345678).' })
  }

  const t0 = Date.now()

  try {
    let payload

    if (message) {
      // Texto libre — solo funciona dentro de la ventana de 24hs de conversación activa
      payload = {
        messaging_product: 'whatsapp',
        to:   phoneNorm,
        type: 'text',
        text: { body: message },
      }
    } else {
      // Template message — funciona en cualquier momento (requiere template aprobado)
      const templateName = TEMPLATES[type] || 'hm_alerta'
      const components   = buildComponents(type, data || {})

      payload = {
        messaging_product: 'whatsapp',
        to:   phoneNorm,
        type: 'template',
        template: {
          name:       templateName,
          language:   { code: 'es_AR' },
          components,
        },
      }
    }

    const url = `https://graph.facebook.com/v20.0/${phoneId}/messages`
    const response = await fetch(url, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(payload),
    })

    const result  = await response.json()
    const latencia = Date.now() - t0

    if (!response.ok) {
      console.error(`[WhatsApp] Meta error ${response.status} (${latencia}ms):`, result.error)
      return res.status(response.status).json({ error: result.error?.message || 'Error enviando WhatsApp' })
    }

    console.log(`[WhatsApp] OK → ${phoneNorm} tipo=${type || 'text'} (${latencia}ms)`)
    return res.status(200).json({ success: true, messageId: result.messages?.[0]?.id })
  } catch (err) {
    console.error('[WhatsApp] Error inesperado:', err.message)
    return res.status(500).json({ error: 'Error interno enviando WhatsApp' })
  }
}

function buildComponents(type, data) {
  const param = (v) => ({ type: 'text', text: String(v ?? '') })

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
