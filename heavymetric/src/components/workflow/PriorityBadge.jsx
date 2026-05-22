/**
 * PriorityBadge.jsx
 * Badge visual de prioridad para el Workflow Engine de HeavyMetric.
 */
export default function PriorityBadge({ prioridad }) {
  const MAP = {
    critica: { label: 'CRÍTICA', cls: 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse' },
    alta:    { label: 'ALTA',    cls: 'bg-orange-500/20 text-orange-300 border-orange-500/40' },
    media:   { label: 'MEDIA',   cls: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' },
    baja:    { label: 'BAJA',    cls: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
    urgente: { label: 'URGENTE', cls: 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse' },
    pendiente: { label: 'PENDIENTE', cls: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' },
    aprobado: { label: 'APROBADO', cls: 'bg-green-500/20 text-green-300 border-green-500/40' },
    rechazado: { label: 'RECHAZADO', cls: 'bg-red-500/20 text-red-300 border-red-500/40' },
  }
  const config = MAP[prioridad] || MAP.media
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-mono font-bold uppercase ${config.cls}`}>
      {config.label}
    </span>
  )
}
