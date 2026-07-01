import { timingSafeEqual } from 'node:crypto'

function isAuthorizedCronRequest(req) {
  const secret = process.env.CRON_SECRET?.trim()
  const authHeader = req.headers.authorization

  if (!secret || secret.length < 32 || typeof authHeader !== 'string') return false

  const expected = Buffer.from(`Bearer ${secret}`)
  const received = Buffer.from(authHeader)
  return expected.length === received.length && timingSafeEqual(expected, received)
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const secret = process.env.CRON_SECRET?.trim()
  const supabaseUrl = process.env.SUPABASE_URL?.trim()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!secret || secret.length < 32 || !supabaseUrl || !serviceRoleKey) {
    console.error('[Cron Dolar] Configuracion de seguridad incompleta')
    return res.status(503).json({ error: 'Servicio no disponible' })
  }

  if (!isAuthorizedCronRequest(req)) {
    return res.status(401).json({ error: 'No autorizado' })
  }

  try {
    const response = await fetch('https://dolarapi.com/v1/dolares/oficial', {
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) throw new Error(`DolarAPI HTTP ${response.status}`)

    const data = await response.json()
    const valorDolar = Number(data?.venta)

    if (!Number.isFinite(valorDolar) || valorDolar <= 0) {
      throw new Error('DolarAPI devolvio una cotizacion invalida')
    }

    const dbResponse = await fetch(`${supabaseUrl}/rest/v1/config_sistema?on_conflict=clave`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({
        clave: 'cotizacion_dolar',
        valor: {
          oficial: valorDolar,
          ultima_actualizacion: new Date().toISOString(),
        },
      }),
      signal: AbortSignal.timeout(10_000),
    })

    if (!dbResponse.ok) throw new Error(`Supabase HTTP ${dbResponse.status}`)

    return res.status(200).json({
      success: true,
      valor: valorDolar,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Cron Dolar] Error:', error.message)
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar cotizacion. Se mantiene el valor anterior.',
    })
  }
}
