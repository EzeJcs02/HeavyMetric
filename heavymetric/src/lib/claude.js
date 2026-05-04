export async function consultarMotorIA(pregunta, historial, moduloActual, orgId) {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
