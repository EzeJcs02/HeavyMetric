export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { tipo, maquina, cliente, horas_restantes, telefono } = req.body

  // Mensaje según tipo de alerta
  const mensajes = {
    service_urgente: `⚠️ ALERTA SERVICE — ${maquina}\nCliente: ${cliente}\nFaltan ${horas_restantes}hs para el service.\nKnock S.A. tiene disponible el kit de filtros. ¿Coordinamos?`,
    service_proximo: `📋 Aviso service — ${maquina}\nCliente: ${cliente}\nFaltan ${horas_restantes}hs para el próximo service (cada 250hs).\nContactanos para coordinar.`,
  }

  const mensaje = mensajes[tipo] ?? `Alerta HeavyMetric: ${maquina} — ${cliente}`

  // TODO: integrar con Twilio o Meta WhatsApp Business API
  // Por ahora loguea el mensaje para desarrollo
  console.log(`[WhatsApp → ${telefono}]: ${mensaje}`)

  return res.status(200).json({ ok: true, mensaje, telefono })
}
