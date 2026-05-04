import { useState, useMemo, useEffect } from 'react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { useFinanzas } from '../../hooks/useFinanzas'
import { useDolar } from '../../context/DolarContext'
import ModalCobro from '../../components/modulos/facturacion/ModalCobro'
import Pagination from '../../components/ui/Pagination'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Input from '../../components/ui/Input'

const PER_PAGE = 10

export default function Facturacion() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTx, setSelectedTx] = useState(null)
  const [periodo, setPeriodo] = useState('este_mes')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('todos') // todos, pendiente, cobrado
  const [page, setPage] = useState(1)

  useEffect(() => { setPage(1) }, [searchQuery, filterStatus, periodo])
  const { formatUSD, formatARS } = useDolar()

  const { transacciones, loading, error, registrarCobro } = useFinanzas()

  // Filtrado Multicapa (Período + Búsqueda + Estado)
  const transaccionesFiltradas = useMemo(() => {
    if (!transacciones) return []
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    return transacciones.filter(tx => {
      // 1. Filtro de Período
      const txDate = new Date(tx.fecha_emision)
      const txMonth = txDate.getMonth()
      const txYear = txDate.getFullYear()
      let matchPeriodo = true

      if (periodo === 'este_mes') matchPeriodo = txMonth === currentMonth && txYear === currentYear
      else if (periodo === 'mes_pasado') {
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear
        matchPeriodo = txMonth === lastMonth && txYear === lastMonthYear
      }
      else if (periodo === 'ano_actual') matchPeriodo = txYear === currentYear

      if (!matchPeriodo) return false

      // 2. Filtro de Búsqueda (Razón Social o Nro Comprobante)
      const q = searchQuery.toLowerCase()
      const matchSearch =
        tx.cliente?.razon_social?.toLowerCase().includes(q) ||
        (tx.numero_comprobante || '').toLowerCase().includes(q)

      // 3. Filtro de Estado
      const matchStatus = filterStatus === 'todos' || tx.estado_pago === filterStatus

      return matchSearch && matchStatus
    })
  }, [transacciones, periodo, searchQuery, filterStatus])

  const txPaginadas = useMemo(
    () => transaccionesFiltradas.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    [transaccionesFiltradas, page]
  )

  const handleOpenModal = (tx) => {
    setSelectedTx(tx)
    setIsModalOpen(true)
  }

  const handleConfirmCobro = async (payload) => {
    try {
      await registrarCobro(selectedTx.id, payload)
      toast.success('Cobro registrado correctamente')
    } catch (err) {
      toast.error('Error al registrar cobro: ' + err.message)
    }
  }

  const handleExportExcel = () => {
    try {
      if (transaccionesFiltradas.length === 0) {
        toast.error('No hay datos para exportar')
        return
      }

      const dataToExport = transaccionesFiltradas.map(tx => ({
        'FECHA': tx.fecha_emision,
        'CLIENTE': tx.cliente?.razon_social || 'N/A',
        'TIPO DOC': tx.tipo_documento,
        'NRO COMPROBANTE': tx.numero_comprobante || tx.id.split('-')[0],
        'MONTO USD': Number(tx.monto_total_usd),
        'TC BNA': (Number(tx.monto_total_ars) / Number(tx.monto_total_usd)).toFixed(2),
        'MONTO FINAL ARS': Number(tx.monto_total_ars),
        'ESTADO': tx.estado_pago.toUpperCase()
      }))

      const worksheet = XLSX.utils.json_to_sheet(dataToExport)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Facturacion')
      XLSX.writeFile(workbook, `Reporte_Facturacion_${periodo}.xlsx`)
      
      toast.success('Reporte Excel generado correctamente')
    } catch (err) {
      toast.error('Error al generar Excel: ' + err.message)
    }
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="p-6 border-red-800 bg-red-900/20 text-red-400">
          <h2 className="font-bold mb-2">Error cargando Módulo</h2>
          <p className="font-mono text-sm">{error}</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between border-b border-hm-border pb-4">
        <h1 className="text-2xl font-bold">Facturación y Cobranzas</h1>
        <div className="flex items-center gap-4">
          <select 
            value={periodo} 
            onChange={(e) => setPeriodo(e.target.value)}
            className="bg-hm-surface2 border border-hm-border rounded p-2 text-sm text-white focus:outline-none focus:border-hm-accent"
          >
            <option value="este_mes">Este Mes</option>
            <option value="mes_pasado">Mes Pasado</option>
            <option value="ano_actual">Año Actual</option>
            <option value="todos">Histórico Total</option>
          </select>
          <Button variant="primary" onClick={handleExportExcel} disabled={transaccionesFiltradas.length === 0}>
            EXPORTAR REPORTE EXCEL
          </Button>
        </div>
      </div>

      {/* BUSCADOR Y FILTROS DE ESTADO */}
      <div className="flex flex-col md:flex-row gap-4 items-end bg-hm-surface2/20 p-4 rounded-lg border border-hm-border/50">
        <div className="flex-1 w-full">
          <label className="text-[10px] font-mono text-hm-muted mb-1 block uppercase tracking-widest">Buscar por Razón Social o Nro. Comprobante</label>
          <Input
            type="text"
            placeholder="Cliente o número de comprobante..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2">
          {[
            { id: 'todos', label: 'TODOS' },
            { id: 'pendiente', label: 'PENDIENTES' },
            { id: 'cobrado', label: 'COBRADOS' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterStatus(f.id)}
              className={`px-4 py-2 rounded text-[10px] font-bold tracking-widest transition-all border ${
                filterStatus === f.id 
                  ? 'bg-hm-accent border-hm-accent text-white shadow-lg shadow-hm-accent/20' 
                  : 'bg-hm-surface border-hm-border text-hm-muted hover:border-hm-accent/50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI SIMPLES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 border-l-4 border-l-hm-accent bg-hm-surface2/30">
          <div className="text-sm font-mono text-hm-muted mb-1">FACTURADO ({periodo.replace('_', ' ').toUpperCase()})</div>
          <div className="text-2xl font-bold">
            {formatUSD(transaccionesFiltradas.reduce((acc, tx) => acc + Number(tx.monto_total_usd), 0))}
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-green-500 bg-hm-surface2/30">
          <div className="text-sm font-mono text-hm-muted mb-1">COBRADO ({periodo.replace('_', ' ').toUpperCase()})</div>
          <div className="text-2xl font-bold text-green-400">
            {formatUSD(transaccionesFiltradas.filter(t => t.estado_pago === 'cobrado').reduce((acc, tx) => acc + Number(tx.monto_total_usd), 0))}
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-red-500 bg-hm-surface2/30">
          <div className="text-sm font-mono text-hm-muted mb-1">PENDIENTE ({periodo.replace('_', ' ').toUpperCase()})</div>
          <div className="text-2xl font-bold text-red-400">
            {formatUSD(transaccionesFiltradas.filter(t => t.estado_pago === 'pendiente').reduce((acc, tx) => acc + Number(tx.monto_total_usd), 0))}
          </div>
        </Card>
      </div>

      {/* TABLA DE TRANSACCIONES */}
      <section>
        <Card className="overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-hm-surface2/50 border-b border-hm-border">
              <tr>
                <th className="p-4 font-mono text-xs text-hm-muted">FECHA</th>
                <th className="p-4 font-mono text-xs text-hm-muted">COMPROBANTE</th>
                <th className="p-4 font-mono text-xs text-hm-muted">CLIENTE</th>
                <th className="p-4 font-mono text-xs text-hm-muted">REFERENCIA</th>
                <th className="p-4 font-mono text-xs text-hm-muted text-right">MONTO USD</th>
                <th className="p-4 font-mono text-xs text-hm-muted text-right">EQ. ARS</th>
                <th className="p-4 font-mono text-xs text-hm-muted text-center">ESTADO</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" className="p-4"><div className="h-4 bg-hm-surface2 rounded animate-pulse w-full"></div></td></tr>
              ) : transaccionesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-hm-muted font-mono text-sm">
                    No se encontraron resultados para los filtros aplicados.
                  </td>
                </tr>
              ) : (
                txPaginadas.map(tx => (
                  <tr key={tx.id} className="border-b border-hm-border hover:bg-hm-surface2/30 transition-colors">
                    <td className="p-4 font-mono text-sm text-hm-muted">{tx.fecha_emision}</td>
                    <td className="p-4">
                      <div className="font-bold text-sm">{tx.tipo_documento}</div>
                      <div className="font-mono text-xs text-hm-muted">#{tx.numero_comprobante || tx.id.split('-')[0]}</div>
                    </td>
                    <td className="p-4 text-sm">{tx.cliente?.razon_social}</td>
                    <td className="p-4">
                      <Badge variant="default" className="text-[10px]">
                        {tx.origen_tipo === 'taller' ? `OT #${tx.ot?.numero_ot}` : `ALQ #${tx.contrato?.numero_contrato}`}
                      </Badge>
                    </td>
                    <td className="p-4 text-right font-mono text-sm font-bold text-green-400">
                      {formatUSD(tx.monto_total_usd)}
                    </td>
                    <td className="p-4 text-right font-mono text-xs text-hm-muted">
                      {formatARS(tx.monto_total_ars)}
                    </td>
                    <td className="p-4 text-center">
                      <Badge variant={tx.estado_pago === 'cobrado' ? 'info' : tx.estado_pago === 'anulado' ? 'taller' : 'ventas'}>
                        {tx.estado_pago.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      {tx.estado_pago === 'pendiente' && (
                        <Button 
                          variant="outline" 
                          className="px-3 py-1 text-xs border-green-500/50 text-green-400 hover:bg-green-500/10"
                          onClick={() => handleOpenModal(tx)}
                        >
                          COBRAR
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <Pagination
            total={transaccionesFiltradas.length}
            page={page}
            perPage={PER_PAGE}
            onPageChange={setPage}
          />
        </Card>
      </section>

      <ModalCobro 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        transaccion={selectedTx}
        onConfirm={handleConfirmCobro}
      />
    </div>
  )
}
