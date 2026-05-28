import { useMemo } from 'react'
import Modal from '../../ui/Modal'
import Badge from '../../ui/Badge'
import Button from '../../ui/Button'
import { useRubro } from '../../../context/RubroContext'
import Timeline360 from '../timeline/Timeline360'

export default function FichaActivo({
  isOpen,
  onClose,
  activo,
  ots = [],
  contratos = [],
  stats = {},
  orgId,
}) {
  const { taxonomia, hasCapability } = useRubro()

  const activoSingular = taxonomia?.activoSingular || 'Activo'
  const ordenTrabajoPlural = taxonomia?.ordenTrabajoPlural || 'Órdenes'
  const medidor = taxonomia?.medidor || 'Uso'
  const medidorUnidad = taxonomia?.medidorUnidad || 'hs'
  const permiteAlquileres = hasCapability?.('alquileres') === true

  const propiedadActivo = activo?.propiedad_activo || (activo?.cliente_id ? 'cliente' : 'propio')

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

  const healthScore = useMemo(() => {
    let score = activo?.score_disponibilidad || 100

    if (activo?.estado_operativo === 'Fuera de servicio') score -= 30
    if (activo?.estado_operativo === 'En taller') score -= 15
    if (activo?.estado_operativo === 'Esperando repuesto') score -= 25

    return Math.max(0, Math.min(100, score))
  }, [activo])

  if (!activo) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="max-w-6xl">
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4 border-b border-hm-border pb-5">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-bold text-white">
                {activo.nombre_unidad || activo.nombre || activoSingular}
              </h2>

              <Badge variant={isRental ? 'info' : propiedadActivo === 'cliente' ? 'default' : 'success'}>
                {isRental ? 'RENTAL' : propiedadActivo === 'cliente' ? 'CLIENTE' : 'PROPIO'}
              </Badge>
            </div>

            <p className="text-sm text-hm-muted mt-1">
              {[activo.tipo, activo.marca, activo.modelo, activo.anio].filter(Boolean).join(' · ') || 'Sin datos técnicos cargados'}
            </p>

            <p className="text-xs text-hm-muted mt-2">
              Identificación: {identificacion}
            </p>
          </div>

          <div className="text-right bg-hm-surface2/30 border border-hm-border rounded-xl px-4 py-3">
            <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest">
              Health Score
            </div>
            <div className={`text-2xl font-bold ${healthScore >= 80 ? 'text-green-400' : healthScore >= 50 ? 'text-orange-400' : 'text-red-400'}`}>
              {healthScore}/100
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card label="Titularidad" value={propiedadActivo === 'cliente' ? 'Cliente' : 'Propio'} />
          <Card label="Destino operativo" value={destinoOperativo.replace('_', ' ')} />
          <Card label={medidor} value={`${activo.horometro_actual || 0} ${medidorUnidad}`} />
          <Card label={ordenTrabajoPlural} value={ots.length} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <section className="lg:col-span-1 bg-hm-surface2/20 border border-hm-border rounded-xl p-4">
            <h3 className="text-sm font-bold text-white mb-3">Datos operativos</h3>

            <Info label="Estado" value={activo.estado_operativo || 'Operativo'} />
            <Info label="Ubicación" value={activo.ubicacion || '—'} />
            <Info label="Cliente propietario" value={activo.cliente?.razon_social || activo.cliente_nombre || '—'} />
            <Info label="Serie / chasis" value={activo.numero_serie || activo.chasis || '—'} />
          </section>

          <section className="lg:col-span-2 bg-hm-surface2/20 border border-hm-border rounded-xl p-4">
            <h3 className="text-sm font-bold text-white mb-3">Historial 360</h3>

            <Timeline360
              orgId={orgId}
              activoId={activo.id}
              clienteId={activo.cliente_id || activo.cliente?.id || null}
            />
          </section>
        </div>

        <div className="flex justify-end border-t border-hm-border pt-4">
          <Button variant="outline" onClick={onClose}>
            CERRAR
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function Card({ label, value }) {
  return (
    <div className="bg-hm-surface2/30 border border-hm-border rounded-xl p-4">
      <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-1">
        {label}
      </div>
      <div className="text-lg font-bold text-white capitalize">
        {value}
      </div>
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div className="border-b border-hm-border/50 py-2 last:border-0">
      <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest">
        {label}
      </div>
      <div className="text-sm text-white mt-0.5">
        {value}
      </div>
    </div>
  )
}