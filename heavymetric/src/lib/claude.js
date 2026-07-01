import { supabase } from './supabase'

export async function consultarMotorIA(pregunta, historial, moduloActual, orgId) {
  void orgId

  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) {
      console.error('Error validando la sesion para IA:', sessionError)
      throw publicError('No se pudo validar tu sesion. Volve a iniciar sesion.')
    }

    const accessToken = session?.access_token
    if (!accessToken) throw publicError('Tu sesion expiro. Volve a iniciar sesion.')

    const question = String(pregunta || '').trim()
    if (!question || question.length > 4000) {
      throw publicError('La consulta debe tener entre 1 y 4000 caracteres.')
    }

    const safeHistory = (Array.isArray(historial) ? historial : [])
      .filter((message) => (
        message
        && ['user', 'assistant', 'system'].includes(message.role)
        && typeof message.content === 'string'
        && message.content.trim()
      ))
      .slice(-19)
      .map((message) => ({
        role: message.role,
        content: message.content.trim().slice(0, 4000),
      }))

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messages: [...safeHistory, { role: 'user', content: question }],
        moduloActual: String(moduloActual || '').slice(0, 80),
      })
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      if (response.status === 401) throw publicError('Tu sesion expiro. Volve a iniciar sesion.')
      if (response.status === 403) throw publicError('No tenes permisos para usar el asistente de IA.')
      if (response.status === 429) throw publicError('Alcanzaste el limite de consultas. Intenta nuevamente en un minuto.')
      throw publicError('No se pudo procesar la consulta en este momento.')
    }

    if (typeof data.content !== 'string' || !data.content.trim()) {
      throw publicError('El asistente no devolvio una respuesta valida.')
    }

    return data.content
  } catch (error) {
    console.error('Error consultando IA:', error)
    if (error?.isPublicError) throw error
    throw publicError('No se pudo conectar con el asistente de IA.')
  }
}

function publicError(message) {
  const error = new Error(message)
  error.isPublicError = true
  return error
}
