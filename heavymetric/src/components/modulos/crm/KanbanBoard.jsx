import KanbanCard from './KanbanCard'

const COL_COLORS = {
  // Ventas
  'Nuevo':              'border-blue-500/40 text-blue-400',
  'Contactado':         'border-yellow-500/40 text-yellow-400',
  'Calificado':         'border-orange-500/40 text-orange-400',
  'Cotizacion Enviada': 'border-teal-500/40 text-teal-400',
  'Negociacion':        'border-purple-500/40 text-purple-400',
  'Ganado':             'border-green-500/40 text-green-400',
  'Perdido':            'border-red-500/40 text-red-400',
  // Postventa
  'Solicitud Recibida': 'border-blue-500/40 text-blue-400',
  'Revision':           'border-yellow-500/40 text-yellow-400',
  'OT Creada':          'border-orange-500/40 text-orange-400',
  'En Proceso':         'border-teal-500/40 text-teal-400',
  'Esperando Repuestos':'border-red-400/40 text-red-400',
  'Finalizado':         'border-green-500/40 text-green-400',
  'Facturado':          'border-hm-accent/40 text-hm-accent',
}

export default function KanbanBoard({ leads, estados, onCardClick, onMoveCard, loading }) {
  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {estados.map(e => (
          <div key={e} className="shrink-0 w-[240px]">
            <div className="h-6 bg-hm-surface2 rounded animate-pulse mb-3" />
            <div className="flex flex-col gap-2">
              {[1,2].map(i => <div key={i} className="h-28 bg-hm-surface2 rounded animate-pulse" />)}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const byEstado = {}
  estados.forEach(e => { byEstado[e] = [] })
  leads.forEach(l => {
    if (byEstado[l.estado] !== undefined) byEstado[l.estado].push(l)
  })

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 min-h-[400px]">
      {estados.map((estado, colIdx) => {
        const cards    = byEstado[estado] || []
        const colorCls = COL_COLORS[estado] || 'border-hm-border text-hm-muted'
        const prevEst  = colIdx > 0 ? estados[colIdx - 1] : null
        const nextEst  = colIdx < estados.length - 1 ? estados[colIdx + 1] : null

        return (
          <div key={estado} className="shrink-0 w-[240px] flex flex-col gap-2">
            {/* Columna header */}
            <div className={`flex items-center justify-between px-2 py-1.5 rounded border ${colorCls} bg-hm-surface`}>
              <span className="text-[10px] font-bold tracking-widest uppercase truncate">
                {estado}
              </span>
              <span className="text-[10px] font-mono opacity-60 ml-1 shrink-0">{cards.length}</span>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2 min-h-[60px]">
              {cards.length === 0 ? (
                <div className="border border-dashed border-hm-border/40 rounded-lg h-16 flex items-center justify-center">
                  <span className="text-[10px] text-hm-muted/40 font-mono">vacío</span>
                </div>
              ) : (
                cards.map(lead => (
                  <KanbanCard
                    key={lead.id}
                    lead={lead}
                    onClick={() => onCardClick(lead)}
                    prevLabel={prevEst}
                    nextLabel={nextEst}
                    onMovePrev={() => onMoveCard(lead, prevEst)}
                    onMoveNext={() => onMoveCard(lead, nextEst)}
                  />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
