import { useMemo } from 'react'

export default function ActivoCostPanel({
  activo,
  ots = [],
  contratos = [],
  stats = {},
}) {
  const financials = useMemo(() => {
    const ingresos =
      Number(
        stats?.totalIngresos ??
        contratos?.reduce(
          (acc, c) => acc + Number(c?.monto || 0),
          0
        ) ??
        0
      )

    const costoRepuestos =
      Number(
        stats?.costoRepuestos ??
        ots?.reduce(
          (acc, ot) =>
            acc + Number(ot?.costo_repuestos || 0),
          0
        ) ??
        0
      )

    const costoManoObra =
      Number(
        stats?.costoManoObra ??
        ots?.reduce(
          (acc, ot) =>
            acc + Number(ot?.costo_mano_obra || 0),
          0
        ) ??
        0
      )

    const costoTotal =
      costoRepuestos + costoManoObra

    const margen =
      ingresos - costoTotal

    const margenPorcentaje =
      ingresos > 0
        ? (margen / ingresos) * 100
        : 0

    return {
      ingresos,
      costoRepuestos,
      costoManoObra,
      costoTotal,
      margen,
      margenPorcentaje,
    }
  }, [stats, contratos, ots])

  const downtimeHoras =
    Number(
      stats?.downtimeHoras ??
      activo?.downtime_horas ??
      0
    )

  const disponibilidad =
    Number(
      activo?.disponibilidad ??
      stats?.disponibilidad ??
      100
    )

  const disponibilidadColor =
    disponibilidad >= 90
      ? 'text-green-400'
      : disponibilidad >= 70
        ? 'text-yellow-400'
        : 'text-red-400'

  const margenColor =
    financials.margen >= 0
      ? 'text-green-400'
      : 'text-red-400'

  return (
    <section className="bg-hm-surface2/20 border border-hm-border rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h3 className="text-sm font-bold text-white">
            Costos y rentabilidad
          </h3>

          <p className="text-xs text-hm-muted mt-1">
            Impacto económico y operativo del activo.
          </p>
        </div>

        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest font-mono text-hm-muted">
            Margen
          </div>

          <div className={`text-xl font-bold ${margenColor}`}>
            {formatCurrency(financials.margen)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Kpi
          label="Ingresos"
          value={formatCurrency(financials.ingresos)}
          positive
        />

        <Kpi
          label="Costos"
          value={formatCurrency(financials.costoTotal)}
        />

        <Kpi
          label="Disponibilidad"
          value={`${disponibilidad}%`}
          color={disponibilidadColor}
        />

        <Kpi
          label="Downtime"
          value={`${downtimeHoras} hs`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CostCard
          title="Repuestos / Insumos"
          value={financials.costoRepuestos}
        />

        <CostCard
          title="Mano de obra"
          value={financials.costoManoObra}
        />
      </div>

      <div className="mt-5 border-t border-hm-border pt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-hm-muted">
            Margen operativo
          </span>

          <span className={`font-bold ${margenColor}`}>
            {financials.margenPorcentaje.toFixed(1)}%
          </span>
        </div>

        <div className="mt-3 h-3 rounded-full overflow-hidden bg-hm-surface2 border border-hm-border">
          <div
            className={`h-full transition-all duration-500 ${
              financials.margenPorcentaje >= 25
                ? 'bg-green-500'
                : financials.margenPorcentaje >= 10
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
            }`}
            style={{
              width: `${Math.min(
                100,
                Math.max(0, financials.margenPorcentaje)
              )}%`,
            }}
          />
        </div>
      </div>
    </section>
  )
}

function Kpi({
  label,
  value,
  positive = false,
  color,
}) {
  return (
    <div className="bg-hm-surface2/30 border border-hm-border rounded-xl p-4">
      <div className="text-[10px] uppercase tracking-widest font-mono text-hm-muted mb-1">
        {label}
      </div>

      <div
        className={`text-lg font-bold ${
          color
            ? color
            : positive
              ? 'text-green-400'
              : 'text-white'
        }`}
      >
        {value}
      </div>
    </div>
  )
}

function CostCard({ title, value }) {
  return (
    <div className="bg-hm-surface2/30 border border-hm-border rounded-xl p-4">
      <div className="text-[10px] uppercase tracking-widest font-mono text-hm-muted mb-2">
        {title}
      </div>

      <div className="text-xl font-bold text-white">
        {formatCurrency(value)}
      </div>
    </div>
  )
}

function formatCurrency(value) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}