import { useMemo } from 'react'
import { useRubro } from '../../../context/RubroContext'

export default function ActivoRentalPanel({
  activo,
  contratos = [],
}) {
  const { hasCapability } = useRubro()

  const rentalEnabled =
    hasCapability('alquileres')

  const esRental =
    activo?.destino === 'rental' ||
    activo?.tipo_operacion === 'rental' ||
    activo?.alquilable === true

  const contratoActivo = useMemo(() => {
    return contratos.find(
      (c) =>
        c.estado === 'Activo' ||
        c.estado === 'En curso'
    )
  }, [contratos])

  if (!rentalEnabled || !esRental) {
    return null
  }

  const disponibilidad =
    Number(
      activo?.disponibilidad ??
      100
    )

  const estado =
    contratoActivo
      ? 'Alquilado'
      : 'Disponible'

  const estadoColor =
    contratoActivo
      ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
      : 'bg-green-500/10 text-green-400 border-green-500/20'

  return (
    <section className="bg-hm-surface2/20 border border-hm-border rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h3 className="text-sm font-bold text-white">
            Rental operativo
          </h3>

          <p className="text-xs text-hm-muted mt-1">
            Estado contractual y disponibilidad del activo en alquiler.
          </p>
        </div>

        <div
          className={`px-2.5 py-1 rounded-xl border text-[10px] uppercase tracking-widest font-mono ${estadoColor}`}
        >
          {estado}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Kpi
          label="Disponibilidad"
          value={`${disponibilidad}%`}
          color={
            disponibilidad >= 90
              ? 'text-green-400'
              : disponibilidad >= 70
                ? 'text-yellow-400'
                : 'text-red-400'
          }
        />

        <Kpi
          label="Contratos"
          value={contratos.length}
        />

        <Kpi
          label="Estado"
          value={estado}
        />

        <Kpi
          label="Cliente"
          value={
            contratoActivo?.cliente_nombre ||
            'Sin asignar'
          }
        />
      </div>

      {contratoActivo ? (
        <div className="bg-hm-surface2/30 border border-hm-border rounded-xl p-4">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <div className="text-sm font-bold text-white">
                Contrato activo
              </div>

              <div className="text-xs text-hm-muted mt-1">
                Seguimiento operativo y comercial.
              </div>
            </div>

            <div className="text-[10px] uppercase tracking-widest font-mono text-hm-muted">
              RENTAL
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <RentalInfo
              label="Cliente"
              value={contratoActivo?.cliente_nombre}
            />

            <RentalInfo
              label="Inicio"
              value={formatDate(contratoActivo?.fecha_inicio)}
            />

            <RentalInfo
              label="Fin"
              value={formatDate(contratoActivo?.fecha_fin)}
            />

            <RentalInfo
              label="Monto"
              value={formatCurrency(contratoActivo?.monto)}
            />
          </div>
        </div>
      ) : (
        <div className="bg-hm-surface2/30 border border-dashed border-hm-border rounded-xl p-4">
          <div className="text-sm text-hm-muted">
            No hay contratos activos asociados.
          </div>

          <div className="text-xs text-hm-muted mt-1">
            Base preparada para reservas, alquileres, renovaciones y disponibilidad operativa.
          </div>
        </div>
      )}
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

      <div className={`text-lg font-bold truncate ${color}`}>
        {value}
      </div>
    </div>
  )
}

function RentalInfo({
  label,
  value,
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest font-mono text-hm-muted mb-1">
        {label}
      </div>

      <div className="text-sm font-medium text-white">
        {value || '—'}
      </div>
    </div>
  )
}

function formatDate(value) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

function formatCurrency(value) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}