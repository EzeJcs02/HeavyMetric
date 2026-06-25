import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  FileSignature,
  FileText,
  Plus,
  ShoppingCart,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useDolar } from '../../context/DolarContext'
import { useClientes } from '../../hooks/useClientes'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import ModalConfirm from '../../components/ui/ModalConfirm'
import ClienteAutocomplete from '../../components/common/ClienteAutocomplete'

const EMPTY_ITEM = {
  tipo_item: 'servicio',
  descripcion: '',
  cantidad: 1,
  precio_usd: 0,
  tasa_iva: 0.21,
}

const ESTADOS = [
  'borrador',
  'enviada',
  'pendiente_firma',
  'firmada',
  'facturada',
  'cobrada',
  'cancelada',
]

const TIPOS_VENTA = [
  'general',
  'maquinaria',
  'implemento',
  'repuesto',
  'servicio',
  'rental',
  'combo',
]

const TIPOS_ITEM = [
  'maquinaria',
  'implemento',
  'repuesto',
  'servicio',
  'alquiler',
  'combo',
  'otro',
]

const ESTADO_LABEL = {
  borrador: 'Borrador',
  enviada: 'Enviada',
  pendiente_firma: 'Pendiente firma',
  firmada: 'Firmada',
  facturada: 'Facturada',
  cobrada: 'Cobrada',
  cancelada: 'Cancelada',
}

const ESTADO_VARIANT = {
  borrador: 'default',
  enviada: 'info',
  pendiente_firma: 'warn',
  firmada: 'success',
  facturada: 'info',
  cobrada: 'success',
  cancelada: 'danger',
}

function calcTotales(items) {
  const subtotal = items.reduce((sum, item) => {
    return sum + Number(item.cantidad || 0) * Number(item.precio_usd || 0)
  }, 0)

  const iva = items.reduce((sum, item) => {
    return sum + Number(item.cantidad || 0) * Number(item.precio_usd || 0) * Number(item.tasa_iva || 0)
  }, 0)

  return {
    subtotal,
    iva,
    total: subtotal + iva,
  }
}

function nextNumeroOV() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const random = Math.floor(1000 + Math.random() * 9000)
  return `OV-${y}${m}-${random}`
}

function estadoVariant(estado) {
  return ESTADO_VARIANT[estado] || 'default'
}

function safeDate(date) {
  if (!date) return '—'
  return new Date(date + 'T00:00:00').toLocaleDateString('es-AR')
}

function ModalOrdenVenta({ isOpen, onClose, onConfirm, clientes, orden }) {
  const { formatUSD } = useDolar()

  const [form, setForm] = useState({
    cliente_id: '',
    numero_ov: nextNumeroOV(),
    estado: 'borrador',
    tipo_venta: 'general',
    fecha: new Date().toISOString().slice(0, 10),
    fecha_entrega: '',
    condiciones_pago: '',
    observaciones: '',
  })

  const [items, setItems] = useState([{ ...EMPTY_ITEM }])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (orden) {
      setForm({
        cliente_id: orden.cliente_id || '',
        numero_ov: orden.numero_ov || nextNumeroOV(),
        estado: orden.estado || 'borrador',
        tipo_venta: orden.tipo_venta || 'general',
        fecha: orden.fecha || new Date().toISOString().slice(0, 10),
        fecha_entrega: orden.fecha_entrega || '',
        condiciones_pago: orden.condiciones_pago || '',
        observaciones: orden.observaciones || '',
      })

      setItems(
        orden.items?.length
          ? orden.items.map((item) => ({
              tipo_item: item.tipo_item || 'servicio',
              descripcion: item.descripcion || '',
              cantidad: item.cantidad || 1,
              precio_usd: item.precio_usd || 0,
              tasa_iva: item.tasa_iva ?? 0.21,
            }))
          : [{ ...EMPTY_ITEM }]
      )
    } else if (isOpen) {
      setForm({
        cliente_id: '',
        numero_ov: nextNumeroOV(),
        estado: 'borrador',
        tipo_venta: 'general',
        fecha: new Date().toISOString().slice(0, 10),
        fecha_entrega: '',
        condiciones_pago: '',
        observaciones: '',
      })

      setItems([{ ...EMPTY_ITEM }])
    }
  }, [orden, isOpen])

  const setF = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const setItem = (index, key, value) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)))
  }

  const addItem = () => setItems((prev) => [...prev, { ...EMPTY_ITEM }])

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const totales = calcTotales(items)

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!form.cliente_id) {
      toast.error('Seleccioná un cliente')
      return
    }

    if (!form.numero_ov.trim()) {
      toast.error('El número de OV es obligatorio')
      return
    }

    if (items.some((item) => !String(item.descripcion || '').trim())) {
      toast.error('Completá la descripción de todos los ítems')
      return
    }

    setSaving(true)

    try {
      await onConfirm(form, items, totales)
      onClose()
    } catch (err) {
      toast.error(err?.message || 'No se pudo guardar la orden de venta')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={orden ? `Editar ${orden.numero_ov}` : 'Nueva Orden de Venta'}
      maxWidth="max-w-4xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Número OV"
            value={form.numero_ov}
            onChange={(event) => setF('numero_ov', event.target.value)}
            required
          />

          <ClienteAutocomplete
            label="Cliente"
            clientes={clientes}
            value={form.cliente_id}
            onChange={(clienteId) => setF('cliente_id', clienteId)}
            required
          />

          <div className="flex flex-col gap-1">
            <label className="label-mono">Tipo de venta</label>
            <select
              value={form.tipo_venta}
              onChange={(event) => setF('tipo_venta', event.target.value)}
              className="bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent transition-colors"
            >
              {TIPOS_VENTA.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Fecha"
            type="date"
            value={form.fecha}
            onChange={(event) => setF('fecha', event.target.value)}
          />

          <Input
            label="Fecha de entrega"
            type="date"
            value={form.fecha_entrega}
            onChange={(event) => setF('fecha_entrega', event.target.value)}
          />

          <div className="flex flex-col gap-1">
            <label className="label-mono">Estado</label>
            <select
              value={form.estado}
              onChange={(event) => setF('estado', event.target.value)}
              className="bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent transition-colors"
            >
              {ESTADOS.map((estado) => (
                <option key={estado} value={estado}>
                  {ESTADO_LABEL[estado]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Input
          label="Condiciones de pago"
          value={form.condiciones_pago}
          onChange={(event) => setF('condiciones_pago', event.target.value)}
          placeholder="Ej: contado, 30% anticipo, saldo contra entrega..."
        />

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label-mono">Ítems de la Orden de Venta</label>

            <button
              type="button"
              onClick={addItem}
              className="text-[10px] font-mono font-bold text-hm-accent hover:underline"
            >
              + AGREGAR ÍTEM
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-[130px_1fr_80px_110px_90px_32px] gap-2 px-2">
              {['TIPO', 'DESCRIPCIÓN', 'CANT.', 'PRECIO USD', 'IVA', ''].map((heading) => (
                <span key={heading} className="text-[9px] font-mono text-hm-muted uppercase tracking-widest">
                  {heading}
                </span>
              ))}
            </div>

            {items.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-[130px_1fr_80px_110px_90px_32px] gap-2 items-center bg-hm-surface2/30 rounded-lg p-2"
              >
                <select
                  value={item.tipo_item}
                  onChange={(event) => setItem(index, 'tipo_item', event.target.value)}
                  className="bg-hm-surface border border-hm-border rounded px-2 py-1.5 text-xs text-hm-text focus:outline-none focus:border-hm-accent"
                >
                  {TIPOS_ITEM.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo.toUpperCase()}
                    </option>
                  ))}
                </select>

                <input
                  value={item.descripcion}
                  onChange={(event) => setItem(index, 'descripcion', event.target.value)}
                  placeholder="Descripción comercial..."
                  className="bg-hm-surface border border-hm-border rounded px-2 py-1.5 text-sm text-hm-text focus:outline-none focus:border-hm-accent w-full"
                />

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={item.cantidad}
                  onChange={(event) => setItem(index, 'cantidad', event.target.value)}
                  className="bg-hm-surface border border-hm-border rounded px-2 py-1.5 text-sm text-center focus:outline-none focus:border-hm-accent"
                />

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.precio_usd}
                  onChange={(event) => setItem(index, 'precio_usd', event.target.value)}
                  className="bg-hm-surface border border-hm-border rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:border-hm-accent"
                />

                <select
                  value={item.tasa_iva}
                  onChange={(event) => setItem(index, 'tasa_iva', event.target.value)}
                  className="bg-hm-surface border border-hm-border rounded px-2 py-1.5 text-xs text-hm-text focus:outline-none focus:border-hm-accent"
                >
                  <option value={0}>0%</option>
                  <option value={0.105}>10.5%</option>
                  <option value={0.21}>21%</option>
                  <option value={0.27}>27%</option>
                </select>

                <button
                  type="button"
                  onClick={() => removeItem(index)}
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
            <span>{formatUSD(totales.subtotal)}</span>
          </div>

          <div className="flex justify-between text-sm text-hm-muted font-mono">
            <span>IVA</span>
            <span>{formatUSD(totales.iva)}</span>
          </div>

          <div className="flex justify-between font-bold border-t border-hm-border pt-1.5 mt-0.5">
            <span className="font-mono text-sm">TOTAL</span>
            <span className="text-lg text-hm-accent">{formatUSD(totales.total)}</span>
          </div>
        </div>

        <Input
          label="Observaciones"
          value={form.observaciones}
          onChange={(event) => setF('observaciones', event.target.value)}
          placeholder="Condiciones comerciales, logística, documentación o aclaraciones..."
        />

        <div className="flex justify-end gap-3 pt-4 border-t border-hm-border">
          <Button variant="outline" type="button" onClick={onClose} disabled={saving}>
            CANCELAR
          </Button>

          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'GUARDANDO...' : orden ? 'GUARDAR CAMBIOS' : 'CREAR OV'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Ventas() {
  const { perfil } = useAuth()
  const { formatUSD } = useDolar()
  const { clientes } = useClientes()

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [changingStatus, setChangingStatus] = useState(null)
  const [search, setSearch] = useState('')
  const [estadoFilter, setEstadoFilter] = useState('todos')

  const fetchOrders = async () => {
    if (!perfil?.organization_id) {
      setOrders([])
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const { data: ordersData, error } = await supabase
        .from('sales_orders')
        .select('*')
        .eq('organization_id', perfil.organization_id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const orderIds = (ordersData || []).map((order) => order.id)
      const clienteIds = [...new Set((ordersData || []).map((order) => order.cliente_id).filter(Boolean))]

      const [{ data: itemsData }, { data: clientesData }] = await Promise.all([
        orderIds.length
          ? supabase.from('sales_order_items').select('*').in('sales_order_id', orderIds)
          : Promise.resolve({ data: [] }),
        clienteIds.length
          ? supabase.from('clientes').select('id, razon_social, nombre_comercial, cuit').in('id', clienteIds)
          : Promise.resolve({ data: [] }),
      ])

      const byOrder = {}
      ;(itemsData || []).forEach((item) => {
        byOrder[item.sales_order_id] = byOrder[item.sales_order_id] || []
        byOrder[item.sales_order_id].push(item)
      })

      const byCliente = {}
      ;(clientesData || []).forEach((cliente) => {
        byCliente[cliente.id] = cliente
      })

      setOrders(
        (ordersData || []).map((order) => ({
          ...order,
          items: byOrder[order.id] || [],
          cliente: byCliente[order.cliente_id] || null,
        }))
      )
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil?.organization_id])

  const filteredOrders = useMemo(() => {
    const q = search.toLowerCase()

    return orders.filter((order) => {
      const cliente = order.cliente?.razon_social || order.cliente?.nombre_comercial || ''
      const matchQ =
        !q ||
        order.numero_ov?.toLowerCase().includes(q) ||
        cliente.toLowerCase().includes(q) ||
        order.tipo_venta?.toLowerCase().includes(q)

      const matchEstado = estadoFilter === 'todos' || order.estado === estadoFilter

      return matchQ && matchEstado
    })
  }, [orders, search, estadoFilter])

  const kpis = useMemo(() => {
    const total = orders.reduce((sum, order) => sum + Number(order.total_usd || 0), 0)
    const pendientesFirma = orders.filter((order) => order.estado === 'pendiente_firma').length
    const firmadas = orders.filter((order) => order.estado === 'firmada').length

    return {
      total,
      count: orders.length,
      pendientesFirma,
      firmadas,
    }
  }, [orders])

  const handleSaveOrder = async (form, items, totales) => {
    if (!perfil?.organization_id) {
      toast.error('No se encontró organization_id del usuario')
      return
    }

    const payload = {
      organization_id: perfil.organization_id,
      cliente_id: form.cliente_id || null,
      numero_ov: form.numero_ov.trim(),
      estado: form.estado,
      tipo_venta: form.tipo_venta,
      fecha: form.fecha,
      fecha_entrega: form.fecha_entrega || null,
      vendedor_id: perfil?.id || null,
      moneda: 'USD',
      subtotal_usd: totales.subtotal,
      iva_usd: totales.iva,
      total_usd: totales.total,
      condiciones_pago: form.condiciones_pago || null,
      observaciones: form.observaciones || null,
      created_by: perfil?.id || null,
    }

    if (editing) {
      const { data: orderCheck, error: checkError } = await supabase
        .from('sales_orders')
        .select('id')
        .eq('id', editing.id)
        .eq('organization_id', perfil.organization_id)
        .single()

      if (checkError || !orderCheck) {
        throw new Error('Acceso denegado: la orden de venta no pertenece a tu organización.')
      }

      const { error } = await supabase
        .from('sales_orders')
        .update(payload)
        .eq('id', editing.id)
        .eq('organization_id', perfil.organization_id)

      if (error) throw error

      const { error: deleteError } = await supabase
        .from('sales_order_items')
        .delete()
        .eq('sales_order_id', editing.id)

      if (deleteError) throw deleteError

      const itemPayload = items.map((item) => ({
        sales_order_id: editing.id,
        tipo_item: item.tipo_item,
        descripcion: item.descripcion,
        cantidad: Number(item.cantidad || 0),
        precio_usd: Number(item.precio_usd || 0),
        tasa_iva: Number(item.tasa_iva || 0),
        subtotal_usd: Number(item.cantidad || 0) * Number(item.precio_usd || 0),
      }))

      const { error: itemsError } = await supabase.from('sales_order_items').insert(itemPayload)
      if (itemsError) throw itemsError

      await supabase.from('sales_order_history').insert({
        sales_order_id: editing.id,
        accion: 'actualizacion_ov',
        estado_anterior: editing.estado,
        estado_nuevo: form.estado,
        descripcion: 'Orden de venta actualizada desde módulo Ventas',
        snapshot: { payload, items: itemPayload },
        created_by: perfil?.id || null,
      })

      toast.success('Orden de Venta actualizada')
    } else {
      const { data: order, error } = await supabase
        .from('sales_orders')
        .insert(payload)
        .select('*')
        .single()

      if (error) throw error

      const itemPayload = items.map((item) => ({
        sales_order_id: order.id,
        tipo_item: item.tipo_item,
        descripcion: item.descripcion,
        cantidad: Number(item.cantidad || 0),
        precio_usd: Number(item.precio_usd || 0),
        tasa_iva: Number(item.tasa_iva || 0),
        subtotal_usd: Number(item.cantidad || 0) * Number(item.precio_usd || 0),
      }))

      const { error: itemsError } = await supabase.from('sales_order_items').insert(itemPayload)
      if (itemsError) throw itemsError

      await supabase.from('sales_order_history').insert({
        sales_order_id: order.id,
        accion: 'creacion_ov',
        estado_anterior: null,
        estado_nuevo: order.estado,
        descripcion: 'Orden de venta creada desde módulo Ventas',
        snapshot: { order, items: itemPayload },
        created_by: perfil?.id || null,
      })

      toast.success('Orden de Venta creada')
    }

    setModalOpen(false)
    setEditing(null)
    fetchOrders()
  }

  const handleChangeStatus = async () => {
    if (!changingStatus) return

    if (!perfil?.organization_id) {
      toast.error('No se encontró organization_id del usuario')
      return
    }

    const { order, estado } = changingStatus

    try {
      const { error } = await supabase
        .from('sales_orders')
        .update({ estado })
        .eq('id', order.id)
        .eq('organization_id', perfil.organization_id)

      if (error) throw error

      await supabase.from('sales_order_history').insert({
        sales_order_id: order.id,
        accion: 'cambio_estado',
        estado_anterior: order.estado,
        estado_nuevo: estado,
        descripcion: `Cambio de estado: ${ESTADO_LABEL[order.estado]} → ${ESTADO_LABEL[estado]}`,
        snapshot: { order },
        created_by: perfil?.id || null,
      })

      toast.success('Estado actualizado')
      setChangingStatus(null)
      fetchOrders()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-hm-border pb-4">
        <div>
          <h1 className="text-2xl font-bold">Ventas</h1>
          <p className="mt-1 text-sm text-hm-muted">
            Órdenes de Venta, condiciones comerciales, firmas, facturación y cobranza.
          </p>
        </div>

        <div className="flex gap-2">
          <Link to="/app/cotizaciones">
            <Button variant="outline">VER COTIZACIONES</Button>
          </Link>

          <Button
            variant="primary"
            onClick={() => {
              setEditing(null)
              setModalOpen(true)
            }}
          >
            <Plus className="h-4 w-4" />
            ORDEN DE VENTA
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          {
            label: 'Órdenes de Venta',
            value: kpis.count,
            detail: 'OV registradas',
            icon: ShoppingCart,
            cls: 'border-l-hm-accent text-hm-accent',
          },
          {
            label: 'Pendientes de firma',
            value: kpis.pendientesFirma,
            detail: 'Requieren aceptación del cliente',
            icon: FileSignature,
            cls: 'border-l-amber-500 text-amber-300',
          },
          {
            label: 'Firmadas',
            value: kpis.firmadas,
            detail: 'Listas para operación o factura',
            icon: CheckCircle2,
            cls: 'border-l-green-500 text-green-300',
          },
          {
            label: 'Monto total',
            value: formatUSD(kpis.total),
            detail: 'Total OV registradas',
            icon: FileText,
            cls: 'border-l-blue-500 text-blue-300',
          },
        ].map((item) => {
          const Icon = item.icon

          return (
            <Card key={item.label} className={`border-l-4 bg-hm-surface2/30 p-4 ${item.cls}`}>
              <div className="mb-3 flex items-center justify-between">
                <div className="text-[10px] font-mono uppercase tracking-widest text-hm-muted">
                  {item.label}
                </div>
                <Icon className="h-4 w-4 opacity-70" />
              </div>

              <div className="text-2xl font-bold">{item.value}</div>
              <p className="mt-1 text-xs text-hm-muted">{item.detail}</p>
            </Card>
          )
        })}
      </div>

      <div className="flex flex-col md:flex-row gap-3 md:items-center">
        <div className="flex-1">
          <Input
            placeholder="Buscar por cliente, número de OV o tipo de venta..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {['todos', ...ESTADOS].map((estado) => (
            <button
              key={estado}
              onClick={() => setEstadoFilter(estado)}
              className={`px-3 py-2 text-[10px] font-mono font-bold rounded-lg border transition-colors ${
                estadoFilter === estado
                  ? 'bg-hm-accent/10 border-hm-accent text-hm-accent'
                  : 'border-hm-border text-hm-muted hover:text-hm-text'
              }`}
            >
              {estado === 'todos' ? 'TODOS' : ESTADO_LABEL[estado].toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-hm-border bg-hm-surface2/30 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Órdenes de Venta</h2>
              <p className="mt-1 text-xs text-hm-muted">
                Base real conectada a Supabase para el circuito Cotización → OV → Firma → Facturación.
              </p>
            </div>

            <span className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-green-300">
              Base real
            </span>
          </div>
        </div>

        <table className="w-full text-left">
          <thead className="border-b border-hm-border bg-hm-surface2/40">
            <tr>
              <th className="p-4 font-mono text-xs text-hm-muted">OV</th>
              <th className="p-4 font-mono text-xs text-hm-muted">CLIENTE</th>
              <th className="p-4 font-mono text-xs text-hm-muted">TIPO</th>
              <th className="p-4 font-mono text-xs text-hm-muted">FECHA</th>
              <th className="p-4 font-mono text-xs text-hm-muted text-center">ÍTEMS</th>
              <th className="p-4 font-mono text-xs text-hm-muted text-right">TOTAL</th>
              <th className="p-4 font-mono text-xs text-hm-muted">ESTADO</th>
              <th className="p-4" />
            </tr>
          </thead>

          <tbody>
            {loading ? (
              [1, 2, 3].map((row) => (
                <tr key={row} className="border-b border-hm-border">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((cell) => (
                    <td key={cell} className="p-4">
                      <div className="h-4 bg-hm-surface2 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan="8" className="p-10 text-center text-hm-muted font-mono text-sm">
                  No hay órdenes de venta registradas.
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-hm-border hover:bg-hm-surface2/30 transition-colors group"
                >
                  <td className="p-4 font-mono text-sm text-hm-accent">{order.numero_ov}</td>
                  <td className="p-4 text-sm font-medium">{order.cliente?.razon_social || order.cliente?.nombre_comercial || '—'}</td>
                  <td className="p-4 text-sm text-hm-muted uppercase">{order.tipo_venta}</td>
                  <td className="p-4 text-xs font-mono text-hm-muted">{safeDate(order.fecha)}</td>
                  <td className="p-4 text-center font-mono text-sm">{order.items?.length || 0}</td>
                  <td className="p-4 text-right font-mono text-sm font-bold text-green-400">
                    {formatUSD(order.total_usd)}
                  </td>
                  <td className="p-4">
                    <Badge variant={estadoVariant(order.estado)}>
                      {ESTADO_LABEL[order.estado] || order.estado}
                    </Badge>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditing(order)
                          setModalOpen(true)
                        }}
                        className="px-3 py-1 text-xs font-mono font-bold border border-hm-border rounded hover:border-hm-accent hover:text-hm-accent transition-colors"
                      >
                        EDITAR
                      </button>

                      {order.estado === 'borrador' && (
                        <button
                          onClick={() => setChangingStatus({ order, estado: 'pendiente_firma' })}
                          className="px-3 py-1 text-xs font-mono font-bold border border-amber-500/40 text-amber-300 rounded hover:bg-amber-500/10 transition-colors"
                        >
                          A FIRMA
                        </button>
                      )}

                      {order.estado === 'pendiente_firma' && (
                        <button
                          onClick={() => setChangingStatus({ order, estado: 'firmada' })}
                          className="px-3 py-1 text-xs font-mono font-bold border border-green-500/40 text-green-400 rounded hover:bg-green-500/10 transition-colors"
                        >
                          FIRMADA
                        </button>
                      )}

                      {order.estado === 'firmada' && (
                        <button
                          onClick={() => setChangingStatus({ order, estado: 'facturada' })}
                          className="px-3 py-1 text-xs font-mono font-bold border border-blue-500/40 text-blue-400 rounded hover:bg-blue-500/10 transition-colors"
                        >
                          FACTURADA
                        </button>
                      )}

                      {order.estado === 'facturada' && (
                        <button
                          onClick={() => setChangingStatus({ order, estado: 'cobrada' })}
                          className="px-3 py-1 text-xs font-mono font-bold border border-green-500/40 text-green-400 rounded hover:bg-green-500/10 transition-colors"
                        >
                          COBRADA
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          ['Cotización aprobada', 'Origen comercial de la venta'],
          ['Orden de Venta', 'Condiciones, ítems y aceptación'],
          ['Firma cliente', 'Evidencia de aprobación comercial'],
          ['Factura / Cobranza', 'Próxima integración financiera'],
        ].map(([title, description], index) => (
          <Card key={title} className="p-4 bg-hm-surface2/20">
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-hm-border font-mono text-xs text-hm-muted">
                {index + 1}
              </div>

              <div>
                <h3 className="text-sm font-bold">{title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-hm-muted">{description}</p>
              </div>

              <ChevronRight className="ml-auto h-4 w-4 text-hm-muted" />
            </div>
          </Card>
        ))}
      </div>

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
        <div className="flex items-start gap-3">
          <Clock className="mt-0.5 h-4 w-4 text-amber-300" />

          <div>
            <h3 className="text-sm font-bold text-amber-200">Siguiente integración pendiente</h3>
            <p className="mt-1 text-sm text-amber-100/70">
              Las órdenes de venta ya se registran en base real. La próxima etapa es crear firma adjunta, PDF de OV y generación de factura desde OV firmada.
            </p>
          </div>
        </div>
      </div>

      <ModalOrdenVenta
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        onConfirm={handleSaveOrder}
        clientes={clientes || []}
        orden={editing}
      />

      <ModalConfirm
        isOpen={!!changingStatus}
        onClose={() => setChangingStatus(null)}
        onConfirm={handleChangeStatus}
        title="Cambiar estado de OV"
        message={`¿Confirmás cambiar ${changingStatus?.order?.numero_ov} a "${
          ESTADO_LABEL[changingStatus?.estado] || changingStatus?.estado
        }"?`}
        confirmLabel="Confirmar"
        variant="primary"
      />
    </div>
  )
}