import { useMemo } from 'react'

export default function ActivoPredictivePanel({
  activo,
  ots = [],
}) {
  const analytics = useMemo(() => {
    const abiertas =
      ots.filter(
        (o) =>
          o.estado !== 'Cerrada' &&
          o.estado !== 'Finalizada'
      ).length

    const criticas =
      ots.filter(
        (o) =>
          o.prioridad === 'Crítica'
      ).length

    const scoreBase =
      Number(
        activo?.score_disponibilidad || 100
      )

    let riesgo = 'Bajo'
    let color = 'text-green-400'
    let barra = 'bg-green-500'
    let porcentaje = scoreBase

    if (abiertas >= 3 || criticas >= 1) {
      riesgo = 'Medio'
      color = 'text-yellow-400'
      barra = 'bg-yellow-500'
      porcentaje -= 20
    }

    if (abiertas >= 5 || criticas >= 2) {
      riesgo = 'Alto'
      color = 'text-red-400'
      barra = 'bg-red-500'
      porcentaje -= 40
    }

    porcentaje = Math.max(
      5,
      Math.min(100, porcentaje)
    )

    const recomendacion =
      riesgo === 'Alto'
        ? 'Programar intervención prioritaria y revisar continuidad operativa.'
        : riesgo === 'Medio'
          ? 'Monitorear comportamiento operativo y validar mantenimiento.'
          : 'Operación estable sin alertas críticas.'

    return {
      abiertas,
      criticas,
      riesgo,
      color,
      barra,
      porcentaje,
      recomendacion,
    }
  }, [activo, ots])

  if (!activo) return null

  return (
    <section className="bg-hm-surface2/20 border border-hm-border rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h3 className="text-sm font-bold text-white">
            IA silenciosa
          </h3>

          <p className="text-xs text-hm-muted mt-1">
            Evaluación predictiva basada en comportamiento operativo y servicios.
          </p>
        </div>

        <div className="text-[10px] uppercase tracking-widest font-mono text-hm-muted">
          AI OPS
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Kpi
          label="OT abiertas"
          value={analytics.abiertas}
        />

        <Kpi
          label="Críticas"
          value={analytics.criticas}
          color={
            analytics.criticas > 0
              ? 'text-red-400'
              : 'text-green-400'
          }
        />

        <Kpi
          label="Riesgo"
          value={analytics.riesgo}
          color={analytics.color}
        />

        <Kpi
          label="Health"
          value={`${analytics.porcentaje}%`}
          color={analytics.color}
        />
      </div>

      <div className="mb-5">
        <div className="flex items-center justify-between text-[11px] text-hm-muted mb-2">
          <span>Continuidad operativa</span>

          <span>
            {analytics.porcentaje}%
          </span>
        </div>

        <div className="h-3 rounded-full overflow-hidden bg-hm-surface2 border border-hm-border">
          <div
            className={`h-full transition-all duration-500 ${analytics.barra}`}
            style={{
              width: `${analytics.porcentaje}%`,
            }}
          />
        </div>
      </div>

      <div className="bg-hm-surface2/30 border border-hm-border rounded-xl p-4">
        <div className="text-[10px] uppercase tracking-widest font-mono text-hm-muted mb-2">
          Recomendación automática
        </div>

        <div className="text-sm text-white leading-relaxed">
          {analytics.recomendacion}
        </div>
      </div>
    </section>
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
