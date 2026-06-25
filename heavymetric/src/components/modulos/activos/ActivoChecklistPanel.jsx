import { useMemo } from 'react'
import { useRubro } from '../../../context/RubroContext'

export default function ActivoChecklistPanel({
  activo,
  checklist = [],
}) {
  const { taxonomia } = useRubro()

  const activoSingular =
    taxonomia?.activoSingular || 'Activo'

  const resumen = useMemo(() => {
    const total = checklist.length

    const completos =
      checklist.filter((c) => c.estado === 'ok').length

    const pendientes =
      checklist.filter((c) => c.estado === 'pendiente').length

    const criticos =
      checklist.filter((c) => c.estado === 'critico').length

    const porcentaje =
      total > 0
        ? (completos / total) * 100
        : 100

    return {
      total,
      completos,
      pendientes,
      criticos,
      porcentaje,
    }
  }, [checklist])

  if (!activo) return null

  return (
    <section className="bg-hm-surface2/20 border border-hm-border rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h3 className="text-sm font-bold text-white">
            Checklist operativo
          </h3>

          <p className="text-xs text-hm-muted mt-1">
            Control preoperacional, seguridad y auditoría del {activoSingular.toLowerCase()}.
          </p>
        </div>

        <div className="text-[10px] uppercase tracking-widest font-mono text-hm-muted">
          ISO OPS
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Kpi
          label="Items"
          value={resumen.total}
        />

        <Kpi
          label="Correctos"
          value={resumen.completos}
          color="text-green-400"
        />

        <Kpi
          label="Pendientes"
          value={resumen.pendientes}
          color="text-yellow-400"
        />

        <Kpi
          label="Críticos"
          value={resumen.criticos}
          color="text-red-400"
        />
      </div>

      <div className="mb-5">
        <div className="flex items-center justify-between text-[11px] text-hm-muted mb-2">
          <span>Estado general</span>

          <span>
            {Math.round(resumen.porcentaje)}%
          </span>
        </div>

        <div className="h-3 rounded-full overflow-hidden bg-hm-surface2 border border-hm-border">
          <div
            className={`h-full transition-all duration-500 ${
              resumen.porcentaje >= 90
                ? 'bg-green-500'
                : resumen.porcentaje >= 70
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
            }`}
            style={{
              width: `${resumen.porcentaje}%`,
            }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {checklist.length === 0 ? (
          <div className="bg-hm-surface2/30 border border-dashed border-hm-border rounded-xl p-4">
            <div className="text-sm text-hm-muted">
              No hay checklist cargado.
            </div>

            <div className="text-xs text-hm-muted mt-1">
              Base preparada para controles operativos, seguridad, entrega y recepción.
            </div>
          </div>
        ) : (
          checklist.map((item) => (
            <ChecklistRow
              key={item.id || item.label}
              item={item}
            />
          ))
        )}
      </div>
    </section>
  )
}

function ChecklistRow({ item }) {
  const status =
    item.estado || 'pendiente'

  const styles = {
    ok: {
      dot: 'bg-green-400',
      text: 'text-green-400',
      label: 'Correcto',
    },

    pendiente: {
      dot: 'bg-yellow-400',
      text: 'text-yellow-400',
      label: 'Pendiente',
    },

    critico: {
      dot: 'bg-red-400',
      text: 'text-red-400',
      label: 'Crítico',
    },
  }

  const current =
    styles[status] || styles.pendiente

  return (
    <div className="bg-hm-surface2/30 border border-hm-border rounded-xl p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`w-2 h-2 rounded-full mt-1.5 ${current.dot}`}
          />

          <div className="min-w-0">
            <div className="text-sm font-medium text-white truncate">
              {item.label || item.nombre}
            </div>

            {item.descripcion && (
              <div className="text-xs text-hm-muted mt-1">
                {item.descripcion}
              </div>
            )}
          </div>
        </div>

        <div
          className={`text-[10px] uppercase tracking-widest font-mono shrink-0 ${current.text}`}
        >
          {current.label}
        </div>
      </div>
    </div>
  )
}

function Kpi({
  label,
  value,
  color = 'text-white',
}) {
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
