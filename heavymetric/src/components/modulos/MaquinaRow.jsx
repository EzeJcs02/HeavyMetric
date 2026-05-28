import HorometroBar from '../ui/HorometroBar'
import { useRubro } from '../../context/RubroContext'

const ESTADO_COLOR = {
  Operativo: 'text-green-400',
  'En mantenimiento': 'text-yellow-400',
  'En taller': 'text-orange-400',
  'Esperando repuesto': 'text-red-400',
  'Fuera de servicio': 'text-red-500',
  Baja: 'text-hm-muted',
}

export default function MaquinaRow({ maquina, onClickDetalle, onEdit }) {
  const { taxonomia, hasCapability } = useRubro()

  const activoSingular = taxonomia?.activoSingular || 'Activo'
  const medidor = taxonomia?.medidor || 'Horómetro'
  const medidorUnidad = taxonomia?.medidorUnidad || 'hrs'
  const moduloTaller = taxonomia?.moduloTaller || 'Taller'
  const permiteAlquileres = hasCapability?.('alquileres') === true

  const propiedadActivo =
    maquina?.propiedad_activo || (maquina?.cliente_id ? 'cliente' : 'propio')

  const destinoOperativo =
    maquina?.destino_operativo ||
    (maquina?.en_alquiler
      ? 'rental'
      : propiedadActivo === 'cliente'
        ? 'servicio_tecnico'
        : 'uso_interno')

  const isRental =
    permiteAlquileres &&
    propiedadActivo === 'propio' &&
    destinoOperativo === 'rental'

  const identificacion =
    maquina?.patente ||
    maquina?.interno ||
    maquina?.numero_serie ||
    maquina?.chasis ||
    '—'

  const propietario =
    maquina?.cliente_nombre ||
    maquina?.cliente?.razon_social ||
    (propiedadActivo === 'cliente' ? 'Cliente externo' : 'Empresa')

  const estadoOperativo = maquina?.estado_operativo || 'Operativo'

  return (
    <tr className="border-b border-hm-border hover:bg-hm-surface2/30 transition-colors group">
      <td className="p-4">
        <div className="flex flex-col">
          <span className="font-bold text-hm-text">
            {maquina.nombre_unidad}
          </span>

          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span
              className={`text-[10px] font-mono uppercase tracking-widest ${
                ESTADO_COLOR[estadoOperativo] || 'text-hm-muted'
              }`}
            >
              ● {estadoOperativo}
            </span>

            {isRental && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-blue-500/30 text-blue-400 bg-blue-500/5 uppercase tracking-widest">
                RENTAL
              </span>
            )}

            {propiedadActivo === 'cliente' && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-orange-500/30 text-orange-400 bg-orange-500/5 uppercase tracking-widest">
                CLIENTE
              </span>
            )}

            {maquina?.en_taller && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-red-500/30 text-red-400 bg-red-500/5 uppercase tracking-widest">
                EN {moduloTaller.toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </td>

      <td className="p-4">
        <div className="flex flex-col">
          <span className="font-mono text-hm-text text-sm">
            {[maquina?.marca, maquina?.modelo].filter(Boolean).join(' ') || '—'}
          </span>

          <span className="text-[10px] text-hm-muted uppercase tracking-widest mt-1">
            {maquina?.tipo || activoSingular}
          </span>
        </div>
      </td>

      <td className="p-4">
        <div className="flex flex-col">
          <span className="font-mono text-sm text-hm-text">
            {identificacion}
          </span>

          <span className="text-[10px] text-hm-muted uppercase tracking-widest mt-1">
            IDENTIFICACIÓN
          </span>
        </div>
      </td>

      <td className="p-4">
        <div className="flex flex-col">
          <span className="text-sm text-hm-text">
            {propietario}
          </span>

          <span className="text-[10px] text-hm-muted uppercase tracking-widest mt-1">
            {propiedadActivo === 'cliente'
              ? 'CLIENTE PROPIETARIO'
              : 'PROPIEDAD INTERNA'}
          </span>
        </div>
      </td>

      <td className="p-4 w-[220px]">
        <div className="flex flex-col gap-2">
          <HorometroBar
            actual={maquina.horometro_actual || 0}
            max={maquina.frecuencia_service || 1}
          />

          <div className="flex justify-between text-[10px] font-mono text-hm-muted">
            <span>{medidor}</span>
            <span>
              {maquina.horometro_actual || 0}
              {medidorUnidad}
            </span>
          </div>
        </div>
      </td>

      <td className="p-4 text-right">
        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button
              onClick={onEdit}
              className="text-hm-muted hover:text-hm-accent font-mono text-xs border border-hm-border rounded px-2 py-1 hover:border-hm-accent transition-colors"
            >
              EDITAR
            </button>
          )}

          <button
            onClick={onClickDetalle}
            className="text-hm-accent hover:text-yellow-400 font-mono text-sm"
          >
            VER FICHA →
          </button>
        </div>
      </td>
    </tr>
  )
}