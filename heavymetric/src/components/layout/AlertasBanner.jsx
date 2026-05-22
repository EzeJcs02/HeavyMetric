import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const TIPO_COLOR = {
  service_urgente:              'red',
  service_proximo:              'red',
  stock_minimo:                 'yellow',
  alquiler_vencimiento:         'orange',
  lead_sin_contacto:            'orange',
  cotizacion_sin_seguimiento:   'yellow',
  cotizacion_critica:           'red',
  seguimiento_vencido:          'orange',
  oportunidad_sin_movimiento:   'yellow',
  activo_detenido:              'orange',
}

const COLOR_STYLES = {
  red:    { bg: 'bg-red-500/10 border-red-500/30',    dot: 'bg-red-500',    text: 'text-red-300',    label: 'text-red-400' },
  yellow: { bg: 'bg-yellow-500/10 border-yellow-500/30', dot: 'bg-yellow-500', text: 'text-yellow-300', label: 'text-yellow-400' },
  orange: { bg: 'bg-orange-500/10 border-orange-500/30', dot: 'bg-orange-500', text: 'text-orange-300', label: 'text-orange-400' },
}

export default function AlertasBanner() {
  const [alertas, setAlertas] = useState([])
  const [idx, setIdx]         = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const { perfil } = useAuth()

  useEffect(() => {
    if (!perfil?.organization_id) return
    const fetch = async () => {
      // 1. Alertas guardadas en BD
      const { data: dbAlertas } = await supabase
        .from('alertas')
        .select('id, tipo, titulo, prioridad')
        .eq('resuelta', false)
        .order('prioridad', { ascending: true })
        .limit(10)

      // 2. IA Silenciosa / Workflow Engine (Al Vuelo)
      const alertasDinamicas = []

      // Stock Mínimo
      const { data: repBajos } = await supabase.from('repuestos').select('id, nombre').lte('stock_actual', 'stock_minimo').eq('activo', true)
      if (repBajos?.length) {
        repBajos.forEach(r => alertasDinamicas.push({
          id: `dyn_rep_${r.id}`, tipo: 'stock_minimo', titulo: `Sugerencia de compra: Reponer "${r.nombre}"`, prioridad: 'media'
        }))
      }

      // Máquinas Críticas (Fuera de servicio)
      const { data: maqCriticas } = await supabase.from('maquinas').select('id, nombre_unidad, estado_operativo').in('estado_operativo', ['Fuera de servicio', 'Esperando repuesto']).eq('activo', true)
      if (maqCriticas?.length) {
        maqCriticas.forEach(m => alertasDinamicas.push({
          id: `dyn_maq_${m.id}`, tipo: 'activo_detenido', titulo: `Atención: "${m.nombre_unidad}" se encuentra ${m.estado_operativo.toLowerCase()}`, prioridad: 'alta'
        }))
      }

      const combo = [...(dbAlertas || []), ...alertasDinamicas]
      setAlertas(combo.sort((a,b) => a.prioridad === 'alta' ? -1 : 1))
      setIdx(0)
      setDismissed(false)
    }
    fetch()
    const interval = setInterval(fetch, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [perfil?.organization_id])

  if (!alertas.length || dismissed) return null

  const alerta  = alertas[idx]
  const color   = TIPO_COLOR[alerta.tipo] || 'yellow'
  const styles  = COLOR_STYLES[color]
  const total   = alertas.length

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
