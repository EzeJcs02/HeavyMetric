import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const TIPO_COLOR = {
  service_urgente:     'red',
  service_proximo:     'red',
  stock_minimo:        'yellow',
  alquiler_vencimiento:'orange',
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
      const { data } = await supabase
        .from('alertas')
        .select('id, tipo, titulo, prioridad')
        .eq('resuelta', false)
        .order('prioridad', { ascending: true }) // 'alta' < 'media' alphabetically — fine for our use
        .limit(20)
      setAlertas(data || [])
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
