// ARCA / AFIP — CUIT lookup proxy (Vercel serverless)
//
// Modos de operación (en orden de prioridad):
//   1. ARCA_API_URL configurado → proxy REST a esa URL (p.ej. proveedor tercero de AFIP)
//   2. ARCA_CERT + ARCA_CUIT  → autenticación WSAA + SR Padrón Alcance 1 (requiere node-forge)
//   3. Sin credenciales       → 503 con instrucciones de configuración
//
// Env vars:
//   ARCA_API_URL    URL base del endpoint REST compatible con AFIP (opcional)
//   ARCA_API_KEY    Bearer token para ARCA_API_URL (opcional)
//   ARCA_CERT       Certificado p12 en base64 (para WSAA directo)
//   ARCA_CUIT       CUIT de la organización (para WSAA directo)
//   ARCA_ENV        "prod" | "homo" — default "homo"

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { cuit } = req.query
  if (!cuit) return res.status(400).json({ error: 'Parámetro "cuit" requerido' })

  const cuitLimpio = cuit.replace(/[- ]/g, '')
  if (!/^\d{11}$/.test(cuitLimpio)) {
    return res.status(400).json({ error: 'CUIT inválido — debe tener 11 dígitos sin guiones' })
  }

  const apiUrl     = process.env.ARCA_API_URL
  const apiKey     = process.env.ARCA_API_KEY
  const hasCert    = !!(process.env.ARCA_CERT && process.env.ARCA_CUIT)

  if (!apiUrl && !hasCert) {
    return res.status(503).json({
      error: 'Integración ARCA no configurada',
      instrucciones: [
        'Opción A (REST proxy): Configurar ARCA_API_URL con la URL base de tu proveedor AFIP REST.',
        '  Ejemplo: ARCA_API_URL=https://api.miproveedor.com/afip',
        '  Opcional: ARCA_API_KEY=<bearer_token>',
        'Opción B (WSAA directo): Configurar ARCA_CERT (p12 en base64), ARCA_CUIT y ARCA_ENV.',
        '  Requiere habilitar el WS "sr-padron-a1" en clave fiscal de AFIP.',
      ],
    })
  }

  const t0 = Date.now()

  try {
    if (apiUrl) {
      const url = `${apiUrl.replace(/\/$/, '')}/persona/${cuitLimpio}`
      const headers = { 'Content-Type': 'application/json' }
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

      const response = await fetch(url, { headers })
      const latencia = Date.now() - t0

      if (!response.ok) {
        const texto = await response.text().catch(() => '')
        console.error(`[ARCA] HTTP ${response.status} (${latencia}ms):`, texto.slice(0, 200))
        return res.status(response.status).json({ error: 'Error consultando ARCA' })
      }

      const raw = await response.json()
      const data = normalizarRespuesta(raw)
      console.log(`[ARCA] OK ${cuitLimpio} (${latencia}ms)`)
      return res.status(200).json({ success: true, data })
    }

    // WSAA directo — requiere node-forge o similar para firmar el TRA con p12
    // Implementar cuando ARCA_CERT esté disponible en el entorno de producción
    return res.status(501).json({
      error: 'Autenticación WSAA con certificado aún no implementada en esta instancia.',
      alternativa: 'Usar ARCA_API_URL con un proveedor REST (ver instrucciones en /503).',
    })
  } catch (err) {
    console.error('[ARCA] Error inesperado:', err.message)
    return res.status(500).json({ error: 'Error interno consultando ARCA' })
  }
}

// Normaliza distintos formatos de respuesta al modelo canónico de HeavyMetric
function normalizarRespuesta(raw) {
  // Formato SR Padrón v2 oficial de AFIP
  if (raw?.persona) {
    const p = raw.persona
    const esMonotributo = Array.isArray(p.categoriasMonotributo) && p.categoriasMonotributo.length > 0
    const esRI = Array.isArray(p.impuesto) && p.impuesto.some(i => i.idImpuesto === 30)

    return {
      razonSocial:        p.razonSocial || p.apellidoNombre || '',
      tipoPersona:        p.tipoClave === 'CUIL' ? 'FISICA' : 'JURIDICA',
      estado:             p.estadoClave || 'ACTIVO',
      condicionIVA:       esMonotributo ? 'Monotributista' : esRI ? 'Responsable Inscripto' : 'Exento',
      actividadPrincipal: p.actividades?.[0]
        ? `${p.actividades[0].idActividad} — ${p.actividades[0].descripcionActividad}`
        : '',
    }
  }

  // Si ya viene en formato canónico (proveedor tercero) o desconocido → pasar directo
  return raw
}
