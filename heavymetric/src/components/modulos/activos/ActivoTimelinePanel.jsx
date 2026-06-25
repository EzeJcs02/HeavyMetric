import Timeline360 from '../timeline/Timeline360'

export default function ActivoTimelinePanel({
  activo,
  orgId,
}) {
  if (!activo) return null

  return (
    <section className="bg-hm-surface2/20 border border-hm-border rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-bold text-white">
            Timeline operativo
          </h3>

          <p className="text-xs text-hm-muted mt-1">
            Historial transversal operativo, comercial y técnico.
          </p>
        </div>

        <div className="text-[10px] uppercase tracking-widest font-mono text-hm-muted">
          CRM + OPS
        </div>
      </div>

      <div className="rounded-xl border border-hm-border overflow-hidden">
        <Timeline360
          orgId={orgId}
          activoId={activo.id}
          clienteId={
            activo?.cliente_id ||
            activo?.cliente?.id ||
            null
          }
        />
      </div>
    </section>
  )
}