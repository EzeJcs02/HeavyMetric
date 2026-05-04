// Usá estos datos mientras el Agente 1 termina el backend
export const mockMaquinas = [
  { id: '1', nombre_unidad: 'Komatsu WA320', marca: 'Komatsu', modelo: 'WA320', patente: 'PAT-321',
    cliente_nombre: 'Canteras del Sur', horometro_actual: 212, ultimo_service_horas: 0,
    frecuencia_service: 250, horas_restantes_service: 38, estado_service: 'urgente' },
  { id: '2', nombre_unidad: 'CAT 320D', marca: 'Caterpillar', modelo: '320D', patente: 'CAT-087',
    cliente_nombre: 'Vial Sur S.A.', horometro_actual: 206, ultimo_service_horas: 0,
    frecuencia_service: 250, horas_restantes_service: 44, estado_service: 'urgente' },
  { id: '3', nombre_unidad: 'Hitachi ZX200', marca: 'Hitachi', modelo: 'ZX200', patente: 'HIT-044',
    cliente_nombre: 'Minera Patagonia', horometro_actual: 80, ultimo_service_horas: 0,
    frecuencia_service: 250, horas_restantes_service: 170, estado_service: 'ok' },
]

export const mockContratos = [
  { id: '1', nombre_unidad: 'Manitowoc 2250', cliente_nombre: 'Vial Sur S.A.',
    fecha_inicio: '2026-04-01', fecha_fin: '2026-05-03', tarifa_diaria_usd: 420,
    dias_restantes: 0, estado_vencimiento: 'vencido' },
  { id: '2', nombre_unidad: 'Liebherr LTM 1100', cliente_nombre: 'Constructora Norte',
    fecha_inicio: '2026-04-15', fecha_fin: '2026-05-05', tarifa_diaria_usd: 580,
    dias_restantes: 2, estado_vencimiento: 'por_vencer' },
]

export const mockInventario = [
  { id: '1', sku_codigo: 'KOM-FIL-001', nombre_repuesto: 'Filtro aceite WA320', stock_actual: 2, stock_minimo: 5, precio_base_usd: 48 },
  { id: '2', sku_codigo: 'CAT-HID-022', nombre_repuesto: 'Manguera hidráulica 320D', stock_actual: 5, stock_minimo: 4, precio_base_usd: 120 },
  { id: '3', sku_codigo: 'VOL-FIL-011', nombre_repuesto: 'Filtro combustible EC210', stock_actual: 18, stock_minimo: 5, precio_base_usd: 35 },
  { id: '4', sku_codigo: 'HIT-SEL-003', nombre_repuesto: 'Sello cilindro ZX200', stock_actual: 1, stock_minimo: 3, precio_base_usd: 95 },
]
