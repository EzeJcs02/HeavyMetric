import { isIntegrationEnabled } from '../../config/integrations'

/**
 * Simula la sincronización de E-Cheqs desde el banco o Interbanking
 */
export const syncEcheqs = async () => {
  if (!isIntegrationEnabled('bancos')) {
    console.log(`[MOCK BANCOS] Sincronizando E-Cheqs...`)
    
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          success: true,
          nuevosCheques: [
            { id: 'CHK-100', banco: 'Galicia', monto: 1500000, fechaPago: '2026-06-15', estado: 'PENDIENTE' },
            { id: 'CHK-101', banco: 'Santander', monto: 850000, fechaPago: '2026-06-20', estado: 'PENDIENTE' }
          ]
        })
      }, 1500)
    })
  }

  // TODO: Implementar integración bancaria
  console.warn('La integración real con Bancos aún no está implementada.')
  return { success: false, error: 'Integración no implementada' }
}

/**
 * Simula la conciliación bancaria futura
 */
export const matchReconciliation = async (movimientos) => {
  if (!isIntegrationEnabled('bancos')) {
    console.log(`[MOCK BANCOS] Conciliando movimientos...`)
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({ success: true, conciliados: movimientos.length, pendientes: 0 })
      }, 1000)
    })
  }
  return { success: false, error: 'Integración no implementada' }
}
