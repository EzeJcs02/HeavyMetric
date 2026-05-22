import PriorityBadge from './PriorityBadge'

const MODULO_ICON = {
  taller:       '🔧',
  stock:        '📦',
  clientes:     '👥',
  proveedores:  '🏭',
  tesoreria:    '💳',
  aprobaciones: '✅',
}

export default function ApprovalCard({ item, onAprobar, onRechazar, onDetalle, readOnly = false }) {
  return (
    <div className="bg-hm-surface2/20 border border-hm-border/50 rounded-xl p-4 flex flex-col gap-3 hover:border-hm-border transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl shrink-0">{MODULO_ICON[item.modulo] || '📋'}</span>
          <div className="min-w-0">
            <div className="font-bold text-sm text-hm-text truncate">{item.titulo}</div>
            {item.subtitulo && (
              <div className="text-xs text-hm-muted mt-0.5 truncate">{item.subtitulo}</div>
            )}
          </div>
        </div>
        <PriorityBadge prioridad={item.prioridad || item.estado} />
      </div>

      {item.descripcion && (
        <p className="text-xs text-hm-muted leading-relaxed">{item.descripcion}</p>
      )}

      <div className="grid grid-cols-2 gap-2 text-xs">
        {item.monto != null && (
          <div className="bg-hm-surface2/30 rounded p-2">
            <div className="text-hm-muted/70 uppercase font-mono text-[9px]">Monto</div>
            <div className="font-bold font-mono text-hm-accent">{typeof item.monto === 'number' ? `$${item.monto.toLocaleString('es-AR')}` : item.monto}</div>
          </div>
        )}
        {item.solicitante && (
          <div className="bg-hm-surface2/30 rounded p-2">
            <div className="text-hm-muted/70 uppercase font-mono text-[9px]">Solicitante</div>
            <div className="font-medium">{item.solicitante}</div>
          </div>
        )}
        {item.fecha && (
          <div className="bg-hm-surface2/30 rounded p-2">
            <div className="text-hm-muted/70 uppercase font-mono text-[9px]">Fecha</div>
            <div className="font-mono">{new Date(item.fecha + 'T00:00:00').toLocaleDateString('es-AR', { day:'2-digit', month:'short' })}</div>
          </div>
        )}
        {item.tipo && (
          <div className="bg-hm-surface2/30 rounded p-2">
            <div className="text-hm-muted/70 uppercase font-mono text-[9px]">Tipo</div>
            <div className="font-medium capitalize">{item.tipo.replace(/_/g, ' ')}</div>
          </div>
        )}
      </div>

      {!readOnly && (
        <div className="flex gap-2 pt-1 border-t border-hm-border/40">
          {onDetalle && (
            <button onClick={() => onDetalle(item)}
              className="flex-1 text-xs font-mono font-bold border border-hm-border text-hm-muted rounded-lg py-1.5 hover:border-hm-accent hover:text-hm-accent transition-colors">
              VER DETALLE
            </button>
          )}
          {onRechazar && item.estado === 'pendiente' && (
            <button onClick={() => onRechazar(item)}
              className="flex-1 text-xs font-mono font-bold border border-red-700/50 text-red-400/80 rounded-lg py-1.5 hover:border-red-500 hover:text-red-400 transition-colors">
              RECHAZAR
            </button>
          )}
          {onAprobar && item.estado === 'pendiente' && (
            <button onClick={() => onAprobar(item)}
              className="flex-1 text-xs font-mono font-bold bg-hm-accent/10 border border-hm-accent/40 text-hm-accent rounded-lg py-1.5 hover:bg-hm-accent/20 transition-colors">
              APROBAR
            </button>
          )}
        </div>
      )}
    </div>
  )
}
