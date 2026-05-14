import { useState, useMemo, useEffect } from 'react'
import { toast } from 'sonner'
import { useInventario } from '../../hooks/useInventario'
import { useDolar } from '../../context/DolarContext'
import { supabase } from '../../lib/supabase'
import Pagination from '../../components/ui/Pagination'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import ModalConfirm from '../../components/ui/ModalConfirm'

const PER_PAGE = 10

const TIPOS_COMPAT = ['Directa', 'Alternativa', 'Equivalente']
const CONFIANZA    = ['Alta', 'Media', 'Baja']

// ─── Modal Cross-Reference ────────────────────────────────────────────────────
function ModalCrossReference({ item, onClose }) {
  const [refs, setRefs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [form, setForm]       = useState({ marca_compatible: '', modelo_compatible: '', tipo_equipo: '', tipo_compatibilidad: 'Directa', nivel_confianza: 'Alta', notas: '' })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => { fetchRefs() }, [])

  const fetchRefs = async () => {
    setLoading(true)
    const { data } = await supabase.from('cross_reference_repuestos').select('*').eq('inventario_id', item.id).order('created_at')
    setRefs(data || [])
    setLoading(false)
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.marca_compatible || !form.modelo_compatible) { toast.error('Marca y modelo son obligatorios'); return }
    setSaving(true)
    try {
      const { error } = await supabase.from('cross_reference_repuestos').insert({ ...form, inventario_id: item.id })
      if (error) throw error
      toast.success('Compatibilidad agregada')
      setForm({ marca_compatible: '', modelo_compatible: '', tipo_equipo: '', tipo_compatibilidad: 'Directa', nivel_confianza: 'Alta', notas: '' })
      await fetchRefs()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    await supabase.from('cross_reference_repuestos').delete().eq('id', id)
    await fetchRefs()
  }

  return (
    <Modal isOpen={true} onClose={onClose} title={`Compatibilidades — ${item.nombre_repuesto}`} maxWidth="max-w-2xl">
      <div className="flex flex-col gap-5">
        {/* Lista */}
        <div>
          <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-2">Compatibilidades registradas</div>
          {loading ? (
            <div className="h-20 bg-hm-surface2 rounded animate-pulse" />
          ) : refs.length === 0 ? (
            <p className="text-sm text-hm-muted italic p-4 bg-hm-surface2/20 rounded">Sin compatibilidades registradas.</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
              {refs.map(r => (
                <div key={r.id} className="flex items-center justify-between bg-hm-surface2/30 rounded-lg px-4 py-2 border border-hm-border group">
                  <div>
                    <span className="font-medium text-sm">{r.marca_compatible} {r.modelo_compatible}</span>
                    {r.tipo_equipo && <span className="text-xs text-hm-muted ml-2">({r.tipo_equipo})</span>}
                    <div className="flex gap-2 mt-0.5">
                      <Badge variant={r.tipo_compatibilidad === 'Directa' ? 'ok' : r.tipo_compatibilidad === 'Alternativa' ? 'warn' : 'info'}>{r.tipo_compatibilidad}</Badge>
                      <Badge variant={r.nivel_confianza === 'Alta' ? 'ok' : r.nivel_confianza === 'Media' ? 'warn' : 'danger'}>{r.nivel_confianza}</Badge>
                    </div>
                    {r.notas && <p className="text-xs text-hm-muted mt-0.5">{r.notas}</p>}
                  </div>
                  <button onClick={() => handleDelete(r.id)} className="opacity-0 group-hover:opacity-100 text-red-400/60 hover:text-red-400 transition-all text-sm px-2">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Formulario */}
        <form onSubmit={handleAdd} className="border-t border-hm-border pt-4 flex flex-col gap-3">
          <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest">Agregar compatibilidad</div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Marca compatible *" value={form.marca_compatible} onChange={e => set('marca_compatible', e.target.value)} />
            <Input label="Modelo compatible *" value={form.modelo_compatible} onChange={e => set('modelo_compatible', e.target.value)} />
            <Input label="Tipo de equipo" value={form.tipo_equipo} onChange={e => set('tipo_equipo', e.target.value)} placeholder="Ej: Excavadora" />
            <div className="flex flex-col gap-1">
              <label className="label-mono">Tipo compatibilidad</label>
              <select value={form.tipo_compatibilidad} onChange={e => set('tipo_compatibilidad', e.target.value)} className="select-hm">
                {TIPOS_COMPAT.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="label-mono">Nivel de confianza</label>
              <select value={form.nivel_confianza} onChange={e => set('nivel_confianza', e.target.value)} className="select-hm">
                {CONFIANZA.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <Input label="Notas" value={form.notas} onChange={e => set('notas', e.target.value)} />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={onClose}>CERRAR</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? 'GUARDANDO...' : '+ AGREGAR'}</Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

// ─── Modal Ajuste de Stock ────────────────────────────────────────────────────
function ModalAjusteStock({ item, onConfirm, onClose }) {
  const [tipo, setTipo] = useState('entrada')
  const [cantidad, setCantidad] = useState(1)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onConfirm(item.id, cantidad, tipo)
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const stockResultante = tipo === 'entrada'
    ? item.stock_actual + Number(cantidad)
    : item.stock_actual - Number(cantidad)

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-hm-surface border border-hm-border rounded-xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="font-mono text-lg font-bold mb-1">Ajuste de Stock</h2>
        <p className="text-sm text-hm-muted mb-6 font-mono">{item.sku_codigo} — {item.nombre_repuesto}</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex gap-3">
            {['entrada', 'salida'].map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={`flex-1 py-2 rounded font-mono text-sm font-bold tracking-widest border transition-all ${
                  tipo === t
                    ? t === 'entrada' ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-red-500/20 border-red-500 text-red-400'
                    : 'bg-hm-surface2 border-hm-border text-hm-muted'
                }`}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>

          <div>
            <label className="text-xs font-mono text-hm-muted uppercase tracking-wider mb-1 block">Cantidad</label>
            <input
              type="number"
              min="1"
              value={cantidad}
              onChange={e => setCantidad(e.target.value)}
              className="w-full bg-hm-surface2 border border-hm-border rounded p-2 text-white text-center text-2xl font-bold focus:outline-none focus:border-hm-accent"
            />
          </div>

          <div className="bg-hm-surface2/50 rounded p-3 flex justify-between items-center">
            <span className="text-xs font-mono text-hm-muted">STOCK ACTUAL</span>
            <span className="font-bold">{item.stock_actual} u.</span>
          </div>
          <div className={`rounded p-3 flex justify-between items-center ${stockResultante < 0 ? 'bg-red-900/20 border border-red-800' : 'bg-green-900/10 border border-green-900/30'}`}>
            <span className="text-xs font-mono text-hm-muted">STOCK RESULTANTE</span>
            <span className={`font-bold text-lg ${stockResultante < 0 ? 'text-red-400' : 'text-green-400'}`}>{stockResultante} u.</span>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded border border-hm-border text-hm-muted hover:border-hm-accent/50 font-mono text-sm transition-colors">
              CANCELAR
            </button>
            <button
              type="submit"
              disabled={loading || stockResultante < 0 || Number(cantidad) < 1}
              className="flex-1 py-2 rounded bg-hm-accent text-white font-mono text-sm font-bold disabled:opacity-50 hover:bg-yellow-500 transition-colors"
            >
              {loading ? 'GUARDANDO...' : 'CONFIRMAR'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Módulo Ventas (Inventario de Repuestos) ──────────────────────────────────
export default function Ventas() {
  const { formatUSD } = useDolar()
  const { items, loading, error, ajustarStock, crearItem, archivarItem } = useInventario()

  const [searchQuery, setSearchQuery] = useState('')
  const [filterStock, setFilterStock] = useState('todos') // todos, bajo, ok
  const [selectedItem, setSelectedItem] = useState(null)
  const [crossRefItem, setCrossRefItem] = useState(null)
  const [itemAArchivar, setItemAArchivar] = useState(null)
  const [archivando, setArchivando] = useState(false)
  const [page, setPage] = useState(1)

  useEffect(() => { setPage(1) }, [searchQuery, filterStock])
  const [showNuevoForm, setShowNuevoForm] = useState(false)
  const [nuevoItem, setNuevoItem] = useState({ sku_codigo: '', nombre_repuesto: '', stock_actual: 0, stock_minimo: 5, precio_base_usd: 0, unidad_medida: 'u' })

  const itemsFiltrados = useMemo(() => {
    return items.filter(i => {
      const matchSearch =
        i.nombre_repuesto.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.sku_codigo.toLowerCase().includes(searchQuery.toLowerCase())
      const matchStock =
        filterStock === 'todos' ||
        (filterStock === 'bajo' && i.stock_actual <= i.stock_minimo) ||
        (filterStock === 'ok' && i.stock_actual > i.stock_minimo)
      return matchSearch && matchStock
    })
  }, [items, searchQuery, filterStock])

  const itemsPaginados = useMemo(
    () => itemsFiltrados.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    [itemsFiltrados, page]
  )

  // KPIs
  const bajosStock = items.filter(i => i.stock_actual <= i.stock_minimo).length
  const valorTotal = items.reduce((acc, i) => acc + Number(i.precio_base_usd) * Number(i.stock_actual), 0)

  const handleConfirmarArchivar = async () => {
    if (!itemAArchivar) return
    setArchivando(true)
    try {
      await archivarItem(itemAArchivar.id)
      toast.success(`"${itemAArchivar.nombre_repuesto}" archivado del inventario`)
      setItemAArchivar(null)
    } catch (err) {
      toast.error('Error al archivar: ' + err.message)
    } finally {
      setArchivando(false)
    }
  }

  const handleAjuste = async (id, cantidad, tipo) => {
    await ajustarStock(id, cantidad, tipo)
    toast.success(`Stock ${tipo === 'entrada' ? 'incrementado' : 'reducido'} correctamente`)
  }

  const handleCrearItem = async (e) => {
    e.preventDefault()
    try {
      await crearItem(nuevoItem)
      toast.success('Repuesto agregado al inventario')
      setShowNuevoForm(false)
      setNuevoItem({ sku_codigo: '', nombre_repuesto: '', stock_actual: 0, stock_minimo: 5, precio_base_usd: 0, unidad_medida: 'u' })
    } catch (err) {
      toast.error('Error al crear repuesto: ' + err.message)
    }
  }

  if (error) return (
    <div className="p-6">
      <Card className="p-6 border-red-800 bg-red-900/20 text-red-400">
        <h2 className="font-bold mb-2">Error cargando inventario</h2>
        <p className="font-mono text-sm">{error}</p>
      </Card>
    </div>
  )

  return (
    <div className="flex flex-col gap-8">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-hm-border pb-4">
        <h1 className="text-2xl font-bold">Inventario de Repuestos</h1>
        <Button variant="primary" onClick={() => setShowNuevoForm(v => !v)}>
          {showNuevoForm ? 'CANCELAR' : '+ NUEVO REPUESTO'}
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 border-l-4 border-l-hm-accent bg-hm-surface2/30">
          <div className="text-sm font-mono text-hm-muted mb-1">TOTAL ÍTEMS</div>
          <div className="text-3xl font-bold">{items.length}</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-red-500 bg-hm-surface2/30">
          <div className="text-sm font-mono text-hm-muted mb-1">STOCK BAJO / CRÍTICO</div>
          <div className={`text-3xl font-bold ${bajosStock > 0 ? 'text-red-400' : 'text-green-400'}`}>{bajosStock}</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-blue-500 bg-hm-surface2/30">
          <div className="text-sm font-mono text-hm-muted mb-1">VALOR TOTAL INVENTARIO</div>
          <div className="text-3xl font-bold text-blue-400">{formatUSD(valorTotal)}</div>
        </Card>
      </div>

      {/* FORMULARIO NUEVO REPUESTO */}
      {showNuevoForm && (
        <Card className="p-6 border-hm-accent/30 bg-hm-accent/5">
          <h3 className="font-mono text-hm-accent tracking-widest text-sm mb-4">NUEVO REPUESTO</h3>
          <form onSubmit={handleCrearItem} className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Input label="SKU / Código" value={nuevoItem.sku_codigo} onChange={e => setNuevoItem(p => ({ ...p, sku_codigo: e.target.value }))} required />
            <Input label="Nombre del Repuesto" value={nuevoItem.nombre_repuesto} onChange={e => setNuevoItem(p => ({ ...p, nombre_repuesto: e.target.value }))} required />
            <Input label="Precio Base (USD)" type="number" step="0.01" value={nuevoItem.precio_base_usd} onChange={e => setNuevoItem(p => ({ ...p, precio_base_usd: e.target.value }))} required />
            <Input label="Stock Inicial" type="number" value={nuevoItem.stock_actual} onChange={e => setNuevoItem(p => ({ ...p, stock_actual: e.target.value }))} />
            <Input label="Stock Mínimo (Alerta)" type="number" value={nuevoItem.stock_minimo} onChange={e => setNuevoItem(p => ({ ...p, stock_minimo: e.target.value }))} />
            <div className="flex items-end">
              <Button type="submit" variant="primary" className="w-full">GUARDAR REPUESTO</Button>
            </div>
          </form>
        </Card>
      )}

      {/* BUSCADOR Y FILTROS */}
      <div className="flex flex-col md:flex-row gap-4 items-end bg-hm-surface2/20 p-4 rounded-lg border border-hm-border/50">
        <div className="flex-1 w-full">
          <label className="text-[10px] font-mono text-hm-muted mb-1 block uppercase tracking-widest">Buscar por SKU o nombre</label>
          <Input type="text" placeholder="Filtro, aceite, hidráulica..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {[
            { id: 'todos', label: 'TODOS' },
            { id: 'bajo', label: 'STOCK BAJO' },
            { id: 'ok', label: 'STOCK OK' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterStock(f.id)}
              className={`px-3 py-2 rounded text-[10px] font-bold tracking-tighter transition-all border ${
                filterStock === f.id
                  ? 'bg-hm-accent border-hm-accent text-white'
                  : 'bg-hm-surface border-hm-border text-hm-muted hover:border-hm-accent/50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* TABLA DE INVENTARIO */}
      <Card className="overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-hm-surface2/50 border-b border-hm-border">
            <tr>
              <th className="p-4 font-mono text-xs text-hm-muted">SKU</th>
              <th className="p-4 font-mono text-xs text-hm-muted">REPUESTO</th>
              <th className="p-4 font-mono text-xs text-hm-muted text-center">STOCK</th>
              <th className="p-4 font-mono text-xs text-hm-muted text-center">MÍN.</th>
              <th className="p-4 font-mono text-xs text-hm-muted text-right">PRECIO UNIT.</th>
              <th className="p-4 font-mono text-xs text-hm-muted text-right">VALOR TOTAL</th>
              <th className="p-4 font-mono text-xs text-hm-muted text-center">ESTADO</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1, 2, 3, 4].map(i => (
                <tr key={i} className="border-b border-hm-border">
                  <td className="p-4"><div className="h-4 bg-hm-surface2 rounded animate-pulse w-24" /></td>
                  <td className="p-4"><div className="h-4 bg-hm-surface2 rounded animate-pulse w-48" /></td>
                  <td className="p-4"><div className="h-4 bg-hm-surface2 rounded animate-pulse w-12 mx-auto" /></td>
                  <td className="p-4"><div className="h-4 bg-hm-surface2 rounded animate-pulse w-12 mx-auto" /></td>
                  <td className="p-4"><div className="h-4 bg-hm-surface2 rounded animate-pulse w-20 ml-auto" /></td>
                  <td className="p-4"><div className="h-4 bg-hm-surface2 rounded animate-pulse w-24 ml-auto" /></td>
                  <td className="p-4"><div className="h-4 bg-hm-surface2 rounded animate-pulse w-16 mx-auto" /></td>
                  <td className="p-4" />
                </tr>
              ))
            ) : itemsFiltrados.length === 0 ? (
              <tr>
                <td colSpan="8" className="p-8 text-center text-hm-muted font-mono text-sm">
                  No se encontraron ítems con los filtros aplicados.
                </td>
              </tr>
            ) : (
              itemsPaginados.map(item => {
                const bajoPorcentaje = (item.stock_actual / Math.max(item.stock_minimo, 1)) * 100
                const esCritico = item.stock_actual === 0
                const esBajo = item.stock_actual <= item.stock_minimo && !esCritico
                return (
                  <tr key={item.id} className={`border-b border-hm-border hover:bg-hm-surface2/30 transition-colors ${esCritico ? 'bg-red-900/5' : esBajo ? 'bg-yellow-900/5' : ''}`}>
                    <td className="p-4 font-mono text-xs text-hm-muted">{item.sku_codigo}</td>
                    <td className="p-4 font-medium text-sm">{item.nombre_repuesto}</td>
                    <td className="p-4 text-center">
                      <span className={`font-bold text-lg ${esCritico ? 'text-red-400' : esBajo ? 'text-yellow-400' : 'text-green-400'}`}>
                        {item.stock_actual}
                      </span>
                    </td>
                    <td className="p-4 text-center font-mono text-sm text-hm-muted">{item.stock_minimo}</td>
                    <td className="p-4 text-right font-mono text-sm">{formatUSD(item.precio_base_usd)}</td>
                    <td className="p-4 text-right font-mono text-sm text-blue-400">
                      {formatUSD(item.precio_base_usd * item.stock_actual)}
                    </td>
                    <td className="p-4 text-center">
                      <Badge variant={esCritico ? 'taller' : esBajo ? 'ventas' : 'info'}>
                        {esCritico ? 'SIN STOCK' : esBajo ? 'BAJO' : 'OK'}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setCrossRefItem(item)}
                          className="px-3 py-1 text-xs font-mono font-bold border border-hm-border rounded hover:border-blue-500 hover:text-blue-400 transition-colors"
                        >
                          COMPAT.
                        </button>
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="px-3 py-1 text-xs font-mono font-bold border border-hm-border rounded hover:border-hm-accent hover:text-hm-accent transition-colors"
                        >
                          AJUSTAR
                        </button>
                        <button
                          onClick={() => setItemAArchivar(item)}
                          className="px-3 py-1 text-xs font-mono font-bold border border-red-900/50 text-red-500/70 rounded hover:border-red-700 hover:text-red-400 transition-colors"
                        >
                          ARCHIVAR
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
        <Pagination
          total={itemsFiltrados.length}
          page={page}
          perPage={PER_PAGE}
          onPageChange={setPage}
        />
      </Card>

      {/* MODAL CROSS REFERENCE */}
      {crossRefItem && (
        <ModalCrossReference item={crossRefItem} onClose={() => setCrossRefItem(null)} />
      )}

      {/* MODAL AJUSTE STOCK */}
      {selectedItem && (
        <ModalAjusteStock
          item={selectedItem}
          onConfirm={handleAjuste}
          onClose={() => setSelectedItem(null)}
        />
      )}

      <ModalConfirm
        isOpen={!!itemAArchivar}
        titulo="Archivar Repuesto"
        mensaje={`¿Archivar "${itemAArchivar?.nombre_repuesto}" (${itemAArchivar?.sku_codigo})? Dejará de aparecer en el inventario activo.`}
        confirmLabel="Archivar"
        onConfirm={handleConfirmarArchivar}
        onClose={() => setItemAArchivar(null)}
        loading={archivando}
      />
    </div>
  )
}
