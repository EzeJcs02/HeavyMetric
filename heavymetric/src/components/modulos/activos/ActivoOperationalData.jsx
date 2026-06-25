import { useRubro } from '../../../context/RubroContext'

const STATUS_STYLES = {
  Operativo: 'bg-green-500/10 text-green-400 border-green-500/20',
  'En mantenimiento': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  'En taller': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'Esperando repuesto': 'bg-red-500/10 text-red-400 border-red-500/20',
  'Fuera de servicio': 'bg-red-500/15 text-red-500 border-red-500/30',
}

export default function ActivoOperationalData({ activo }) {
  const { taxonomia } = useRubro()

  const activoSingular =
    taxonomia?.activoSingular || 'Activo'

  if (!activo) return null

  const propiedadActivo =
    activo?.propiedad_activo ||
    (activo?.cliente_id ? 'cliente' : 'propio')

  const estadoOperativo =
    activo?.estado_operativo || 'Operativo'

  const destinoOperativo =
    activo?.destino_operativo ||
    (activo?.en_alquiler
      ? 'rental'
      : propiedadActivo === 'cliente'
        ? 'servicio_tecnico'
        : 'uso_interno')

  const criticidad =
    activo?.criticidad_operativa || 'media'

  const statusStyle =
    STATUS_STYLES[estadoOperativo] ||
    'bg-hm-surface2 text-hm-text border-hm-border'

  return (
    <section className="bg-hm-surface2/20 border border-hm-border rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-bold text-white">
            Datos operativos
          </h3>

          <p className="text-xs text-hm-muted mt-1">
            Información general y operacional del {activoSingular.toLowerCase()}.
          </p>
        </div>

        <div
          className={`px-2.5 py-1 rounded-xl border text-[10px] uppercase tracking-widest font-mono ${statusStyle}`}
        >
          {estadoOperativo}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
        <Info
          label="Cliente propietario"
          value={
            activo?.cliente?.razon_social ||
            activo?.cliente_nombre ||
            '—'
          }
        />

        <Info
          label="Titularidad"
          value={formatLabel(propiedadActivo)}
        />

        <Info
          label="Destino operativo"
          value={formatLabel(destinoOperativo)}
        />

        <Info
          label="Criticidad"
          value={formatLabel(criticidad)}
        />

        <Info
          label="Ubicación"
          value={activo?.ubicacion || '—'}
        />

        <Info
          label="Sucursal"
          value={activo?.sucursal || '—'}
        />

        <Info
          label="Interno"
          value={activo?.interno || '—'}
        />

        <Info
          label="Patente"
          value={activo?.patente || '—'}
        />

        <Info
          label="Serie"
          value={
            activo?.numero_serie ||
            activo?.serie ||
            '—'
          }
        />

        <Info
          label="Chasis"
          value={activo?.chasis || '—'}
        />

        <Info
          label="Motor"
          value={activo?.motor || '—'}
        />

        <Info
          label="Modelo"
          value={activo?.modelo || '—'}
        />
      </div>
    </section>
  )
}

function Info({ label, value }) {
  return (
    <div className="border-b border-hm-border/40 py-2 last:border-0">
      <div className="text-[10px] uppercase tracking-widest font-mono text-hm-muted">
        {label}
      </div>

      <div className="text-sm text-white mt-1 break-words">
        {value || '—'}
      </div>
    </div>
  )
}

function formatLabel(value) {
  if (!value) return '—'

  return String(value)
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase())
}