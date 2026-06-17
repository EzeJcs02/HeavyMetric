import PriorityBadge from './PriorityBadge'

const MODULO_ICON = {
  taller: '🔧',
  stock: '📦',
  clientes: '👥',
  proveedores: '🏭',
  tesoreria: '💳',
  aprobaciones: '✅',
  ventas: '🧾',
  facturacion: '📄',
  remitos: '🚚',
}

const formatDate = (value) => {
  if (!value) return 'Sin fecha'

  const normalized = String(value).includes('T') ? value : `${value}T00:00:00`

  return new Date(normalized).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const formatMoney = (value) => {
  if (value == null || value === '') return '—'

  if (typeof value === 'number') {
    return `$${value.toLocaleString('es-AR')}`
  }

  return value
}

const getSolicitante = (item) => {
  return (
    item?.solicitante?.nombre_completo ||
    item?.solicitante_nombre ||
    item?.solicitante ||
    'Sin solicitante'
  )
}

const getDecididoPor = (item) => {
  return (
    item?.decidido?.nombre_completo ||
    item?.decidido_por_nombre ||
    item?.decidido_por ||
    null
  )
}

const getEstadoStyle = (estado) => {
  const styles = {
    pendiente: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300',
    urgente: 'border-red-500/30 bg-red-500/10 text-red-300',
    aprobado: 'border-green-500/30 bg-green-500/10 text-green-300',
    rechazada: 'border-red-500/30 bg-red-500/10 text-red-300',
    rechazado: 'border-red-500/30 bg-red-500/10 text-red-300',
  }

  return styles[estado] || 'border-hm-border bg-hm-surface2/40 text-hm-muted'
}

function InfoBox({ label, children }) {
  return (
    <div className="rounded bg-hm-surface2/30 p-2">
      <div className="text-hm-muted/70 uppercase font-mono text-[9px]">{label}</div>
      <div className="font-medium text-xs text-hm-text break-words">{children}</div>
    </div>
  )
}

export default function ApprovalCard({
  item,
  onAprobar,
  onRechazar,
  onDetalle,
  readOnly = false,
}) {
  const estado = item?.estado || 'pendiente'
  const puedeDecidir = !readOnly && ['pendiente', 'urgente'].includes(estado)
  const decididoPor = getDecididoPor(item)

  return (
    <div className="bg-hm-surface2/20 border border-hm-border/50 rounded-xl p-4 flex flex-col gap-3 hover:border-hm-border transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl shrink-0">{MODULO_ICON[item?.modulo] || '📋'}</span>

          <div className="min-w-0">
            <div className="font-bold text-sm text-hm-text truncate">
              {item?.titulo || 'Aprobación sin título'}
            </div>

            {item?.subtitulo && (
              <div className="text-xs text-hm-muted mt-0.5 truncate">
                {item.subtitulo}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <PriorityBadge prioridad={item?.prioridad || estado} />

          <span className={`inline-flex rounded border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest ${getEstadoStyle(estado)}`}>
            {estado}
          </span>
        </div>
      </div>

      {item?.descripcion && (
        <p className="text-xs text-hm-muted leading-relaxed">
          {item.descripcion}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
        {item?.monto != null && (
          <InfoBox label="Monto">
            <span className="font-mono text-hm-accent">{formatMoney(item.monto)}</span>
          </InfoBox>
        )}

        <InfoBox label="Solicitante">
          {getSolicitante(item)}
        </InfoBox>

        <InfoBox label="Fecha solicitud">
          <span className="font-mono">
            {formatDate(item?.fecha || item?.created_at)}
          </span>
        </InfoBox>

        {item?.tipo && (
          <InfoBox label="Tipo">
            <span className="capitalize">{String(item.tipo).replace(/_/g, ' ')}</span>
          </InfoBox>
        )}

        {item?.modulo && (
          <InfoBox label="Módulo">
            <span className="capitalize">{String(item.modulo).replace(/_/g, ' ')}</span>
          </InfoBox>
        )}

        {decididoPor && (
          <InfoBox label="Decidido por">
            {decididoPor}
          </InfoBox>
        )}

        {item?.fecha_decision && (
          <InfoBox label="Fecha decisión">
            <span className="font-mono">{formatDate(item.fecha_decision)}</span>
          </InfoBox>
        )}
      </div>

      {item?.observacion && (
        <div className="rounded-lg border border-hm-border/50 bg-black/10 p-3">
          <div className="mb-1 text-[9px] font-mono uppercase tracking-widest text-hm-muted">
            Observación
          </div>
          <div className="text-xs text-hm-muted leading-relaxed">
            {item.observacion}
          </div>
        </div>
      )}

      {!readOnly && (
        <div className="flex gap-2 pt-1 border-t border-hm-border/40">
          {onDetalle && (
            <button
              type="button"
              onClick={() => onDetalle(item)}
              className="flex-1 text-xs font-mono font-bold border border-hm-border text-hm-muted rounded-lg py-1.5 hover:border-hm-accent hover:text-hm-accent transition-colors"
            >
              VER DETALLE
            </button>
          )}

          {onRechazar && puedeDecidir && (
            <button
              type="button"
              onClick={() => onRechazar(item)}
              className="flex-1 text-xs font-mono font-bold border border-red-700/50 text-red-400/80 rounded-lg py-1.5 hover:border-red-500 hover:text-red-400 transition-colors"
            >
              RECHAZAR
            </button>
          )}

          {onAprobar && puedeDecidir && (
            <button
              type="button"
              onClick={() => onAprobar(item)}
              className="flex-1 text-xs font-mono font-bold bg-hm-accent/10 border border-hm-accent/40 text-hm-accent rounded-lg py-1.5 hover:bg-hm-accent/20 transition-colors"
            >
              APROBAR
            </button>
          )}
        </div>
      )}
    </div>
  )
}