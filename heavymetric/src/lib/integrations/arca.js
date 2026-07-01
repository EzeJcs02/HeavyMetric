import { isIntegrationEnabled } from '../../config/integrations'
import { supabase } from '../supabase'

const MOCK_PADRON = {
  '30712345678': {
    razonSocial: 'HEAVYMETRIC S.A.', tipoPersona: 'JURIDICA', estado: 'ACTIVO',
    condicionIVA: 'Responsable Inscripto',
    actividadPrincipal: '620100 - SERVICIOS DE PROGRAMACIÓN Y CONSULTORÍA INFORMÁTICA',
  },
  '20123456789': {
    razonSocial: 'JUAN PEREZ', tipoPersona: 'FISICA', estado: 'ACTIVO',
    condicionIVA: 'Monotributista',
    actividadPrincipal: '702099 - SERVICIOS DE ASESORAMIENTO, DIRECCIÓN Y GESTIÓN EMPRESARIAL N.C.P.',
  },
}

export const lookupCuit = async (cuit) => {
  const limpio = cuit.replace(/[- ]/g, '')

  if (!isIntegrationEnabled('arca')) {
    console.log(`[MOCK ARCA] Buscando CUIT ${limpio}...`)
    return new Promise(resolve => setTimeout(() => resolve({
      success: true,
      data: MOCK_PADRON[limpio] ?? {
        razonSocial:        `EMPRESA MOCK ${limpio}`,
        tipoPersona:        'JURIDICA',
        estado:             'ACTIVO',
        condicionIVA:       'Responsable Inscripto',
        actividadPrincipal: '000000 - ACTIVIDAD NO ESPECIFICADA',
      },
    }), 800))
  }

  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw sessionError

    const accessToken = session?.access_token
    if (!accessToken) throw new Error('No hay una sesion autenticada activa')

    const res = await fetch(`/api/arca-lookup?cuit=${limpio}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const data = await res.json()
    if (!res.ok) return { success: false, error: data.error || 'Error consultando ARCA' }
    return data
  } catch (err) {
    return { success: false, error: err.message }
  }
}

// Validar comprobante y obtener CAE — requiere WSFE habilitado en producción
export const validarComprobante = async (datosFactura) => {
  if (!isIntegrationEnabled('arca')) {
    console.log('[MOCK ARCA] Validando comprobante...', datosFactura)
    return new Promise(resolve => setTimeout(() => resolve({
      success: true,
      cae:    String(Math.random()).replace('0.', '').padStart(14, '0').slice(0, 14),
      vtoCae: new Date(Date.now() + 10 * 86_400_000).toISOString().split('T')[0],
    }), 1000))
  }

  // Facturación electrónica real requiere certificado AFIP + configuración WSFE
  return { success: false, error: 'Facturación ARCA requiere certificado AFIP y WSFE configurado' }
}

// Factura futura / recurrente
export const generarFacturaFutura = async (datosFactura) => {
  if (!isIntegrationEnabled('arca')) {
    console.log('[MOCK ARCA] Generando factura futura...', datosFactura)
    return new Promise(resolve => setTimeout(() => resolve({ success: true, id: `FC-FUT-${Date.now()}` }), 500))
  }

  return { success: false, error: 'Facturación recurrente ARCA pendiente de configuración WSFE' }
}
