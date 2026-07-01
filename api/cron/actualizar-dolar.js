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
    console.error('[BNA] Configuracion de seguridad incompleta')
    return res.status(503).json({ error: 'Servicio no disponible' })
  }

  if (!isAuthorizedCronRequest(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const response = await fetch('https://dolarapi.com/v1/dolares/oficial', {
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) throw new Error(`DolarAPI HTTP ${response.status}`)

    const data = await response.json()
    const venta = Number(data?.venta)
    const compra = Number(data?.compra)
    if (!Number.isFinite(venta) || venta <= 0 || !Number.isFinite(compra) || compra <= 0) {
      throw new Error('DolarAPI devolvio una cotizacion invalida')
    }

    const hoy = new Date().toISOString().split('T')[0]
    const dbResponse = await fetch(`${supabaseUrl}/rest/v1/tipo_cambio?on_conflict=fecha`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({ fecha: hoy, venta, compra, fuente: 'dolarapi.com' }),
      signal: AbortSignal.timeout(10_000),
    })

    if (!dbResponse.ok) throw new Error(`Supabase HTTP ${dbResponse.status}`)

    console.log(`[BNA] Cotizacion actualizada (${hoy})`)
    return res.status(200).json({ ok: true, venta, fecha: hoy })
  } catch (err) {
    console.error('[BNA] Error:', err.message)
    return res.status(500).json({ error: 'Error al actualizar la cotizacion' })
  }
}
