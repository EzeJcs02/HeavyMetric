import { useMemo } from 'react'
import { useRubro } from '../../../context/RubroContext'

const DOC_STATUS = {
  vigente: 'bg-green-500/10 text-green-400 border-green-500/20',
  por_vencer: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  vencido: 'bg-red-500/10 text-red-400 border-red-500/20',
  pendiente: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20',
}

export default function ActivoDocumentsPanel({
  activo,
  documentos = [],
}) {
  const { taxonomia } = useRubro()

  const activoSingular = taxonomia?.activoSingular || 'Activo'

  const resumen = useMemo(() => {
    return {
      total: documentos.length,
      vencidos: documentos.filter((d) => d.estado === 'vencido').length,
      porVencer: documentos.filter((d) => d.estado === 'por_vencer').length,
      vigentes: documentos.filter((d) => d.estado === 'vigente').length,
    }
  }, [documentos])

  if (!activo) return null

  return (
    <section className="bg-hm-surface2/20 border border-hm-border rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h3 className="text-sm font-bold text-white">
            Documentación
          </h3>

          <p className="text-xs text-hm-muted mt-1">
            Archivos, certificados, seguros, manuales y evidencias asociadas al {activoSingular.toLowerCase()}.
          </p>
        </div>

        <div className="text-[10px] uppercase tracking-widest font-mono text-hm-muted">
          ISO DOCS
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Kpi label="Total" value={resumen.total} />
        <Kpi label="Vigentes" value={resumen.vigentes} color="text-green-400" />
        <Kpi label="Por vencer" value={resumen.porVencer} color="text-yellow-400" />
        <Kpi label="Vencidos" value={resumen.vencidos} color="text-red-400" />
      </div>

      <div className="flex flex-col gap-2">
        {documentos.length === 0 ? (
          <div className="bg-hm-surface2/30 border border-dashed border-hm-border rounded-xl p-4">
            <div className="text-sm text-hm-muted">
              No hay documentación cargada para este {activoSingular.toLowerCase()}.
            </div>
            <div className="text-xs text-hm-muted mt-1">
              Base preparada para adjuntar manuales, pólizas, certificados, remitos, garantías, contratos y evidencias ISO.
            </div>
          </div>
        ) : (
          documentos.map((doc) => {
            const estado = doc.estado || getEstadoByFecha(doc.fecha_vencimiento)
            const statusStyle =
              DOC_STATUS[estado] ||
              DOC_STATUS.pendiente

            return (
              <div
                key={doc.id || `${doc.nombre}-${doc.tipo}`}
                className="bg-hm-surface2/30 border border-hm-border rounded-xl p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">
                      {doc.nombre || doc.titulo || 'Documento sin nombre'}
                    </div>

                    <div className="flex gap-2 flex-wrap mt-2">
                      <span className="text-[10px] uppercase tracking-widest font-mono text-hm-muted">
                        {doc.tipo || 'documento'}
                      </span>

                      {doc.fecha_vencimiento && (
                        <span className="text-[10px] uppercase tracking-widest font-mono text-hm-muted">
                          Vence: {formatDate(doc.fecha_vencimiento)}
                        </span>
                      )}
                    </div>
                  </div>

                  <span
                    className={`px-2 py-1 rounded-lg border text-[10px] uppercase tracking-widest font-mono shrink-0 ${statusStyle}`}
                  >
                    {formatLabel(estado)}
                  </span>
                </div>

                {doc.descripcion && (
                  <div className="text-xs text-hm-muted mt-2">
                    {doc.descripcion}
                  </div>
                )}

                {doc.url && (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex mt-3 text-xs text-hm-accent hover:text-white transition-colors"
                  >
                    Ver documento →
                  </a>
                )}
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}

function Kpi({ label, value, color = 'text-white' }) {
  return (
    <div className="bg-hm-surface2/30 border border-hm-border rounded-xl p-4">
      <div className="text-[10px] uppercase tracking-widest font-mono text-hm-muted mb-1">
        {label}
      </div>

      <div className={`text-lg font-bold ${color}`}>
        {value}
      </div>
    </div>
  )
}

function getEstadoByFecha(fecha) {
  if (!fecha) return 'pendiente'

  const today = new Date()
  const vencimiento = new Date(fecha)
  const diffDays = Math.ceil((vencimiento - today) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'vencido'
  if (diffDays <= 30) return 'por_vencer'

  return 'vigente'
}

function formatDate(value) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

function formatLabel(value) {
  return String(value || 'pendiente')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase())
}