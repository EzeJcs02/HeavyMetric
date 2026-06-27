import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const TIPO_COLOR = {
  service_urgente:            'red',
  service_proximo:            'red',
  stock_minimo:               'yellow',
  alquiler_vencimiento:       'orange',
  lead_sin_contacto:          'orange',
  cotizacion_sin_seguimiento: 'yellow',
  cotizacion_critica:         'red',
  seguimiento_vencido:        'orange',
  oportunidad_sin_movimiento: 'yellow',
  activo_detenido:            'orange',
  ot_demorada:                'yellow',
  flujo_negativo:             'red',
  mora_cliente:               'red',
  proveedor_riesgoso:         'orange',
}

const COLOR_STYLES = {
  red:    { bg: 'bg-red-500/10 border-red-500/30',       dot: 'bg-red-500',    text: 'text-red-300',    label: 'text-red-400' },
  yellow: { bg: 'bg-yellow-500/10 border-yellow-500/30', dot: 'bg-yellow-500', text: 'text-yellow-300', label: 'text-yellow-400' },
  orange: { bg: 'bg-orange-500/10 border-orange-500/30', dot: 'bg-orange-500', text: 'text-orange-300', label: 'text-orange-400' },
}

export default function AlertasBanner() {
  const [alertas, setAlertas]     = useState([])
  const [idx, setIdx]             = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const { perfil }                = useAuth()
  const organizationId            = perfil?.organization_id ?? null

  useEffect(() => {
    if (!organizationId) {
      setAlertas([])
      setIdx(0)
      return
    }

    const fetch = async () => {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const [
        { data: dbAlertas },
        { data: repBajos },
        { data: maqCriticas },
        { data: otsDemoradas },
        { data: clientesMorosos },
        { data: provRiesgosos },
      ] = await Promise.all([
        // 1. Alertas persistidas en BD
        supabase
          .from('alertas')
          .select('id, tipo, titulo, prioridad')
          .eq('organization_id', organizationId)
          .eq('resuelta', false)
          .order('prioridad', { ascending: true })
          .limit(10),

        // 2. Stock bajo mínimo
        supabase
          .from('repuestos')
          .select('id, nombre')
          .eq('organization_id', organizationId)
          .lte('stock_actual', 'stock_minimo')
          .eq('activo', true),

        // 3. Máquinas fuera de servicio
        supabase
          .from('maquinas')
          .select('id, nombre_unidad, estado_operativo')
          .eq('organization_id', organizationId)
          .in('estado_operativo', ['Fuera de servicio', 'Esperando repuesto'])
          .eq('activa', true),

        // 4. OTs demoradas (>7 días abiertas)
        supabase
          .from('ordenes_trabajo')
          .select('id')
          .eq('organization_id', organizationId)
          .in('estado', ['borrador', 'en_progreso'])
          .lt('fecha_ingreso', sevenDaysAgo.toISOString().split('T')[0]),

        // 5. Clientes morosos
        supabase
          .from('clientes')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('estado_financiero', 'moroso')
          .eq('activo', true),

        // 6. Proveedores riesgosos
        supabase
          .from('proveedores')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('estado', 'riesgoso')
          .eq('activo', true),
      ])

      const dinamicas = []

      repBajos?.forEach(r => dinamicas.push({
        id: `dyn_rep_${r.id}`,
        tipo: 'stock_minimo',
        titulo: `Reponer urgente: "${r.nombre}"`,
        prioridad: 'media',
      }))

      maqCriticas?.forEach(m => dinamicas.push({
        id: `dyn_maq_${m.id}`,
        tipo: 'activo_detenido',
        titulo: `"${m.nombre_unidad}" — ${m.estado_operativo.toLowerCase()}`,
        prioridad: 'alta',
      }))

      if (otsDemoradas?.length > 0) {
        dinamicas.push({
          id: 'dyn_ots_demoradas',
          tipo: 'ot_demorada',
          titulo: `${otsDemoradas.length} OT(s) sin movimiento hace más de 7 días`,
          prioridad: 'media',
        })
      }

      if (clientesMorosos?.length > 0) {
        dinamicas.push({
          id: 'dyn_mora_clientes',
          tipo: 'mora_cliente',
          titulo: `${clientesMorosos.length} cliente(s) con mora — gestionar cobranza`,
          prioridad: 'alta',
        })
      }

      if (provRiesgosos?.length > 0) {
        dinamicas.push({
          id: 'dyn_prov_riesgosos',
          tipo: 'proveedor_riesgoso',
          titulo: `${provRiesgosos.length} proveedor(es) con riesgo alto`,
          prioridad: 'media',
        })
      }

      const combo = [...(dbAlertas || []), ...dinamicas]
      const ORDER = { critica: 0, alta: 1, media: 2, baja: 3 }
      combo.sort((a, b) => (ORDER[a.prioridad] ?? 9) - (ORDER[b.prioridad] ?? 9))

      setAlertas(combo)
      setIdx(0)
      setDismissed(false)
    }

    fetch()
    const interval = setInterval(fetch, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [organizationId])

  if (!alertas.length || dismissed) return null

  const alerta = alertas[idx]
  const color  = TIPO_COLOR[alerta.tipo] || 'yellow'
  const styles = COLOR_STYLES[color]
  const total  = alertas.length

  return (
    <div className={`border-b px-4 md:px-6 py-2 flex items-center justify-between gap-4 shrink-0 ${styles.bg}`}>
      <div className="flex items-center gap-2 min-w-0">
        <div className={`w-2 h-2 rounded-full animate-pulse shrink-0 ${styles.dot}`} />
        <span className={`text-xs font-mono font-bold shrink-0 ${styles.label}`}>
          {total > 1 ? `${idx + 1}/${total} ALERTAS —` : 'ALERTA —'}
        </span>
        <span className={`text-xs truncate ${styles.text}`}>{alerta.titulo}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {total > 1 && (
          <button
            onClick={() => setIdx(i => (i + 1) % total)}
            className={`text-xs font-mono px-2 py-0.5 rounded border transition-colors ${styles.label} border-current/30 hover:bg-white/5`}
          >
            ›
          </button>
        )}
        <button
          onClick={() => setDismissed(true)}
          className={`transition-colors hover:opacity-60 ${styles.label}`}
          aria-label="Descartar"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}