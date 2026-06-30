import { useState, useMemo, useEffect } from 'react'
import { toast } from 'sonner'
import { useFinanzas } from '../../hooks/useFinanzas'
import { useDolar } from '../../context/DolarContext'
import { useClientes } from '../../hooks/useClientes'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { sendWhatsAppMessage } from '../../lib/integrations/whatsapp'
import { sendEmail } from '../../lib/integrations/email'
import ModalCobro from '../../components/modulos/facturacion/ModalCobro'
import ModalConfirm from '../../components/ui/ModalConfirm'
import Pagination from '../../components/ui/Pagination'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Input from '../../components/ui/Input'
import ClienteAutocomplete from '../../components/common/ClienteAutocomplete'

const PER_PAGE = 10

export default function Facturacion() {
  const { can, canApprovePrice } = useAuth()
  const canManageBilling = can('facturacion.create')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTx, setSelectedTx] = useState(null)
  const [txAAnular, setTxAAnular] = useState(null)
  const [anulando, setAnulando] = useState(false)
  const [periodo, setPeriodo] = useState('este_mes')
  const [searchQuery, setSearchQuery] = useState('')
  const [clienteFiltro, setClienteFiltro] = useState('')
  const [filterStatus, setFilterStatus] = useState('todos')
  const [page, setPage] = useState(1)
  const [generandoPdf, setGenerandoPdf] = useState(null)
  const [exportandoExcel, setExportandoExcel] = useState(false)

  const { formatUSD, formatARS } = useDolar()
  const { clientes } = useClientes()
  const { transacciones, tipoCambio, loading, error, registrarCobro, anularTransaccion } = useFinanzas()

  const [showTC, setShowTC] = useState(false)
  const [tcForm, setTcForm] = useState({ compra: '', venta: '' })
  const [savingTC, setSavingTC] = useState(false)

  useEffect(() => {
    setPage(1)
  }, [searchQuery, clienteFiltro, filterStatus, periodo])

  const handleGuardarTC = async () => {
    if (!canApprovePrice) {
      toast.error('No tenes permisos para actualizar el tipo de cambio')
      return
    }

    const compra = Number(tcForm.compra) || 0
    const venta = Number(tcForm.venta)

    if (!Number.isFinite(venta) || venta <= 0) {
      toast.error('Ingresá el tipo de cambio venta')
      return
    }
    if (!Number.isFinite(compra) || compra < 0) {
      toast.error('El tipo de cambio compra no es valido')
      return
    }

    setSavingTC(true)

    try {
      const { data: updated, error: err } = await supabase.from('tipo_cambio').upsert(
        {
          fecha: new Date().toISOString().slice(0, 10),
          compra,
          venta,
          fuente: 'BNA',
        },
        { onConflict: 'fecha,fuente' }
      ).select('id').maybeSingle()

      if (err) throw err
      if (!updated) throw new Error('No se pudo verificar la actualizacion del tipo de cambio')

      toast.success('Tipo de cambio actualizado')
      setShowTC(false)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSavingTC(false)
    }
  }

  const transaccionesFiltradas = useMemo(() => {
    if (!transacciones) return []

    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    return transacciones.filter((tx) => {
      const txDate = new Date(tx.fecha_emision)
      const txMonth = txDate.getMonth()
      const txYear = txDate.getFullYear()
      let matchPeriodo = true

      if (periodo === 'este_mes') {
        matchPeriodo = txMonth === currentMonth && txYear === currentYear
      } else if (periodo === 'mes_pasado') {
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear
        matchPeriodo = txMonth === lastMonth && txYear === lastMonthYear
      } else if (periodo === 'ano_actual') {
        matchPeriodo = txYear === currentYear
      }

      if (!matchPeriodo) return false

      const matchCliente = !clienteFiltro || tx.cliente_id === clienteFiltro || tx.cliente?.id === clienteFiltro
      if (!matchCliente) return false

      const q = searchQuery.trim().toLowerCase()

      const matchSearch =
        !q ||
        tx.cliente?.razon_social?.toLowerCase().includes(q) ||
        tx.cliente?.nombre_comercial?.toLowerCase().includes(q) ||
        tx.cliente?.cuit?.toLowerCase().includes(q) ||
        (tx.numero_comprobante || '').toLowerCase().includes(q) ||
        (tx.tipo_documento || '').toLowerCase().includes(q)

      const matchStatus = filterStatus === 'todos' || tx.estado_pago === filterStatus

      return matchSearch && matchStatus
    })
  }, [transacciones, periodo, searchQuery, clienteFiltro, filterStatus])

  const txPaginadas = useMemo(
    () => transaccionesFiltradas.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    [transaccionesFiltradas, page]
  )

  const handleOpenModal = (tx) => {
    if (!canManageBilling) {
      toast.error('No tenes permisos para registrar cobros')
      return
    }
    if (!tx || tx.estado_pago !== 'pendiente') {
      toast.error('El comprobante ya no esta pendiente')
      return
    }
    setSelectedTx(tx)
    setIsModalOpen(true)
  }

  const handleOpenAnular = (tx) => {
    if (!canManageBilling) {
      toast.error('No tenes permisos para anular comprobantes')
      return
    }
    if (!tx || tx.estado_pago !== 'pendiente') {
      toast.error('El comprobante ya no esta pendiente')
      return
    }
    setTxAAnular(tx)
  }

  const handleConfirmarAnular = async () => {
    if (!txAAnular || !canManageBilling) return

    const currentTx = transacciones.find((tx) => tx.id === txAAnular.id)
    if (!currentTx || currentTx.estado_pago !== 'pendiente') {
      toast.error('El comprobante ya no esta pendiente')
      setTxAAnular(null)
      return
    }

    setAnulando(true)

    try {
      await anularTransaccion(txAAnular.id)
      toast.success('Comprobante anulado correctamente')
      setTxAAnular(null)
    } catch (err) {
      toast.error('Error al anular: ' + err.message)
    } finally {
      setAnulando(false)
    }
  }

  const handleSendEmail = async (tx) => {
    if (!canManageBilling) {
      toast.error('No tenes permisos para enviar comprobantes')
      return
    }
    toast.info('Enviando email...')

    const res = await sendEmail(
      tx.cliente?.email || 'test@example.com',
      `Factura ${tx.numero_comprobante || tx.id.split('-')[0]}`,
      'Adjuntamos su factura.',
      ['factura.pdf']
    )

    if (res.success) toast.success('Email enviado')
    else toast.error('Error al enviar: ' + res.error)
  }

  const handleSendWA = async (tx) => {
    if (!canManageBilling) {
      toast.error('No tenes permisos para enviar comprobantes')
      return
    }
    toast.info('Enviando WhatsApp...')

    const res = await sendWhatsAppMessage(
      tx.cliente?.telefono || '1234567890',
      'cobranza',
      {
        factura: tx.numero_comprobante || tx.id.split('-')[0],
        monto: tx.monto_total_usd,
      }
    )

    if (res.success) toast.success('WhatsApp enviado')
    else toast.error('Error al enviar: ' + res.error)
  }

  const handleConfirmCobro = async (payload) => {
    if (!selectedTx || !canManageBilling) {
      toast.error('No tenes permisos para registrar cobros')
      return
    }

    const currentTx = transacciones.find((tx) => tx.id === selectedTx.id)
    if (!currentTx || currentTx.estado_pago !== 'pendiente') {
      toast.error('El comprobante ya no esta pendiente')
      return
    }

    try {
      await registrarCobro(selectedTx.id, payload)
      toast.success('Cobro registrado correctamente')
    } catch (err) {
      toast.error('Error al registrar cobro: ' + err.message)
    }
  }

  const handleExportExcel = async () => {
    try {
      if (transaccionesFiltradas.length === 0) {
        toast.error('No hay datos para exportar')
        return
      }

      setExportandoExcel(true)

      const XLSX = await import('xlsx')

      const dataToExport = transaccionesFiltradas.map((tx) => ({
        FECHA: tx.fecha_emision,
        CLIENTE: tx.cliente?.razon_social || 'N/A',
        'TIPO DOC': tx.tipo_documento,
        'NRO COMPROBANTE': tx.numero_comprobante || tx.id.split('-')[0],
        'MONTO USD': Number(tx.monto_total_usd),
        'TC BNA': Number(tx.monto_total_usd)
          ? (Number(tx.monto_total_ars) / Number(tx.monto_total_usd)).toFixed(2)
          : 0,
        'MONTO FINAL ARS': Number(tx.monto_total_ars),
        ESTADO: tx.estado_pago.toUpperCase(),
      }))

      const worksheet = XLSX.utils.json_to_sheet(dataToExport)
      const workbook = XLSX.utils.book_new()

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Documentos_y_Cobranzas')
      XLSX.writeFile(workbook, `Documentos_Cobranzas_${periodo}.xlsx`)

      toast.success('Reporte Excel generado correctamente')
    } catch (err) {
      toast.error('Error al generar Excel: ' + err.message)
    } finally {
      setExportandoExcel(false)
    }
  }

  const handleGenerarFacturaPDF = async (tx) => {
    setGenerandoPdf(`factura-${tx.id}`)

    try {
      const { generateFacturaPDF } = await import('../../lib/pdfGenerator')
      generateFacturaPDF(tx)
    } catch (err) {
      console.error('Error generando factura PDF:', err)
      toast.error('No se pudo generar la factura PDF')
    } finally {
      setGenerandoPdf(null)
    }
  }

  const handleGenerarReciboPDF = async (tx) => {
    setGenerandoPdf(`recibo-${tx.id}`)

    try {
      const { generateReciboPDF } = await import('../../lib/pdfGenerator')
      generateReciboPDF(tx)
    } catch (err) {
      console.error('Error generando recibo PDF:', err)
      toast.error('No se pudo generar el recibo PDF')
    } finally {
      setGenerandoPdf(null)
    }
  }

  const handleGenerarRemitoPDF = async (tx) => {
    setGenerandoPdf(`remito-${tx.id}`)

    try {
      const { generateRemitoPDF } = await import('../../lib/pdfGenerator')
      generateRemitoPDF(tx)
    } catch (err) {
      console.error('Error generando remito PDF:', err)
      toast.error('No se pudo generar el remito PDF')
    } finally {
      setGenerandoPdf(null)
    }
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="p-6 border-red-800 bg-red-900/20 text-red-400">
          <h2 className="font-bold mb-2">Error cargando módulo</h2>
          <p className="font-mono text-sm">{error}</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 border-b border-hm-border pb-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Documentos y Cobranzas</h1>
          <p className="mt-1 text-sm text-hm-muted">
            Facturas, recibos, remitos, cobros registrados y documentos pendientes de seguimiento.
          </p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-[10px] font-mono text-hm-muted">TC BNA HOY</div>
              <div className="text-sm font-bold text-hm-accent">
                {tipoCambio ? `$${Number(tipoCambio.venta).toLocaleString('es-AR')}` : '—'}
              </div>
            </div>

            <button
              onClick={() => {
                setShowTC((v) => !v)
                setTcForm({
                  compra: tipoCambio?.compra || '',
                  venta: tipoCambio?.venta || '',
                })
              }}
              className="px-3 py-1.5 text-xs font-mono border border-hm-border rounded hover:border-hm-accent hover:text-hm-accent transition-colors"
            >
              {showTC ? 'CANCELAR' : 'ACTUALIZAR TC'}
            </button>
          </div>

          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent focus:ring-1 focus:ring-hm-accent/30 transition-colors"
          >
            <option value="este_mes">Este mes</option>
            <option value="mes_pasado">Mes pasado</option>
            <option value="ano_actual">Año actual</option>
            <option value="todos">Histórico total</option>
          </select>

          <Button
            variant="primary"
            onClick={handleExportExcel}
            disabled={transaccionesFiltradas.length === 0 || exportandoExcel}
          >
            {exportandoExcel ? 'GENERANDO...' : 'EXPORTAR EXCEL'}
          </Button>
        </div>
      </div>

      {showTC && (
        <div className="flex flex-col gap-4 bg-hm-accent/5 border border-hm-accent/30 rounded-lg p-4 md:flex-row md:items-center">
          <span className="text-xs font-mono text-hm-muted uppercase tracking-widest">TC BNA —</span>

          <div className="flex items-center gap-2">
            <label className="text-xs font-mono text-hm-muted">Compra</label>
            <input
              type="number"
              value={tcForm.compra}
              onChange={(e) => setTcForm((p) => ({ ...p, compra: e.target.value }))}
              className="w-28 bg-hm-surface2 border border-hm-border rounded px-2 py-1 text-sm focus:outline-none focus:border-hm-accent"
              placeholder="0"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-mono text-hm-muted">Venta *</label>
            <input
              type="number"
              value={tcForm.venta}
              onChange={(e) => setTcForm((p) => ({ ...p, venta: e.target.value }))}
              className="w-28 bg-hm-surface2 border border-hm-border rounded px-2 py-1 text-sm focus:outline-none focus:border-hm-accent"
              placeholder="0"
            />
          </div>

          <button
            onClick={handleGuardarTC}
            disabled={savingTC}
            className="px-4 py-1.5 text-xs font-mono font-bold bg-hm-accent text-black rounded hover:bg-yellow-500 transition-colors disabled:opacity-50"
          >
            {savingTC ? 'GUARDANDO...' : 'GUARDAR'}
          </button>
        </div>
      )}

      <div className="bg-hm-surface2/20 p-4 rounded-lg border border-hm-border/50">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr_auto] xl:items-end">
          <ClienteAutocomplete
            label="Filtrar por cliente"
            clientes={clientes || []}
            value={clienteFiltro}
            onChange={(clienteId) => setClienteFiltro(clienteId)}
            placeholder="Escribí razón social, nombre comercial o CUIT..."
          />

          <div className="w-full">
            <label className="text-[10px] font-mono text-hm-muted mb-1 block uppercase tracking-widest">
              Buscar por comprobante, tipo o cliente
            </label>

            <Input
              type="text"
              placeholder="Número de comprobante, factura, recibo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            {[
              { id: 'todos', label: 'TODOS' },
              { id: 'pendiente', label: 'PENDIENTES' },
              { id: 'cobrado', label: 'COBRADOS' },
            ].map((f) => (
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

        {(clienteFiltro || searchQuery || filterStatus !== 'todos') && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-hm-muted">
              Filtros activos
            </span>

            {clienteFiltro && (
              <button
                type="button"
                onClick={() => setClienteFiltro('')}
                className="rounded border border-hm-border px-2 py-1 text-[10px] font-mono text-hm-muted hover:border-red-500 hover:text-red-400"
              >
                Limpiar cliente
              </button>
            )}

            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="rounded border border-hm-border px-2 py-1 text-[10px] font-mono text-hm-muted hover:border-red-500 hover:text-red-400"
              >
                Limpiar búsqueda
              </button>
            )}

            {filterStatus !== 'todos' && (
              <button
                type="button"
                onClick={() => setFilterStatus('todos')}
                className="rounded border border-hm-border px-2 py-1 text-[10px] font-mono text-hm-muted hover:border-red-500 hover:text-red-400"
              >
                Limpiar estado
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 border-l-4 border-l-hm-accent bg-hm-surface2/30">
          <div className="text-sm font-mono text-hm-muted mb-1">
            EMITIDO ({periodo.replace('_', ' ').toUpperCase()})
          </div>
          <div className="text-2xl font-bold">
            {formatUSD(transaccionesFiltradas.reduce((acc, tx) => acc + Number(tx.monto_total_usd), 0))}
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-green-500 bg-hm-surface2/30">
          <div className="text-sm font-mono text-hm-muted mb-1">
            COBRADO ({periodo.replace('_', ' ').toUpperCase()})
          </div>
          <div className="text-2xl font-bold text-green-400">
            {formatUSD(
              transaccionesFiltradas
                .filter((t) => t.estado_pago === 'cobrado')
                .reduce((acc, tx) => acc + Number(tx.monto_total_usd), 0)
            )}
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-red-500 bg-hm-surface2/30">
          <div className="text-sm font-mono text-hm-muted mb-1">
            PENDIENTE ({periodo.replace('_', ' ').toUpperCase()})
          </div>
          <div className="text-2xl font-bold text-red-400">
            {formatUSD(
              transaccionesFiltradas
                .filter((t) => t.estado_pago === 'pendiente')
                .reduce((acc, tx) => acc + Number(tx.monto_total_usd), 0)
            )}
          </div>
        </Card>
      </div>

      <section>
        <Card className="overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-hm-surface2/50 border-b border-hm-border">
              <tr>
                <th className="p-4 font-mono text-xs text-hm-muted">FECHA</th>
                <th className="p-4 font-mono text-xs text-hm-muted">DOCUMENTO</th>
                <th className="p-4 font-mono text-xs text-hm-muted">CLIENTE</th>
                <th className="p-4 font-mono text-xs text-hm-muted">ORIGEN</th>
                <th className="p-4 font-mono text-xs text-hm-muted text-right">MONTO USD</th>
                <th className="p-4 font-mono text-xs text-hm-muted text-right">EQ. ARS</th>
                <th className="p-4 font-mono text-xs text-hm-muted text-center">ESTADO</th>
                <th className="p-4"></th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="p-4">
                    <div className="h-4 bg-hm-surface2 rounded animate-pulse w-full"></div>
                  </td>
                </tr>
              ) : transaccionesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-hm-muted font-mono text-sm">
                    No se encontraron documentos con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                txPaginadas.map((tx) => (
                  <tr key={tx.id} className="border-b border-hm-border hover:bg-hm-surface2/30 transition-colors">
                    <td className="p-4 font-mono text-sm text-hm-muted">{tx.fecha_emision}</td>

                    <td className="p-4">
                      <div className="font-bold text-sm">{tx.tipo_documento}</div>
                      <div className="font-mono text-xs text-hm-muted">
                        #{tx.numero_comprobante || tx.id.split('-')[0]}
                      </div>
                    </td>

                    <td className="p-4 text-sm">{tx.cliente?.razon_social || tx.cliente?.nombre_comercial || '—'}</td>

                    <td className="p-4">
                      <Badge variant="default" className="text-[10px]">
                        {tx.origen_tipo === 'taller'
                          ? `Trabajo #${tx.ot?.numero_ot}`
                          : tx.origen_tipo === 'venta'
                            ? 'Venta'
                            : tx.contrato?.numero_contrato
                              ? `Rental #${tx.contrato?.numero_contrato}`
                              : 'Operación'}
                      </Badge>
                    </td>

                    <td className="p-4 text-right font-mono text-sm font-bold text-green-400">
                      {formatUSD(tx.monto_total_usd)}
                    </td>

                    <td className="p-4 text-right font-mono text-xs text-hm-muted">
                      {formatARS(tx.monto_total_ars)}
                    </td>

                    <td className="p-4 text-center">
                      <Badge
                        variant={
                          tx.estado_pago === 'cobrado'
                            ? 'info'
                            : tx.estado_pago === 'anulado'
                              ? 'taller'
                              : 'ventas'
                        }
                      >
                        {tx.estado_pago.toUpperCase()}
                      </Badge>
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex gap-2 justify-end items-center flex-wrap">
                        <Button
                          variant="outline"
                          className="px-2 py-1 text-[10px] font-mono border-hm-border hover:border-blue-400 hover:text-blue-400"
                          onClick={() => handleGenerarFacturaPDF(tx)}
                          disabled={generandoPdf === `factura-${tx.id}`}
                        >
                          {generandoPdf === `factura-${tx.id}` ? '...' : 'FACT PDF'}
                        </Button>

                        <Button
                          variant="outline"
                          className="px-2 py-1 text-[10px] font-mono border-hm-border hover:border-purple-400 hover:text-purple-400"
                          onClick={() => handleGenerarReciboPDF(tx)}
                          disabled={generandoPdf === `recibo-${tx.id}`}
                        >
                          {generandoPdf === `recibo-${tx.id}` ? '...' : 'REC PDF'}
                        </Button>

                        <Button
                          variant="outline"
                          className="px-2 py-1 text-[10px] font-mono border-hm-border hover:border-orange-400 hover:text-orange-400"
                          onClick={() => handleGenerarRemitoPDF(tx)}
                          disabled={generandoPdf === `remito-${tx.id}`}
                        >
                          {generandoPdf === `remito-${tx.id}` ? '...' : 'REM PDF'}
                        </Button>

                        <Button
                          variant="outline"
                          className="px-2 py-1 text-[10px] font-mono border-hm-border hover:border-hm-accent hover:text-hm-accent"
                          onClick={() => handleSendEmail(tx)}
                        >
                          EMAIL
                        </Button>

                        <Button
                          variant="outline"
                          className="px-2 py-1 text-[10px] font-mono border-hm-border hover:border-green-400 hover:text-green-400"
                          onClick={() => handleSendWA(tx)}
                        >
                          WPP
                        </Button>

                        {tx.estado_pago === 'pendiente' && (
                          <>
                            <Button
                              variant="outline"
                              className="px-3 py-1 text-xs border-green-500/50 text-green-400 hover:bg-green-500/10"
                              onClick={() => handleOpenModal(tx)}
                            >
                              COBRAR
                            </Button>

                            <Button
                              variant="outline"
                              className="px-3 py-1 text-xs border-red-800 text-red-400 hover:bg-red-900/20"
                              onClick={() => handleOpenAnular(tx)}
                            >
                              ANULAR
                            </Button>
                          </>
                        )}
                      </div>
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

      <ModalConfirm
        isOpen={!!txAAnular}
        titulo="Anular documento"
        mensaje={`¿Anular el documento ${txAAnular?.tipo_documento} #${
          txAAnular?.numero_comprobante || txAAnular?.id?.split('-')[0]
        } de ${txAAnular?.cliente?.razon_social}? Esta acción no puede deshacerse.`}
        confirmLabel="Anular"
        onConfirm={handleConfirmarAnular}
        onClose={() => setTxAAnular(null)}
        loading={anulando}
      />
    </div>
  )
}
