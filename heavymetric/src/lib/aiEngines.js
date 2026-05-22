/**
 * HeavyMetric Silent AI Engines — Fase K
 * Funciones puras que evalúan datos cargados en memoria.
 * Sin llamadas externas, sin side effects.
 */

// 1. FALLAS REPETIDAS — Detecta patrón de reingresos en un mismo activo
export function detectFallasRepetidas(ots, activoId) {
  if (!ots?.length || !activoId) return null

  const activoOts = ots
    .filter(ot => ot.activo_id === activoId)
    .sort((a, b) => new Date(b.fecha_ingreso || b.created_at) - new Date(a.fecha_ingreso || a.created_at))

  if (activoOts.length < 3) return null

  const recent = activoOts.slice(0, 3)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 60)

  if (recent.every(ot => new Date(ot.fecha_ingreso || ot.created_at) > cutoff)) {
    return {
      type: 'warning',
      message: `Patrón de falla: 3 ingresos en los últimos 60 días`,
      confidence: 0.85,
    }
  }
  return null
}

// 2. STOCK — Sugerir compra cuando stock_actual <= stock_minimo
export function suggestStock(item) {
  if (!item) return null

  const actual = Number(item.stock_actual) || 0
  const minimo = Number(item.stock_minimo) || 0

  if (actual > minimo) return null

  const sugerido = Math.ceil(minimo * 1.5) - actual

  if (actual <= 0) {
    return {
      type: 'critical',
      title: 'Sin stock',
      message: `Sin stock de "${item.nombre || item.sku}". Comprar ${sugerido} u. urgente.`,
      actionText: `Comprar ${sugerido} unidades`,
      suggestedQty: sugerido,
    }
  }

  return {
    type: 'stock',
    title: 'Quiebre inminente',
    message: `Stock bajo: ${actual}/${minimo} mín. Sugerimos comprar ${sugerido} u.`,
    actionText: `Comprar ${sugerido} unidades`,
    suggestedQty: sugerido,
  }
}

// 3. CLIENTE EN RIESGO — mora + baja actividad
export function evaluateClientRisk(cliente) {
  if (!cliente) return null

  const moroso = cliente.estado_financiero === 'moroso'
  const deudaAlta = Number(cliente.deuda_total) > 500000
  const diasInactivo = cliente.ultima_actividad
    ? (Date.now() - new Date(cliente.ultima_actividad)) / 86400000
    : 0

  if ((moroso || deudaAlta) && diasInactivo > 30) {
    return { type: 'critical', message: 'Alta mora y sin actividad +30 días', riskScore: 0.9 }
  }
  if (moroso || deudaAlta) {
    return { type: 'risk', message: 'Facturas vencidas — gestionar cobranza', riskScore: 0.7 }
  }
  if (diasInactivo > 90) {
    return { type: 'warning', message: 'Sin actividad en más de 90 días', riskScore: 0.6 }
  }
  return null
}

// 4. PROVEEDOR EN RIESGO — demoras + incidencias + rating
export function evaluateProviderRisk(proveedor) {
  if (!proveedor) return null

  const { estado, rating = 3, entregas_a_tiempo = 0, entregas_tarde = 0, incidencias = 0 } = proveedor

  if (estado === 'riesgoso') {
    return { type: 'critical', message: 'Proveedor clasificado como riesgoso' }
  }

  const totalEnt = entregas_a_tiempo + entregas_tarde
  const tasaTarde = totalEnt > 0 ? entregas_tarde / totalEnt : 0

  if (tasaTarde > 0.4 || incidencias >= 3) {
    return {
      type: 'risk',
      message: `${Math.round(tasaTarde * 100)}% entregas tardías, ${incidencias} incidencia(s)`,
    }
  }
  if (rating <= 2 || (tasaTarde > 0.25 && incidencias >= 1)) {
    return {
      type: 'warning',
      message: `Desempeño bajo: ${rating}★, revisar condiciones de compra`,
    }
  }
  return null
}

// 5. ACTIVO CRÍTICO — fallas acumuladas + downtime + costo vs valor
export function detectActivoCritico(activo, ots = []) {
  if (!activo) return null

  const fallas = ots.filter(ot => ot.activo_id === activo.id).length
  const downtime = Number(activo.downtime_acumulado) || 0
  const costoAcum = Number(activo.costo_mantenimiento_acumulado) || 0
  const valorAdq = Number(activo.valor_adquisicion) || 10000000

  if (fallas > 5 && downtime > 10) {
    return { type: 'critical', message: `${fallas} fallas y ${downtime} días de downtime acumulado` }
  }
  if (costoAcum > valorAdq * 0.3) {
    return { type: 'warning', message: `Costo de mantenimiento supera el 30% del valor de adquisición` }
  }
  return null
}

// 6. OT NO RENTABLE — margen < 15%
export function detectOTNoRentable(ot) {
  if (!ot) return null

  const costoMat = Number(ot.costo_materiales || ot.total_repuestos_usd) || 0
  const costoMO = Number(ot.costo_hh || ot.total_mano_obra_usd) || 0
  const facturado = Number(ot.total_facturado || ot.presupuesto) || 0
  const costoTotal = costoMat + costoMO

  if (facturado <= 0 || costoTotal <= 0) return null

  if (costoTotal > facturado * 0.85) {
    const margen = ((facturado - costoTotal) / facturado) * 100
    return {
      type: 'anomaly',
      message: `Margen proyectado: ${margen.toFixed(1)}% (riesgo de pérdida)`,
    }
  }
  return null
}

// 7. DOWNTIME PREDICTION — mantenimiento preventivo inminente
export function predictDowntime(activo) {
  if (!activo) return null

  const horas = Number(activo.horas_uso || activo.km_actual) || 0
  const proxService = Number(activo.prox_mantenimiento) || 0

  if (proxService > 0 && proxService - horas < 50 && proxService > horas) {
    return {
      type: 'maintenance',
      message: `Service preventivo en menos de 50 hs/km (actual: ${horas}, límite: ${proxService})`,
    }
  }
  return null
}

// 8. ANOMALÍAS — gasto atípico sin aprobación gerencial
export function detectAnomalias(transaccion) {
  if (!transaccion) return null

  if (Number(transaccion.monto_total_usd) > 5000000 && !transaccion.aprobada_gerencia) {
    return { type: 'risk', message: 'Transacción de alto monto sin aprobación gerencial' }
  }
  return null
}

// 9. PRIORIZACIÓN — score compuesto para ordenar OTs
export function calculateAIPriorityScore(ot, cliente) {
  let score = 0

  if (ot.prioridad === 'emergencia') score += 70
  else if (ot.prioridad === 'alta') score += 50

  if (cliente?.propension_compra === 'A') score += 30
  else if (cliente?.categoria === 'VIP') score += 30

  const diasAbierto = (Date.now() - new Date(ot.fecha_ingreso || ot.created_at)) / 86400000
  score += Math.min(diasAbierto * 2, 30)

  if (detectOTNoRentable(ot)) score += 20

  return Math.round(score)
}
