import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useDolar } from '../../context/DolarContext'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'

const EMPTY_FORM = {
  sku: '', nombre: '', descripcion: '', unidad: 'unidad',
  costo_usd: '', precio_usd: '', stock_actual: '', stock_minimo: '',
}

function stockVariant(actual, minimo) {
  if (Number(actual) <= 0) return 'danger'
  if (Number(actual) <= Number(minimo)) return 'warn'
  return 'success'
}

function stockLabel(actual, minimo) {
  if (Number(actual) <= 0) return 'SIN STOCK'
  if (Number(actual) <= Number(minimo)) return 'BAJO'
  return 'OK'
}

export default function Repuestos() {
  const { perfil } = useAuth()
  const { formatUSD } = useDolar()
  const [repuestos, setRepuestos]     = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [editando, setEditando]       = useState(null)   // null = nuevo, obj = editar
  const [modalOpen, setModalOpen]     = useState(false)
  const [movModal, setMovModal]       = useState(null)   // repuesto para movimiento
  const [histModal, setHistModal]     = useState(null)   // repuesto para historial
  const [historial, setHistorial]     = useState([])
  const [form, setForm]               = useState(EMPTY_FORM)
  const [movForm, setMovForm]         = useState({ tipo: 'entrada', cantidad: '', notas: '' })
  const [saving, setSaving]           = useState(false)

  const fetchRepuestos = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('repuestos')
      .select('*')
      .eq('activo', true)
      .order('nombre')
    if (error) toast.error(error.message)
    setRepuestos(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchRepuestos() }, [])

  const filtrados = useMemo(() =>
    repuestos.filter(r =>
      r.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (r.sku || '').toLowerCase().includes(search.toLowerCase())
    ), [repuestos, search])

  const handleOpenNuevo = () => {
    setEditando(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  const handleOpenEditar = (rep) => {
    setEditando(rep)
    setForm({
      sku: rep.sku || '', nombre: rep.nombre, descripcion: rep.descripcion || '',
      unidad: rep.unidad || 'unidad', costo_usd: rep.costo_usd, precio_usd: rep.precio_usd,
      stock_actual: rep.stock_actual, stock_minimo: rep.stock_minimo,
    })
    setModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.nombre.trim()) { toast.error('El nombre es obligatorio'); return }
    setSaving(true)
    try {
      const payload = {
        sku: form.sku || null,
        nombre: form.nombre.trim(),
        descripcion: form.descripcion || null,
        unidad: form.unidad || 'unidad',
        costo_usd: Number(form.costo_usd) || 0,
        precio_usd: Number(form.precio_usd) || 0,
        stock_actual: Number(form.stock_actual) || 0,
        stock_minimo: Number(form.stock_minimo) || 0,
      }
      if (editando) {
        const { error } = await supabase.from('repuestos').update(payload).eq('id', editando.id)
        if (error) throw error
        toast.success('Repuesto actualizado')
      } else {
        const { error } = await supabase.from('repuestos').insert({ ...payload, organization_id: perfil.organization_id })
        if (error) throw error
        toast.success('Repuesto creado')
      }
      setModalOpen(false)
      fetchRepuestos()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const handleMovimiento = async (e) => {
    e.preventDefault()
    if (!movForm.cantidad || Number(movForm.cantidad) <= 0) { toast.error('Cantidad inválida'); return }
    setSaving(true)
    try {
      const { error } = await supabase.rpc('registrar_movimiento_stock', {
        p_repuesto_id:     movModal.id,
        p_tipo:            movForm.tipo,
        p_cantidad:        Number(movForm.cantidad),
        p_notas:           movForm.notas || null,
      })
      if (error) throw error
      toast.success('Movimiento registrado')
      setMovModal(null)
      setMovForm({ tipo: 'entrada', cantidad: '', notas: '' })
      fetchRepuestos()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const handleVerHistorial = async (rep) => {
    setHistModal(rep)
    const { data } = await supabase
      .from('stock_movimientos')
      .select('*, perfiles:creado_por(nombre_completo)')
      .eq('repuesto_id', rep.id)
      .order('created_at', { ascending: false })
      .limit(30)
    setHistorial(data || [])
  }

  const handleEliminar = async (rep) => {
    if (!confirm(`¿Dar de baja "${rep.nombre}"?`)) return
    await supabase.from('repuestos').update({ activo: false }).eq('id', rep.id)
    toast.success('Repuesto dado de baja')
    fetchRepuestos()
  }

  const handleExport = () => {
    if (!filtrados.length) { toast.error('Sin datos para exportar'); return }
    const rows = filtrados.map(r => ({
      SKU: r.sku || '—', NOMBRE: r.nombre, UNIDAD: r.unidad,
      'STOCK ACTUAL': r.stock_actual, 'STOCK MÍNIMO': r.stock_minimo,
      'COSTO USD': r.costo_usd, 'PRECIO USD': r.precio_usd,
      ESTADO: stockLabel(r.stock_actual, r.stock_minimo),
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Repuestos')
    XLSX.writeFile(wb, `Repuestos_${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success('Excel generado')
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-hm-border pb-4">
        <h1 className="text-2xl font-bold">REPUESTOS / STOCK</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>EXPORTAR EXCEL</Button>
          <Button variant="primary" onClick={handleOpenNuevo}>+ REPUESTO</Button>
        </div>
      </div>

      <div className="flex gap-4 items-end bg-hm-surface2/20 p-4 rounded-lg border border-hm-border/50">
        <div className="flex-1">
          <label className="text-[10px] font-mono text-hm-muted mb-1 block uppercase tracking-widest">Buscar</label>
          <Input
            placeholder="Buscar por nombre o SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-4 text-xs font-mono text-hm-muted">
          <span>Total: <span className="text-hm-text font-bold">{repuestos.length}</span></span>
          <span className="text-red-400">Sin stock: <span className="font-bold">{repuestos.filter(r => Number(r.stock_actual) <= 0).length}</span></span>
          <span className="text-yellow-400">Bajo: <span className="font-bold">{repuestos.filter(r => Number(r.stock_actual) > 0 && Number(r.stock_actual) <= Number(r.stock_minimo)).length}</span></span>
        </div>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-hm-surface2/50 border-b border-hm-border">
            <tr>
              <th className="p-4 font-mono text-xs text-hm-muted">SKU</th>
              <th className="p-4 font-mono text-xs text-hm-muted">NOMBRE</th>
              <th className="p-4 font-mono text-xs text-hm-muted">STOCK</th>
              <th className="p-4 font-mono text-xs text-hm-muted">MÍNIMO</th>
              <th className="p-4 font-mono text-xs text-hm-muted">PRECIO USD</th>
              <th className="p-4 font-mono text-xs text-hm-muted text-right">INMOVILIZADO</th>
              <th className="p-4 font-mono text-xs text-hm-muted">ESTADO</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1, 2, 3].map(i => (
                <tr key={i} className="border-b border-hm-border">
                  {[1,2,3,4,5,6,7,8].map(j => (
                    <td key={j} className="p-4"><div className="h-4 bg-hm-surface2 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : filtrados.length === 0 ? (
              <tr><td colSpan="8" className="p-10 text-center text-hm-muted font-mono text-sm">No hay repuestos. Agregá el primero.</td></tr>
            ) : filtrados.map(rep => (
              <tr key={rep.id} className="border-b border-hm-border hover:bg-hm-surface2/30 transition-colors">
                <td className="p-4 font-mono text-xs text-hm-muted">{rep.sku || '—'}</td>
                <td className="p-4">
                  <div className="font-medium text-sm flex items-center gap-2">
                    {rep.nombre}
                    {Number(rep.stock_actual) <= Number(rep.stock_minimo) && (
                      <span className="text-[9px] font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30 px-1.5 py-0.5 rounded" title="IA Silenciosa: Sugerimos reponer stock urgente. Lead time prom: 3 días.">
                        💡 SUGERENCIA COMPRA
                      </span>
                    )}
                  </div>
                  {rep.descripcion && <div className="text-xs text-hm-muted truncate max-w-[200px]">{rep.descripcion}</div>}
                </td>
                <td className="p-4 font-bold text-sm">{rep.stock_actual} <span className="text-xs text-hm-muted font-mono font-normal">{rep.unidad}</span></td>
                <td className="p-4 font-mono text-sm text-hm-muted">{rep.stock_minimo}</td>
                <td className="p-4 font-mono text-sm text-green-400">{formatUSD(rep.precio_usd)}</td>
                <td className="p-4 font-mono text-sm text-orange-400 text-right">{formatUSD((Number(rep.costo_usd) || 0) * (Number(rep.stock_actual) || 0))}</td>
                <td className="p-4">
                  <Badge variant={stockVariant(rep.stock_actual, rep.stock_minimo)}>
                    {stockLabel(rep.stock_actual, rep.stock_minimo)}
                  </Badge>
                </td>
                <td className="p-4">
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => handleVerHistorial(rep)}
                      className="text-[10px] font-mono text-hm-muted hover:text-hm-text border border-hm-border hover:border-hm-border/80 rounded px-2 py-1 transition-colors"
                    >
                      HISTORIAL
                    </button>
                    <button
                      onClick={() => { setMovModal(rep); setMovForm({ tipo: 'entrada', cantidad: '', notas: '' }) }}
                      className="text-[10px] font-mono text-hm-accent border border-hm-accent/30 hover:border-hm-accent rounded px-2 py-1 transition-colors"
                    >
                      MOVIMIENTO
                    </button>
                    <button
                      onClick={() => handleOpenEditar(rep)}
                      className="text-[10px] font-mono text-hm-muted hover:text-hm-text border border-hm-border rounded px-2 py-1 transition-colors"
                    >
                      EDITAR
                    </button>
                    <button
                      onClick={() => handleEliminar(rep)}
                      className="text-[10px] font-mono text-red-400/60 hover:text-red-400 border border-red-900/30 hover:border-red-700 rounded px-2 py-1 transition-colors"
                    >
                      BAJA
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* MODAL AGREGAR / EDITAR REPUESTO */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editando ? 'Editar Repuesto' : 'Nuevo Repuesto'} maxWidth="max-w-lg">
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="SKU" value={form.sku} onChange={e => setForm(p => ({ ...p, sku: e.target.value }))} placeholder="Opcional" />
            <Input label="Unidad" value={form.unidad} onChange={e => setForm(p => ({ ...p, unidad: e.target.value }))} />
          </div>
          <Input label="Nombre *" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} required />
          <Input label="Descripción" value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="Opcional" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Costo USD" type="number" step="0.01" value={form.costo_usd} onChange={e => setForm(p => ({ ...p, costo_usd: e.target.value }))} />
            <Input label="Precio USD" type="number" step="0.01" value={form.precio_usd} onChange={e => setForm(p => ({ ...p, precio_usd: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Stock Actual" type="number" step="0.01" value={form.stock_actual} onChange={e => setForm(p => ({ ...p, stock_actual: e.target.value }))} />
            <Input label="Stock Mínimo" type="number" step="0.01" value={form.stock_minimo} onChange={e => setForm(p => ({ ...p, stock_minimo: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-hm-border">
            <Button variant="outline" type="button" onClick={() => setModalOpen(false)}>CANCELAR</Button>
            <Button type="submit" disabled={saving}>{saving ? 'GUARDANDO...' : editando ? 'GUARDAR' : 'CREAR'}</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL MOVIMIENTO DE STOCK */}
      <Modal isOpen={!!movModal} onClose={() => setMovModal(null)} title={`Movimiento — ${movModal?.nombre}`} maxWidth="max-w-sm">
        <form onSubmit={handleMovimiento} className="flex flex-col gap-4">
          <div>
            <label className="text-[10px] font-mono text-hm-muted mb-1 block uppercase tracking-widest">Tipo</label>
            <div className="flex gap-2">
              {['entrada', 'salida', 'ajuste'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setMovForm(p => ({ ...p, tipo: t }))}
                  className={`flex-1 py-2 rounded text-xs font-bold border transition-all ${
                    movForm.tipo === t
                      ? t === 'entrada' ? 'bg-green-500/20 border-green-500 text-green-400'
                        : t === 'salida' ? 'bg-red-500/20 border-red-500 text-red-400'
                        : 'bg-blue-500/20 border-blue-500 text-blue-400'
                      : 'bg-hm-surface border-hm-border text-hm-muted hover:border-hm-accent/40'
                  }`}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <Input
            label={movForm.tipo === 'ajuste' ? 'Nuevo stock total' : 'Cantidad'}
            type="number"
            step="0.01"
            value={movForm.cantidad}
            onChange={e => setMovForm(p => ({ ...p, cantidad: e.target.value }))}
            required
          />
          <Input
            label="Notas (opcional)"
            value={movForm.notas}
            onChange={e => setMovForm(p => ({ ...p, notas: e.target.value }))}
            placeholder="Motivo, referencia, etc."
          />
          <div className="bg-hm-surface2/30 rounded p-3 font-mono text-sm text-hm-muted">
            Stock actual: <span className="text-hm-text font-bold">{movModal?.stock_actual}</span> {movModal?.unidad}
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-hm-border">
            <Button variant="outline" type="button" onClick={() => setMovModal(null)}>CANCELAR</Button>
            <Button type="submit" disabled={saving}>{saving ? '...' : 'REGISTRAR'}</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL HISTORIAL */}
      <Modal isOpen={!!histModal} onClose={() => setHistModal(null)} title={`Historial — ${histModal?.nombre}`} maxWidth="max-w-lg">
        <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
          {historial.length === 0 ? (
            <p className="text-center text-hm-muted font-mono text-sm py-8">Sin movimientos registrados.</p>
          ) : historial.map(m => (
            <div key={m.id} className="flex items-center justify-between bg-hm-surface2/20 rounded px-4 py-3 border border-hm-border/50">
              <div>
                <span className={`text-xs font-bold mr-2 ${m.tipo === 'entrada' ? 'text-green-400' : m.tipo === 'salida' ? 'text-red-400' : 'text-blue-400'}`}>
                  {m.tipo.toUpperCase()}
                </span>
                <span className="font-mono text-sm font-bold">{m.tipo === 'ajuste' ? `→ ${m.cantidad}` : m.tipo === 'entrada' ? `+${m.cantidad}` : `-${m.cantidad}`}</span>
                {m.notas && <p className="text-xs text-hm-muted mt-0.5">{m.notas}</p>}
              </div>
              <div className="text-right">
                <div className="text-xs font-mono text-hm-muted">{new Date(m.created_at).toLocaleDateString('es-AR')}</div>
                {m.perfiles?.nombre_completo && (
                  <div className="text-xs text-hm-muted">{m.perfiles.nombre_completo}</div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="pt-4 border-t border-hm-border flex justify-end">
          <Button variant="ghost" onClick={() => setHistModal(null)}>Cerrar</Button>
        </div>
      </Modal>
    </div>
  )
}
