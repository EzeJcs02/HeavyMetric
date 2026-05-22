import { useState, useMemo, useEffect } from 'react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'
import { useMaquinas } from '../../hooks/useMaquinas'
import { useClientes } from '../../hooks/useClientes'
import { useTaller } from '../../hooks/useTaller'
import { useFinanzas } from '../../hooks/useFinanzas'
import { useDolar } from '../../context/DolarContext'
import { generateOTPDF, generateServicioPDF } from '../../utils/pdfGenerator'
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

export default function Taller() {
  const [activeTab, setActiveTab] = useState('flota')
  const [selectedOT, setSelectedOT] = useState(null)
  const [otACancelar, setOtACancelar] = useState(null)
  const [cancelando, setCancelando] = useState(false)
  const [facturandoOT, setFacturandoOT] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isNuevaOTOpen, setIsNuevaOTOpen] = useState(false)
  
  // Estados de Búsqueda y Filtros
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('todos') // todos, disponibles, alquiladas, taller
  const [isFichaOpen, setIsFichaOpen] = useState(false)
  const [selectedMaquinaId, setSelectedMaquinaId] = useState(null)
  const [isMaquinaModalOpen, setIsMaquinaModalOpen] = useState(false)
  const [editingMaquina, setEditingMaquina] = useState(null)
  const [isFichaOTOpen, setIsFichaOTOpen] = useState(false)
  const [otToView, setOtToView] = useState(null)
  const [pageMaq, setPageMaq] = useState(1)
  const [pageOT, setPageOT] = useState(1)

  useEffect(() => { setPageMaq(1) }, [searchQuery, filterStatus])
  useEffect(() => { setPageOT(1) }, [searchQuery])

  const { formatUSD } = useDolar()
  const { maquinas, loading: loadingMaq, error: errorMaq, createMaquina, updateMaquina } = useMaquinas()
  const { clientes } = useClientes()
  const { ots, loading: loadingOT, error: errorOT, finalizarOT, createOT, cancelarOT } = useTaller()
  const { crearFacturaDesdeOT } = useFinanzas()

  // Lógica de Filtrado de Maquinas
  const maquinasFiltradas = useMemo(() => {
    return maquinas.filter(m => {
      const matchSearch =
        m.nombre_unidad.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.marca.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.modelo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.cliente?.razon_social || '').toLowerCase().includes(searchQuery.toLowerCase())

      const matchStatus =
        filterStatus === 'todos' ||
        (filterStatus === 'disponibles' && !m.en_alquiler && !m.en_taller) ||
        (filterStatus === 'alquiladas' && m.en_alquiler) ||
        (filterStatus === 'taller' && m.en_taller)

      return matchSearch && matchStatus
    })
  }, [maquinas, searchQuery, filterStatus])

  const maquinasPaginadas = useMemo(
    () => maquinasFiltradas.slice((pageMaq - 1) * PER_PAGE, pageMaq * PER_PAGE),
    [maquinasFiltradas, pageMaq]
  )

  const handleOpenFicha = (id) => {
    setSelectedMaquinaId(id)
    setIsFichaOpen(true)
  }

  // Lógica de Filtrado de OTs
  const otsFiltradas = useMemo(() => {
    return ots.filter(ot => {
      return (
        ot.numero_ot.toString().includes(searchQuery) ||
        ot.maquina?.nombre_unidad.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ot.cliente?.razon_social.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })
  }, [ots, searchQuery])

  const otsPaginadas = useMemo(
    () => otsFiltradas.slice((pageOT - 1) * PER_PAGE, pageOT * PER_PAGE),
    [otsFiltradas, pageOT]
  )

  const handleOpenModal = (ot, e) => {
    e.stopPropagation()
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

  const handleConfirmFinalizar = async (payload) => {
    try {
      const { repuestosUtilizados, ...otPayload } = payload

      if (repuestosUtilizados?.length > 0) {
        await supabase.from('ot_repuestos').delete().eq('orden_trabajo_id', selectedOT.id)
        const rows = repuestosUtilizados.map(r => ({
          orden_trabajo_id: selectedOT.id,
          repuesto_id: r.repuesto_id || null,
          nombre: r.nombre,
          cantidad: Number(r.cantidad),
          precio_unitario_usd: Number(r.precio_unitario_usd),
          subtotal_usd: Number(r.cantidad) * Number(r.precio_unitario_usd),
        }))
        await supabase.from('ot_repuestos').insert(rows)
        const totalRep = rows.reduce((s, r) => s + r.subtotal_usd, 0)
        await supabase.from('ordenes_trabajo').update({ total_repuestos_usd: totalRep }).eq('id', selectedOT.id)
      }

      await finalizarOT(selectedOT.id, otPayload)
      toast.success(`Orden de Trabajo #${selectedOT.numero_ot} finalizada con éxito`)
      handleCloseModal()
    } catch (err) {
      toast.error('Error al finalizar la OT: ' + err.message)
    }
  }

  const handleConfirmarCancelar = async () => {
    if (!otACancelar) return
    setCancelando(true)
    try {
      await cancelarOT(otACancelar.id, otACancelar.maquina_id)
      toast.success(`OT #${otACancelar.numero_ot} cancelada`)
      setOtACancelar(null)
    } catch (err) {
      toast.error('Error al cancelar OT: ' + err.message)
    } finally {
      setCancelando(false)
    }
  }

  const handleFacturarOT = async (ot) => {
    setFacturandoOT(ot.id)
    try {
      await crearFacturaDesdeOT(ot.id)
      toast.success(`OT #${ot.numero_ot} facturada correctamente`)
    } catch (err) {
      toast.error('Error al facturar: ' + err.message)
    } finally {
      setFacturandoOT(null)
    }
  }

  const handleCreateOT = async (payload) => {
    try {
      await createOT(payload)
      toast.success('Orden de Trabajo creada correctamente')
      setIsNuevaOTOpen(false)
      setActiveTab('ots')
    } catch (err) {
      toast.error('Error al crear OT: ' + err.message)
    }
  }

  const handleUpdateEstadoOT = async (id, nuevoEstado) => {
    try {
      await supabase.from('ordenes_trabajo').update({ estado: nuevoEstado }).eq('id', id)
      toast.success('Estado actualizado')
      // Refrescar OT local para FichaOT
      setOtToView(prev => ({ ...prev, estado: nuevoEstado }))
      // No llamo a fetchOts completo para no des-seleccionar, o sí lo llamo pero la ficha se actualiza.
    } catch (err) {
      toast.error('Error al actualizar: ' + err.message)
    }
  }

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

  const handleExportOTs = () => {
    if (!otsFiltradas.length) { toast.error('No hay OTs para exportar'); return }
    const rows = otsFiltradas.map(ot => ({
      'NRO OT':    `#${ot.numero_ot}`,
      MÁQUINA:     ot.maquina?.nombre_unidad || '—',
      CLIENTE:     ot.cliente?.razon_social || '—',
      INGRESO:     ot.fecha_ingreso || '—',
      ESTADO:      ot.estado || '—',
      'REPUESTOS USD': Number(ot.total_repuestos_usd || 0),
      'MANO OBRA USD': Number(ot.total_mano_obra_usd || 0),
      'TOTAL USD':    Number(ot.total_repuestos_usd || 0) + Number(ot.total_mano_obra_usd || 0),
      NPS:         ot.nps_score || '—',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'OTs')
    XLSX.writeFile(wb, `OTs_${new Date().toISOString().slice(0,10)}.xlsx`)
    toast.success('Excel generado')
  }

  if (errorMaq || errorOT) {
    return (
      <div className="p-6">
        <Card className="p-6 border-red-800 bg-red-900/20 text-red-400">
          <h2 className="font-bold mb-2">Error cargando Módulo</h2>
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
            className={`text-xl font-bold transition-colors ${activeTab === 'flota' ? 'text-white' : 'text-hm-muted hover:text-white'}`}
          >
            FLOTA
          </button>
          <button 
            onClick={() => setActiveTab('ots')}
            className={`text-xl font-bold transition-colors ${activeTab === 'ots' ? 'text-white' : 'text-hm-muted hover:text-white'}`}
          >
            ÓRDENES DE TRABAJO
          </button>
        </div>
        <div className="flex gap-2">
          {activeTab === 'flota' && (
            <Button variant="outline" onClick={() => { setEditingMaquina(null); setIsMaquinaModalOpen(true) }}>+ MÁQUINA</Button>
          )}
          {activeTab === 'ots' && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportOTs}>EXPORTAR EXCEL</Button>
              <Button variant="primary" onClick={() => setIsNuevaOTOpen(true)}>NUEVA OT</Button>
            </div>
          )}
        </div>
      </div>

      {/* DASHBOARD OPERATIVO */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="p-3 border-l-2 border-l-green-500">
          <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-1">Uptime Flota</div>
          <div className="text-lg font-bold">{maquinas.length > 0 ? Math.round(maquinas.reduce((acc, m) => acc + (m.score_disponibilidad || 100), 0) / maquinas.length) : 100}%</div>
        </Card>
        <Card className="p-3 border-l-2 border-l-orange-500">
          <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-1">Máquinas Detenidas</div>
          <div className="text-lg font-bold">{maquinas.filter(m => ['Fuera de servicio', 'En taller', 'Esperando repuesto'].includes(m.estado_operativo)).length}</div>
        </Card>
        <Card className="p-3 border-l-2 border-l-blue-500">
          <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-1">OTs Abiertas</div>
          <div className="text-lg font-bold">{ots.filter(ot => !['completada', 'facturada', 'cerrada', 'cancelada'].includes(ot.estado)).length}</div>
        </Card>
        <Card className="p-3 bg-hm-surface2/30">
          <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-1">MTTR (Días Promedio)</div>
          <div className="text-lg font-bold">2.4 <span className="text-[10px] text-green-400 font-normal">días</span></div>
        </Card>
        <Card className="p-3 bg-hm-surface2/30">
          <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-1">First Time Fix</div>
          <div className="text-lg font-bold">87%</div>
        </Card>
        <Card className="p-3 bg-hm-surface2/30">
          <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-1">Costo Promedio OT</div>
          <div className="text-lg font-bold text-hm-accent">
            {formatUSD(ots.length ? ots.reduce((acc, o) => acc + Number(o.total_usd||0), 0) / ots.length : 0)}
          </div>
        </Card>
      </div>

      {/* BUSCADOR Y FILTROS */}
      <div className="flex flex-col md:flex-row gap-4 items-end bg-hm-surface2/20 p-4 rounded-lg border border-hm-border/50">
        <div className="flex-1 w-full">
          <label className="text-[10px] font-mono text-hm-muted mb-1 block uppercase tracking-widest">Buscador Global</label>
          <Input 
            type="text"
            placeholder={activeTab === 'flota' ? "Buscar por unidad, marca o cliente..." : "Buscar por Nro OT, unidad o cliente..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        {activeTab === 'flota' && (
          <div className="flex gap-2">
            {[
              { id: 'todos', label: 'TODOS' },
              { id: 'disponibles', label: 'DISPONIBLES' },
              { id: 'alquiladas', label: 'ALQUILADAS' },
              { id: 'taller', label: 'TALLER' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilterStatus(f.id)}
                className={`px-3 py-2 rounded text-[10px] font-bold tracking-tighter transition-all border ${
                  filterStatus === f.id 
                    ? 'bg-hm-accent border-hm-accent text-white' 
                    : 'bg-hm-surface border-hm-border text-hm-muted hover:border-hm-accent/50'
                }`}
              >
                {f.label}
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
                <th className="p-4 font-mono text-xs text-hm-muted">UNIDAD</th>
                <th className="p-4 font-mono text-xs text-hm-muted">EQUIPO</th>
                <th className="p-4 font-mono text-xs text-hm-muted">PATENTE</th>
                <th className="p-4 font-mono text-xs text-hm-muted">CLIENTE</th>
                <th className="p-4 font-mono text-xs text-hm-muted">HORÓMETRO</th>
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
                    No se encontraron máquinas con los filtros actuales.
                  </td>
                </tr>
              ) : (
                maquinasPaginadas.map(m => (
                  <MaquinaRow
                    key={m.id}
                    maquina={m}
                    onClickDetalle={() => handleOpenFicha(m.id)}
                    onEdit={() => { setEditingMaquina(m); setIsMaquinaModalOpen(true) }}
                  />
                ))
              )}
            </tbody>
          </table>
          <Pagination total={maquinasFiltradas.length} page={pageMaq} perPage={PER_PAGE} onPageChange={setPageMaq} />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-hm-surface2/50 border-b border-hm-border">
              <tr>
                <th className="p-4 font-mono text-xs text-hm-muted">NRO</th>
                <th className="p-4 font-mono text-xs text-hm-muted">MÁQUINA</th>
                <th className="p-4 font-mono text-xs text-hm-muted">CLIENTE</th>
                <th className="p-4 font-mono text-xs text-hm-muted">INGRESO</th>
                <th className="p-4 font-mono text-xs text-hm-muted">ESTADO</th>
                <th className="p-4 font-mono text-xs text-hm-muted">TOTAL</th>
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
                    No se encontraron órdenes de trabajo.
                  </td>
                </tr>
              ) : (
                otsPaginadas.map(ot => (
                  <tr 
                    key={ot.id} 
                    className="border-b border-hm-border hover:bg-hm-surface2/30 transition-colors cursor-pointer"
                    onClick={() => handleOpenFichaOT(ot)}
                  >
                    <td className="p-4 font-mono text-sm">#{ot.numero_ot}</td>
                    <td className="p-4">
                      <div className="font-medium text-sm">{ot.maquina?.nombre_unidad}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-hm-muted">{ot.cliente?.razon_social}</div>
                    </td>
                    <td className="p-4 font-mono text-sm text-hm-muted">{ot.fecha_ingreso}</td>
                    <td className="p-4">
                      <Badge variant={ot.estado === 'en_progreso' ? 'ventas' : ot.estado === 'completada' ? 'info' : 'default'}>
                        {ot.estado.toUpperCase().replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="p-4 font-mono text-sm text-green-400">
                      {formatUSD(Number(ot.total_repuestos_usd || 0) + Number(ot.total_mano_obra_usd || 0))}
                    </td>
                    <td className="p-4 text-right flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => generateOTPDF(ot)}
                        className="p-2 hover:bg-hm-surface2 rounded text-hm-accent transition-colors"
                        title="PDF Orden de Trabajo (interno)"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </button>
                      {(ot.estado === 'completada' || ot.estado === 'facturada') && (
                        <button
                          onClick={() => generateServicioPDF(ot)}
                          className="px-3 py-1 text-xs font-mono font-bold border border-blue-800/50 text-blue-400/80 rounded hover:border-blue-500 hover:text-blue-400 transition-colors"
                          title="Parte de Servicio (para firma del cliente)"
                        >
                          PARTE ↓
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
                      {ot.estado !== 'completada' && ot.estado !== 'facturada' && ot.estado !== 'cancelada' && (
                        <>
                          <Button
                            variant="outline"
                            className="px-3 py-1 text-xs"
                            onClick={(e) => handleOpenModal(ot, e)}
                          >
                            FINALIZAR
                          </Button>
                          <Button
                            variant="outline"
                            className="px-3 py-1 text-xs border-red-800 text-red-400 hover:bg-red-900/20"
                            onClick={(e) => { e.stopPropagation(); setOtACancelar(ot) }}
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
          <Pagination total={otsFiltradas.length} page={pageOT} perPage={PER_PAGE} onPageChange={setPageOT} />
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
        onClose={() => { setIsFichaOTOpen(false); setOtToView(null) }}
        ot={otToView}
        onUpdateEstado={handleUpdateEstadoOT}
      />

      <ModalConfirm
        isOpen={!!otACancelar}
        titulo="Cancelar Orden de Trabajo"
        mensaje={`¿Cancelar la OT #${otACancelar?.numero_ot}? La máquina quedará disponible.`}
        confirmLabel="Cancelar OT"
        onConfirm={handleConfirmarCancelar}
        onClose={() => setOtACancelar(null)}
        loading={cancelando}
      />

      <ModalMaquina
        isOpen={isMaquinaModalOpen}
        onClose={() => { setIsMaquinaModalOpen(false); setEditingMaquina(null) }}
        maquina={editingMaquina}
        clientes={clientes}
        onConfirm={async (payload) => {
          if (editingMaquina) {
            await updateMaquina(editingMaquina.id, payload)
            toast.success('Máquina actualizada correctamente')
          } else {
            await createMaquina(payload)
            toast.success('Máquina agregada a la flota')
          }
          setIsMaquinaModalOpen(false)
          setEditingMaquina(null)
        }}
      />
    </div>
  )
}
