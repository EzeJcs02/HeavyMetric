import Badge from '../../ui/Badge'
import { useRubro } from '../../../context/RubroContext'

const ESTADO_COLOR = {
  Operativo: 'text-green-400',
  'En mantenimiento': 'text-yellow-400',
  'En taller': 'text-orange-400',
  'Esperando repuesto': 'text-red-400',
  'Fuera de servicio': 'text-red-500',
  Baja: 'text-hm-muted',
}

export default function ActivoHeader({
  activo,
  ots = [],
  stats = {},
  healthScore,
  onClose,
}) {
  const { taxonomia, hasCapability } = useRubro()

  const activoSingular = taxonomia?.activoSingular || 'Activo'
  const ordenTrabajoPlural = taxonomia?.ordenTrabajoPlural || 'Órdenes'
  const medidor = taxonomia?.medidor || 'Uso'
  const medidorUnidad = taxonomia?.medidorUnidad || 'hs'
  const permiteAlquileres = hasCapability?.('alquileres') === true

  if (!activo) return null

  const propiedadActivo =
    activo?.propiedad_activo ||
    (activo?.cliente_id ? 'cliente' : 'propio')

  const destinoOperativo =
    activo?.destino_operativo ||
    (activo?.en_alquiler
      ? 'rental'
      : propiedadActivo === 'cliente'
        ? 'servicio_tecnico'
        : 'uso_interno')

  const isRental =
    permiteAlquileres &&
    propiedadActivo === 'propio' &&
    destinoOperativo === 'rental'

  const identificacion =
    activo?.patente ||
    activo?.interno ||
    activo?.numero_serie ||
    activo?.chasis ||
    '—'

  const estadoOperativo =
    activo?.estado_operativo || 'Operativo'

  const finalHealthScore =
    typeof healthScore === 'number'
      ? healthScore
      : Number(activo?.score_disponibilidad || 100)

  const healthColor =
    finalHealthScore >= 80
      ? 'text-green-400'
      : finalHealthScore >= 50
        ? 'text-orange-400'
        : 'text-red-400'

  const titularidadLabel =
    propiedadActivo === 'cliente'
      ? 'Cliente'
      : propiedadActivo === 'tercero'
        ? 'Tercero'
        : 'Propio'

  const destinoLabel =
    destinoOperativo === 'rental'
      ? 'Rental'
      : destinoOperativo === 'servicio_tecnico'
        ? 'Servicio técnico'
        : 'Uso interno'

  return (
    <div className="flex flex-col gap-5 border-b border-hm-border pb-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-2xl font-bold text-white truncate">
              {activo.nombre_unidad || activo.nombre || activoSingular}
            </h2>

            <Badge
              variant={
                isRental
                  ? 'info'
                  : propiedadActivo === 'cliente'
                    ? 'default'
                    : 'success'
              }
            >
              {isRental ? 'RENTAL' : titularidadLabel.toUpperCase()}
            </Badge>

            <span
              className={`text-xs font-mono font-bold ${
                ESTADO_COLOR[estadoOperativo] || 'text-hm-muted'
              }`}
            >
              ● {estadoOperativo}
            </span>
          </div>

          <p className="text-sm text-hm-muted mt-1">
            {[activo.tipo, activo.marca, activo.modelo, activo.anio]
              .filter(Boolean)
              .join(' · ') || 'Sin datos técnicos cargados'}
          </p>

          <div className="flex gap-2 flex-wrap mt-3">
            <span className="text-[10px] font-mono px-2 py-1 rounded border border-hm-border bg-hm-surface2/30 text-hm-muted uppercase">
              Identificación: {identificacion}
            </span>

            <span className="text-[10px] font-mono px-2 py-1 rounded border border-hm-border bg-hm-surface2/30 text-hm-muted uppercase">
              Titularidad: {titularidadLabel}
            </span>

            <span className="text-[10px] font-mono px-2 py-1 rounded border border-hm-border bg-hm-surface2/30 text-hm-muted uppercase">
              Destino: {destinoLabel}
            </span>
          </div>
        </div>

        <div className="flex items-start gap-3 shrink-0">
          <div className="text-right bg-hm-surface2/30 border border-hm-border rounded-xl px-4 py-3">
            <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest">
              Health Score
            </div>
            <div className={`text-2xl font-bold ${healthColor}`}>
              {finalHealthScore}/100
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-hm-muted hover:text-white border border-hm-border rounded-xl px-3 py-2 text-xs font-mono transition-colors"
            >
              CERRAR
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Titularidad" value={titularidadLabel} />
        <KpiCard label="Destino operativo" value={destinoLabel} />
        <KpiCard
          label={medidor}
          value={`${activo.horometro_actual || activo.medidor_uso_valor || 0} ${medidorUnidad}`}
        />
        <KpiCard label={ordenTrabajoPlural} value={ots.length} />
      </div>

      {stats && Object.keys(stats).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {'totalIngresos' in stats && (
            <KpiCard
              label="Ingresos"
              value={formatNumber(stats.totalIngresos)}
              muted
            />
          )}

          {'totalGastos' in stats && (
            <KpiCard
              label="Costos"
              value={formatNumber(stats.totalGastos)}
              muted
            />
          )}

          {'ordenesAbiertas' in stats && (
            <KpiCard
              label="Abiertas"
              value={stats.ordenesAbiertas}
              muted
            />
          )}

          {'alertas' in stats && (
            <KpiCard
              label="Alertas"
              value={stats.alertas}
              muted
            />
          )}
        </div>
      )}
    </div>
  )
}

function KpiCard({ label, value, muted = false }) {
  return (
    <div className="bg-hm-surface2/30 border border-hm-border rounded-xl p-4">
      <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-1">
        {label}
      </div>
      <div
        className={`text-lg font-bold capitalize ${
          muted ? 'text-hm-text' : 'text-white'
        }`}
      >
        {value ?? '—'}
      </div>
    </div>
  )
}

function formatNumber(value) {
  const n = Number(value || 0)

  return new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 0,
  }).format(n)
}