/**
 * cuitValidator.js
 * Validador de CUIT/CUIL argentino (Módulo 11)
 */

export function validarCuit(cuit) {
  if (!cuit) return false

  // Eliminar guiones y espacios
  const cuitLimpio = cuit.replace(/[- ]/g, '')

  // Verificar longitud (exactamente 11 dígitos) y que sean solo números
  if (cuitLimpio.length !== 11 || !/^\d+$/.test(cuitLimpio)) {
    return false
  }

  const base = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  const arrayCuit = cuitLimpio.split('').map(Number)
  const digitoVerificador = arrayCuit.pop()
  
  let suma = 0
  for (let i = 0; i < 10; i++) {
    suma += arrayCuit[i] * base[i]
  }

  let mod11 = 11 - (suma % 11)
  
  if (mod11 === 11) {
    mod11 = 0
  } else if (mod11 === 10) {
    mod11 = 9
  }

  return mod11 === digitoVerificador
}

export function formatearCuit(cuit) {
  if (!cuit) return ''
  const c = cuit.replace(/\D/g, '')
  if (c.length <= 2) return c
  if (c.length <= 10) return `${c.slice(0, 2)}-${c.slice(2)}`
  return `${c.slice(0, 2)}-${c.slice(2, 10)}-${c.slice(10, 11)}`
}
