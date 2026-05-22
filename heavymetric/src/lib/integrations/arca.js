import { isIntegrationEnabled } from '../../config/integrations'

// Mock Data para el padrón
const mockPadronData = {
  '30712345678': {
    razonSocial: 'HEAVYMETRIC S.A.',
    tipoPersona: 'JURIDICA',
    estado: 'ACTIVO',
    condicionIVA: 'Responsable Inscripto',
    actividadPrincipal: '620100 - SERVICIOS DE PROGRAMACIÓN Y CONSULTORÍA INFORMÁTICA'
  },
  '20123456789': {
    razonSocial: 'JUAN PEREZ',
    tipoPersona: 'FISICA',
    estado: 'ACTIVO',
    condicionIVA: 'Monotributo',
    actividadPrincipal: '702099 - SERVICIOS DE ASESORAMIENTO, DIRECCIÓN Y GESTIÓN EMPRESARIAL N.C.P.'
  }
}

/**
 * Consulta el CUIT en ARCA. Si está desactivado, devuelve mocks.
 */
export const lookupCuit = async (cuit) => {
  const limpio = cuit.replace(/[- ]/g, '')

  if (!isIntegrationEnabled('arca')) {
    console.log(`[MOCK ARCA] Buscando CUIT ${limpio}...`)
    return new Promise(resolve => {
      setTimeout(() => {
        if (mockPadronData[limpio]) {
          resolve({ success: true, data: mockPadronData[limpio] })
        } else {
          // Mock genérico
          resolve({
            success: true,
            data: {
              razonSocial: `EMPRESA MOCK PARA ${limpio}`,
              tipoPersona: 'JURIDICA',
              estado: 'ACTIVO',
              condicionIVA: 'Responsable Inscripto',
              actividadPrincipal: '000000 - ACTIVIDAD NO ESPECIFICADA'
            }
          })
        }
      }, 800)
    })
  }

  // TODO: Implementar llamada real a API de ARCA / AFIP
  console.warn('La integración real con ARCA aún no está implementada.')
  return { success: false, error: 'Integración no implementada' }
}

/**
 * Simula la validación fiscal (Ej: obtener un CAE)
 */
export const validarComprobante = async (datosFactura) => {
  if (!isIntegrationEnabled('arca')) {
    console.log('[MOCK ARCA] Validando comprobante...', datosFactura)
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          success: true,
          cae: Math.floor(Math.random() * 100000000000000).toString().padStart(14, '0'),
          vtoCae: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 10 días
        })
      }, 1000)
    })
  }
  return { success: false, error: 'Integración no implementada' }
}

/**
 * Simula la facturación de servicios recurrentes/futuros
 */
export const generarFacturaFutura = async (datosFactura) => {
  if (!isIntegrationEnabled('arca')) {
    console.log('[MOCK ARCA] Generando factura futura...', datosFactura)
    return new Promise(resolve => {
      setTimeout(() => resolve({ success: true, id: `FC-FUT-${Date.now()}` }), 500)
    })
  }
  return { success: false, error: 'Integración no implementada' }
}
