import { supabase } from './supabase'

export async function consultarMotorIA(pregunta, historial, moduloActual, orgId) {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw sessionError

    const accessToken = session?.access_token
    if (!accessToken) throw new Error('No hay una sesion autenticada activa')

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messages: [...historial, { role: 'user', content: pregunta }],
        moduloActual,
        orgId // Enviamos el ID de empresa para usar su propia llave
      })
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Error en la respuesta')

    return data.content
  } catch (error) {
    console.error('Error consultando IA:', error)
    throw error
  }
}
