import { useState, useMemo, useEffect } from 'react'
import { toast } from 'sonner'
import { useCotizaciones } from '../../hooks/useCotizaciones'
import { useClientesOptions } from '../../hooks/useClientes'
import { useLeadsOptions } from '../../hooks/useLeads'
import { useMaquinas } from '../../hooks/useMaquinas'
import { useAuth } from '../../context/AuthContext'
import { useDolar } from '../../context/DolarContext'
import { supabase } from '../../lib/supabase'
import Modal from '../../components/ui/Modal'
import ModalConfirm from '../../components/ui/ModalConfirm'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Pagination from '../../components/ui/Pagination'
import ClienteAutocomplete from '../../components/common/ClienteAutocomplete'

const PER_PAGE = 10

const ESTADOS = ['Borrador', 'Enviada', 'Aprobada', 'Rechazada', 'Vencida', 'Convertida']
const TIPOS = ['Maquina', 'Implemento', 'Repuesto', 'Servicio', 'Alquiler', 'Combo', 'Otro']

const ESTADO_VARIANT = {
  Borrador: 'default',
  Enviada: 'info',
  Aprobada: 'ok',
  Rechazada: 'danger',
  Vencida: 'warn',
  Convertida: 'success',
}

const EMPTY_ITEM = {
  tipo_item: 'Servicio',
  descripcion: '',
  cantidad: 1,
  precio_usd: 0,
  tasa_iva: 0.21,
}

function calcTotales(items) {
  const subtotal = items.reduce((s, i) => s + Number(i.cantidad || 0) * Number(i.precio_usd || 0), 0)
  const iva = items.reduce(
    (s, i) => s + Number(i.cantidad || 0) * Number(i.precio_usd || 0) * Number(i.tasa_iva || 0),
    0
  )

  return { subtotal, iva, total: subtotal + iva }
}

function esCotizacionServicio(cotizacion) {
  const items = cotizacion?.items || []
  return items.some((item) => String(item.tipo_item || '').toLowerCase() === 'servicio')
}

function ModalCotizacion({ isOpen, onClose, cotizacion, clientes, leads, onConfirm }) {
  const { formatUSD } = useDolar()
  const { perfil } = useAuth()

  const [form, setForm] = useState({
    cliente_id: '',
    lead_id: '',
    fecha_vencimiento: '',
    condiciones: '',
    notas: '',
  })

  const [items, setItems] = useState([{ ...EMPTY_ITEM }])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (cotizacion) {
      setForm({
        cliente_id: cotizacion.cliente_id || '',
        lead_id: cotizacion.lead_id || '',
        fecha_vencimiento: cotizacion.fecha_vencimiento || '',
        condiciones: cotizacion.condiciones || '',
        notas: cotizacion.notas || '',
      })

      setItems(
        cotizacion.items?.length > 0
          ? cotizacion.items.map((i) => ({
              tipo_item: i.tipo_item,
              descripcion: i.descripcion,
              cantidad: i.cantidad,
              precio_usd: i.precio_usd,
              tasa_iva: i.tasa_iva,
            }))
          : [{ ...EMPTY_ITEM }]
      )
    } else {
      setForm({
        cliente_id: '',
        lead_id: '',
        fecha_vencimiento: '',
        condiciones: '',
        notas: '',
      })

      setItems([{ ...EMPTY_ITEM }])
    }
  }, [cotizacion, isOpen])

  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const setItem = (idx, k, v) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [k]: v } : it)))
  }

  const addItem = () => setItems((p) => [...p, { ...EMPTY_ITEM }])

  const removeItem = (idx) => {
    setItems((p) => p.filter((_, i) => i !== idx))
  }

  const { subtotal, iva, total } = calcTotales(items)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.cliente_id && !form.lead_id) {
      toast.error('Seleccioná un cliente o un lead')
      return
    }

    const hasEmptyDesc = items.some((i) => !String(i.descripcion || '').trim())

    if (hasEmptyDesc) {
      toast.error('Completá la descripción de todos los ítems')
      return
    }

    setSaving(true)

    try {
      await onConfirm(
        {
          ...form,
          created_by: perfil?.id,
          organization_id: perfil?.organization_id,
        },
        items
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={cotizacion ? `Editar Cotización #${cotizacion.numero_cotizacion}` : 'Nueva Cotización'}
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ClienteAutocomplete
            label="Cliente"
            clientes={clientes}
            value={form.cliente_id}
            onChange={(clienteId) => {
              setF('cliente_id', clienteId)
              if (clienteId) setF('lead_id', '')
            }}
          />

          <div className="flex flex-col gap-1">
            <label className="label-mono">Lead / oportunidad</label>
            <select
              value={form.lead_id}
              onChange={(e) => {
                setF('lead_id', e.target.value)
                if (e.target.value) setF('cliente_id', '')
              }}
              className="select-hm"
            >
              <option value="">— Ninguno —</option>
              {leads
                .filter((l) => !['Ganado', 'Perdido'].includes(l.estado))
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.empresa || l.nombre} ({l.estado})
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Fecha de vencimiento"
            type="date"
            value={form.fecha_vencimiento}
            onChange={(e) => setF('fecha_vencimiento', e.target.value)}
          />

          <Input
            label="Condiciones comerciales"
            value={form.condiciones}
            onChange={(e) => setF('condiciones', e.target.value)}
            placeholder="Ej: contado, anticipo, cuotas, entrega..."
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label-mono">Ítems cotizados</label>

            <button
              type="button"
              onClick={addItem}
              className="text-[10px] font-mono font-bold text-hm-accent hover:underline"
            >
              + AGREGAR ÍTEM
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-[120px_1fr_70px_90px_80px_28px] gap-2 px-2">
              {['TIPO', 'DESCRIPCIÓN', 'CANT.', 'PRECIO USD', 'IVA', ''].map((h) => (
                <span key={h} className="text-[9px] font-mono text-hm-muted uppercase tracking-widest">
                  {h}
                </span>
              ))}
            </div>

            {items.map((item, idx) => (
              <div
                key={idx}
                className="grid grid-cols-[120px_1fr_70px_90px_80px_28px] gap-2 items-center bg-hm-surface2/30 rounded-lg p-2"
              >
                <select
                  value={item.tipo_item}
                  onChange={(e) => setItem(idx, 'tipo_item', e.target.value)}
                  className="select-hm text-xs py-1.5"
                >
                  {TIPOS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>

                <input
                  value={item.descripcion}
                  onChange={(e) => setItem(idx, 'descripcion', e.target.value)}
                  placeholder="Descripción..."
                  className="bg-hm-surface border border-hm-border rounded px-2 py-1.5 text-sm text-hm-text focus:outline-none focus:border-hm-accent w-full"
                />

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={item.cantidad}
                  onChange={(e) => setItem(idx, 'cantidad', e.target.value)}
                  className="bg-hm-surface border border-hm-border rounded px-2 py-1.5 text-sm text-center focus:outline-none focus:border-hm-accent"
                />

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.precio_usd}
                  onChange={(e) => setItem(idx, 'precio_usd', e.target.value)}
                  className="bg-hm-surface border border-hm-border rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:border-hm-accent"
                />

                <select
                  value={item.tasa_iva}
                  onChange={(e) => setItem(idx, 'tasa_iva', e.target.value)}
                  className="select-hm text-xs py-1.5"
                >
                  <option value={0}>0%</option>
                  <option value={0.105}>10.5%</option>
                  <option value={0.21}>21%</option>
                  <option value={0.27}>27%</option>
                </select>

                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  disabled={items.length === 1}
                  className="text-red-400/60 hover:text-red-400 disabled:opacity-20 text-base leading-none"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-hm-surface2/40 rounded-lg p-4 border border-hm-border flex flex-col gap-1.5 self-end w-full max-w-xs ml-auto">
          <div className="flex justify-between text-sm text-hm-muted font-mono">
            <span>SUBTOTAL</span>
            <span>{formatUSD(subtotal)}</span>
          </div>

          <div className="flex justify-between text-sm text-hm-muted font-mono">
            <span>IVA</span>
            <span>{formatUSD(iva)}</span>
          </div>

          <div className="flex justify-between font-bold border-t border-hm-border pt-1.5 mt-0.5">
            <span className="font-mono text-sm">TOTAL</span>
            <span className="text-lg text-hm-accent">{formatUSD(total)}</span>
          </div>
        </div>

        <Input
          label="Notas internas / aclaraciones"
          value={form.notas}
          onChange={(e) => setF('notas', e.target.value)}
        />

        <div className="flex justify-end gap-3 pt-4 border-t border-hm-border">
          <Button variant="outline" type="button" onClick={onClose} disabled={saving}>
            CANCELAR
          </Button>

          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'GUARDANDO...' : cotizacion ? 'GUARDAR CAMBIOS' : 'CREAR COTIZACIÓN'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Cotizaciones() {
  const { cotizaciones, loading, error, crearCotizacion, actualizarCotizacion, actualizarEstado } = useCotizaciones()
  const { opciones: clientes } = useClientesOptions()
  const { opciones: leads } = useLeadsOptions()
  const { formatUSD } = useDolar()
  const { canEdit, perfil } = useAuth()

  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState(null)
  const [cambiandoEstado, setCambiandoEstado] = useState(null)
  const [creandoTrabajo, setCreandoTrabajo] = useState(null)
  const [preparandoVenta, setPreparandoVenta] = useState(null)
  const [maquinaTrabajo, setMaquinaTrabajo] = useState('')
  const [savingTrabajo, setSavingTrabajo] = useState(false)
  const [savingVenta, setSavingVenta] = useState(false)
  const [generandoPdf, setGenerandoPdf] = useState(null)

  const { maquinas } = useMaquinas()

  const nombreCotizacion = (c) => c.cliente?.razon_social || c.lead?.empresa || c.lead?.nombre || '—'

  const handleCrearTrabajo = async () => {
    if (!maquinaTrabajo) {
      toast.error('Seleccioná un activo')
      return
    }

    setSavingTrabajo(true)

    try {
      const descripcion =
        creandoTrabajo.items?.map((i) => i.descripcion).filter(Boolean).join(' / ') ||
        creandoTrabajo.titulo ||
        'Trabajo según cotización'

      const { error: insertError } = await supabase.from('ordenes_trabajo').insert([
        {
          organization_id: perfil?.organization_id,
          maquina_id: maquinaTrabajo,
          cliente_id: creandoTrabajo.cliente_id,
          descripcion_trabajo: descripcion,
          fecha_ingreso: new Date().toISOString().slice(0, 10),
          estado: 'en_progreso',
          notas_internas: `Generada desde Cotización #${creandoTrabajo.numero_cotizacion}`,
        },
      ])

      if (insertError) throw insertError

      await actualizarEstado(creandoTrabajo.id, 'Convertida')

      toast.success(`Trabajo creado desde Cotización #${creandoTrabajo.numero_cotizacion}`)
      setCreandoTrabajo(null)
      setMaquinaTrabajo('')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSavingTrabajo(false)
    }
  }

  const handlePrepararVenta = async () => {
    if (!preparandoVenta) return

    setSavingVenta(true)

    try {
      await actualizarEstado(preparandoVenta.id, 'Convertida')
      toast.success(`Cotización #${preparandoVenta.numero_cotizacion} preparada para venta`)
      setPreparandoVenta(null)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSavingVenta(false)
    }
  }

  useEffect(() => {
    setPage(1)
  }, [filtroEstado, busqueda])

  const filtradas = useMemo(() => {
    const q = busqueda.toLowerCase()

    return cotizaciones.filter((c) => {
      const nombre = (c.cliente?.razon_social || c.lead?.empresa || c.lead?.nombre || '').toLowerCase()
      const matchQ = !q || nombre.includes(q) || String(c.numero_cotizacion).includes(q)
      const matchE = filtroEstado === 'todos' || c.estado === filtroEstado

      return matchQ && matchE
    })
  }, [cotizaciones, busqueda, filtroEstado])

  const paginadas = useMemo(() => {
    return filtradas.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  }, [filtradas, page])

  const totalMonto = cotizaciones.reduce((s, c) => s + Number(c.total_usd || 0), 0)
  const aceptadas = cotizaciones.filter((c) => c.estado === 'Aprobada' || c.estado === 'Convertida').length
  const pendientes = cotizaciones.filter((c) => ['Borrador', 'Enviada'].includes(c.estado)).length

  const montoAceptado = cotizaciones
    .filter((c) => c.estado === 'Aprobada' || c.estado === 'Convertida')
    .reduce((s, c) => s + Number(c.total_usd || 0), 0)

  const handleConfirm = async (payload, items) => {
    try {
      if (editando) {
        await actualizarCotizacion(editando.id, payload, items)
        toast.success('Cotización actualizada')
      } else {
        await crearCotizacion(payload, items)
        toast.success('Cotización creada')
      }

      setModalOpen(false)
      setEditando(null)
    } catch (err) {
      toast.error(err.message)
      throw err
    }
  }

  const handleCambiarEstado = async () => {
    try {
      await actualizarEstado(cambiandoEstado.cot.id, cambiandoEstado.estado)
      toast.success(`Estado actualizado a ${cambiandoEstado.estado}`)
      setCambiandoEstado(null)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleGenerarCotizacionPDF = async (cotizacion) => {
    setGenerandoPdf(`cot-${cotizacion.id}`)

    try {
      const { generateCotizacionPDF } = await import('../../lib/pdfGenerator')
      generateCotizacionPDF(cotizacion)
    } catch (err) {
      console.error('Error generando PDF de cotización:', err)
      toast.error('No se pudo generar el PDF de cotización')
    } finally {
      setGenerandoPdf(null)
    }
  }

  const handleGenerarPresupuestoPDF = async (cotizacion) => {
    setGenerandoPdf(`pre-${cotizacion.id}`)

    try {
      const { generatePresupuestoPDF } = await import('../../lib/pdfGenerator')
      generatePresupuestoPDF(cotizacion)
    } catch (err) {
      console.error('Error generando PDF de presupuesto:', err)
      toast.error('No se pudo generar el PDF de presupuesto')
    } finally {
      setGenerandoPdf(null)
    }
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="p-6 border-red-800 bg-red-900/20 text-red-400">
          <p className="font-mono text-sm">{error}</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-hm-border pb-4">
        <div>
          <h1 className="text-2xl font-bold">Cotizaciones</h1>
          <p className="text-sm text-hm-muted mt-1">
            Presupuestos comerciales, servicios, repuestos, maquinaria e implementos.
          </p>
        </div>

        {canEdit && (
          <Button
            variant="primary"
            onClick={() => {
              setEditando(null)
              setModalOpen(true)
            }}
          >
            + NUEVA COTIZACIÓN
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-hm-accent bg-hm-surface2/30">
          <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-1">
            Monto cotizado
          </div>
          <div className="text-2xl font-bold text-hm-accent">{formatUSD(totalMonto)}</div>
        </Card>

        <Card className="p-4 border-l-4 border-l-green-500 bg-hm-surface2/30">
          <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-1">
            Monto aceptado
          </div>
          <div className="text-2xl font-bold text-green-400">{formatUSD(montoAceptado)}</div>
        </Card>

        <Card className="p-4 border-l-4 border-l-blue-500 bg-hm-surface2/30">
          <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-1">
            En gestión
          </div>
          <div className="text-3xl font-bold text-blue-400">{pendientes}</div>
        </Card>

        <Card className="p-4 border-l-4 border-l-green-500 bg-hm-surface2/30">
          <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-1">
            Aceptadas / convertidas
          </div>
          <div className="text-3xl font-bold text-green-400">{aceptadas}</div>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-end bg-hm-surface2/20 p-4 rounded-lg border border-hm-border/50">
        <div className="flex-1">
          <label className="text-[10px] font-mono text-hm-muted mb-1 block uppercase tracking-widest">
            Buscar
          </label>

          <Input
            placeholder="Cliente, lead, número..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFiltroEstado('todos')}
            className={`px-3 py-2 rounded text-[10px] font-bold tracking-widest border transition-all ${
              filtroEstado === 'todos'
                ? 'bg-hm-accent border-hm-accent text-white'
                : 'bg-hm-surface border-hm-border text-hm-muted hover:border-hm-accent/50'
            }`}
          >
            TODOS
          </button>

          {ESTADOS.map((estado) => (
            <button
              key={estado}
              onClick={() => setFiltroEstado(filtroEstado === estado ? 'todos' : estado)}
              className={`px-3 py-2 rounded text-[10px] font-bold tracking-widest border transition-all ${
                filtroEstado === estado
                  ? 'bg-hm-accent border-hm-accent text-white'
                  : 'bg-hm-surface border-hm-border text-hm-muted hover:border-hm-accent/50'
              }`}
            >
              {estado.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-hm-surface2/50 border-b border-hm-border">
            <tr>
              <th className="p-4 font-mono text-xs text-hm-muted">N°</th>
              <th className="p-4 font-mono text-xs text-hm-muted">CLIENTE / LEAD</th>
              <th className="p-4 font-mono text-xs text-hm-muted text-center">ÍTEMS</th>
              <th className="p-4 font-mono text-xs text-hm-muted text-right">SUBTOTAL</th>
              <th className="p-4 font-mono text-xs text-hm-muted text-right">TOTAL</th>
              <th className="p-4 font-mono text-xs text-hm-muted">ESTADO</th>
              <th className="p-4 font-mono text-xs text-hm-muted">VENCE</th>
              <th className="p-4 font-mono text-xs text-hm-muted">FECHA</th>
              <th className="p-4" />
            </tr>
          </thead>

          <tbody>
            {loading ? (
              [1, 2, 3].map((i) => (
                <tr key={i} className="border-b border-hm-border">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((j) => (
                    <td key={j} className="p-4">
                      <div className="h-4 bg-hm-surface2 rounded animate-pulse" />
                    </td>
                  ))}
                  <td className="p-4" />
                </tr>
              ))
            ) : filtradas.length === 0 ? (
              <tr>
                <td colSpan="9" className="p-8 text-center text-hm-muted font-mono text-sm">
                  No hay cotizaciones con los filtros aplicados.
                </td>
              </tr>
            ) : (
              paginadas.map((cot) => {
                const vence = cot.fecha_vencimiento ? new Date(cot.fecha_vencimiento) : null
                const vencida = vence && vence < new Date()
                const puedeCrearTrabajo = esCotizacionServicio(cot)

                return (
                  <tr
                    key={cot.id}
                    className="border-b border-hm-border hover:bg-hm-surface2/30 transition-colors group"
                  >
                    <td className="p-4 font-mono text-sm text-hm-accent">
                      #{cot.numero_cotizacion}
                    </td>

                    <td className="p-4">
                      <div className="font-medium text-sm">{nombreCotizacion(cot)}</div>
                      {cot.lead_id && <div className="text-xs text-hm-muted font-mono">vía CRM</div>}
                    </td>

                    <td className="p-4 text-center font-mono text-sm">
                      {cot.items?.length ?? 0}
                    </td>

                    <td className="p-4 text-right font-mono text-sm text-hm-muted">
                      {formatUSD(cot.subtotal_usd)}
                    </td>

                    <td className="p-4 text-right font-mono text-sm font-bold">
                      {formatUSD(cot.total_usd)}
                    </td>

                    <td className="p-4">
                      <Badge variant={ESTADO_VARIANT[cot.estado]}>{cot.estado}</Badge>
                    </td>

                    <td className="p-4 font-mono text-xs">
                      {vence ? (
                        <span className={vencida ? 'text-red-400' : 'text-hm-muted'}>
                          {vence.toLocaleDateString('es-AR')}
                        </span>
                      ) : (
                        <span className="text-hm-muted/50">—</span>
                      )}
                    </td>

                    <td className="p-4 font-mono text-xs text-hm-muted">
                      {new Date(cot.created_at).toLocaleDateString('es-AR')}
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleGenerarCotizacionPDF(cot)}
                          disabled={generandoPdf === `cot-${cot.id}`}
                          className="px-2 py-1 text-[10px] font-mono font-bold border border-hm-border rounded hover:border-blue-400 hover:text-blue-400 transition-colors disabled:opacity-50"
                        >
                          {generandoPdf === `cot-${cot.id}` ? '...' : 'COT PDF'}
                        </button>

                        <button
                          onClick={() => handleGenerarPresupuestoPDF(cot)}
                          disabled={generandoPdf === `pre-${cot.id}`}
                          className="px-2 py-1 text-[10px] font-mono font-bold border border-hm-border rounded hover:border-purple-400 hover:text-purple-400 transition-colors disabled:opacity-50"
                        >
                          {generandoPdf === `pre-${cot.id}` ? '...' : 'PRE PDF'}
                        </button>

                        {canEdit && (
                          <button
                            onClick={() => {
                              setEditando(cot)
                              setModalOpen(true)
                            }}
                            className="px-2 py-1 text-[10px] font-mono font-bold border border-hm-border rounded hover:border-hm-accent hover:text-hm-accent transition-colors"
                          >
                            EDITAR
                          </button>
                        )}

                        {canEdit && cot.estado === 'Borrador' && (
                          <button
                            onClick={() => setCambiandoEstado({ cot, estado: 'Enviada' })}
                            className="px-2 py-1 text-[10px] font-mono font-bold border border-blue-500/40 text-blue-400 rounded hover:bg-blue-500/10 transition-colors"
                          >
                            ENVIAR
                          </button>
                        )}

                        {canEdit && cot.estado === 'Enviada' && (
                          <>
                            <button
                              onClick={() => setCambiandoEstado({ cot, estado: 'Aprobada' })}
                              className="px-2 py-1 text-[10px] font-mono font-bold border border-green-500/40 text-green-400 rounded hover:bg-green-500/10 transition-colors"
                            >
                              APROBAR
                            </button>

                            <button
                              onClick={() => setCambiandoEstado({ cot, estado: 'Rechazada' })}
                              className="px-2 py-1 text-[10px] font-mono font-bold border border-red-500/40 text-red-400 rounded hover:bg-red-500/10 transition-colors"
                            >
                              RECHAZAR
                            </button>
                          </>
                        )}

                        {canEdit && cot.estado === 'Aprobada' && puedeCrearTrabajo && (
                          <button
                            onClick={() => {
                              setCreandoTrabajo(cot)
                              setMaquinaTrabajo('')
                            }}
                            className="px-2 py-1 text-[10px] font-mono font-bold border border-hm-accent/40 text-hm-accent rounded hover:bg-hm-accent/10 transition-colors"
                          >
                            CREAR TRABAJO
                          </button>
                        )}

                        {canEdit && cot.estado === 'Aprobada' && (
                          <button
                            onClick={() => setPreparandoVenta(cot)}
                            className="px-2 py-1 text-[10px] font-mono font-bold border border-green-500/40 text-green-400 rounded hover:bg-green-500/10 transition-colors"
                          >
                            PREPARAR VENTA
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        <Pagination total={filtradas.length} page={page} perPage={PER_PAGE} onPageChange={setPage} />
      </Card>

      <ModalCotizacion
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditando(null)
        }}
        cotizacion={editando}
        clientes={clientes}
        leads={leads}
        onConfirm={handleConfirm}
      />

      {creandoTrabajo && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-hm-surface border border-hm-border rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="font-semibold text-base mb-1">Crear trabajo / servicio</h2>

            <p className="text-sm text-hm-muted mb-1">
              Cotización #{creandoTrabajo.numero_cotizacion} — {nombreCotizacion(creandoTrabajo)}
            </p>

            <p className="text-xs text-hm-muted mb-4">
              Seleccioná el activo asociado al trabajo.
            </p>

            <select
              value={maquinaTrabajo}
              onChange={(e) => setMaquinaTrabajo(e.target.value)}
              className="w-full bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent mb-4"
            >
              <option value="">— Seleccionar activo —</option>
              {maquinas.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre_unidad} — {m.marca} {m.modelo}
                </option>
              ))}
            </select>

            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setCreandoTrabajo(null)} disabled={savingTrabajo}>
                Cancelar
              </Button>

              <Button variant="primary" onClick={handleCrearTrabajo} disabled={savingTrabajo || !maquinaTrabajo}>
                {savingTrabajo ? 'Creando...' : 'Crear trabajo'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ModalConfirm
        isOpen={!!preparandoVenta}
        onClose={() => setPreparandoVenta(null)}
        onConfirm={handlePrepararVenta}
        loading={savingVenta}
        title="Preparar venta"
        message={`¿Confirmás preparar la cotización #${preparandoVenta?.numero_cotizacion} para venta? En esta fase quedará como convertida. Luego se conectará con Orden de Venta, firma, facturación y cobranza.`}
        confirmLabel="Preparar venta"
        variant="primary"
      />

      <ModalConfirm
        isOpen={!!cambiandoEstado}
        onClose={() => setCambiandoEstado(null)}
        onConfirm={handleCambiarEstado}
        title={`Cambiar estado a ${cambiandoEstado?.estado}`}
        message={`¿Confirmás cambiar la cotización #${cambiandoEstado?.cot?.numero_cotizacion} a "${cambiandoEstado?.estado}"?`}
        confirmLabel="Confirmar"
        variant={cambiandoEstado?.estado === 'Rechazada' ? 'danger' : 'primary'}
      />
    </div>
  )
}