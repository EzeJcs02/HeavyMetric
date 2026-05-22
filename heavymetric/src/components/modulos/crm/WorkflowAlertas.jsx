import { useMemo } from 'react'

const TERMINALES = new Set(['Ganado', 'Perdido', 'Cierre'])
const DIAS_SLA = { alta: 2, media: 5, baja: 10 }

function daysSince(dateStr) {
  if (!dateStr) return null
  return Math.floor((Date.now() - new Date(dateStr)) / 86400000)
}

const COLOR = {
  red:    'text-red-400 border-red-500/30 bg-red-500/10 hover:bg-red-500/20',
  blue:   'text-blue-400 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20',
  yellow: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/20',
  orange: 'text-orange-400 border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20',
}

export default function WorkflowAlertas({ leads, filtroActivo, onSetFiltro }) {
  const alertas = useMemo(() => {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    const activos = leads.filter(l => !TERMINALES.has(l.estado))

    const vencidos = activos.filter(l =>
      l.proximo_seguimiento && new Date(l.proximo_seguimiento + 'T12:00') < hoy
    )

    const frios = activos.filter(l => {
      const dias = daysSince(l.ultimo_contacto)
      const sla = DIAS_SLA[l.prioridad] || 5
      return dias !== null && dias > sla * 2 && (l.lead_grade === 'A' || l.lead_grade === 'B')
    })

    const cotsSinRespuesta = activos.filter(l =>
      l.estado === 'Cotización' && (daysSince(l.ultimo_contacto) ?? 99) > 7
    )

    const reclamosCriticos = leads.filter(l =>
      l.pipeline === 'postventa' && l.prioridad === 'alta' && !TERMINALES.has(l.estado)
    )

    return { vencidos, frios, cotsSinRespuesta, reclamosCriticos }
  }, [leads])

  const items = [
    { key: 'vencidos',          leads: alertas.vencidos,          icon: '⏰', label: 'seguimiento',  plural: 's',  color: 'red' },
    { key: 'frios',             leads: alertas.frios,             icon: '🧊', label: 'oportunidad', plural: 'es', color: 'blue' },
    { key: 'cotssinrespuesta',  leads: alertas.cotsSinRespuesta,  icon: '📋', label: 'cotización',  plural: 'es', color: 'yellow' },
    { key: 'reclamoscriticos',  leads: alertas.reclamosCriticos,  icon: '🚨', label: 'reclamo',     plural: 's',  color: 'orange' },
  ].filter(i => i.leads.length > 0)

  if (!items.length) return null

  return (
    <div className="flex flex-wrap gap-2 items-center px-3 py-2.5 rounded-lg border border-hm-border bg-hm-surface2/20">
      <span className="text-[9px] font-mono font-bold text-hm-muted uppercase tracking-widest mr-1">
        ALERTAS WORKFLOW
      </span>
      {items.map(({ key, leads: lst, icon, label, plural, color }) => {
        const n = lst.length
        const activo = filtroActivo === key
        return (
          <button
            key={key}
            onClick={() => onSetFiltro(activo ? null : key)}
            className={`flex items-center gap-1.5 text-[10px] font-mono font-bold px-3 py-1.5 rounded border transition-all ${
              activo
                ? 'bg-hm-accent border-hm-accent text-hm-bg'
                : COLOR[color]
            }`}
          >
            <span>{icon}</span>
            <span className="text-sm font-black">{n}</span>
            <span>{label}{n !== 1 ? plural : ''} {key === 'vencidos' ? 'vencido' + (n !== 1 ? 's' : '') : key === 'frios' ? 'fría' + (n !== 1 ? 's' : '') : key === 'cotssinrespuesta' ? 'sin respuesta' : 'crítico' + (n !== 1 ? 's' : '')}</span>
          </button>
        )
      })}
      {filtroActivo && (
        <button
          onClick={() => onSetFiltro(null)}
          className="text-[10px] font-mono text-hm-muted hover:text-hm-text border border-hm-border rounded px-2 py-1 transition-colors"
        >
          ✕ limpiar
        </button>
      )}
    </div>
  )
}

export function computeAlertaLeads(leads, key) {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const activos = leads.filter(l => !TERMINALES.has(l.estado))

  if (key === 'vencidos') {
    return activos.filter(l =>
      l.proximo_seguimiento && new Date(l.proximo_seguimiento + 'T12:00') < hoy
    )
  }
  if (key === 'frios') {
    return activos.filter(l => {
      const dias = daysSince(l.ultimo_contacto)
      const sla = DIAS_SLA[l.prioridad] || 5
      return dias !== null && dias > sla * 2 && (l.lead_grade === 'A' || l.lead_grade === 'B')
    })
  }
  if (key === 'cotssinrespuesta') {
    return activos.filter(l => l.estado === 'Cotización' && (daysSince(l.ultimo_contacto) ?? 99) > 7)
  }
  if (key === 'reclamoscriticos') {
    return leads.filter(l => l.pipeline === 'postventa' && l.prioridad === 'alta' && !TERMINALES.has(l.estado))
  }
  return []
}
