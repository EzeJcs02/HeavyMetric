import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { useAprobaciones } from '../../hooks/useAprobaciones'
import ApprovalCard from '../../components/workflow/ApprovalCard'
import PriorityBadge from '../../components/workflow/PriorityBadge'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import { useAuth } from '../../context/AuthContext'

const TIPOS = [
  'todos',
  'cotizacion_descuento',
  'compra_proveedor',
  'ot_costo_elevado',
  'limite_credito',
  'baja_activo',
  'cambio_precio',
  'pago_proveedor',
]

const ESTADOS = ['todos', 'pendiente', 'urgente', 'aprobado', 'rechazado']

const ESTADO_COLOR = {
  pendiente: 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10',
  urgente: 'border-red-500/50 text-red-400 bg-red-500/10',
  aprobado: 'border-green-500/50 text-green-400 bg-green-500/10',
  rechazado: 'border-hm-border text-hm-muted bg-hm-surface2/30',
}

const formatTipo = (tipo) => {
  if (!tipo) return 'Sin tipo'
  return tipo.replace(/_/g, ' ')
}

const formatEstado = (estado) => {
  if (!estado) return 'Sin estado'
  return estado.charAt(0).toUpperCase() + estado.slice(1)
}

const formatMoney = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `$${value.toLocaleString('es-AR')}`
  }

  return value || '—'
}

function normalizeItem(raw = {}) {
  return {
    ...raw,
    id: raw.id || `temp-${raw.tipo || 'sin-tipo'}-${raw.created_at || raw.fecha || Math.random()}`,
    titulo: raw.titulo || 'Solicitud sin título',
    subtitulo: raw.subtitulo || '',
    descripcion: raw.descripcion || 'Sin descripción disponible.',
    tipo: raw.tipo || 'sin_tipo',
    prioridad: raw.prioridad || 'media',
    estado: raw.estado || 'pendiente',
    solicitante: raw.solicitante?.nombre_completo || raw.solicitante || 'Sistema',
    fecha: raw.created_at?.slice(0, 10) || raw.fecha || '',
    observacion: raw.observacion || '',
  }
}

export default function Aprobaciones() {
  const { isOwner, canEdit } = useAuth()
  const { aprobaciones, loading, error, decidir } = useAprobaciones()

  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [detalleItem, setDetalleItem] = useState(null)
  const [observacion, setObservacion] = useState('')
  const [saving, setSaving] = useState(false)

  const canManage = Boolean(isOwner || canEdit)
  const aprobacionesBase = Array.isArray(aprobaciones) ? aprobaciones : []

  const items = useMemo(() => aprobacionesBase.map(normalizeItem), [aprobacionesBase])

  const pendientes = useMemo(
    () => items.filter((item) => item.estado === 'pendiente' || item.estado === 'urgente'),
    [items]
  )

  const filtrados = useMemo(() => {
    return items.filter((item) => {
      const okEstado = filtroEstado === 'todos' || item.estado === filtroEstado
      const okTipo = filtroTipo === 'todos' || item.tipo === filtroTipo

      return okEstado && okTipo
    })
  }, [items, filtroEstado, filtroTipo])

  const kpis = useMemo(
    () => [
      {
        label: 'Pendientes',
        value: items.filter((item) => item.estado === 'pendiente').length,
        color: 'border-l-yellow-500',
      },
      {
        label: 'Urgentes',
        value: items.filter((item) => item.estado === 'urgente').length,
        color: 'border-l-red-500',
      },
      {
        label: 'Aprobadas',
        value: items.filter((item) => item.estado === 'aprobado').length,
        color: 'border-l-green-500',
      },
      {
        label: 'Rechazadas',
        value: items.filter((item) => item.estado === 'rechazado').length,
        color: 'border-l-hm-muted',
      },
    ],
    [items]
  )

  const resetModal = () => {
    setDetalleItem(null)
    setObservacion('')
  }

  const openDetalle = (item) => {
    setDetalleItem(item)
    setObservacion(item.observacion || '')
  }

  const openDecision = (item) => {
    setDetalleItem(item)
    setObservacion('')
  }

  const handleAprobar = async (item) => {
    if (!item?.id) {
      toast.error('No se pudo identificar la solicitud')
      return
    }

    setSaving(true)

    try {
      await decidir(item.id, 'aprobado', observacion)
      toast.success(`Aprobado: ${item.titulo}`)
      resetModal()
    } catch (err) {
      toast.error(err?.message || 'Error al aprobar la solicitud')
    } finally {
      setSaving(false)
    }
  }

  const handleRechazar = async (item) => {
    if (!item?.id) {
      toast.error('No se pudo identificar la solicitud')
      return
    }

    if (!observacion.trim()) {
      toast.error('Agregá un motivo de rechazo')
      return
    }

    setSaving(true)

    try {
      await decidir(item.id, 'rechazado', observacion)
      toast.error(`Rechazado: ${item.titulo}`)
      resetModal()
    } catch (err) {
      toast.error(err?.message || 'Error al rechazar la solicitud')
    } finally {
      setSaving(false)
    }
  }

  if (!canManage) {
    return (
      <div className="p-8 text-center text-hm-muted">
        <div className="text-4xl mb-4">🔒</div>
        <div className="font-bold">Acceso restringido</div>
        <div className="text-sm mt-1">Solo supervisores y owners pueden gestionar aprobaciones.</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 border-b border-hm-border pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Centro de Aprobaciones</h1>
          <p className="text-sm text-hm-muted mt-1">
            {loading ? (
              'Cargando aprobaciones...'
            ) : pendientes.length > 0 ? (
              <span className="text-orange-400 font-bold">
                {pendientes.length} solicitud(es) esperando decisión
              </span>
            ) : (
              'Todo al día — sin aprobaciones pendientes'
            )}
          </p>
        </div>

        <div className="w-fit rounded-full border border-hm-border/50 bg-hm-surface2/30 px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-hm-muted">
          {loading ? 'Base preparada' : `${items.length} registros reales`}
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-800 text-red-400 text-xs p-3 rounded-lg font-mono">
          Error cargando aprobaciones: {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(({ label, value, color }) => (
          <div
            key={label}
            className={`bg-hm-surface2/20 border border-hm-border/50 border-l-4 ${color} rounded-xl p-4`}
          >
            <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-1">
              {label}
            </div>
            <div className="text-2xl font-bold">{loading ? '—' : value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-hm-border/50 bg-hm-surface2/20 p-4 md:flex-row md:items-end">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-mono text-hm-muted uppercase tracking-widest">
            Estado
          </label>
          <select
            value={filtroEstado}
            onChange={(event) => setFiltroEstado(event.target.value)}
            className="bg-hm-surface2 border border-hm-border rounded-lg px-3 py-1.5 text-sm text-hm-text focus:outline-none focus:border-hm-accent transition-colors"
          >
            {ESTADOS.map((estado) => (
              <option key={estado} value={estado}>
                {estado === 'todos' ? 'Todos los estados' : formatEstado(estado)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-mono text-hm-muted uppercase tracking-widest">
            Tipo
          </label>
          <select
            value={filtroTipo}
            onChange={(event) => setFiltroTipo(event.target.value)}
            className="bg-hm-surface2 border border-hm-border rounded-lg px-3 py-1.5 text-sm text-hm-text focus:outline-none focus:border-hm-accent transition-colors"
          >
            {TIPOS.map((tipo) => (
              <option key={tipo} value={tipo}>
                {tipo === 'todos' ? 'Todos los tipos' : formatTipo(tipo)}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-hm-muted font-mono md:ml-auto">
          {filtrados.length} registro(s)
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-40 bg-hm-surface2 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-16 text-hm-muted border border-hm-border/40 rounded-xl bg-hm-surface2/10">
          <div className="text-4xl mb-4">✅</div>
          <div className="font-bold">Sin aprobaciones para los filtros seleccionados</div>
          <div className="text-xs mt-2">
            Cuando existan solicitudes reales pendientes, aparecerán en este centro de decisión.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtrados.map((item) => (
            <ApprovalCard
              key={item.id}
              item={item}
              onAprobar={canManage ? openDecision : null}
              onRechazar={canManage ? openDecision : null}
              onDetalle={openDetalle}
            />
          ))}
        </div>
      )}

      <Modal isOpen={!!detalleItem} onClose={resetModal} title="Detalle de Solicitud" maxWidth="max-w-lg">
        {detalleItem && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <PriorityBadge prioridad={detalleItem.prioridad} />
              <span
                className={`text-[10px] font-mono border rounded px-2 py-0.5 uppercase ${
                  ESTADO_COLOR[detalleItem.estado] || ESTADO_COLOR.pendiente
                }`}
              >
                {detalleItem.estado}
              </span>
            </div>

            <div>
              <div className="font-bold text-base">{detalleItem.titulo}</div>
              {detalleItem.subtitulo && (
                <div className="text-sm text-hm-muted mt-0.5">{detalleItem.subtitulo}</div>
              )}
            </div>

            <p className="text-sm text-hm-muted leading-relaxed">{detalleItem.descripcion}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {detalleItem.monto != null && (
                <div className="bg-hm-surface2/30 rounded p-2">
                  <div className="text-hm-muted/70 uppercase font-mono text-[9px]">Monto</div>
                  <div className="font-bold text-hm-accent font-mono">
                    {formatMoney(detalleItem.monto)}
                  </div>
                </div>
              )}

              <div className="bg-hm-surface2/30 rounded p-2">
                <div className="text-hm-muted/70 uppercase font-mono text-[9px]">Solicitante</div>
                <div className="font-medium">{detalleItem.solicitante || 'Sistema'}</div>
              </div>

              <div className="bg-hm-surface2/30 rounded p-2">
                <div className="text-hm-muted/70 uppercase font-mono text-[9px]">Fecha</div>
                <div className="font-mono">
                  {detalleItem.fecha
                    ? new Date(`${detalleItem.fecha}T00:00:00`).toLocaleDateString('es-AR')
                    : '—'}
                </div>
              </div>

              <div className="bg-hm-surface2/30 rounded p-2">
                <div className="text-hm-muted/70 uppercase font-mono text-[9px]">Tipo</div>
                <div className="capitalize">{formatTipo(detalleItem.tipo)}</div>
              </div>
            </div>

            {detalleItem.observacion && (
              <div className="bg-hm-surface2/20 border border-hm-border/50 rounded-lg p-3">
                <div className="text-[9px] font-mono text-hm-muted uppercase mb-1">
                  Observación / Motivo
                </div>
                <div className="text-sm italic text-hm-muted">{detalleItem.observacion}</div>
              </div>
            )}

            {detalleItem.estado === 'pendiente' || detalleItem.estado === 'urgente' ? (
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-mono text-hm-muted uppercase tracking-widest">
                  Observación / Motivo
                </label>

                <textarea
                  value={observacion}
                  onChange={(event) => setObservacion(event.target.value)}
                  placeholder="Comentario para el solicitante..."
                  rows={3}
                  className="bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text resize-none focus:outline-none focus:border-hm-accent transition-colors"
                />

                <div className="flex flex-col gap-2 pt-2 border-t border-hm-border/50 sm:flex-row">
                  <Button variant="outline" onClick={resetModal}>
                    CANCELAR
                  </Button>

                  <button
                    onClick={() => handleRechazar(detalleItem)}
                    disabled={saving}
                    className="flex-1 text-xs font-mono font-bold border border-red-700/50 text-red-400 rounded-lg py-2 hover:border-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  >
                    RECHAZAR
                  </button>

                  <button
                    onClick={() => handleAprobar(detalleItem)}
                    disabled={saving}
                    className="flex-1 text-xs font-mono font-bold bg-hm-accent/10 border border-hm-accent/40 text-hm-accent rounded-lg py-2 hover:bg-hm-accent/20 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'GUARDANDO...' : 'APROBAR ✓'}
                  </button>
                </div>
              </div>
            ) : (
              <Button variant="outline" onClick={resetModal}>
                CERRAR
              </Button>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}