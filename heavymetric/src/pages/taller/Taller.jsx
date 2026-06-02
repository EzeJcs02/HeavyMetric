import { useState, useMemo, useEffect } from 'react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'
import { useMaquinas } from '../../hooks/useMaquinas'
import { useClientes } from '../../hooks/useClientes'
import { useTaller } from '../../hooks/useTaller'
import { useFinanzas } from '../../hooks/useFinanzas'
import { useDolar } from '../../context/DolarContext'
import { useRubro } from '../../context/RubroContext'
import { detectFallasRepetidas, detectOTNoRentable } from '../../lib/aiEngines'
import { SilentBadge } from '../../components/ai/SilentBadge'
import MaquinaRow from '../../components/modulos/MaquinaRow'
import ModalFinalizarOT from '../../components/modulos/taller/ModalFinalizarOT'
import ModalNuevaOT from '../../components/modulos/taller/ModalNuevaOT'
import ModalMaquina from '../../components/modulos/maquinas/ModalMaquina'
import Pagination from '../../components/ui/Pagination'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import FichaMaquina from '../../components/modulos/maquinas/FichaMaquina'
import FichaOT from '../../components/modulos/taller/FichaOT'
import Input from '../../components/ui/Input'
import ModalConfirm from '../../components/ui/ModalConfirm'

const PER_PAGE = 10

const ESTADOS_OT_CERRADOS = ['completada', 'facturada', 'cerrada', 'cancelada']

const SkeletonRow = () => (
  <tr className="border-b border-hm-border">
    <td className="p-4"><div className="h-4 bg-hm-surface2 rounded animate-pulse w-3/4"></div></td>
    <td className="p-4"><div className="h-4 bg-hm-surface2 rounded animate-pulse w-1/2"></div></td>
    <td className="p-4"><div className="h-4 bg-hm-surface2 rounded animate-pulse w-1/2"></div></td>
    <td className="p-4"><div className="h-4 bg-hm-surface2 rounded animate-pulse w-3/4"></div></td>
    <td className="p-4"><div className="h-4 bg-hm-surface2 rounded animate-pulse w-full"></div></td>
    <td className="p-4"></td>
  </tr>
)

const normalizarTexto = (value) => String(value || '').toLowerCase().trim()

const estadoOperativoEnTaller = (estado) => {
  return ['Fuera de servicio', 'En taller', 'Esperando repuesto'].includes(estado)
}

const getTotalOT = (ot) => {
  return Number(ot?.total_repuestos_usd || 0) + Number(ot?.total_mano_obra_usd || 0)
}

const getEstadoBadgeVariant = (estado) => {
  if (estado === 'en_progreso') return 'ventas'
  if (estado === 'completada') return 'info'
  if (estado === 'cancelada') return 'danger'
  if (estado === 'facturada') return 'success'
  return 'default'
}

export default function Taller() {
  const [activeTab, setActiveTab] = useState('flota')
  const [selectedOT, setSelectedOT] = useState(null)
  const [otACancelar, setOtACancelar] = useState(null)
  const [cancelando, setCancelando] = useState(false)
  const [facturandoOT, setFacturandoOT] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isNuevaOTOpen, setIsNuevaOTOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('todos')
  const [isFichaOpen, setIsFichaOpen] = useState(false)
  const [selectedMaquinaId, setSelectedMaquinaId] = useState(null)
  const [isMaquinaModalOpen, setIsMaquinaModalOpen] = useState(false)
  const [editingMaquina, setEditingMaquina] = useState(null)
  const [isFichaOTOpen, setIsFichaOTOpen] = useState(false)
  const [otToView, setOtToView] = useState(null)
  const [pageMaq, setPageMaq] = useState(1)
  const [pageOT, setPageOT] = useState(1)
  const [generandoPdf, setGenerandoPdf] = useState(null)

  const { formatUSD } = useDolar()
  const { taxonomia, hasCapability } = useRubro()

  const activoSingular = taxonomia?.activoSingular || 'Activo'
  const activoPlural = taxonomia?.activoPlural || 'Activos'
  const ordenTrabajo = taxonomia?.ordenTrabajo || 'Orden de Trabajo'
  const ordenTrabajoPlural = taxonomia?.ordenTrabajoPlural || 'Órdenes de Trabajo'
  const medidor = taxonomia?.medidor || 'Horas/Km'
  const moduloTaller = taxonomia?.moduloTaller || 'Taller'
  const permiteAlquileres = hasCapability?.('alquileres') === true

  const {
    maquinas,
    loading: loadingMaq,
    error: errorMaq,
    createMaquina,
    updateMaquina,
  } = useMaquinas()

  const { clientes } = useClientes()

  const {
    ots,
    loading: loadingOT,
    error: errorOT,
    finalizarOT,
    createOT,
    cancelarOT,
  } = useTaller()

  const { crearFacturaDesdeOT } = useFinanzas()

  useEffect(() => {
    setPageMaq(1)
  }, [searchQuery, filterStatus])

  useEffect(() => {
    setPageOT(1)
  }, [searchQuery])

  useEffect(() => {
    if (!permiteAlquileres && filterStatus === 'alquiladas') {
      setFilterStatus('todos')
    }
  }, [permiteAlquileres, filterStatus])

  const crearEventoISO = ({
    accion,
    entidad = 'orden_trabajo',
    entidadId = null,
    estadoAnterior = null,
    estadoNuevo = null,
    responsable = null,
    observaciones = '',
    evidencias = [],
    metadata = {},
  }) => ({
    accion,
    entidad,
    entidad_id: entidadId,
    responsable,
    estado_anterior: estadoAnterior,
    estado_nuevo: estadoNuevo,
    fecha_hora: new Date().toISOString(),
    observaciones,
    evidencias,
    origen: 'src/pages/taller/Taller.jsx',
    metadata,
  })

  const registrarEventoISO = async (evento) => {
    try {
      const { error } = await supabase.from('auditoria_eventos').insert([evento])

      if (error) {
        console.warn('[HeavyMetric][ISO] Evento preparado pero no persistido:', error.message)
      }
    } catch (error) {
      console.warn('[HeavyMetric][ISO] Auditoría no disponible:', error.message)
    }
  }

  const activoFallasMap = useMemo(() => {
    const map = {}
    const ids = [...new Set(ots.map((o) => o.activo_id).filter(Boolean))]

    ids.forEach((id) => {
      const resultado = detectFallasRepetidas(ots, id)
      if (resultado) map[id] = resultado
    })

    return map
  }, [ots])

  const otNoRentableMap = useMemo(() => {
    const map = {}

    ots.forEach((ot) => {
      const resultado = detectOTNoRentable(ot)
      if (resultado) map[ot.id] = resultado
    })

    return map
  }, [ots])

  const maquinasFiltradas = useMemo(() => {
    const query = normalizarTexto(searchQuery)

    return maquinas.filter((maquina) => {
      const matchSearch =
        !query ||
        normalizarTexto(maquina.nombre_unidad).includes(query) ||
        normalizarTexto(maquina.marca).includes(query) ||
        normalizarTexto(maquina.modelo).includes(query) ||
        normalizarTexto(maquina.cliente?.razon_social).includes(query)

      const matchStatus =
        filterStatus === 'todos' ||
        (
          filterStatus === 'disponibles' &&
          (!permiteAlquileres || !maquina.en_alquiler) &&
          !maquina.en_taller
        ) ||
        (
          permiteAlquileres &&
          filterStatus === 'alquiladas' &&
          maquina.en_alquiler
        ) ||
        (
          filterStatus === 'taller' &&
          maquina.en_taller
        )

      return matchSearch && matchStatus
    })
  }, [maquinas, searchQuery, filterStatus, permiteAlquileres])

  const maquinasPaginadas = useMemo(
    () => maquinasFiltradas.slice((pageMaq - 1) * PER_PAGE, pageMaq * PER_PAGE),
    [maquinasFiltradas, pageMaq]
  )

  const otsFiltradas = useMemo(() => {
    const query = normalizarTexto(searchQuery)

    return ots.filter((ot) => {
      return (
        !query ||
        String(ot.numero_ot || '').includes(query) ||
        normalizarTexto(ot.maquina?.nombre_unidad).includes(query) ||
        normalizarTexto(ot.cliente?.razon_social).includes(query)
      )
    })
  }, [ots, searchQuery])

  const otsPaginadas = useMemo(
    () => otsFiltradas.slice((pageOT - 1) * PER_PAGE, pageOT * PER_PAGE),
    [otsFiltradas, pageOT]
  )

  const filtrosActivos = useMemo(() => {
    const filtros = [
      { id: 'todos', label: 'TODOS' },
      { id: 'disponibles', label: 'DISPONIBLES' },
    ]

    if (permiteAlquileres) {
      filtros.push({ id: 'alquiladas', label: 'ALQUILADAS' })
    }

    filtros.push({ id: 'taller', label: moduloTaller.toUpperCase() })

    return filtros
  }, [permiteAlquileres, moduloTaller])

  const handleOpenFicha = (id) => {
    setSelectedMaquinaId(id)
    setIsFichaOpen(true)
  }

  const handleOpenModal = (ot, event) => {
    event.stopPropagation()
    setSelectedOT(ot)
    setIsModalOpen(true)
  }

  const handleOpenFichaOT = (ot) => {
    setOtToView(ot)
    setIsFichaOTOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedOT(null)
  }

  const handleGenerarOTPDF = async (ot) => {
    setGenerandoPdf(`ot-${ot.id}`)

    try {
      const { generateOTPDF } = await import('../../lib/pdfGenerator')
      generateOTPDF(ot)
    } catch (err) {
      console.error(`Error generando PDF de ${ordenTrabajo}:`, err)
      toast.error(`No se pudo generar el PDF de ${ordenTrabajo}`)
    } finally {
      setGenerandoPdf(null)
    }
  }

  const handleGenerarServicioPDF = async (ot) => {
    setGenerandoPdf(`servicio-${ot.id}`)

    try {
      const { generateServicioPDF } = await import('../../lib/pdfGenerator')
      generateServicioPDF(ot)
    } catch (err) {
      console.error('Error generando parte de servicio:', err)
      toast.error('No se pudo generar el parte de servicio')
    } finally {
      setGenerandoPdf(null)
    }
  }

  const handleConfirmFinalizar = async (payload) => {
    try {
      const { repuestosUtilizados, ...otPayload } = payload

      if (repuestosUtilizados?.length > 0) {
        await supabase
          .from('ot_repuestos')
          .delete()
          .eq('orden_trabajo_id', selectedOT.id)

        const rows = repuestosUtilizados.map((repuesto) => ({
          orden_trabajo_id: selectedOT.id,
          repuesto_id: repuesto.repuesto_id || null,
          nombre: repuesto.nombre,
          cantidad: Number(repuesto.cantidad),
          precio_unitario_usd: Number(repuesto.precio_unitario_usd),
          subtotal_usd: Number(repuesto.cantidad) * Number(repuesto.precio_unitario_usd),
        }))

        await supabase.from('ot_repuestos').insert(rows)

        const totalRepuestos = rows.reduce((total, repuesto) => {
          return total + repuesto.subtotal_usd
        }, 0)

        await supabase
          .from('ordenes_trabajo')
          .update({ total_repuestos_usd: totalRepuestos })
          .eq('id', selectedOT.id)
      }

      await finalizarOT(selectedOT.id, otPayload)

      await registrarEventoISO(
        crearEventoISO({
          accion: 'finalizar_ot',
          entidadId: selectedOT.id,
          estadoAnterior: selectedOT.estado || null,
          estadoNuevo: 'completada',
          responsable: otPayload.responsable || otPayload.tecnico || null,
          observaciones: otPayload.observaciones || '',
          evidencias: otPayload.evidencias || otPayload.fotos || [],
          metadata: {
            numero_ot: selectedOT.numero_ot,
            cliente_id: selectedOT.cliente_id || selectedOT.cliente?.id || null,
            activo_id: selectedOT.activo_id || selectedOT.maquina_id || null,
            repuestos_utilizados: repuestosUtilizados || [],
            modulo: moduloTaller,
          },
        })
      )

      toast.success(`${ordenTrabajo} #${selectedOT.numero_ot} finalizada con éxito`)
      handleCloseModal()
    } catch (err) {
      toast.error(`Error al finalizar ${ordenTrabajo.toLowerCase()}: ${err.message}`)
    }
  }

  const handleConfirmarCancelar = async () => {
    if (!otACancelar) return

    setCancelando(true)

    try {
      await cancelarOT(otACancelar.id, otACancelar.maquina_id)

      await registrarEventoISO(
        crearEventoISO({
          accion: 'cancelar_ot',
          entidadId: otACancelar.id,
          estadoAnterior: otACancelar.estado || null,
          estadoNuevo: 'cancelada',
          observaciones: `Cancelación manual desde ${moduloTaller}`,
          metadata: {
            numero_ot: otACancelar.numero_ot,
            activo_id: otACancelar.activo_id || otACancelar.maquina_id || null,
            cliente_id: otACancelar.cliente_id || otACancelar.cliente?.id || null,
          },
        })
      )

      toast.success(`${ordenTrabajo} #${otACancelar.numero_ot} cancelada`)
      setOtACancelar(null)
    } catch (err) {
      toast.error(`Error al cancelar ${ordenTrabajo.toLowerCase()}: ${err.message}`)
    } finally {
      setCancelando(false)
    }
  }

  const handleFacturarOT = async (ot) => {
    setFacturandoOT(ot.id)

    try {
      await crearFacturaDesdeOT(ot.id)

      await registrarEventoISO(
        crearEventoISO({
          accion: 'facturar_ot',
          entidadId: ot.id,
          estadoAnterior: ot.estado || null,
          estadoNuevo: 'facturada',
          observaciones: `${ordenTrabajo} facturada desde ${moduloTaller}`,
          metadata: {
            numero_ot: ot.numero_ot,
            activo_id: ot.activo_id || ot.maquina_id || null,
            cliente_id: ot.cliente_id || ot.cliente?.id || null,
            total_usd: getTotalOT(ot),
          },
        })
      )

      toast.success(`${ordenTrabajo} #${ot.numero_ot} facturada correctamente`)
    } catch (err) {
      toast.error('Error al facturar: ' + err.message)
    } finally {
      setFacturandoOT(null)
    }
  }

  const handleCreateOT = async (payload) => {
    try {
      await createOT(payload)

      await registrarEventoISO(
        crearEventoISO({
          accion: 'crear_ot',
          estadoAnterior: null,
          estadoNuevo: payload.estado || 'abierta',
          responsable: payload.responsable || payload.tecnico || null,
          observaciones: payload.observaciones || '',
          metadata: {
            activo_id: payload.activo_id || payload.maquina_id || null,
            cliente_id: payload.cliente_id || null,
            origen_operativo: moduloTaller,
          },
        })
      )

      toast.success(`${ordenTrabajo} creada correctamente`)
      setIsNuevaOTOpen(false)
      setActiveTab('ots')
    } catch (err) {
      toast.error(`Error al crear ${ordenTrabajo.toLowerCase()}: ${err.message}`)
    }
  }

  const handleUpdateEstadoOT = async (id, nuevoEstado) => {
    try {
      const estadoAnterior = otToView?.estado || null

      await supabase
        .from('ordenes_trabajo')
        .update({ estado: nuevoEstado })
        .eq('id', id)

      await registrarEventoISO(
        crearEventoISO({
          accion: 'cambio_estado_ot',
          entidadId: id,
          estadoAnterior,
          estadoNuevo: nuevoEstado,
          observaciones: `Cambio manual de estado desde ficha de ${ordenTrabajo}`,
          metadata: {
            numero_ot: otToView?.numero_ot || null,
            activo_id: otToView?.activo_id || otToView?.maquina_id || null,
            cliente_id: otToView?.cliente_id || otToView?.cliente?.id || null,
          },
        })
      )

      toast.success('Estado actualizado')
      setOtToView((prev) => ({ ...prev, estado: nuevoEstado }))
    } catch (err) {
      toast.error('Error al actualizar: ' + err.message)
    }
  }

  const handleExportOTs = () => {
    if (!otsFiltradas.length) {
      toast.error(`No hay ${ordenTrabajoPlural.toLowerCase()} para exportar`)
      return
    }

    const rows = otsFiltradas.map((ot) => ({
      'NRO OT': `#${ot.numero_ot}`,
      [activoSingular.toUpperCase()]: ot.maquina?.nombre_unidad || '—',
      CLIENTE: ot.cliente?.razon_social || '—',
      INGRESO: ot.fecha_ingreso || '—',
      ESTADO: ot.estado || '—',
      'REPUESTOS USD': Number(ot.total_repuestos_usd || 0),
      'MANO OBRA USD': Number(ot.total_mano_obra_usd || 0),
      'TOTAL USD': getTotalOT(ot),
      NPS: ot.nps_score || '—',
    }))

    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(workbook, worksheet, 'OTs')
    XLSX.writeFile(workbook, `OTs_${new Date().toISOString().slice(0, 10)}.xlsx`)

    toast.success('Excel generado')
  }

  if (errorMaq || errorOT) {
    return (
      <div className="p-6">
        <Card className="p-6 border-red-800 bg-red-900/20 text-red-400">
          <h2 className="font-bold mb-2">Error cargando módulo</h2>
          <p className="font-mono text-sm">{errorMaq || errorOT}</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-hm-border pb-4">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('flota')}
            className={`text-xl font-bold transition-colors uppercase ${
              activeTab === 'flota'
                ? 'text-white'
                : 'text-hm-muted hover:text-white'
            }`}
          >
            {activoPlural}
          </button>

          <button
            onClick={() => setActiveTab('ots')}
            className={`text-xl font-bold transition-colors uppercase ${
              activeTab === 'ots'
                ? 'text-white'
                : 'text-hm-muted hover:text-white'
            }`}
          >
            {ordenTrabajoPlural}
          </button>
        </div>

        <div className="flex gap-2">
          {activeTab === 'flota' && (
            <Button
              variant="outline"
              onClick={() => {
                setEditingMaquina(null)
                setIsMaquinaModalOpen(true)
              }}
            >
              + {activoSingular.toUpperCase()}
            </Button>
          )}

          {activeTab === 'ots' && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportOTs}>
                EXPORTAR EXCEL
              </Button>

              <Button variant="primary" onClick={() => setIsNuevaOTOpen(true)}>
                NUEVA {ordenTrabajo.toUpperCase()}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="p-3 border-l-2 border-l-green-500">
          <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-1">
            Uptime {activoPlural}
          </div>
          <div className="text-lg font-bold">
            {maquinas.length > 0
              ? Math.round(
                  maquinas.reduce((acc, maquina) => {
                    return acc + (maquina.score_disponibilidad || 100)
                  }, 0) / maquinas.length
                )
              : 100}
            %
          </div>
        </Card>

        <Card className="p-3 border-l-2 border-l-orange-500">
          <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-1">
            {activoPlural} Detenidos
          </div>
          <div className="text-lg font-bold">
            {maquinas.filter((maquina) => estadoOperativoEnTaller(maquina.estado_operativo)).length}
          </div>
        </Card>

        <Card className="p-3 border-l-2 border-l-blue-500">
          <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-1">
            {ordenTrabajoPlural} Abiertas
          </div>
          <div className="text-lg font-bold">
            {ots.filter((ot) => !ESTADOS_OT_CERRADOS.includes(ot.estado)).length}
          </div>
        </Card>

        <Card className="p-3 bg-hm-surface2/30">
          <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-1">
            MTTR Promedio
          </div>
          <div className="text-lg font-bold">
            2.4 <span className="text-[10px] text-green-400 font-normal">días</span>
          </div>
        </Card>

        <Card className="p-3 bg-hm-surface2/30">
          <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-1">
            First Time Fix
          </div>
          <div className="text-lg font-bold">87%</div>
        </Card>

        <Card className="p-3 bg-hm-surface2/30">
          <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-1">
            Costo Promedio {ordenTrabajo}
          </div>
          <div className="text-lg font-bold text-hm-accent">
            {formatUSD(
              ots.length
                ? ots.reduce((acc, ot) => acc + getTotalOT(ot), 0) / ots.length
                : 0
            )}
          </div>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-end bg-hm-surface2/20 p-4 rounded-lg border border-hm-border/50">
        <div className="flex-1 w-full">
          <label className="text-[10px] font-mono text-hm-muted mb-1 block uppercase tracking-widest">
            Buscador Global
          </label>

          <Input
            type="text"
            placeholder={
              activeTab === 'flota'
                ? `Buscar por ${activoSingular.toLowerCase()}, marca o cliente...`
                : `Buscar por Nro OT, ${activoSingular.toLowerCase()} o cliente...`
            }
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>

        {activeTab === 'flota' && (
          <div className="flex gap-2 flex-wrap">
            {filtrosActivos.map((filtro) => (
              <button
                key={filtro.id}
                onClick={() => setFilterStatus(filtro.id)}
                className={`px-3 py-2 rounded text-[10px] font-bold tracking-tighter transition-all border ${
                  filterStatus === filtro.id
                    ? 'bg-hm-accent border-hm-accent text-white'
                    : 'bg-hm-surface border-hm-border text-hm-muted hover:border-hm-accent/50'
                }`}
              >
                {filtro.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {activeTab === 'flota' ? (
        <Card className="overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-hm-surface2/50 border-b border-hm-border">
              <tr>
                <th className="p-4 font-mono text-xs text-hm-muted uppercase">
                  {activoSingular}
                </th>
                <th className="p-4 font-mono text-xs text-hm-muted uppercase">
                  Tipo / Modelo
                </th>
                <th className="p-4 font-mono text-xs text-hm-muted uppercase">
                  Identificación
                </th>
                <th className="p-4 font-mono text-xs text-hm-muted uppercase">
                  Cliente
                </th>
                <th className="p-4 font-mono text-xs text-hm-muted uppercase">
                  {medidor}
                </th>
                <th className="p-4"></th>
              </tr>
            </thead>

            <tbody>
              {loadingMaq ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : maquinasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-hm-muted font-mono text-sm">
                    No se encontraron {activoPlural.toLowerCase()} con los filtros actuales.
                  </td>
                </tr>
              ) : (
                maquinasPaginadas.map((maquina) => (
                  <MaquinaRow
                    key={maquina.id}
                    maquina={maquina}
                    onClickDetalle={() => handleOpenFicha(maquina.id)}
                    onEdit={() => {
                      setEditingMaquina(maquina)
                      setIsMaquinaModalOpen(true)
                    }}
                  />
                ))
              )}
            </tbody>
          </table>

          <Pagination
            total={maquinasFiltradas.length}
            page={pageMaq}
            perPage={PER_PAGE}
            onPageChange={setPageMaq}
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-hm-surface2/50 border-b border-hm-border">
              <tr>
                <th className="p-4 font-mono text-xs text-hm-muted uppercase">
                  Nro
                </th>
                <th className="p-4 font-mono text-xs text-hm-muted uppercase">
                  {activoSingular}
                </th>
                <th className="p-4 font-mono text-xs text-hm-muted uppercase">
                  Cliente
                </th>
                <th className="p-4 font-mono text-xs text-hm-muted uppercase">
                  Ingreso
                </th>
                <th className="p-4 font-mono text-xs text-hm-muted uppercase">
                  Estado
                </th>
                <th className="p-4 font-mono text-xs text-hm-muted uppercase">
                  Total
                </th>
                <th className="p-4"></th>
              </tr>
            </thead>

            <tbody>
              {loadingOT ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : otsFiltradas.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-hm-muted font-mono text-sm">
                    No se encontraron {ordenTrabajoPlural.toLowerCase()}.
                  </td>
                </tr>
              ) : (
                otsPaginadas.map((ot) => (
                  <tr
                    key={ot.id}
                    className="border-b border-hm-border hover:bg-hm-surface2/30 transition-colors cursor-pointer"
                    onClick={() => handleOpenFichaOT(ot)}
                  >
                    <td className="p-4 font-mono text-sm">
                      #{ot.numero_ot}
                    </td>

                    <td className="p-4">
                      <div className="font-medium text-sm flex items-center gap-1.5">
                        {ot.maquina?.nombre_unidad || '—'}

                        {activoFallasMap[ot.activo_id] && (
                          <SilentBadge
                            type={activoFallasMap[ot.activo_id].type}
                            message={activoFallasMap[ot.activo_id].message}
                            iconOnly
                          />
                        )}
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="text-sm text-hm-muted">
                        {ot.cliente?.razon_social || '—'}
                      </div>
                    </td>

                    <td className="p-4 font-mono text-sm text-hm-muted">
                      {ot.fecha_ingreso || '—'}
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant={getEstadoBadgeVariant(ot.estado)}>
                          {String(ot.estado || 'pendiente').toUpperCase().replace('_', ' ')}
                        </Badge>

                        {otNoRentableMap[ot.id] && (
                          <SilentBadge
                            type={otNoRentableMap[ot.id].type}
                            message={otNoRentableMap[ot.id].message}
                            iconOnly
                          />
                        )}
                      </div>
                    </td>

                    <td className="p-4 font-mono text-sm text-green-400">
                      {formatUSD(getTotalOT(ot))}
                    </td>

                    <td
                      className="p-4 text-right flex gap-2 justify-end"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <button
                        onClick={() => handleGenerarOTPDF(ot)}
                        disabled={generandoPdf === `ot-${ot.id}`}
                        className="p-2 hover:bg-hm-surface2 rounded text-hm-accent transition-colors disabled:opacity-50"
                        title={`PDF ${ordenTrabajo} interno`}
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </button>

                      {(ot.estado === 'completada' || ot.estado === 'facturada') && (
                        <button
                          onClick={() => handleGenerarServicioPDF(ot)}
                          disabled={generandoPdf === `servicio-${ot.id}`}
                          className="px-3 py-1 text-xs font-mono font-bold border border-blue-800/50 text-blue-400/80 rounded hover:border-blue-500 hover:text-blue-400 disabled:opacity-50 transition-colors"
                          title="Parte de servicio para firma del cliente"
                        >
                          {generandoPdf === `servicio-${ot.id}` ? '...' : 'PARTE ↓'}
                        </button>
                      )}

                      {ot.estado === 'completada' && (
                        <button
                          onClick={() => handleFacturarOT(ot)}
                          disabled={facturandoOT === ot.id}
                          className="px-3 py-1 text-xs font-mono font-bold border border-green-800/50 text-green-400/80 rounded hover:border-green-500 hover:text-green-400 disabled:opacity-50 transition-colors"
                        >
                          {facturandoOT === ot.id ? '...' : 'FACTURAR'}
                        </button>
                      )}

                      {ot.estado !== 'completada' &&
                        ot.estado !== 'facturada' &&
                        ot.estado !== 'cancelada' && (
                          <>
                            <Button
                              variant="outline"
                              className="px-3 py-1 text-xs"
                              onClick={(event) => handleOpenModal(ot, event)}
                            >
                              FINALIZAR
                            </Button>

                            <Button
                              variant="outline"
                              className="px-3 py-1 text-xs border-red-800 text-red-400 hover:bg-red-900/20"
                              onClick={(event) => {
                                event.stopPropagation()
                                setOtACancelar(ot)
                              }}
                            >
                              CANCELAR
                            </Button>
                          </>
                        )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <Pagination
            total={otsFiltradas.length}
            page={pageOT}
            perPage={PER_PAGE}
            onPageChange={setPageOT}
          />
        </Card>
      )}

      {selectedOT && (
        <ModalFinalizarOT
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          ot={selectedOT}
          onConfirm={handleConfirmFinalizar}
        />
      )}

      <ModalNuevaOT
        isOpen={isNuevaOTOpen}
        onClose={() => setIsNuevaOTOpen(false)}
        maquinas={maquinas}
        clientes={clientes}
        onConfirm={handleCreateOT}
      />

      <FichaMaquina
        isOpen={isFichaOpen}
        onClose={() => setIsFichaOpen(false)}
        maquinaId={selectedMaquinaId}
      />

      <FichaOT
        isOpen={isFichaOTOpen}
        onClose={() => {
          setIsFichaOTOpen(false)
          setOtToView(null)
        }}
        ot={otToView}
        onUpdateEstado={handleUpdateEstadoOT}
      />

      <ModalConfirm
        isOpen={!!otACancelar}
        titulo={`Cancelar ${ordenTrabajo}`}
        mensaje={`¿Cancelar la OT #${otACancelar?.numero_ot}? El ${activoSingular.toLowerCase()} quedará disponible.`}
        confirmLabel="Cancelar OT"
        onConfirm={handleConfirmarCancelar}
        onClose={() => setOtACancelar(null)}
        loading={cancelando}
      />

      <ModalMaquina
        isOpen={isMaquinaModalOpen}
        onClose={() => {
          setIsMaquinaModalOpen(false)
          setEditingMaquina(null)
        }}
        maquina={editingMaquina}
        clientes={clientes}
        onConfirm={async (payload) => {
          if (editingMaquina) {
            await updateMaquina(editingMaquina.id, payload)
            toast.success(`${activoSingular} actualizado correctamente`)
          } else {
            await createMaquina(payload)
            toast.success(`${activoSingular} agregado correctamente`)
          }

          setIsMaquinaModalOpen(false)
          setEditingMaquina(null)
        }}
      />
    </div>
  )
}