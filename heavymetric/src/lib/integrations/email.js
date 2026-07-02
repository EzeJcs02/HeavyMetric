import { integrationDisabledResult, isIntegrationEnabled, isIntegrationMockAllowed } from '../../config/integrations'
import { supabase } from '../supabase'

// ── Templates HTML ──────────────────────────────────────────────

const BASE = (color, titulo, subtitulo, cuerpo) => `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#1a1a1a;color:#e0e0e0;border-radius:8px;overflow:hidden;border:1px solid #333">
  <div style="background:${color};padding:20px 24px">
    <h1 style="margin:0;font-size:18px;color:#fff;font-weight:700">${titulo}</h1>
    ${subtitulo ? `<p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.8)">${subtitulo}</p>` : ''}
  </div>
  <div style="padding:24px;line-height:1.6">${cuerpo}</div>
  <div style="padding:12px 24px;background:#111;font-size:11px;color:#666;border-top:1px solid #333">
    HeavyMetric — Sistema de gestión de activos industriales
  </div>
</div>`

const row = (label, value) =>
  `<p style="margin:6px 0"><strong style="color:#9ca3af">${label}:</strong> ${value}</p>`

const TEMPLATES = {
  ot_completada: ({ numeroOT, maquina, descripcion, tecnico, fecha }) =>
    BASE('#f97316', 'Orden de Trabajo Completada', numeroOT, `
      ${row('Activo', maquina)}
      ${row('Trabajo realizado', descripcion)}
      ${row('Técnico', tecnico)}
      ${row('Fecha', fecha)}
    `),

  vencimiento_contrato: ({ cliente, maquina, fechaVencimiento, diasRestantes }) =>
    BASE('#ef4444', 'Vencimiento de Contrato', `Faltan ${diasRestantes} días`, `
      ${row('Cliente', cliente)}
      ${row('Activo', maquina)}
      ${row('Vencimiento', fechaVencimiento)}
      <p style="margin-top:16px;color:#9ca3af;font-size:13px">
        Por favor coordine la renovación o devolución del equipo.
      </p>
    `),

  factura_emitida: ({ numeroFactura, cliente, monto, fechaVto }) =>
    BASE('#22c55e', 'Nueva Factura Emitida', numeroFactura, `
      ${row('Cliente', cliente)}
      ${row('Monto total', `$${Number(monto).toLocaleString('es-AR')}`)}
      ${row('Vencimiento de pago', fechaVto)}
      <p style="margin-top:16px;color:#9ca3af;font-size:13px">Se adjunta la factura en PDF.</p>
    `),

  cobranza: ({ cliente, monto, diasMora, numeroFactura }) =>
    BASE('#f59e0b', 'Aviso de Cobranza', `${diasMora} días de mora`, `
      ${row('Cliente', cliente)}
      ${row('Factura', numeroFactura)}
      ${row('Monto pendiente', `$${Number(monto).toLocaleString('es-AR')}`)}
      <p style="margin-top:16px;color:#9ca3af;font-size:13px">
        Le solicitamos regularizar su situación a la brevedad.
      </p>
    `),

  service_proximo: ({ maquina, horasRestantes, cliente }) =>
    BASE('#3b82f6', 'Service Próximo', `${horasRestantes}hs restantes`, `
      ${row('Activo', maquina)}
      ${row('Cliente', cliente)}
      <p style="margin-top:16px;color:#9ca3af;font-size:13px">
        El equipo se acerca a su próxima fecha de mantenimiento programado (cada 250hs).
        Contactenos para coordinar.
      </p>
    `),
}

/**
 * Envía un correo electrónico.
 *
 * Modo mock (VITE_ENABLE_EMAIL=false): loguea en consola.
 * Modo real: llama a /api/email-send → Resend.
 *
 * @param {string|string[]} to          - Destinatario(s)
 * @param {string}          subject     - Asunto
 * @param {string}          body        - HTML o texto plano
 * @param {Array}           attachments - [{ filename, content (base64) }]
 */
export const sendEmail = async (to, subject, body, attachments = []) => {
  if (!isIntegrationEnabled('email')) {
    if (!isIntegrationMockAllowed()) return integrationDisabledResult('Email')

    const dest = Array.isArray(to) ? to.join(', ') : to
    console.log(`[MOCK EMAIL → ${dest}] ${subject}`)
    if (attachments.length) console.log(`[MOCK EMAIL] Adjuntos: ${attachments.length}`)
    return new Promise(resolve =>
      setTimeout(() => resolve({ success: true, messageId: `EMAIL-MOCK-${Date.now()}` }), 600)
    )
  }

  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw sessionError

    const accessToken = session?.access_token
    if (!accessToken) throw new Error('No hay una sesion autenticada activa')

    const isHtml = typeof body === 'string' && body.trimStart().startsWith('<')
    const res = await fetch('/api/email-send', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body:    JSON.stringify({
        to, subject, attachments,
        ...(isHtml ? { html: body } : { text: body }),
      }),
    })
    const result = await res.json()
    if (!res.ok) return { success: false, error: result.error || 'Error enviando email' }
    return result
  } catch (err) {
    return { success: false, error: err.message }
  }
}

// Wrappers tipados para los casos de uso del sistema
export const emailOTCompletada = (to, datos) =>
  sendEmail(to, `OT Completada — ${datos.numeroOT}`, TEMPLATES.ot_completada(datos))

export const emailVencimientoContrato = (to, datos) =>
  sendEmail(to, `Vencimiento de contrato — ${datos.maquina}`, TEMPLATES.vencimiento_contrato(datos))

export const emailFacturaEmitida = (to, datos, pdfBase64) =>
  sendEmail(
    to,
    `Factura ${datos.numeroFactura} — ${datos.cliente}`,
    TEMPLATES.factura_emitida(datos),
    pdfBase64 ? [{ filename: `${datos.numeroFactura}.pdf`, content: pdfBase64 }] : []
  )

export const emailCobranza = (to, datos) =>
  sendEmail(to, `Aviso de cobranza — ${datos.cliente}`, TEMPLATES.cobranza(datos))

export const emailServiceProximo = (to, datos) =>
  sendEmail(to, `Service próximo — ${datos.maquina}`, TEMPLATES.service_proximo(datos))
