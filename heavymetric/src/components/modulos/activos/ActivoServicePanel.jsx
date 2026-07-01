import { useMemo } from 'react'
import { useRubro } from '../../../context/RubroContext'

export default function ActivoServicePanel({
  activo,
  ots = [],
}) {
  const { taxonomia } = useRubro()

  const medidor =
    taxonomia?.medidor || 'Uso'

  const medidorUnidad =
    taxonomia?.medidorUnidad || 'hs'

  const ordenTrabajo =
    taxonomia?.ordenTrabajo || 'Orden de trabajo'



  const medidorActual =
    Number(
      activo?.medidor_uso_valor ??
      activo?.horometro_actual ??
      activo?.kilometraje_actual ??
      0
    )

  const frecuenciaService =
    Number(
      activo?.frecuencia_service ??
      activo?.service_cada ??
      250
    )

  const proximoService =
    Number(
      activo?.proximo_service ??
      (medidorActual + frecuenciaService)
    )

  const restante =
    proximoService - medidorActual

  const porcentaje =
    Math.min(
      100,
      Math.max(
        0,
        (medidorActual / proximoService) * 100
      )
    )

  const status = useMemo(() => {
    if (restante <= 0) {
      return {
        label: 'Vencido',
        color: 'bg-red-500/15 border-red-500/20 text-red-400',
      }
    }

    if (restante <= frecuenciaService * 0.2) {
      return {
        label: 'Próximo',
        color: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
      }
    }

    return {
      label: 'Controlado',
      color: 'bg-green-500/10 border-green-500/20 text-green-400',
    }
  }, [restante, frecuenciaService])

  if (!activo) return null

  const abiertas =
    ots.filter(
      (ot) =>
        ot.estado !== 'Cerrada' &&
        ot.estado !== 'Finalizada'
    ).length

  return (
    <section className="bg-hm-surface2/20 border border-hm-border rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-bold text-white">
            Mantenimiento y servicio
          </h3>

          <p className="text-xs text-hm-muted mt-1">
            Estado operativo y control preventivo del activo.
          </p>
        </div>

        <div
          className={`px-2.5 py-1 rounded-xl border text-[10px] uppercase tracking-widest font-mono ${status.color}`}
        >
          {status.label}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Kpi
          label={medidor}
          value={`${formatNumber(medidorActual)} ${medidorUnidad}`}
        />

        <Kpi
          label="Próximo service"
          value={`${formatNumber(proximoService)} ${medidorUnidad}`}
        />

        <Kpi
          label="Restante"
          value={`${formatNumber(restante)} ${medidorUnidad}`}
        />

        <Kpi
          label={`${ordenTrabajo}s abiertas`}
          value={abiertas}
        />
      </div>

      <div>
        <div className="flex items-center justify-between text-[11px] text-hm-muted mb-2">
          <span>Avance preventivo</span>

          <span>
            {Math.round(porcentaje)}%
          </span>
        </div>

        <div className="h-3 rounded-full overflow-hidden bg-hm-surface2 border border-hm-border">
          <div
            className={`h-full transition-all duration-500 ${
              porcentaje >= 90
                ? 'bg-red-500'
                : porcentaje >= 70
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
            }`}
            style={{
              width: `${porcentaje}%`,
            }}
          />
        </div>
      </div>

      <div className="mt-5 border-t border-hm-border pt-4">
        <div className="text-[10px] uppercase tracking-widest font-mono text-hm-muted mb-3">
          Últimas intervenciones
        </div>

        <div className="flex flex-col gap-2">
          {ots.length === 0 ? (
            <div className="text-sm text-hm-muted">
              No hay intervenciones registradas.
            </div>
          ) : (
            ots.slice(0, 5).map((ot) => (
              <div
                key={ot.id}
                className="bg-hm-surface2/30 border border-hm-border rounded-xl px-3 py-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {ot.titulo || ot.descripcion || ordenTrabajo}
                    </div>

                    <div className="text-[11px] text-hm-muted mt-1">
                      {ot.tecnico || ot.responsable || 'Sin responsable'}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-[10px] uppercase tracking-wider font-mono text-hm-muted">
                      Estado
                    </div>

                    <div className="text-xs text-white mt-1">
                      {ot.estado || '—'}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}

function Kpi({ label, value }) {
  return (
    <div className="bg-hm-surface2/30 border border-hm-border rounded-xl p-4">
      <div className="text-[10px] uppercase tracking-widest font-mono text-hm-muted mb-1">
        {label}
      </div>

      <div className="text-lg font-bold text-white">
        {value}
      </div>
    </div>
  )
}

function formatNumber(value) {
  return new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}