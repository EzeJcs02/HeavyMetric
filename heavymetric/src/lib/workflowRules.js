/**
 * workflowRules.js
 * Motor de reglas silencioso para HeavyMetric.
 * Evalúa condiciones operativas y devuelve acciones recomendadas.
 * TODO: Conectar con datos reales de Supabase en próxima etapa.
 */

export const PRIORIDAD = {
  CRITICA: 'critica',
  ALTA:    'alta',
  MEDIA:   'media',
  BAJA:    'baja',
}

export const MODULO = {
  TALLER:      'taller',
  STOCK:       'stock',
  CLIENTES:    'clientes',
  PROVEEDORES: 'proveedores',
  TESORERIA:   'tesoreria',
  APROBACION:  'aprobaciones',
}

/**
 * Evalúa un conjunto de métricas operativas y devuelve lista de reglas disparadas.
 * @param {object} metrics - Objeto con datos de la org
 * @returns {Array} - Lista de { id, titulo, descripcion, prioridad, modulo, tipo, accion, link }
 */
export function evaluateRules(metrics = {}) {
  const acciones = []
  const {
    otsAbiertas = 0,
    otsDemoradas = 0,
    servicesVencidos = 0,
    stockCritico = 0,
    flotaDetenida = 0,
    aprobacionesPendientes = 0,
    deudaClientes = 0,
    clientesMorosos = 0,
    chequesProximos = 0,
    pagosVencidos = 0,
    provRiesgosos = 0,
    flujoNegativo = false,
  } = metrics

  // ── STOCK ──
  if (stockCritico > 0) {
    acciones.push({
      id: 'rule_stock_critico',
      titulo: `${stockCritico} repuesto(s) sin stock mínimo`,
      descripcion: 'Revisar y generar órdenes de compra para reponer inventario.',
      prioridad: stockCritico > 3 ? PRIORIDAD.CRITICA : PRIORIDAD.ALTA,
      modulo: MODULO.STOCK,
      tipo: 'stock_bajo',
      link: '/app/repuestos',
    })
  }

  // ── TALLER ──
  if (servicesVencidos > 0) {
    acciones.push({
      id: 'rule_services_vencidos',
      titulo: `${servicesVencidos} servicio(s) de mantenimiento vencido(s)`,
      descripcion: 'Máquinas que superaron su límite de horas sin service.',
      prioridad: PRIORIDAD.CRITICA,
      modulo: MODULO.TALLER,
      tipo: 'service_urgente',
      link: '/app/taller',
    })
  }
  if (otsDemoradas > 0) {
    acciones.push({
      id: 'rule_ots_demoradas',
      titulo: `${otsDemoradas} OT(s) con demora`,
      descripcion: 'Órdenes de trabajo abiertas hace más de 7 días sin movimiento.',
      prioridad: PRIORIDAD.ALTA,
      modulo: MODULO.TALLER,
      tipo: 'ot_demorada',
      link: '/app/taller',
    })
  }
  if (flotaDetenida > 0) {
    acciones.push({
      id: 'rule_flota_detenida',
      titulo: `${flotaDetenida} activo(s) fuera de servicio`,
      descripcion: 'Máquinas o vehículos detenidos que impactan operaciones.',
      prioridad: PRIORIDAD.CRITICA,
      modulo: MODULO.TALLER,
      tipo: 'activo_detenido',
      link: '/app/taller',
    })
  }

  // ── CLIENTES ──
  if (clientesMorosos > 0) {
    acciones.push({
      id: 'rule_clientes_morosos',
      titulo: `${clientesMorosos} cliente(s) con mora`,
      descripcion: 'Clientes con deuda vencida que requieren gestión de cobranza.',
      prioridad: PRIORIDAD.ALTA,
      modulo: MODULO.CLIENTES,
      tipo: 'mora_cliente',
      link: '/app/clientes',
    })
  }
  if (deudaClientes > 0) {
    acciones.push({
      id: 'rule_deuda_clientes',
      titulo: 'Cobranzas pendientes de cobro',
      descripcion: `Total a cobrar de clientes. Revisar estado de facturas.`,
      prioridad: PRIORIDAD.MEDIA,
      modulo: MODULO.CLIENTES,
      tipo: 'cobranza_pendiente',
      link: '/app/clientes',
    })
  }

  // ── PROVEEDORES ──
  if (provRiesgosos > 0) {
    acciones.push({
      id: 'rule_prov_riesgosos',
      titulo: `${provRiesgosos} proveedor(es) con riesgo alto`,
      descripcion: 'Evaluar alternativas o condiciones antes de nuevas órdenes de compra.',
      prioridad: PRIORIDAD.MEDIA,
      modulo: MODULO.PROVEEDORES,
      tipo: 'proveedor_riesgoso',
      link: '/app/proveedores',
    })
  }
  if (pagosVencidos > 0) {
    acciones.push({
      id: 'rule_pagos_vencidos',
      titulo: `${pagosVencidos} pago(s) vencido(s) a proveedores`,
      descripcion: 'Órdenes de compra con pago pendiente vencido.',
      prioridad: PRIORIDAD.ALTA,
      modulo: MODULO.PROVEEDORES,
      tipo: 'pago_vencido',
      link: '/app/proveedores',
    })
  }

  // ── TESORERÍA ──
  if (chequesProximos > 0) {
    acciones.push({
      id: 'rule_cheques_proximos',
      titulo: `${chequesProximos} cheque(s) vencen en los próximos 7 días`,
      descripcion: 'Verificar disponibilidad bancaria y cartera de cheques.',
      prioridad: PRIORIDAD.ALTA,
      modulo: MODULO.TESORERIA,
      tipo: 'cheque_proximo',
      link: '/app/tesoreria',
    })
  }
  if (flujoNegativo) {
    acciones.push({
      id: 'rule_flujo_negativo',
      titulo: 'Flujo de caja proyectado negativo (7 días)',
      descripcion: 'Los pagos próximos superan las cobranzas esperadas. Revisar tesorería.',
      prioridad: PRIORIDAD.CRITICA,
      modulo: MODULO.TESORERIA,
      tipo: 'flujo_negativo',
      link: '/app/tesoreria',
    })
  }

  // ── APROBACIONES ──
  if (aprobacionesPendientes > 0) {
    acciones.push({
      id: 'rule_aprobaciones',
      titulo: `${aprobacionesPendientes} solicitud(es) esperando tu aprobación`,
      descripcion: 'Cotizaciones, compras u OTs que requieren autorización.',
      prioridad: PRIORIDAD.ALTA,
      modulo: MODULO.APROBACION,
      tipo: 'aprobacion_pendiente',
      link: '/app/aprobaciones',
    })
  }

  // Ordenar por prioridad
  const ORDER = { critica: 0, alta: 1, media: 2, baja: 3 }
  return acciones.sort((a, b) => (ORDER[a.prioridad] ?? 9) - (ORDER[b.prioridad] ?? 9))
}

/**
 * Convierte métricas de Supabase al formato esperado por evaluateRules
 */
export function buildMetrics({
  otsAbiertas          = 0,
  otsDemoradas         = 0,
  servicesProximos     = 0,
  stockCritico         = 0,
  flotaDetenida        = 0,
  aprobacionesPendientes = 0,
  deudaClientes        = 0,
  clientesMorosos      = 0,
  chequesProximos      = 0,
  pagosVencidos        = 0,
  provRiesgosos        = 0,
  flujoNegativo        = false,
} = {}) {
  return {
    otsAbiertas,
    otsDemoradas,
    servicesVencidos: servicesProximos,
    stockCritico,
    flotaDetenida,
    aprobacionesPendientes,
    deudaClientes,
    clientesMorosos,
    chequesProximos,
    pagosVencidos,
    provRiesgosos,
    flujoNegativo,
  }
}
