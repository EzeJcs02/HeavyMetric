import { useState, useMemo, useEffect } from 'react'
import { toast } from 'sonner'
import { useAlquileres } from '../../hooks/useAlquileres'
import { useMaquinas } from '../../hooks/useMaquinas'
import { useClientes } from '../../hooks/useClientes'
import { useDolar } from '../../context/DolarContext'
import { useFinanzas } from '../../hooks/useFinanzas'
import { generateAlquilerPDF } from '../../utils/pdfGenerator'
import ModalNuevoContrato from '../../components/modulos/alquileres/ModalNuevoContrato'
import ModalConfirm from '../../components/ui/ModalConfirm'
import CalendarioAlquileres from '../../components/modulos/alquileres/CalendarioAlquileres'
import Pagination from '../../components/ui/Pagination'

const PER_PAGE = 10
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Input from '../../components/ui/Input'

export default function Alquileres() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [contratoAFinalizar, setContratoAFinalizar] = useState(null)
  const [finalizandoId, setFinalizandoId] = useState(null)
  const [contratoACancelar, setContratoACancelar] = useState(null)
  const [cancelando, setCancelando] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('todos') // todos, disponibles, alquiladas, taller
  const [pageContratos, setPageContratos] = useState(1)
  const [vistaCalendario, setVistaCalendario] = useState(false)

  useEffect(() => { setPageContratos(1) }, [searchQuery, filterStatus])

  const { formatUSD } = useDolar()

  const { contratos, loading: loadingAlq, error: errorAlq, createContrato, finalizarContrato, cancelarContrato } = useAlquileres()
  const { crearFacturaDesdeAlquiler } = useFinanzas()

  const handleFacturar = async (contrato) => {
    try {
      await crearFacturaDesdeAlquiler(contrato.id)
      toast.success(`Factura generada para contrato #${contrato.numero_contrato}`)
    } catch (err) {
      toast.error('Error al facturar: ' + err.message)
    }
  }
  const { maquinas, loading: loadingMaq, error: errorMaq } = useMaquinas()
  const { clientes, loading: loadingCli, error: errorCli } = useClientes()

  // Lógica de Filtrado de Maquinas (Grid)
  const maquinasGrid = useMemo(() => {
    return maquinas.filter(m => {
      if (!m.activa) return false

      const matchSearch =
        m.nombre_unidad.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.marca.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.modelo.toLowerCase().includes(searchQuery.toLowerCase())

      const matchStatus =
        filterStatus === 'todos' ||
        (filterStatus === 'disponibles' && !m.en_alquiler && !m.en_taller) ||
        (filterStatus === 'alquiladas' && m.en_alquiler) ||
        (filterStatus === 'taller' && m.en_taller)

      return matchSearch && matchStatus
    })
  }, [maquinas, searchQuery, filterStatus])

  // Lógica de Filtrado de Contratos
  const contratosFiltrados = useMemo(() => {

    return contratos.filter(c => {
      return (
        c.cliente_nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.nombre_unidad.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.numero_contrato.toString().includes(searchQuery)
      )
    })
  }, [contratos, searchQuery])

  const contratosPaginados = useMemo(
    () => contratosFiltrados.slice((pageContratos - 1) * PER_PAGE, pageContratos * PER_PAGE),
    [contratosFiltrados, pageContratos]
  )

  const maquinasDisponibles = maquinas.filter(m => !m.en_alquiler && !m.en_taller && m.activa)

  const handleCreateContrato = async (payload) => {
    try {
      await createContrato(payload)
      toast.success('Contrato creado exitosamente')
    } catch (err) {
      toast.error('Error al crear contrato: ' + err.message)
    }
  }

  const handleConfirmarCancelar = async () => {
    if (!contratoACancelar) return
    setCancelando(true)
    try {
      await cancelarContrato(contratoACancelar.id)
      toast.success('Contrato cancelado y unidad liberada')
      setContratoACancelar(null)
    } catch (err) {
      toast.error('Error al cancelar contrato: ' + err.message)
    } finally {
      setCancelando(false)
    }
  }

  const handleConfirmarFinalizar = async () => {
    if (!contratoAFinalizar) return
    setFinalizandoId(contratoAFinalizar.id)
    try {
      await finalizarContrato(contratoAFinalizar.id)
      toast.success('Contrato finalizado y unidad liberada')
      setContratoAFinalizar(null)
    } catch (err) {
      toast.error('Error al finalizar contrato: ' + err.message)
    } finally {
      setFinalizandoId(null)
    }
  }

  if (errorAlq || errorMaq || errorCli) {
    return (
      <div className="p-6">
        <Card className="p-6 border-red-800 bg-red-900/20 text-red-400">
          <h2 className="font-bold mb-2">Error cargando Módulo</h2>
          <p className="font-mono text-sm">{errorAlq || errorMaq || errorCli}</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Gestión de Alquileres</h1>
          <p className="text-hm-muted text-sm mt-1">Control de contratos, vencimientos y disponibilidad de flota.</p>
        </div>
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>+ NUEVO CONTRATO</Button>
      </div>

      {/* BUSCADOR Y FILTROS */}
      <div className="flex flex-col md:flex-row gap-4 items-end bg-hm-surface/50 backdrop-blur-sm p-5 rounded-xl border border-hm-border/50 shadow-premium">
        <div className="flex-1 w-full">
          <label className="text-[10px] font-bold text-hm-muted mb-1.5 block uppercase tracking-[0.15em]">Buscar en Flota o Contratos</label>
          <Input
            type="text"
            placeholder="Buscar por unidad, cliente o nro contrato..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="hm-input w-full"
          />
        </div>

        <div className="flex gap-2 p-1 bg-hm-bg/50 rounded-lg border border-hm-border/30">
          {[
            { id: 'todos', label: 'TODOS' },
            { id: 'disponibles', label: 'DISPONIBLES' },
            { id: 'alquiladas', label: 'ALQUILADAS' },
            { id: 'taller', label: 'TALLER' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterStatus(f.id)}
              className={`px-4 py-1.5 rounded-md text-[10px] font-bold tracking-wider transition-all duration-200 ${filterStatus === f.id
                ? 'bg-hm-accent text-black shadow-glow'
                : 'text-hm-muted hover:text-hm-text hover:bg-hm-surface2'
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* GRID DE FLOTA */}
      <section>
        <h2 className="font-mono text-sm text-hm-muted mb-4 tracking-wider uppercase">Estado de Flota</h2>
        {loadingMaq ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-hm-surface2 rounded animate-pulse"></div>)}
          </div>
        ) : maquinasGrid.length === 0 ? (
          <div className="p-8 text-center bg-hm-surface2/20 rounded border border-dashed border-hm-border text-hm-muted font-mono text-xs">
            No se encontraron unidades con los filtros aplicados.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {maquinasGrid.map(m => {
              const estado = m.en_taller ? 'TALLER' : m.en_alquiler ? 'ALQUILADA' : 'DISPONIBLE'
              const bgClass = m.en_taller ? 'border-red-900/50 bg-red-900/10' :
                m.en_alquiler ? 'border-blue-900/50 bg-blue-900/10' :
                  'border-green-900/50 bg-green-900/10'
              const textClass = m.en_taller ? 'text-red-400' :
                m.en_alquiler ? 'text-blue-400' :
                  'text-green-400'
              return (
                <Card key={m.id} className={`p-4 border ${bgClass} transition-colors hover:bg-hm-surface2/50`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-bold">{m.nombre_unidad}</div>
                    <div className={`text-[10px] font-mono tracking-widest px-2 py-1 rounded bg-hm-surface ${textClass}`}>
                      {estado}
                    </div>
                  </div>
                  <div className="text-sm text-hm-muted">{m.marca} {m.modelo}</div>
                  <div className="text-xs font-mono text-hm-muted mt-3">PATENTE: {m.patente}</div>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      {/* TABLA / CALENDARIO DE CONTRATOS */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-mono text-sm text-hm-muted tracking-wider uppercase">Contratos Activos</h2>
          <div className="flex items-center gap-1 bg-hm-surface2 border border-hm-border rounded-lg p-1">
            <button
              onClick={() => setVistaCalendario(false)}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${!vistaCalendario ? 'bg-hm-accent text-hm-bg' : 'text-hm-muted hover:text-hm-text'}`}
            >
              Lista
            </button>
            <button
              onClick={() => setVistaCalendario(true)}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${vistaCalendario ? 'bg-hm-accent text-hm-bg' : 'text-hm-muted hover:text-hm-text'}`}
            >
              Calendario
            </button>
          </div>
        </div>

        {vistaCalendario ? (
          <Card className="p-5">
            <CalendarioAlquileres contratos={contratos} />
          </Card>
        ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-hm-surface2/50 border-b border-hm-border">
              <tr>
                <th className="p-4 font-mono text-xs text-hm-muted">NRO</th>
                <th className="p-4 font-mono text-xs text-hm-muted">MÁQUINA</th>
                <th className="p-4 font-mono text-xs text-hm-muted">CLIENTE</th>
                <th className="p-4 font-mono text-xs text-hm-muted">FECHAS</th>
                <th className="p-4 font-mono text-xs text-hm-muted">DÍAS REST.</th>
                <th className="p-4 font-mono text-xs text-hm-muted">VENCIMIENTO</th>
                <th className="p-4 font-mono text-xs text-hm-muted text-right">TOTAL USD</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {loadingAlq ? (
                <tr><td colSpan="8" className="p-4"><div className="h-4 bg-hm-surface2 rounded animate-pulse w-full"></div></td></tr>
              ) : contratosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-hm-muted font-mono text-sm">
                    No se encontraron contratos de alquiler.
                  </td>
                </tr>
              ) : (
                contratosPaginados.map(c => (
                  <tr key={c.id} className="border-b border-hm-border hover:bg-hm-surface2/30 transition-colors">
                    <td className="p-4 font-mono text-sm">#{c.numero_contrato}</td>
                    <td className="p-4">
                      <div className="font-medium text-sm">{c.nombre_unidad}</div>
                      <div className="text-xs text-hm-muted">{c.marca}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm">{c.cliente_nombre}</div>
                    </td>
                    <td className="p-4 font-mono text-sm text-hm-muted text-[10px]">
                      {c.fecha_inicio} al {c.fecha_fin}
                    </td>
                    <td className="p-4 font-mono text-sm text-center">
                      {c.dias_restantes > 0 ? c.dias_restantes : 0}
                    </td>
                    <td className="p-4">
                      <Badge variant={c.estado_vencimiento === 'vencido' ? 'taller' : c.estado_vencimiento === 'por_vencer' ? 'ventas' : 'info'}>
                        {c.estado_vencimiento.toUpperCase().replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="p-4 font-mono text-sm text-blue-400 text-right">
                      {formatUSD(c.total_contrato_usd)}
                    </td>
                    <td className="p-4 text-right flex gap-2 justify-end">
                      <button
                        onClick={() => generateAlquilerPDF(c)}
                        className="p-2 hover:bg-hm-surface2 rounded text-hm-accent transition-colors"
                        title="Descargar PDF"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </button>
                      {(c.estado === 'activo' || c.estado === 'finalizado') && (
                        <Button
                          variant="outline"
                          className="px-3 py-1 text-xs border-green-800/50 text-green-400 hover:bg-green-900/20"
                          onClick={() => handleFacturar(c)}
                        >
                          FACTURAR
                        </Button>
                      )}
                      {c.estado !== 'finalizado' && c.estado !== 'cancelado' && (
                        <>
                          <Button
                            variant="outline"
                            className="px-3 py-1 text-xs"
                            onClick={() => setContratoAFinalizar(c)}
                          >
                            FINALIZAR
                          </Button>
                          <Button
                            variant="outline"
                            className="px-3 py-1 text-xs border-red-800 text-red-400 hover:bg-red-900/20"
                            onClick={() => setContratoACancelar(c)}
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
          <Pagination total={contratosFiltrados.length} page={pageContratos} perPage={PER_PAGE} onPageChange={setPageContratos} />
        </Card>
        )}
      </section>

      <ModalNuevoContrato
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maquinasDisponibles={maquinasDisponibles}
        clientes={clientes}
        onConfirm={handleCreateContrato}
      />

      <ModalConfirm
        isOpen={!!contratoACancelar}
        titulo="Cancelar Contrato de Alquiler"
        mensaje={`¿Cancelar el contrato #${contratoACancelar?.numero_contrato} de ${contratoACancelar?.cliente_nombre}? La unidad quedará disponible sin generar factura.`}
        confirmLabel="Cancelar Contrato"
        onConfirm={handleConfirmarCancelar}
        onClose={() => setContratoACancelar(null)}
        loading={cancelando}
      />

      <ModalConfirm
        isOpen={!!contratoAFinalizar}
        titulo="Finalizar Contrato de Alquiler"
        mensaje={`¿Confirmás que querés finalizar el contrato #${contratoAFinalizar?.numero_contrato} de ${contratoAFinalizar?.cliente_nombre}? La unidad quedará disponible.`}
        onConfirm={handleConfirmarFinalizar}
        onClose={() => setContratoAFinalizar(null)}
        loading={!!finalizandoId}
      />
    </div>
  )
}
