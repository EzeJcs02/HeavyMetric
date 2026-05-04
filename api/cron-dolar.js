import { createClient } from '@supabase/supabase-js'

// Inicializar cliente Supabase con Service Role para saltar RLS
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  // 1. Verificación de Seguridad (CRON_SECRET)
  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'No autorizado' })
  }

  try {
    // 2. Fetch a la API de DolarAPI (BNA Oficial)
    const response = await fetch('https://dolarapi.com/v1/dolares/oficial')
    
    if (!response.ok) {
      throw new Error(`Error de API externa: ${response.statusText}`)
    }

    const data = await response.json()
    const valorDolar = data.venta // Usamos el valor de venta para facturación

    if (!valorDolar) {
      throw new Error('No se recibió un valor válido de la API')
    }

    // 3. Actualizar en Supabase (tabla config_sistema)
    const { error: dbError } = await supabase
      .from('config_sistema')
      .upsert({ 
        clave: 'cotizacion_dolar', 
        valor: { 
          oficial: valorDolar, 
          ultima_actualizacion: new Date().toISOString() 
        } 
      })

    if (dbError) throw dbError

    return res.status(200).json({ 
      success: true, 
      valor: valorDolar,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error en Cron Dólar:', error.message)
    
    // Si falla la API externa o la DB, respondemos con 500
    // pero el valor anterior se mantiene en la DB por diseño.
    return res.status(500).json({ 
      success: false, 
      message: 'Error al actualizar cotización. Se mantiene el valor anterior.',
      error: error.message 
    })
  }
}
