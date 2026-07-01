import { useState, useMemo, useEffect } from 'react'
import { toast } from 'sonner'
import { useRemitos } from '../../hooks/useRemitos'
import { useClientesOptions } from '../../hooks/useClientes'
import { useAuth } from '../../context/AuthContext'
import Modal from '../../components/ui/Modal'
import ModalConfirm from '../../components/ui/ModalConfirm'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Pagination from '../../components/ui/Pagination'
import ClienteAutocomplete from '../../components/common/ClienteAutocomplete'

const PER_PAGE = 12

const TIPOS = ['salida', 'entrada', 'interno']
const ESTADOS = ['borrador', 'emitido', 'entregado', 'cancelado']
const UNIDADES = ['u', 'kg', 'lt', 'm', 'm²', 'hs', 'juego', 'par', 'set']

const ESTADO_VARIANT = {
  borrador: 'default',
  emitido: 'info',
  entregado: 'success',
  cancelado: 'danger',
}

const TIPO_LABEL = {
  salida: 'Salida',
  entrada: 'Entrada',
  interno: 'Interno',
}

const EMPTY_ITEM = { codigo: '', descripcion: '', cantidad: 1, unidad: 'u' }

function ModalRemito({ isOpen, onClose, clientes, onConfirm }) {
  const [form, setForm] = useState({
    tipo: 'salida',
    cliente_id: '',
    fecha: new Date().toISOString().slice(0, 10),
    destino: '',
    observaciones: '',
  })

  const [items, setItems] = useState([{ ...EMPTY_ITEM }])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setForm({
        tipo: 'salida',
        cliente_id: '',
        fecha: new Date().toISOString().slice(0, 10),
        destino: '',
        observaciones: '',
      })
      setItems([{ ...EMPTY_ITEM }])
    }
  }, [isOpen])

  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const setItem = (idx, k, v) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [k]: v } : it)))
  }

  const addItem = () => setItems((p) => [...p, { ...EMPTY_ITEM }])

  const removeItem = (idx) => {
    setItems((p) => p.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const validItems = items.filter((i) => i.descripcion.trim())

    if (validItems.length === 0) {
      toast.error('Agregá al menos un ítem con descripción')
      return
    }

    setSaving(true)

    try {
      await onConfirm(form, validItems)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuevo Remito" maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="label-mono">Tipo *</label>
            <select value={form.tipo} onChange={(e) => setF('tipo', e.target.value)} className="select-hm">
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {TIPO_LABEL[t]}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Fecha *"
            type="date"
            value={form.fecha}
            onChange={(e) => setF('fecha', e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ClienteAutocomplete
            label="Cliente (opcional)"
            clientes={clientes || []}
            value={form.cliente_id}
            onChange={(clienteId) => setF('cliente_id', clienteId)}
            placeholder="Escribí razón social, nombre comercial o CUIT..."
          />

          <Input
            label="Destino / Referencia"
            value={form.destino}
            onChange={(e) => setF('destino', e.target.value)}
            placeholder="Destino, obra, sector..."
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label-mono">Ítems *</label>
            <button
              type="button"
              onClick={addItem}
              className="text-[10px] font-mono font-bold text-hm-accent hover:underline"
            >
              + AGREGAR ÍTEM
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-[90px_1fr_80px_80px_28px] gap-2 px-2">
              {['CÓDIGO', 'DESCRIPCIÓN', 'CANT.', 'UNIDAD', ''].map((h, i) => (
                <span key={i} className="text-[9px] font-mono text-hm-muted uppercase tracking-widest">
                  {h}
                </span>
              ))}
            </div>

            {items.map((item, idx) => (
              <div
                key={idx}
                className="grid grid-cols-[90px_1fr_80px_80px_28px] gap-2 items-center bg-hm-surface2/30 rounded-lg p-2"
              >
                <input
                  value={item.codigo}
                  onChange={(e) => setItem(idx, 'codigo', e.target.value)}
                  placeholder="SKU..."
                  className="bg-hm-surface border border-hm-border rounded px-2 py-1.5 text-xs text-hm-muted focus:outline-none focus:border-hm-accent w-full font-mono"
                />

                <input
                  value={item.descripcion}
                  onChange={(e) => setItem(idx, 'descripcion', e.target.value)}
                  placeholder="Descripción del ítem..."
                  className="bg-hm-surface border border-hm-border rounded px-2 py-1.5 text-sm text-hm-text focus:outline-none focus:border-hm-accent w-full"
                />

                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={item.cantidad}
                  onChange={(e) => setItem(idx, 'cantidad', e.target.value)}
                  className="bg-hm-surface border border-hm-border rounded px-2 py-1.5 text-sm text-center focus:outline-none focus:border-hm-accent"
                />

                <select
                  value={item.unidad}
                  onChange={(e) => setItem(idx, 'unidad', e.target.value)}
                  className="select-hm text-xs py-1.5"
                >
                  {UNIDADES.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
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

        <Input
          label="Observaciones"
          value={form.observaciones}
          onChange={(e) => setF('observaciones', e.target.value)}
          placeholder="Notas adicionales..."
        />

        <div className="flex justify-end gap-3 pt-4 border-t border-hm-border">
          <Button variant="outline" type="button" onClick={onClose} disabled={saving}>
            CANCELAR
          </Button>

          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'GUARDANDO...' : 'CREAR REMITO'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Remitos() {
  const { remitos, loading, error, crearRemito, actualizarEstado } = useRemitos()
  const { opciones: clientes } = useClientesOptions()
  const { canEdit } = useAuth()

  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [cambiandoEstado, setCambiandoEstado] = useState(null)
  const [generandoPdfId, setGenerandoPdfId] = useState(null)

  useEffect(() => {
    setPage(1)
  }, [filtroEstado, filtroTipo, busqueda])

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase()

    return remitos.filter((r) => {
      const nombre = (r.cliente?.razon_social || r.destino || '').toLowerCase()
      const matchQ = !q || nombre.includes(q) || String(r.numero_remito).includes(q)
      const matchE = filtroEstado === 'todos' || r.estado === filtroEstado
      const matchT = filtroTipo === 'todos' || r.tipo === filtroTipo

      return matchQ && matchE && matchT
    })
  }, [remitos, busqueda, filtroEstado, filtroTipo])

  const paginados = useMemo(() => {
    return filtrados.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  }, [filtrados, page])

  const kpis = {
    total: remitos.length,
    emitidos: remitos.filter((r) => r.estado === 'emitido').length,
    entregados: remitos.filter((r) => r.estado === 'entregado').length,
    borradores: remitos.filter((r) => r.estado === 'borrador').length,
  }

  const handleConfirm = async (payload, items) => {
    try {
      await crearRemito(payload, items)
      toast.success('Remito creado')
      setModalOpen(false)
    } catch (err) {
      toast.error(err.message)
      throw err
    }
  }

  const handleCambiarEstado = async () => {
    try {
      await actualizarEstado(cambiandoEstado.remito.id, cambiandoEstado.estado)
      toast.success(`Estado actualizado a ${cambiandoEstado.estado}`)
      setCambiandoEstado(null)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleGenerarPDF = async (remito) => {
    setGenerandoPdfId(remito.id)

    try {
      const { generateRemitoPDF } = await import('../../lib/pdfGenerator')

      generateRemitoPDF({
        ...remito,
        numero_comprobante: remito.numero_remito,
        tipo: TIPO_LABEL[remito.tipo] || remito.tipo,
      })
    } catch (err) {
      console.error('Error generando PDF de remito:', err)
      toast.error('No se pudo generar el PDF del remito')
    } finally {
      setGenerandoPdfId(null)
    }
  }

  const nombreRemito = (r) => r.cliente?.razon_social || r.destino || '—'

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
          <h1 className="text-2xl font-bold">Remitos</h1>
          <p className="text-sm text-hm-muted mt-1">{remitos.length} remitos registrados</p>
        </div>

        {canEdit && (
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            + NUEVO REMITO
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-hm-accent bg-hm-surface2/30">
          <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-1">Total</div>
          <div className="text-3xl font-bold text-hm-accent">{kpis.total}</div>
        </Card>

        <Card className="p-4 border-l-4 border-l-yellow-500 bg-hm-surface2/30">
          <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-1">Borradores</div>
          <div className="text-3xl font-bold text-yellow-400">{kpis.borradores}</div>
        </Card>

        <Card className="p-4 border-l-4 border-l-blue-500 bg-hm-surface2/30">
          <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-1">Emitidos</div>
          <div className="text-3xl font-bold text-blue-400">{kpis.emitidos}</div>
        </Card>

        <Card className="p-4 border-l-4 border-l-green-500 bg-hm-surface2/30">
          <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-1">Entregados</div>
          <div className="text-3xl font-bold text-green-400">{kpis.entregados}</div>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-end bg-hm-surface2/20 p-4 rounded-lg border border-hm-border/50">
        <div className="flex-1">
          <label className="text-[10px] font-mono text-hm-muted mb-1 block uppercase tracking-widest">Buscar</label>
          <Input placeholder="Cliente, destino, número..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
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

          {ESTADOS.map((e) => (
            <button
              key={e}
              onClick={() => setFiltroEstado(filtroEstado === e ? 'todos' : e)}
              className={`px-3 py-2 rounded text-[10px] font-bold tracking-widest border transition-all ${
                filtroEstado === e
                  ? 'bg-hm-accent border-hm-accent text-white'
                  : 'bg-hm-surface border-hm-border text-hm-muted hover:border-hm-accent/50'
              }`}
            >
              {e.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          {['todos', ...TIPOS].map((t) => (
            <button
              key={t}
              onClick={() => setFiltroTipo(filtroTipo === t ? 'todos' : t)}
              className={`px-3 py-2 rounded text-[10px] font-bold tracking-widest border transition-all ${
                filtroTipo === t
                  ? 'bg-hm-accent/20 border-hm-accent text-hm-accent'
                  : 'bg-hm-surface border-hm-border text-hm-muted hover:border-hm-accent/50'
              }`}
            >
              {t === 'todos' ? 'TIPO: TODOS' : (TIPO_LABEL[t] || t).toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-hm-surface2/50 border-b border-hm-border">
            <tr>
              <th className="p-4 font-mono text-xs text-hm-muted">N°</th>
              <th className="p-4 font-mono text-xs text-hm-muted">TIPO</th>
              <th className="p-4 font-mono text-xs text-hm-muted">CLIENTE / DESTINO</th>
              <th className="p-4 font-mono text-xs text-hm-muted text-center">ÍTEMS</th>
              <th className="p-4 font-mono text-xs text-hm-muted">ESTADO</th>
              <th className="p-4 font-mono text-xs text-hm-muted">FECHA</th>
              <th className="p-4" />
            </tr>
          </thead>

          <tbody>
            {loading ? (
              [1, 2, 3].map((i) => (
                <tr key={i} className="border-b border-hm-border">
                  {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                    <td key={j} className="p-4">
                      <div className="h-4 bg-hm-surface2 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtrados.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-8 text-center text-hm-muted font-mono text-sm">
                  No hay remitos con los filtros aplicados.
                </td>
              </tr>
            ) : (
              paginados.map((r) => (
                <tr key={r.id} className="border-b border-hm-border hover:bg-hm-surface2/30 transition-colors group">
                  <td className="p-4 font-mono text-sm text-hm-accent">#{r.numero_remito}</td>

                  <td className="p-4">
                    <span className="text-[10px] font-mono font-bold border border-hm-border rounded px-2 py-0.5 text-hm-muted uppercase">
                      {TIPO_LABEL[r.tipo] || r.tipo}
                    </span>
                  </td>

                  <td className="p-4">
                    <div className="font-medium text-sm">{nombreRemito(r)}</div>
                    {r.proveedor && <div className="text-xs text-hm-muted font-mono">Prov: {r.proveedor.empresa}</div>}
                  </td>

                  <td className="p-4 text-center font-mono text-sm">{r.items?.length ?? 0}</td>

                  <td className="p-4">
                    <Badge variant={ESTADO_VARIANT[r.estado]}>{r.estado}</Badge>
                  </td>

                  <td className="p-4 font-mono text-xs text-hm-muted">
                    {new Date(r.fecha + 'T12:00:00').toLocaleDateString('es-AR')}
                  </td>

                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleGenerarPDF(r)}
                        disabled={generandoPdfId === r.id}
                        className="px-2 py-1 text-[10px] font-mono font-bold border border-hm-border rounded hover:border-blue-400 hover:text-blue-400 transition-colors disabled:opacity-50"
                      >
                        {generandoPdfId === r.id ? '...' : 'PDF'}
                      </button>

                      {canEdit && r.estado === 'borrador' && (
                        <button
                          onClick={() => setCambiandoEstado({ remito: r, estado: 'emitido' })}
                          className="px-2 py-1 text-[10px] font-mono font-bold border border-blue-500/40 text-blue-400 rounded hover:bg-blue-500/10 transition-colors"
                        >
                          EMITIR
                        </button>
                      )}

                      {canEdit && r.estado === 'emitido' && (
                        <button
                          onClick={() => setCambiandoEstado({ remito: r, estado: 'entregado' })}
                          className="px-2 py-1 text-[10px] font-mono font-bold border border-green-500/40 text-green-400 rounded hover:bg-green-500/10 transition-colors"
                        >
                          ENTREGADO
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <Pagination total={filtrados.length} page={page} perPage={PER_PAGE} onPageChange={setPage} />
      </Card>

      <ModalRemito isOpen={modalOpen} onClose={() => setModalOpen(false)} clientes={clientes} onConfirm={handleConfirm} />

      <ModalConfirm
        isOpen={!!cambiandoEstado}
        onClose={() => setCambiandoEstado(null)}
        onConfirm={handleCambiarEstado}
        title={`Cambiar estado a ${cambiandoEstado?.estado}`}
        message={`¿Confirmás el remito #${cambiandoEstado?.remito?.numero_remito} como "${cambiandoEstado?.estado}"?`}
        confirmLabel="Confirmar"
        variant="primary"
      />
    </div>
  )
}