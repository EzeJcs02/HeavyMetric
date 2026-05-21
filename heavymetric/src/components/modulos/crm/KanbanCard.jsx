const PRIORIDAD_DOT = {
  alta:  'bg-red-500',
  media: 'bg-yellow-500',
  baja:  'bg-hm-muted',
}

const GRADE_STYLE = {
  A: 'bg-red-500/20 text-red-300 border-red-500/40',
  B: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  C: 'bg-hm-surface2 text-hm-muted border-hm-border',
}

function diasDesde(fecha) {
  if (!fecha) return null
  const diff = Math.floor((Date.now() - new Date(fecha)) / 86400000)
  if (diff === 0) return 'hoy'
  if (diff === 1) return 'ayer'
  return `hace ${diff}d`
}

function diasHasta(fecha) {
  if (!fecha) return null
  const diff = Math.floor((new Date(fecha) - Date.now()) / 86400000)
  if (diff < 0) return { label: `vencido ${Math.abs(diff)}d`, vencido: true }
  if (diff === 0) return { label: 'hoy', vencido: false }
  return { label: `en ${diff}d`, vencido: false }
}

export default function KanbanCard({ lead, onClick, onMoveNext, onMovePrev, nextLabel, prevLabel }) {
  const seguimiento = diasHasta(lead.proximo_seguimiento)

  return (
    <div
      onClick={onClick}
      className="bg-hm-surface border border-hm-border rounded-lg p-3 cursor-pointer group
        hover:border-hm-accent/40 hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)] transition-all duration-150
        flex flex-col gap-2"
    >
      {/* Fila superior: prioridad + grade + score */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full shrink-0 ${PRIORIDAD_DOT[lead.prioridad || 'media']}`} />
          <span className={`inline-flex items-center justify-center w-5 h-5 rounded border text-[9px] font-black ${GRADE_STYLE[lead.lead_grade]}`}>
            {lead.lead_grade}
          </span>
        </div>
        <span className="text-[9px] font-mono text-hm-muted">{lead.lead_score}/100</span>
      </div>

      {/* Empresa / nombre */}
      <div>
        <div className="font-semibold text-sm leading-tight text-hm-text truncate">
          {lead.empresa || lead.nombre || '—'}
        </div>
        {lead.empresa && lead.nombre && (
          <div className="text-xs text-hm-muted truncate mt-0.5">{lead.nombre}</div>
        )}
        {lead.producto_interes && (
          <div className="text-[10px] text-hm-muted/70 truncate mt-0.5">{lead.producto_interes}</div>
        )}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1">
        {lead.rubro && (
          <span className="text-[9px] font-mono bg-hm-surface2 text-hm-muted border border-hm-border rounded px-1.5 py-0.5">
            {lead.rubro}
          </span>
        )}
        {lead.origen && (
          <span className="text-[9px] font-mono bg-hm-surface2 text-hm-muted border border-hm-border rounded px-1.5 py-0.5">
            {lead.origen}
          </span>
        )}
        {lead.cotizaciones?.[0]?.count > 0 && (
          <span className="text-[9px] font-mono bg-teal-500/10 text-teal-400 border border-teal-500/30 rounded px-1.5 py-0.5">
            {lead.cotizaciones[0].count} cotiz.
          </span>
        )}
      </div>

      {/* Footer: contacto + seguimiento */}
      <div className="flex items-center justify-between text-[9px] font-mono text-hm-muted pt-1 border-t border-hm-border/50">
        <span title="Último contacto">
          {lead.ultimo_contacto
            ? `📞 ${diasDesde(lead.ultimo_contacto)}`
            : <span className="text-red-400/70">sin contacto</span>
          }
        </span>
        {seguimiento && (
          <span className={seguimiento.vencido ? 'text-red-400' : 'text-hm-accent'}>
            ⏰ {seguimiento.label}
          </span>
        )}
      </div>

      {/* Responsable */}
      {lead.asignado?.nombre_completo && (
        <div className="text-[9px] font-mono text-hm-muted truncate">
          👤 {lead.asignado.nombre_completo}
        </div>
      )}

      {/* Acciones hover */}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity pt-1 border-t border-hm-border/50">
        {prevLabel && (
          <button
            onClick={e => { e.stopPropagation(); onMovePrev?.() }}
            className="flex-1 text-[9px] font-mono text-hm-muted border border-hm-border rounded px-1.5 py-1 hover:border-hm-accent/50 hover:text-hm-text transition-colors truncate"
          >
            ← {prevLabel}
          </button>
        )}
        {nextLabel && (
          <button
            onClick={e => { e.stopPropagation(); onMoveNext?.() }}
            className="flex-1 text-[9px] font-mono text-green-400/80 border border-green-800/40 rounded px-1.5 py-1 hover:border-green-500 hover:text-green-400 transition-colors truncate"
          >
            {nextLabel} →
          </button>
        )}
      </div>
    </div>
  )
}
