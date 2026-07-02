import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useDolar } from '../../context/DolarContext'
import { suggestStock } from '../../lib/aiEngines'
import { SilentBadge } from '../../components/ai/SilentBadge'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Pagination from '../../components/ui/Pagination'
import { useInventario, useInventarioKpis } from '../../hooks/useInventario'

const PER_PAGE = 12

const EMPTY_FORM = {
  sku: '',
  nombre: '',
  descripcion: '',
  unidad: 'unidad',
  costo_usd: '',
  precio_usd: '',
  stock_actual: '',
  stock_minimo: '',
}

function stockVariant(actual, minimo) {
  if (Number(actual) <= 0) return 'danger'
  if (Number(actual) <= Number(minimo)) return 'warn'
  return 'success'
}

function stockLabel(actual, minimo) {
  if (Number(actual) <= 0) return 'SIN DISPONIBILIDAD'
  if (Number(actual) <= Number(minimo)) return 'BAJO MÍNIMO'
  return 'DISPONIBLE'
}

export default function Repuestos() {
  const { perfil } = useAuth()
  const { formatUSD } = useDolar()

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { items: repuestos, totalCount, loading, crearItem, updateItem, archivarItem, fetchItems } = useInventario({
    page,
    pageSize: PER_PAGE,
    search
  })

  const { kpis } = useInventarioKpis()

  const [editando, setEditando] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [movModal, setMovModal] = useState(null)
  const [histModal, setHistModal] = useState(null)
  const [historial, setHistorial] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [movForm, setMovForm] = useState({ tipo: 'entrada', cantidad: '', notas: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { setPage(1) }, [search])

  const handleOpenNuevo = () => {
    setEditando(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  const handleOpenEditar = (item) => {
    setEditando(item)
    setForm({
      sku: item.sku || '',
      nombre: item.nombre,
      descripcion: item.descripcion || '',
      unidad: item.unidad || 'unidad',
      costo_usd: item.costo_usd,
      precio_usd: item.precio_usd,
      stock_actual: item.stock_actual,
      stock_minimo: item.stock_minimo,
    })
    setModalOpen(true)
  }

  const handleSave = async (event) => {
    event.preventDefault()

    if (!form.nombre.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }

    if (!perfil?.organization_id) {
      toast.error('No se pudo determinar la organización. Volvé a iniciar sesión.')
      return
    }

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
        await updateItem(editando.id, payload)
        toast.success('Ítem actualizado')
      } else {
        await crearItem(payload)
        toast.success('Ítem creado')
      }

      setModalOpen(false)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleMovimiento = async (event) => {
    event.preventDefault()

    if (!movForm.cantidad || Number(movForm.cantidad) <= 0) {
      toast.error('Cantidad inválida')
      return
    }

    setSaving(true)

    try {
      const { error } = await supabase.rpc('registrar_movimiento_stock', {
        p_repuesto_id: movModal.id,
        p_tipo: movForm.tipo,
        p_cantidad: Number(movForm.cantidad),
        p_notas: movForm.notas || null,
      })

      if (error) throw error

      toast.success('Movimiento registrado')
      setMovModal(null)
      setMovForm({ tipo: 'entrada', cantidad: '', notas: '' })
      fetchItems()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleVerHistorial = async (item) => {
    setHistModal(item)

    const { data, error } = await supabase
      .from('stock_movimientos')
      .select('*, perfiles:creado_por(nombre_completo)')
      .eq('repuesto_id', item.id)
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) {
      toast.error('No se pudo cargar el historial de movimientos')
      console.error('handleVerHistorial:', error.message)
      return
    }

    setHistorial(data || [])
  }

  const handleEliminar = async (item) => {
    if (!confirm(`¿Dar de baja "${item.nombre}"?`)) return

    try {
      await archivarItem(item.id)
      toast.success('Ítem dado de baja')
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleExport = () => {
    if (!repuestos.length) {
      toast.error('Sin datos para exportar en esta página')
      return
    }

    const rows = repuestos.map((item) => ({
      SKU: item.sku || '—',
      NOMBRE: item.nombre,
      UNIDAD: item.unidad,
      'DISPONIBLE ACTUAL': item.stock_actual,
      'MÍNIMO DEFINIDO': item.stock_minimo,
      'COSTO USD': item.costo_usd,
      'PRECIO USD': item.precio_usd,
      ESTADO: stockLabel(item.stock_actual, item.stock_minimo),
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(wb, ws, 'Inventario')
    XLSX.writeFile(wb, `Inventario_${new Date().toISOString().slice(0, 10)}.xlsx`)

    toast.success('Excel generado')
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-hm-border pb-4">
        <div>
          <h1 className="text-2xl font-bold">Inventario</h1>
          <p className="mt-1 text-sm text-hm-muted">
            Control de repuestos, consumibles, stock disponible, mínimos y movimientos.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            EXPORTAR EXCEL
          </Button>

          <Button variant="primary" onClick={handleOpenNuevo}>
            + ÍTEM
          </Button>
        </div>
      </div>

      <div className="flex gap-4 items-end bg-hm-surface2/20 p-4 rounded-lg border border-hm-border/50">
        <div className="flex-1">
          <label className="text-[10px] font-mono text-hm-muted mb-1 block uppercase tracking-widest">
            Buscar
          </label>

          <Input
            placeholder="Buscar por nombre o SKU..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="flex gap-4 text-xs font-mono text-hm-muted">
          <span>
            Total:{' '}
            <span className="text-hm-text font-bold">
              {kpis.total}
            </span>
          </span>

          <span className="text-red-400">
            Sin disponibilidad:{' '}
            <span className="font-bold">
              {kpis.sin_disponibilidad}
            </span>
          </span>

          <span className="text-yellow-400">
            Bajo mínimo:{' '}
            <span className="font-bold">
              {kpis.bajo_minimo}
            </span>
          </span>
        </div>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-hm-surface2/50 border-b border-hm-border">
            <tr>
              <th className="p-4 font-mono text-xs text-hm-muted">SKU</th>
              <th className="p-4 font-mono text-xs text-hm-muted">ÍTEM</th>
              <th className="p-4 font-mono text-xs text-hm-muted">DISPONIBLE</th>
              <th className="p-4 font-mono text-xs text-hm-muted">MÍNIMO</th>
              <th className="p-4 font-mono text-xs text-hm-muted">PRECIO USD</th>
              <th className="p-4 font-mono text-xs text-hm-muted text-right">INMOVILIZADO</th>
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
            ) : repuestos.length === 0 ? (
              <tr>
                <td colSpan="8" className="p-10 text-center text-hm-muted font-mono text-sm">
                  No hay ítems cargados en inventario.
                </td>
              </tr>
            ) : (
              repuestos.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-hm-border hover:bg-hm-surface2/30 transition-colors"
                >
                  <td className="p-4 font-mono text-xs text-hm-muted">
                    {item.sku || '—'}
                  </td>

                  <td className="p-4">
                    <div className="font-medium text-sm flex items-center gap-2">
                      {item.nombre}

                      {(() => {
                        const suggestion = suggestStock(item)
                        return suggestion ? (
                          <SilentBadge
                            type={suggestion.type}
                            message={suggestion.message}
                            iconOnly
                          />
                        ) : null
                      })()}
                    </div>

                    {item.descripcion && (
                      <div className="text-xs text-hm-muted truncate max-w-[200px]">
                        {item.descripcion}
                      </div>
                    )}
                  </td>

                  <td className="p-4 font-bold text-sm">
                    {item.stock_actual}{' '}
                    <span className="text-xs text-hm-muted font-mono font-normal">
                      {item.unidad}
                    </span>
                  </td>

                  <td className="p-4 font-mono text-sm text-hm-muted">
                    {item.stock_minimo}
                  </td>

                  <td className="p-4 font-mono text-sm text-green-400">
                    {formatUSD(item.precio_usd)}
                  </td>

                  <td className="p-4 font-mono text-sm text-orange-400 text-right">
                    {formatUSD((Number(item.costo_usd) || 0) * (Number(item.stock_actual) || 0))}
                  </td>

                  <td className="p-4">
                    <Badge variant={stockVariant(item.stock_actual, item.stock_minimo)}>
                      {stockLabel(item.stock_actual, item.stock_minimo)}
                    </Badge>
                  </td>

                  <td className="p-4">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleVerHistorial(item)}
                        className="text-[10px] font-mono text-hm-muted hover:text-hm-text border border-hm-border hover:border-hm-border/80 rounded px-2 py-1 transition-colors"
                      >
                        MOVIMIENTOS
                      </button>

                      <button
                        onClick={() => {
                          setMovModal(item)
                          setMovForm({ tipo: 'entrada', cantidad: '', notas: '' })
                        }}
                        className="text-[10px] font-mono text-hm-accent border border-hm-accent/30 hover:border-hm-accent rounded px-2 py-1 transition-colors"
                      >
                        REGISTRAR
                      </button>

                      <button
                        onClick={() => handleOpenEditar(item)}
                        className="text-[10px] font-mono text-hm-muted hover:text-hm-text border border-hm-border rounded px-2 py-1 transition-colors"
                      >
                        EDITAR
                      </button>

                      <button
                        onClick={() => handleEliminar(item)}
                        className="text-[10px] font-mono text-red-400/60 hover:text-red-400 border border-red-900/30 hover:border-red-700 rounded px-2 py-1 transition-colors"
                      >
                        BAJA
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <Pagination total={totalCount} page={page} perPage={PER_PAGE} onPageChange={setPage} />
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editando ? 'Editar ítem' : 'Nuevo ítem'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="SKU"
              value={form.sku}
              onChange={(event) => setForm((prev) => ({ ...prev, sku: event.target.value }))}
              placeholder="Opcional"
            />

            <Input
              label="Unidad"
              value={form.unidad}
              onChange={(event) => setForm((prev) => ({ ...prev, unidad: event.target.value }))}
            />
          </div>

          <Input
            label="Nombre *"
            value={form.nombre}
            onChange={(event) => setForm((prev) => ({ ...prev, nombre: event.target.value }))}
            required
          />

          <Input
            label="Descripción"
            value={form.descripcion}
            onChange={(event) => setForm((prev) => ({ ...prev, descripcion: event.target.value }))}
            placeholder="Opcional"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Costo USD"
              type="number"
              step="0.01"
              value={form.costo_usd}
              onChange={(event) => setForm((prev) => ({ ...prev, costo_usd: event.target.value }))}
            />

            <Input
              label="Precio USD"
              type="number"
              step="0.01"
              value={form.precio_usd}
              onChange={(event) => setForm((prev) => ({ ...prev, precio_usd: event.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Disponible actual"
              type="number"
              step="0.01"
              value={form.stock_actual}
              onChange={(event) => setForm((prev) => ({ ...prev, stock_actual: event.target.value }))}
            />

            <Input
              label="Mínimo definido"
              type="number"
              step="0.01"
              value={form.stock_minimo}
              onChange={(event) => setForm((prev) => ({ ...prev, stock_minimo: event.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-hm-border">
            <Button variant="outline" type="button" onClick={() => setModalOpen(false)}>
              CANCELAR
            </Button>

            <Button type="submit" disabled={saving}>
              {saving ? 'GUARDANDO...' : editando ? 'GUARDAR' : 'CREAR'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!movModal}
        onClose={() => setMovModal(null)}
        title={`Registrar movimiento — ${movModal?.nombre}`}
        maxWidth="max-w-sm"
      >
        <form onSubmit={handleMovimiento} className="flex flex-col gap-4">
          <div>
            <label className="text-[10px] font-mono text-hm-muted mb-1 block uppercase tracking-widest">
              Tipo de movimiento
            </label>

            <div className="flex gap-2">
              {['entrada', 'salida', 'ajuste'].map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => setMovForm((prev) => ({ ...prev, tipo }))}
                  className={`flex-1 py-2 rounded text-xs font-bold border transition-all ${
                    movForm.tipo === tipo
                      ? tipo === 'entrada'
                        ? 'bg-green-500/20 border-green-500 text-green-400'
                        : tipo === 'salida'
                          ? 'bg-red-500/20 border-red-500 text-red-400'
                          : 'bg-blue-500/20 border-blue-500 text-blue-400'
                      : 'bg-hm-surface border-hm-border text-hm-muted hover:border-hm-accent/40'
                  }`}
                >
                  {tipo.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <Input
            label={movForm.tipo === 'ajuste' ? 'Nuevo disponible total' : 'Cantidad'}
            type="number"
            step="0.01"
            value={movForm.cantidad}
            onChange={(event) => setMovForm((prev) => ({ ...prev, cantidad: event.target.value }))}
            required
          />

          <Input
            label="Notas"
            value={movForm.notas}
            onChange={(event) => setMovForm((prev) => ({ ...prev, notas: event.target.value }))}
            placeholder="Motivo, referencia, documento, OT, OC..."
          />

          <div className="bg-hm-surface2/30 rounded p-3 font-mono text-sm text-hm-muted">
            Disponible actual:{' '}
            <span className="text-hm-text font-bold">
              {movModal?.stock_actual}
            </span>{' '}
            {movModal?.unidad}
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-hm-border">
            <Button variant="outline" type="button" onClick={() => setMovModal(null)}>
              CANCELAR
            </Button>

            <Button type="submit" disabled={saving}>
              {saving ? '...' : 'REGISTRAR'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!histModal}
        onClose={() => setHistModal(null)}
        title={`Movimientos — ${histModal?.nombre}`}
        maxWidth="max-w-lg"
      >
        <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
          {historial.length === 0 ? (
            <p className="text-center text-hm-muted font-mono text-sm py-8">
              Sin movimientos registrados.
            </p>
          ) : (
            historial.map((movimiento) => (
              <div
                key={movimiento.id}
                className="flex items-center justify-between bg-hm-surface2/20 rounded px-4 py-3 border border-hm-border/50"
              >
                <div>
                  <span
                    className={`text-xs font-bold mr-2 ${
                      movimiento.tipo === 'entrada'
                        ? 'text-green-400'
                        : movimiento.tipo === 'salida'
                          ? 'text-red-400'
                          : 'text-blue-400'
                    }`}
                  >
                    {movimiento.tipo.toUpperCase()}
                  </span>

                  <span className="font-mono text-sm font-bold">
                    {movimiento.tipo === 'ajuste'
                      ? `→ ${movimiento.cantidad}`
                      : movimiento.tipo === 'entrada'
                        ? `+${movimiento.cantidad}`
                        : `-${movimiento.cantidad}`}
                  </span>

                  {movimiento.notas && (
                    <p className="text-xs text-hm-muted mt-0.5">
                      {movimiento.notas}
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <div className="text-xs font-mono text-hm-muted">
                    {new Date(movimiento.created_at).toLocaleDateString('es-AR')}
                  </div>

                  {movimiento.perfiles?.nombre_completo && (
                    <div className="text-xs text-hm-muted">
                      {movimiento.perfiles.nombre_completo}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pt-4 border-t border-hm-border flex justify-end">
          <Button variant="ghost" onClick={() => setHistModal(null)}>
            Cerrar
          </Button>
        </div>
      </Modal>
    </div>
  )
}
