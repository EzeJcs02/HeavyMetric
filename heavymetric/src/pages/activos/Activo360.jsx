import { useState, useMemo } from 'react'
import { useMaquinas } from '../../hooks/useMaquinas'
import { calcServiceState } from '../../hooks/useCliente360'
import { useRubro } from '../../context/RubroContext'
import { useAuth } from '../../context/AuthContext'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import FichaActivo from '../../components/modulos/activos/FichaActivo'

const ESTADO_OP_COLOR = {
  Operativo: 'text-green-400 bg-green-500/10 border-green-500/30',
  'En mantenimiento': 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  'En taller': 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  'Esperando repuesto': 'text-red-400 bg-red-500/10 border-red-500/30',
  'Fuera de servicio': 'text-red-500 bg-red-500/10 border-red-500/30 font-bold',
  Baja: 'text-hm-muted bg-hm-surface2 border-hm-border',
}

function DataBadge({ type = 'real' }) {
  const styles = {
    real: 'border-green-500/30 bg-green-500/10 text-green-300',
    prep: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300',
    empty: 'border-hm-border bg-hm-surface2/40 text-hm-muted',
  }

  const labels = {
    real: 'REAL',
    prep: 'BASE PREPARADA',
    empty: 'SIN DATOS',
  }

  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest ${styles[type]}`}>
      {labels[type]}
    </span>
  )
}

function EmptyState({ title, description }) {
  return (
    <div className="p-8 text-center">
      <div className="text-sm font-mono text-hm-muted">{title}</div>
      <div className="mt-1 text-xs text-hm-muted/70">{description}</div>
    </div>
  )
}

function SkeletonRow() {
  return (
    <tr className="border-b border-hm-border/50">
      <td colSpan={6} className="p-4">
        <div className="h-6 bg-hm-surface2 rounded animate-pulse" />
      </td>
    </tr>
  )
}

export default function Activo360() {
  const { maquinas, loading, error } = useMaquinas()
  const { orgId } = useAuth()
  const { taxonomia, hasCapability } = useRubro()

  const [searchQuery, setSearchQuery] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('Todos')
  const [selectedActivoId, setSelectedActivoId] = useState(null)

  const activos = maquinas || []

  const activoSingular = taxonomia?.activoSingular || 'Activo'
  const activoPlural = taxonomia?.activoPlural || 'Activos'
  const medidorUnidad = taxonomia?.medidorUnidad || 'hs'
  const permiteAlquileres = hasCapability?.('alquileres') === true

  const getPropiedadActivo = (activo) => {
    if (activo?.propiedad_activo) return activo.propiedad_activo
    if (activo?.cliente_id || activo?.cliente?.id) return 'cliente'
    return 'propio'
  }

  const getDestinoOperativo = (activo) => {
    if (activo?.destino_operativo) return activo.destino_operativo
    if (activo?.en_alquiler) return 'rental'
    if (getPropiedadActivo(activo) === 'cliente') return 'servicio_tecnico'
    return 'uso_interno'
  }

  const isRental = (activo) => {
    return (
      permiteAlquileres &&
      getPropiedadActivo(activo) === 'propio' &&
      getDestinoOperativo(activo) === 'rental'
    )
  }

  const isMovilidad = (activo) => {
    const tipo = String(activo?.tipo || '').toLowerCase()

    return [
      'movilidad',
      'vehículo',
      'vehiculo',
      'auto',
      'camioneta',
      'camión',
      'camion',
    ].includes(tipo)
  }

  const activoTieneAlerta = (activo) => {
    const svc = calcServiceState(activo)

    return (
      activo.activa !== false &&
      (
        ['Fuera de servicio', 'Esperando repuesto', 'En taller'].includes(activo.estado_operativo) ||
        ['vencido', 'urgente'].includes(svc?.estado)
      )
    )
  }

  const alertas = useMemo(() => {
    if (!activos.length) return 0
    return activos.filter((activo) => activoTieneAlerta(activo)).length
  }, [activos])

  const activosFiltrados = useMemo(() => {
    let filtrados = [...activos]

    if (filtroTipo === 'Propio') {
      filtrados = filtrados.filter((activo) => {
        return getPropiedadActivo(activo) === 'propio' && !isRental(activo)
      })
    }

    if (filtroTipo === 'Cliente') {
      filtrados = filtrados.filter((activo) => getPropiedadActivo(activo) === 'cliente')
    }

    if (filtroTipo === 'Rental') {
      filtrados = filtrados.filter((activo) => isRental(activo))
    }

    if (filtroTipo === 'Movilidad') {
      filtrados = filtrados.filter((activo) => isMovilidad(activo))
    }

    if (filtroTipo === 'Alertas') {
      filtrados = filtrados.filter((activo) => activoTieneAlerta(activo))
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()

      filtrados = filtrados.filter((activo) => {
        return (
          (activo.nombre_unidad || '').toLowerCase().includes(q) ||
          (activo.nombre || '').toLowerCase().includes(q) ||
          (activo.interno || '').toLowerCase().includes(q) ||
          (activo.patente || '').toLowerCase().includes(q) ||
          (activo.numero_serie || '').toLowerCase().includes(q) ||
          (activo.chasis || '').toLowerCase().includes(q) ||
          (activo.marca || '').toLowerCase().includes(q) ||
          (activo.modelo || '').toLowerCase().includes(q) ||
          (activo.tipo || '').toLowerCase().includes(q) ||
          (activo.estado_operativo || '').toLowerCase().includes(q) ||
          (activo.cliente?.razon_social || '').toLowerCase().includes(q) ||
          (activo.cliente_nombre || '').toLowerCase().includes(q)
        )
      })
    }

    return filtrados
  }, [activos, searchQuery, filtroTipo, permiteAlquileres])

  const resumenActivos = useMemo(() => {
    const total = activos.length

    const propios = activos.filter((activo) => {
      return getPropiedadActivo(activo) === 'propio' && !isRental(activo)
    }).length

    const cliente = activos.filter((activo) => {
      return getPropiedadActivo(activo) === 'cliente'
    }).length

    const rental = activos.filter((activo) => isRental(activo)).length

    const movilidad = activos.filter((activo) => isMovilidad(activo)).length

    const sinServicio = activos.filter((activo) => {
      return ['Fuera de servicio', 'Esperando repuesto', 'En taller'].includes(activo.estado_operativo)
    }).length

    const operativos = activos.filter((activo) => {
      const estado = activo.estado_operativo || 'Operativo'
      return activo.activa !== false && estado === 'Operativo'
    }).length

    const promedioDisponibilidad = total
      ? Math.round(
          activos.reduce((sum, activo) => sum + Number(activo.score_disponibilidad || 0), 0) / total
        )
      : 0

    return {
      total,
      propios,
      cliente,
      rental,
      movilidad,
      sinServicio,
      operativos,
      promedioDisponibilidad,
    }
  }, [activos, permiteAlquileres])

  const selectedActivo = useMemo(() => {
    if (!selectedActivoId) return null
    return activos.find((activo) => String(activo.id) === String(selectedActivoId)) || null
  }, [activos, selectedActivoId])

  const getBadgeData = (activo) => {
    const propiedad = getPropiedadActivo(activo)

    if (isRental(activo)) {
      return {
        variant: 'info',
        label: 'RENTAL',
      }
    }

    if (propiedad === 'cliente') {
      return {
        variant: 'default',
        label: 'CLIENTE',
      }
    }

    if (isMovilidad(activo)) {
      return {
        variant: 'default',
        label: 'MOVILIDAD',
      }
    }

    return {
      variant: 'success',
      label: 'PROPIO',
    }
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="p-6 border-red-800 bg-red-900/20 text-red-400">
          <h2 className="font-bold mb-2">Error cargando {activoPlural.toLowerCase()}</h2>
          <p className="font-mono text-sm">{error}</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 border-b border-hm-border pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{activoPlural}</h1>
          <p className="text-sm text-hm-muted mt-1">
            Visión unificada de operación, titularidad, disponibilidad, mantenimiento y trazabilidad.
          </p>
        </div>

        <DataBadge type={activos.length > 0 ? 'real' : 'empty'} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-hm-surface2/70 border-hm-border/50 p-4">
          <div className="text-sm text-hm-muted uppercase font-mono tracking-widest">
            {activoPlural} totales
          </div>
          <div className="text-2xl font-bold text-hm-text">
            {resumenActivos.total}
          </div>
          <div className="mt-2">
            <DataBadge type={resumenActivos.total > 0 ? 'real' : 'empty'} />
          </div>
        </Card>

        <Card className="bg-hm-surface2/70 border-hm-border/50 p-4">
          <div className="text-sm text-hm-muted uppercase font-mono tracking-widest">
            Propios
          </div>
          <div className="text-2xl font-bold text-hm-text">
            {resumenActivos.propios}
          </div>
          <div className="mt-2">
            <DataBadge type="real" />
          </div>
        </Card>

        {permiteAlquileres ? (
          <Card className="bg-hm-surface2/70 border-hm-border/50 p-4">
            <div className="text-sm text-hm-muted uppercase font-mono tracking-widest">
              Alquileres
            </div>
            <div className="text-2xl font-bold text-hm-text">
              {resumenActivos.rental}
            </div>
            <div className="mt-2">
              <DataBadge type="real" />
            </div>
          </Card>
        ) : (
          <Card className="bg-hm-surface2/70 border-hm-border/50 p-4">
            <div className="text-sm text-hm-muted uppercase font-mono tracking-widest">
              De clientes
            </div>
            <div className="text-2xl font-bold text-hm-text">
              {resumenActivos.cliente}
            </div>
            <div className="mt-2">
              <DataBadge type="real" />
            </div>
          </Card>
        )}

        <Card className="bg-hm-surface2/70 border-hm-border/50 p-4">
          <div className="text-sm text-hm-muted uppercase font-mono tracking-widest">
            Movilidad
          </div>
          <div className="text-2xl font-bold text-hm-text">
            {resumenActivos.movilidad}
          </div>
          <div className="mt-2">
            <DataBadge type="real" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        <Card className="bg-hm-surface2/70 border-hm-border/50 p-4">
          <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest">
            Operativos
          </div>
          <div className="text-xl font-bold text-green-400">
            {resumenActivos.operativos}
          </div>
          <div className="mt-2">
            <DataBadge type="real" />
          </div>
        </Card>

        <Card className="bg-hm-surface2/70 border-hm-border/50 p-4">
          <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest">
            Disponibilidad promedio
          </div>
          <div className={`text-xl font-bold ${resumenActivos.promedioDisponibilidad < 80 ? 'text-red-400' : 'text-hm-accent'}`}>
            {resumenActivos.total > 0 ? `${resumenActivos.promedioDisponibilidad}%` : '—'}
          </div>
          <div className="mt-2">
            <DataBadge type={resumenActivos.total > 0 ? 'real' : 'empty'} />
          </div>
        </Card>

        <Card className="bg-hm-surface2/70 border-hm-border/50 p-4">
          <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest">
            {activoPlural} con alerta
          </div>
          <div className={`text-xl font-bold ${alertas > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {alertas}
          </div>
          <div className="mt-2">
            <DataBadge type="real" />
          </div>
        </Card>

        <Card className="bg-hm-surface2/70 border-hm-border/50 p-4">
          <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest">
            Sin servicio
          </div>
          <div className={`text-xl font-bold ${resumenActivos.sinServicio > 0 ? 'text-orange-400' : 'text-green-400'}`}>
            {resumenActivos.sinServicio}
          </div>
          <div className="mt-2">
            <DataBadge type="real" />
          </div>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-hm-surface2/20 p-4 rounded-lg border border-hm-border/50 mt-4">
        <div className="flex-1">
          <label className="text-[10px] font-mono text-hm-muted mb-1 block uppercase tracking-widest">
            Buscar
          </label>

          <Input
            placeholder={`Buscar por interno, nombre, marca, modelo, patente, serie, cliente o identificación del ${activoSingular.toLowerCase()}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="w-full sm:w-56">
          <label className="text-[10px] font-mono text-hm-muted mb-1 block uppercase tracking-widest">
            Filtrar por grupo
          </label>

          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="w-full bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent"
          >
            <option value="Todos">Todos ({activos.length})</option>
            <option value="Propio">Propios</option>
            <option value="Cliente">De clientes</option>
            {permiteAlquileres && (
              <option value="Rental">Alquileres</option>
            )}
            <option value="Movilidad">Movilidad</option>
            <option value="Alertas">Con alerta ({alertas})</option>
          </select>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-hm-border bg-hm-surface2/30 px-5 py-3.5">
          <div>
            <h2 className="text-sm font-bold">Registro de {activoPlural.toLowerCase()}</h2>
            <p className="mt-0.5 text-xs text-hm-muted">
              {activosFiltrados.length} resultado{activosFiltrados.length === 1 ? '' : 's'} según filtros actuales.
            </p>
          </div>

          <DataBadge type={activosFiltrados.length > 0 ? 'real' : 'empty'} />
        </div>

        <table className="w-full text-left">
          <thead className="bg-hm-surface2/50 border-b border-hm-border">
            <tr>
              <th className="p-4 font-mono text-[10px] text-hm-muted uppercase">
                {activoSingular}
              </th>
              <th className="p-4 font-mono text-[10px] text-hm-muted uppercase">
                Ubicación / Cliente
              </th>
              <th className="p-4 font-mono text-[10px] text-hm-muted uppercase text-center">
                Titularidad
              </th>
              <th className="p-4 font-mono text-[10px] text-hm-muted uppercase">
                Estado op.
              </th>
              <th className="p-4 font-mono text-[10px] text-hm-muted uppercase text-center">
                Salud / disp.
              </th>
              <th className="p-4 font-mono text-[10px] text-hm-muted uppercase">
                Mantenimiento
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              [1, 2, 3, 4, 5].map((i) => <SkeletonRow key={i} />)
            ) : activosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    title={`No se encontraron ${activoPlural.toLowerCase()}`}
                    description="Probá limpiar filtros o revisar si existen activos cargados en la organización."
                  />
                </td>
              </tr>
            ) : (
              activosFiltrados.map((activo) => {
                const svc = calcServiceState(activo)
                const disp = activo.score_disponibilidad ?? 100
                const estadoCls =
                  ESTADO_OP_COLOR[activo.estado_operativo] ||
                  ESTADO_OP_COLOR.Operativo

                const badge = getBadgeData(activo)

                return (
                  <tr
                    key={activo.id}
                    onClick={() => setSelectedActivoId(activo.id)}
                    className="border-b border-hm-border/30 hover:bg-hm-surface2/40 cursor-pointer transition-colors group"
                  >
                    <td className="p-4">
                      <div className="font-bold text-sm text-hm-text group-hover:text-hm-accent transition-colors">
                        {activo.interno ? `[${activo.interno}] ` : ''}
                        {activo.nombre_unidad || activo.nombre || activoSingular}
                      </div>

                      <div className="text-xs text-hm-muted mt-0.5">
                        {[activo.tipo, activo.marca, activo.modelo, activo.anio]
                          .filter(Boolean)
                          .join(' · ') || 'Sin datos técnicos cargados'}
                      </div>

                      <div className="mt-1 flex flex-wrap gap-2 text-[10px] font-mono text-hm-muted">
                        {activo.patente && <span>Patente: {activo.patente}</span>}
                        {activo.numero_serie && <span>Serie: {activo.numero_serie}</span>}
                        {activo.chasis && <span>Chasis: {activo.chasis}</span>}
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="text-sm font-medium">
                        {activo.cliente?.razon_social ||
                          activo.cliente_nombre ||
                          'Base / Operación'}
                      </div>

                      <div className="text-[10px] text-hm-muted mt-0.5">
                        {activo.ubicacion || getDestinoOperativo(activo).replace('_', ' ')}
                      </div>
                    </td>

                    <td className="p-4 text-center">
                      <Badge variant={badge.variant}>
                        {badge.label}
                      </Badge>
                    </td>

                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-mono font-bold border ${estadoCls}`}>
                        {activo.estado_operativo || 'Operativo'}
                      </span>
                    </td>

                    <td className="p-4 text-center">
                      <div
                        className={`text-sm font-black ${
                          disp < 70
                            ? 'text-red-400'
                            : disp < 90
                              ? 'text-yellow-400'
                              : 'text-green-400'
                        }`}
                      >
                        {disp}%
                      </div>
                    </td>

                    <td className="p-4">
                      {svc ? (
                        <div>
                          <div
                            className={`text-xs font-mono font-bold ${
                              svc.estado === 'vencido' || svc.estado === 'urgente'
                                ? 'text-red-400'
                                : svc.estado === 'proximo'
                                  ? 'text-yellow-400'
                                  : 'text-green-400'
                            }`}
                          >
                            {svc.estado.toUpperCase()}
                          </div>

                          <div className="text-[10px] text-hm-muted">
                            {svc.restantes !== undefined && svc.restantes !== null
                              ? `${Math.abs(Number(svc.restantes)).toFixed(0)}${medidorUnidad} ${
                                  svc.estado === 'vencido' ? 'atrasado' : 'restantes'
                                }`
                              : 'Sin umbral cargado'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[10px] text-hm-muted font-mono italic">
                          Sin configurar
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </Card>

      {selectedActivo && (
        <FichaActivo
          isOpen={!!selectedActivo}
          onClose={() => setSelectedActivoId(null)}
          activo={selectedActivo}
          ots={selectedActivo?.ots || []}
          contratos={selectedActivo?.contratos || []}
          stats={selectedActivo?.stats || {}}
          orgId={orgId}
        />
      )}
    </div>
  )
}