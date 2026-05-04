import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Usamos service role para poder leer la key de la org
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo no permitido' })

  const { messages, moduloActual, orgId } = req.body

  if (!orgId) return res.status(400).json({ error: 'Falta identificación de la empresa' })

  try {
    // 1. Buscamos la llave de la organización en la DB
    const { data: org, error: orgError } = await supabase
      .from('organizaciones')
      .select('api_key_ia')
      .eq('id', orgId)
      .single()

    if (orgError || !org?.api_key_ia) {
      return res.status(403).json({ error: 'Esta empresa no tiene configurada una llave de IA propia.' })
    }

    // 2. Llamamos a Anthropic con LA LLAVE DE LA EMPRESA
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': org.api_key_ia, // <--- LLAVE DINÁMICA
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        system: `Eres el Asistente Inteligente de HeavyMetric ERP. Tu objetivo es ayudar al usuario con auditorías sobre su maquinaria pesada. Módulo actual: ${moduloActual}.`,
        messages: messages
      })
    })

    const data = await response.json()
    if (data.error) throw new Error(data.error.message)

    return res.status(200).json({ content: data.content[0].text })
  } catch (error) {
    console.error('Error IA SaaS:', error)
    return res.status(500).json({ error: error.message })
  }
}
