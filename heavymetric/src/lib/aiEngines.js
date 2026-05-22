/**
 * HeavyMetric Silent AI Engines
 * This file contains the logic for the 9 AI engines defined in Phase K.
 * In a real-world scenario, these could be serverless edge functions or Python microservices.
 * Here, they are implemented as pure functions evaluating the frontend data to provide instant, silent insights.
 */

// 1. FALLAS REPETIDAS: Detect patterns in Work Orders (OTs).
export function detectFallasRepetidas(ots, targetActivoId) {
  if (!ots || ots.length === 0) return null;
  
  const activoOts = ots.filter(ot => ot.activo_id === targetActivoId);
  if (activoOts.length < 3) return null;

  // Sort by date descending
  const sorted = activoOts.sort((a, b) => new Date(b.fecha_ingreso) - new Date(a.fecha_ingreso));
  const recentOts = sorted.slice(0, 3);

  // Check if they happened within the last 60 days
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const areRecent = recentOts.every(ot => new Date(ot.fecha_ingreso) > sixtyDaysAgo);
  
  if (areRecent) {
    return {
      type: 'warning',
      message: 'Patrón de falla repetida: 3 ingresos en los últimos 60 días.',
      confidence: 0.85
    };
  }

  return null;
}

// 2. STOCK: Suggest purchases based on inventory and consumption.
export function suggestStock(item) {
  if (!item) return null;

  const currentStock = item.stock_actual || 0;
  const minStock = item.stock_minimo || 5;
  
  if (currentStock <= minStock) {
    const faltante = minStock - currentStock;
    // Suggest buying enough to reach minimum + buffer (e.g., 20%)
    const suggestedPurchase = Math.ceil((minStock * 1.2) - currentStock);
    
    return {
      type: 'stock',
      title: 'Quiebre de stock inminente',
      message: `Stock crítico de ${item.nombre || item.codigo}. Stock actual: ${currentStock}.`,
      actionText: `Comprar ${suggestedPurchase} unidades`,
      suggestedQty: suggestedPurchase
    };
  }
  return null;
}

// 3. CLIENTE EN RIESGO: arrears / low activity.
export function evaluateClientRisk(cliente, transacciones) {
  if (!cliente) return null;
  
  // Simulated logic: check for 'vencido' state or significant debt.
  const hasDebt = cliente.estado_financiero === 'moroso' || cliente.deuda_total > 500000;
  const diasSinActividad = cliente.ultima_actividad 
    ? (new Date() - new Date(cliente.ultima_actividad)) / (1000 * 60 * 60 * 24) 
    : 0;

  if (hasDebt && diasSinActividad > 30) {
    return {
      type: 'critical',
      message: 'Cliente en Riesgo: Alta mora y sin actividad reciente.',
      riskScore: 0.9
    };
  } else if (hasDebt) {
    return {
      type: 'risk',
      message: 'Riesgo de Cobro: Facturas vencidas detectadas.',
      riskScore: 0.7
    };
  } else if (diasSinActividad > 90) {
    return {
      type: 'warning',
      message: 'Riesgo de Fuga: Sin actividad en >90 días.',
      riskScore: 0.6
    };
  }
  
  return null;
}

// 4. PROVEEDOR EN RIESGO: delays / debt.
export function evaluateProviderRisk(proveedor) {
  if (!proveedor) return null;

  // Assuming provider has fields like 'retraso_promedio_dias' and 'estado_entregas'
  if (proveedor.retraso_promedio_dias > 15 || proveedor.estado_entregas === 'critico') {
    return {
      type: 'risk',
      message: `Proveedor en Riesgo: Retraso promedio de ${proveedor.retraso_promedio_dias || '>15'} días en entregas.`,
    };
  }
  return null;
}

// 5. ACTIVO CRÍTICO: failures + downtime + cost.
export function detectActivoCritico(activo, ots = []) {
  if (!activo) return null;

  const fallasTotal = ots.filter(ot => ot.activo_id === activo.id).length;
  const downtimeDias = activo.downtime_acumulado || 0; // Days accumulated
  const costoTotal = activo.costo_mantenimiento_acumulado || 0;
  
  if (fallasTotal > 5 && downtimeDias > 10) {
    return {
      type: 'critical',
      message: `Activo Crítico: ${fallasTotal} fallas detectadas, alto impacto en operación.`,
    };
  }
  
  if (costoTotal > (activo.valor_adquisicion || 10000000) * 0.3) {
    return {
      type: 'warning',
      message: 'Alerta Financiera: Costo de mantenimiento > 30% del valor del equipo.',
    };
  }

  return null;
}

// 6. OT NO RENTABLE: alert.
export function detectOTNoRentable(ot) {
  if (!ot) return null;

  const costoMateriales = ot.costo_materiales || 0;
  const costoManoObra = ot.costo_hh || 0;
  const facturado = ot.total_facturado || ot.presupuesto || 0;
  
  const costoTotal = costoMateriales + costoManoObra;
  
  // Si los costos superan el 85% de lo facturado (margen < 15%)
  if (facturado > 0 && costoTotal > (facturado * 0.85)) {
    const margen = ((facturado - costoTotal) / facturado) * 100;
    return {
      type: 'anomaly',
      message: `Rentabilidad en riesgo: Margen actual proyectado en ${margen.toFixed(1)}%.`,
    };
  }
  return null;
}

// 7. DOWNTIME PREDICTION: Predict future downtime.
export function predictDowntime(activo) {
  if (!activo) return null;
  
  const horasUso = activo.horas_uso || activo.km_actual || 0;
  const proxService = activo.prox_mantenimiento || (horasUso + 500); // mock
  
  // If approaching maintenance limit
  if (proxService - horasUso < 50) {
    return {
      type: 'optimization',
      message: 'Predicción de Downtime: Mantenimiento preventivo requerido inminentemente.',
    };
  }
  return null;
}

// 8. ANOMALÍAS: General anomaly detection (e.g. costs out of range).
export function detectAnomalias(transaccion) {
  if (!transaccion) return null;

  if (transaccion.monto > 5000000 && !transaccion.aprobada_gerencia) {
    return {
      type: 'risk',
      message: 'Anomalía Detectada: Gasto atípicamente alto requiere revisión.',
    };
  }
  return null;
}

// 9. PRIORIZACIÓN: AI sort factor for tasks/OTs
export function calculateAIPriorityScore(ot, cliente) {
  let score = 0;
  
  // Base priorities
  if (ot.prioridad === 'alta' || ot.prioridad === 'emergencia') score += 50;
  
  // VIP Client factor
  if (cliente?.categoria === 'VIP' || cliente?.categoria === 'A') score += 30;
  
  // Time factor (older = higher priority)
  const daysOpen = (new Date() - new Date(ot.fecha_ingreso || ot.created_at)) / (1000 * 60 * 60 * 24);
  score += daysOpen * 2; // +2 points per day open

  // Unprofitable risk (needs attention)
  const noRentableAlert = detectOTNoRentable(ot);
  if (noRentableAlert) score += 20;

  return score; // higher is more priority
}
