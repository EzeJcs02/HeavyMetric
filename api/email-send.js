// Email sender via Resend — Vercel serverless function
//
// Env vars (server-side, sin prefijo VITE_):
//   RESEND_API_KEY   — clave de API de Resend (resend.com)
//   RESEND_FROM      — dirección remitente verificada, p.ej. "HeavyMetric <notif@tudominio.com>"

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { to, subject, html, text, attachments } = req.body || {}

  if (!to || !subject || (!html && !text)) {
    return res.status(400).json({ error: 'Campos requeridos: to, subject, html o text' })
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(503).json({
      error: 'Integración Email no configurada',
      instrucciones: 'Agregar RESEND_API_KEY y RESEND_FROM en las variables de entorno del servidor.',
    })
  }

  const from = process.env.RESEND_FROM || 'HeavyMetric <notificaciones@heavymetric.com>'
  const t0   = Date.now()

  try {
    const payload = {
      from,
      to:      Array.isArray(to) ? to : [to],
      subject,
      ...(html ? { html } : { text }),
    }

    if (Array.isArray(attachments) && attachments.length > 0) {
      payload.attachments = attachments.map(a => ({
        filename: a.filename,
        content:  a.content, // base64 string
      }))
    }

    const response = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()
    const latencia = Date.now() - t0

    if (!response.ok) {
      console.error(`[Email] Resend error ${response.status} (${latencia}ms):`, data)
      return res.status(response.status).json({ error: data.message || 'Error enviando email' })
    }

    console.log(`[Email] OK → ${Array.isArray(to) ? to.join(', ') : to} (${latencia}ms)`)
    return res.status(200).json({ success: true, messageId: data.id })
  } catch (err) {
    console.error('[Email] Error inesperado:', err.message)
    return res.status(500).json({ error: 'Error interno enviando email' })
  }
}
