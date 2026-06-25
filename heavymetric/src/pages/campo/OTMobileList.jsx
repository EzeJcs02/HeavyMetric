import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useRubro } from '../../context/RubroContext'
import { getCache, fetchAndCacheAssignments } from '../../lib/syncQueue'
import {
  FileText,
  MapPin,
  Clock,
  Search,
  ChevronRight,
  Wifi,
  WifiOff,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react'
import { format } from 'date-fns'

export default function OTMobileList() {
  const { user } = useAuth()
  const { taxonomia } = useRubro()
  const { isOffline } = useOutletContext()
  const navigate = useNavigate()

  const [ots, setOts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('todas')

  const activoSingular = taxonomia?.activoSingular || 'Activo'
  const ordenTrabajo = taxonomia?.ordenTrabajo || 'Orden de trabajo'
  const ordenTrabajoPlural = taxonomia?.ordenTrabajoPlural || 'Órdenes de trabajo'

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOffline, user])

  const loadData = async () => {
    if (!user) return

    setLoading(true)

    try {
      if (!isOffline) {
        await fetchAndCacheAssignments(user.id)
      }

      const localOts = await getCache('my_ots')

      if (localOts) {
        setOts(localOts)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getActivoNombre = (ot) => {
    return (
      ot?.maquinas?.nombre_unidad ||
      ot?.activo?.nombre_unidad ||
      ot?.activo_nombre ||
      `${activoSingular} sin identificar`
    )
  }

  const getActivoTipo = (ot) => {
    return (
      ot?.maquinas?.tipo ||
      ot?.activo?.tipo ||
      ot?.activo_tipo ||
      activoSingular
    )
  }

  const getClienteNombre = (ot) => {
    return (
      ot?.clientes?.razon_social ||
      ot?.cliente?.razon_social ||
      ot?.cliente_nombre ||
      'Cliente no informado'
    )
  }

  const getCriticidad = (ot) => {
    return (
      ot?.criticidad ||
      ot?.metadata_iso?.criticidad ||
      ot?.metadata?.criticidad ||
      'media'
    )
  }

  const getTipoIntervencion = (ot) => {
    return (
      ot?.tipo_intervencion ||
      ot?.metadata_iso?.tipo_intervencion ||
      ot?.metadata?.tipo_intervencion ||
      'Intervención técnica'
    )
  }

  const getSyncStatus = (ot) => {
    if (ot?.sync_error) return 'error'
    if (ot?.estado_sync) return ot.estado_sync
    if (ot?.iso_cierre_campo && ot?.estado === 'completada') return 'pendiente_sync'
    return isOffline ? 'offline' : 'sync_ok'
  }

  const filteredOts = useMemo(() => {
    const q = search.toLowerCase().trim()

    return ots.filter((ot) => {
      const matchSearch =
        !q ||
        ot.numero_ot?.toString().includes(q) ||
        getActivoNombre(ot).toLowerCase().includes(q) ||
        getActivoTipo(ot).toLowerCase().includes(q) ||
        getClienteNombre(ot).toLowerCase().includes(q)

      const matchStatus =
        statusFilter === 'todas' ||
        String(ot.estado || '').toLowerCase() === statusFilter

      return matchSearch && matchStatus
    })
  }, [ots, search, statusFilter, isOffline])

  const counters = useMemo(() => {
    return {
      total: ots.length,
      progreso: ots.filter((ot) => ot.estado === 'en_progreso').length,
      pausadas: ots.filter((ot) => ot.estado === 'pausada').length,
      pendientes: ots.filter((ot) => !['completada', 'facturada', 'cancelada'].includes(ot.estado)).length,
    }
  }, [ots])

  const getStatusColor = (estado) => {
    switch (estado) {
      case 'borrador':
        return 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30'
      case 'en_progreso':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      case 'pausada':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'completada':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      case 'cancelada':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      default:
        return 'bg-neutral-800 text-neutral-400 border-white/10'
    }
  }

  const getCriticidadColor = (criticidad) => {
    switch (criticidad) {
      case 'critica':
        return 'bg-red-500/15 text-red-400 border-red-500/30'
      case 'alta':
        return 'bg-orange-500/15 text-orange-400 border-orange-500/30'
      case 'media':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    }
  }

  const getSyncBadge = (status) => {
    if (status === 'error') {
      return {
        label: 'SYNC ERROR',
        cls: 'bg-red-500/15 text-red-400 border-red-500/30',
        icon: AlertTriangle,
      }
    }

    if (status === 'pendiente_sync' || status === 'offline_pendiente') {
      return {
        label: 'PENDIENTE SYNC',
        cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
        icon: WifiOff,
      }
    }

    if (status === 'offline') {
      return {
        label: 'OFFLINE',
        cls: 'bg-neutral-700/40 text-neutral-300 border-white/10',
        icon: WifiOff,
      }
    }

    return {
      label: 'SYNC OK',
      cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      icon: Wifi,
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="bg-neutral-950 border border-white/10 rounded-2xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-white text-lg font-semibold leading-tight">
              {ordenTrabajoPlural}
            </h1>
            <p className="text-neutral-500 text-xs mt-1">
              Trabajo de campo offline-first con trazabilidad ISO.
            </p>
          </div>

          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold uppercase ${
              isOffline
                ? 'bg-red-500/10 text-red-400 border-red-500/30'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}
          >
            {isOffline ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
            {isOffline ? 'Offline' : 'Online'}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="bg-neutral-900/80 border border-white/5 rounded-xl p-3">
            <div className="text-white font-bold text-lg">{counters.pendientes}</div>
            <div className="text-[10px] text-neutral-500 uppercase tracking-wider">
              Pendientes
            </div>
          </div>

          <div className="bg-neutral-900/80 border border-white/5 rounded-xl p-3">
            <div className="text-orange-400 font-bold text-lg">{counters.progreso}</div>
            <div className="text-[10px] text-neutral-500 uppercase tracking-wider">
              En curso
            </div>
          </div>

          <div className="bg-neutral-900/80 border border-white/5 rounded-xl p-3">
            <div className="text-yellow-400 font-bold text-lg">{counters.pausadas}</div>
            <div className="text-[10px] text-neutral-500 uppercase tracking-wider">
              Pausadas
            </div>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
        <input
          type="text"
          placeholder={`Buscar ${ordenTrabajo.toLowerCase()}, ${activoSingular.toLowerCase()} o cliente...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-neutral-950 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all placeholder-neutral-600"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {[
          { id: 'todas', label: 'Todas' },
          { id: 'en_progreso', label: 'En curso' },
          { id: 'pausada', label: 'Pausadas' },
          { id: 'borrador', label: 'Pendientes' },
        ].map((filter) => (
          <button
            key={filter.id}
            onClick={() => setStatusFilter(filter.id)}
            className={`px-3 py-2 rounded-xl border text-xs font-bold whitespace-nowrap transition-colors ${
              statusFilter === filter.id
                ? 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                : 'bg-neutral-950 text-neutral-500 border-white/10 hover:text-neutral-300'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-10 text-neutral-500 animate-pulse text-sm">
            Cargando {ordenTrabajoPlural.toLowerCase()} asignadas...
          </div>
        ) : filteredOts.length === 0 ? (
          <div className="text-center py-10 text-neutral-500 text-sm bg-neutral-900/50 border border-white/5 rounded-2xl">
            No tenés {ordenTrabajoPlural.toLowerCase()} pendientes.
          </div>
        ) : (
          filteredOts.map((ot) => {
            const syncBadge = getSyncBadge(getSyncStatus(ot))
            const SyncIcon = syncBadge.icon
            const criticidad = getCriticidad(ot)

            return (
              <div
                key={ot.id}
                onClick={() => navigate(`/campo/ot/${ot.id}`)}
                className="bg-neutral-900 border border-white/5 rounded-2xl p-4 active:scale-[0.98] transition-transform cursor-pointer shadow-sm relative overflow-hidden"
              >
                <div className={`absolute top-0 right-0 px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-bl-xl border-l border-b ${getStatusColor(ot.estado)}`}>
                  {String(ot.estado || 'pendiente').replace('_', ' ')}
                </div>

                <div className="flex items-start gap-3 mt-2">
                  <div className="p-2 bg-neutral-800 rounded-lg text-neutral-400">
                    <FileText className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-white font-medium text-lg leading-tight">
                        {ordenTrabajo} #{ot.numero_ot}
                      </h3>
                    </div>

                    <p className="text-orange-400 font-medium text-sm mt-0.5 truncate">
                      {getActivoNombre(ot)}
                    </p>

                    <p className="text-neutral-500 text-xs mt-0.5 truncate">
                      {getActivoTipo(ot)} · {getTipoIntervencion(ot)}
                    </p>

                    <div className="flex gap-2 flex-wrap mt-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold uppercase ${getCriticidadColor(criticidad)}`}>
                        <ShieldCheck className="w-3 h-3" />
                        {criticidad}
                      </span>

                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold uppercase ${syncBadge.cls}`}>
                        <SyncIcon className="w-3 h-3" />
                        {syncBadge.label}
                      </span>
                    </div>

                    <div className="mt-3 space-y-1.5">
                      <div className="flex items-center gap-2 text-xs text-neutral-400">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="truncate">{getClienteNombre(ot)}</span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-neutral-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          Ingreso:{' '}
                          {ot.fecha_ingreso
                            ? format(new Date(`${ot.fecha_ingreso}T00:00:00`), 'dd/MM/yyyy')
                            : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="self-center pl-2 text-neutral-500">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}