import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  try {
    const response = await fetch('https://dolarapi.com/v1/dolares/oficial')
    const data = await response.json()
    const hoy = new Date().toISOString().split('T')[0]
    const { error } = await supabase
      .from('tipo_cambio')
      .upsert(
        { fecha: hoy, venta: data.venta, compra: data.compra, fuente: 'dolarapi.com' },
        { onConflict: 'fecha' }
      )
    if (error) throw error
    console.log(`[BNA] Actualizado: $${data.venta} (${hoy})`)
    return res.status(200).json({ ok: true, venta: data.venta, fecha: hoy })
  } catch (err) {
    console.error('[BNA] Error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
