import { useState, useMemo, useEffect } from 'react'
import { toast } from 'sonner'
import { isValidCuit, formatCuit } from '../../lib/cuitValidator'
import { generateOCPDF } from '../../lib/pdfGenerator'
import { useProveedores, fetchComprasProveedor, fetchRepuestosProveedor, crearCompra, recibirCompra, fetchActivosProveedor, vincularActivo, desvincularActivo, calcRiskScore, riskLabel, fetchCentrosCosto } from '../../hooks/useProveedores'
import { useAuth } from '../../context/AuthContext'
import { useDolar } from '../../context/DolarContext'
import Modal from '../../components/ui/Modal'
import ModalConfirm from '../../components/ui/ModalConfirm'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Input from '../../components/ui/Input'
import Pagination from '../../components/ui/Pagination'

const PER_PAGE = 12

const RUBROS = ['Repuestos', 'Lubricantes', 'Neumáticos', 'Hidráulica', 'Eléctrico', 'Herramientas', 'Combustible', 'Servicios', 'Logística', 'Otros']
const CONDICIONES_PAGO = ['contado', '15 días', '30 días', '45 días', '60 días', 'consignación']

const ESTADO_COLOR = {
  activo:    'text-green-400 bg-green-500/10 border-green-500/30',
  preferido: 'text-hm-accent bg-hm-accent/10 border-hm-accent/30',
  riesgoso:  'text-red-400 bg-red-500/10 border-red-500/30',
  inactivo:  'text-hm-muted bg-hm-surface2 border-hm-border',
}

const ESTADO_COMPRA_COLOR = {
  borrador:          'default',
  pendiente:         'warning',
  recibido_parcial:  'info',
  recibido:          'success',
  cancelado:         'danger',
}

const CATEGORIAS_COMPRA = ['repuesto','activo','servicio','combustible','lubricante','herramienta','otro']
const TIPOS_RELACION_ACTIVO = ['fabricante','distribuidor','service','garantia','repuestos']

const EMPTY_FORM = {
  empresa: '', cuit: '', rubro: '', contacto_nombre: '', telefono: '', email: '',
  condicion_pago: 'contado', tiempo_entrega_dias: 3, rating: 3,
  estado: 'activo', observaciones: '',
  incidencias: 0, entregas_a_tiempo: 0, entregas_tarde: 0,
}

function Stars({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(n => (
        <button key={n} type="button" onClick={() => onChange?.(n)}
          className={`text-lg transition-colors ${n <= value ? 'text-yellow-400' : 'text-hm-border hover:text-yellow-300'}`}>
          ★
        </button>
      ))}
    </div>
  )
}

function ModalProveedor({ isOpen, onClose, proveedor, onConfirm }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    setForm(proveedor ? {
      empresa:           proveedor.empresa || '',
      cuit:              proveedor.cuit || '',
      rubro:             proveedor.rubro || '',
      contacto_nombre:   proveedor.contacto_nombre || '',
      telefono:          proveedor.telefono || '',
      email:             proveedor.email || '',
      condicion_pago:    proveedor.condicion_pago || 'contado',
      tiempo_entrega_dias: proveedor.tiempo_entrega_dias ?? 3,
      rating:            proveedor.rating ?? 3,
      estado:            proveedor.estado || 'activo',
      observaciones:     proveedor.observaciones || '',
      incidencias:       proveedor.incidencias ?? 0,
      entregas_a_tiempo: proveedor.entregas_a_tiempo ?? 0,
      entregas_tarde:    proveedor.entregas_tarde ?? 0,
    } : EMPTY_FORM)
  }, [proveedor, isOpen])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.cuit && !isValidCuit(form.cuit)) {
      toast.error('El CUIT ingresado no es válido')
      return
    }
    setLoading(true)
    try {
      await onConfirm({ ...form, tiempo_entrega_dias: Number(form.tiempo_entrega_dias), rating: Number(form.rating) })
    } finally { setLoading(false) }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}
      title={proveedor ? `Editar — ${proveedor.empresa}` : 'Nuevo Proveedor'}
      maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Empresa *" value={form.empresa} onChange={e => set('empresa', e.target.value)} required />
          <Input label="CUIT" value={form.cuit} onChange={e => set('cuit', formatCuit(e.target.value))} placeholder="30-12345678-9" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Contacto" value={form.contacto_nombre} onChange={e => set('contacto_nombre', e.target.value)} />
          <div className="flex flex-col gap-1">
            <label className="label-mono">Rubro</label>
            <select value={form.rubro} onChange={e => set('rubro', e.target.value)}
              className="bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent transition-colors">
              <option value="">— Sin especificar —</option>
              {RUBROS.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Teléfono" value={form.telefono} onChange={e => set('telefono', e.target.value)} />
          <Input label="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Tiempo entrega (días)" type="number" value={form.tiempo_entrega_dias} onChange={e => set('tiempo_entrega_dias', e.target.value)} />
          <div className="flex flex-col gap-1">
            <label className="label-mono">Condición de pago</label>
            <select value={form.condicion_pago} onChange={e => set('condicion_pago', e.target.value)}
              className="bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent transition-colors">
              {CONDICIONES_PAGO.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="label-mono">Estado</label>
            <select value={form.estado} onChange={e => set('estado', e.target.value)}
              className="bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent transition-colors">
              <option value="activo">Activo</option>
              <option value="preferido">Preferido</option>
              <option value="riesgoso">Riesgoso</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="label-mono">Rating interno</label>
          <Stars value={form.rating} onChange={v => set('rating', v)} />
        </div>

        <div className="grid grid-cols-3 gap-3 bg-hm-surface2/20 border border-hm-border/50 rounded-lg p-3">
          <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest col-span-3 mb-1">Performance (para risk score)</div>
          <Input label="Entregas en tiempo" type="number" min="0" value={form.entregas_a_tiempo} onChange={e => set('entregas_a_tiempo', e.target.value)} />
          <Input label="Entregas tarde" type="number" min="0" value={form.entregas_tarde} onChange={e => set('entregas_tarde', e.target.value)} />
          <Input label="Incidencias" type="number" min="0" value={form.incidencias} onChange={e => set('incidencias', e.target.value)} />
        </div>

        <div className="flex flex-col gap-1">
          <label className="label-mono">Observaciones</label>
          <textarea value={form.observaciones} onChange={e => set('observaciones', e.target.value)} rows={2}
            className="w-full bg-hm-surface2 border border-hm-border rounded-lg p-3 text-hm-text text-sm focus:outline-none focus:border-hm-accent transition-colors resize-none"
            placeholder="Notas internas, condiciones especiales..." />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-hm-border">
          <Button variant="outline" type="button" onClick={onClose} disabled={loading}>CANCELAR</Button>
          <Button type="submit" variant="primary" disabled={loading || !form.empresa}>
            {loading ? 'GUARDANDO...' : proveedor ? 'GUARDAR CAMBIOS' : 'CREAR PROVEEDOR'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function ProveedorDetalle({ proveedor, isOpen, onClose, onEdit }) {
  const [tab, setTab] = useState('info')
  const [compras, setCompras]   = useState([])
  const [repuestos, setRepuestos] = useState([])
  const [activos, setActivos]   = useState([])
  const [loading, setLoading]   = useState(false)
  const { formatUSD } = useDolar()
  const { perfil } = useAuth()

  // Nueva compra
  const [showCompra, setShowCompra] = useState(false)
  const [compraItems, setCompraItems] = useState([{ descripcion: '', cantidad: 1, precio_unitario_usd: 0 }])
  const [compraNota, setCompraNota] = useState('')
  const [compraCategoria, setCompraCategoria] = useState('repuesto')
  const [savingCompra, setSavingCompra] = useState(false)

  // Vincular activo
  const [showVincular, setShowVincular] = useState(false)
  const [maquinasDisp, setMaquinasDisp] = useState([])
  const [vincForm, setVincForm] = useState({ maquina_id: '', tipo_relacion: 'service', notas: '' })
  const [savingVinc, setSavingVinc] = useState(false)

  useEffect(() => {
    if (!proveedor || !isOpen) return
    setTab('info')
    setLoading(true)
    Promise.all([
      fetchComprasProveedor(proveedor.id),
      fetchRepuestosProveedor(proveedor.id),
      fetchActivosProveedor(proveedor.id),
    ]).then(([c, r, a]) => { setCompras(c); setRepuestos(r); setActivos(a); setLoading(false) })
  }, [proveedor?.id, isOpen])

  useEffect(() => {
    if (tab !== 'activos' || maquinasDisp.length > 0) return
    // Cargar lista de maquinas para vincular
    import('../../lib/supabase').then(({ supabase }) =>
      supabase.from('maquinas').select('id, nombre_unidad, tipo, marca').eq('activa', true).order('nombre_unidad')
        .then(({ data }) => setMaquinasDisp(data || []))
    )
  }, [tab])

  const handleCrearCompra = async () => {
    const items = compraItems.filter(i => i.descripcion.trim())
    if (!items.length) return
    setSavingCompra(true)
    try {
      await crearCompra(proveedor.id, perfil?.organization_id, items, compraNota, { categoria: compraCategoria })
      toast.success('Compra registrada')
      setShowCompra(false)
      setCompraItems([{ descripcion: '', cantidad: 1, precio_unitario_usd: 0 }])
      setCompraNota('')
      setCompraCategoria('repuesto')
      const c = await fetchComprasProveedor(proveedor.id)
      setCompras(c)
    } catch (err) { toast.error(err.message) }
    finally { setSavingCompra(false) }
  }

  const handleVincularActivo = async () => {
    if (!vincForm.maquina_id) return
    setSavingVinc(true)
    try {
      await vincularActivo(proveedor.id, vincForm.maquina_id, vincForm.tipo_relacion, vincForm.notas)
      toast.success('Activo vinculado')
      setShowVincular(false)
      setVincForm({ maquina_id: '', tipo_relacion: 'service', notas: '' })
      const a = await fetchActivosProveedor(proveedor.id)
      setActivos(a)
    } catch (err) { toast.error(err.message) }
    finally { setSavingVinc(false) }
  }

  const handleDesvincular = async (maquinaId) => {
    try {
      await desvincularActivo(proveedor.id, maquinaId)
      toast.success('Vínculo eliminado')
      const a = await fetchActivosProveedor(proveedor.id)
      setActivos(a)
    } catch (err) { toast.error(err.message) }
  }

  const handleRecibir = async (compraId) => {
    try {
      await recibirCompra(compraId)
      toast.success('Compra recibida — stock actualizado')
      const c = await fetchComprasProveedor(proveedor.id)
      setCompras(c)
    } catch (err) { toast.error(err.message) }
  }

  if (!proveedor) return null
  const totalGastado = compras.filter(c => c.estado === 'recibido').reduce((s, c) => s + Number(c.total_usd || 0), 0)
  const risk = riskLabel(calcRiskScore(proveedor))

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5 -mt-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold">{proveedor.empresa}</h2>
            <span className={`text-[9px] font-mono font-bold border rounded px-2 py-0.5 uppercase ${ESTADO_COLOR[proveedor.estado]}`}>
              {proveedor.estado}
            </span>
            <span className={`text-[9px] font-mono font-bold border rounded px-2 py-0.5 ${risk.bg} ${risk.color}`}>
              RIESGO {risk.label.toUpperCase()} · {calcRiskScore(proveedor)}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm text-hm-muted">
            {proveedor.rubro && <span>{proveedor.rubro}</span>}
            <Stars value={proveedor.rating} />
            <span className="font-mono">Entrega: {proveedor.tiempo_entrega_dias}d · {proveedor.condicion_pago}</span>
          </div>
        </div>
        <button onClick={() => onEdit(proveedor)}
          className="text-xs font-mono font-bold border border-hm-border text-hm-muted rounded px-3 py-1.5 hover:border-hm-accent hover:text-hm-accent transition-colors shrink-0">
          ✏️ Editar
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          ['Compras totales', compras.length, ''],
          ['Repuestos vinculados', repuestos.length, ''],
          ['Total gastado', formatUSD(totalGastado), totalGastado > 0 ? 'text-hm-accent' : ''],
        ].map(([label, val, cls]) => (
          <div key={label} className="bg-hm-surface2/30 border border-hm-border/50 rounded-lg p-3">
            <div className={`text-xl font-bold ${cls}`}>{val}</div>
            <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest">{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-hm-border mb-4 overflow-x-auto no-scrollbar scroll-smooth">
        {[['info','INFORMACIÓN'],['compras','COMPRAS'],['pagos','CUENTAS A PAGAR'],['repuestos','REPUESTOS'],['activos','ACTIVOS'],['riesgo','RIESGO & SCORE']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-3 py-2 text-[10px] sm:text-xs font-mono font-bold border-b-2 transition-all whitespace-nowrap shrink-0 ${tab===k ? 'border-hm-accent text-hm-accent' : 'border-transparent text-hm-muted hover:text-hm-text'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Tab: INFO */}
      {tab === 'info' && (
        <div className="grid grid-cols-2 gap-3">
          {[
            ['Contacto', proveedor.contacto_nombre],
            ['Teléfono', proveedor.telefono],
            ['Email', proveedor.email],
            ['Cond. pago', proveedor.condicion_pago],
          ].map(([label, val]) => (
            <div key={label} className="bg-hm-surface2/20 border border-hm-border/40 rounded-lg p-3">
              <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-0.5">{label}</div>
              <div className="text-sm font-medium">{val || '—'}</div>
            </div>
          ))}
          {proveedor.observaciones && (
            <div className="col-span-2 bg-hm-surface2/20 border border-hm-border/40 rounded-lg p-3">
              <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-0.5">Observaciones</div>
              <div className="text-sm text-hm-muted italic">{proveedor.observaciones}</div>
            </div>
          )}
        </div>
      )}

      {/* Tab: COMPRAS */}
      {tab === 'compras' && (
        <div className="flex flex-col gap-3">
          <button onClick={() => setShowCompra(v => !v)}
            className="text-xs font-mono font-bold border border-hm-accent/40 text-hm-accent rounded-lg px-4 py-2 hover:bg-hm-accent/10 transition-colors self-start">
            {showCompra ? '✕ Cancelar' : '+ Nueva compra'}
          </button>

          {showCompra && (
            <div className="bg-hm-surface2/20 border border-hm-border rounded-lg p-4 flex flex-col gap-3">
              <div className="text-xs font-mono text-hm-muted mb-1">ÍTEMS</div>
              {compraItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_80px_100px_32px] gap-2 items-end">
                  <Input placeholder="Descripción" value={item.descripcion}
                    onChange={e => setCompraItems(p => p.map((x,i) => i===idx ? {...x, descripcion: e.target.value} : x))} />
                  <Input type="number" placeholder="Cant." value={item.cantidad}
                    onChange={e => setCompraItems(p => p.map((x,i) => i===idx ? {...x, cantidad: e.target.value} : x))} />
                  <Input type="number" placeholder="Precio USD" value={item.precio_unitario_usd}
                    onChange={e => setCompraItems(p => p.map((x,i) => i===idx ? {...x, precio_unitario_usd: e.target.value} : x))} />
                  <button onClick={() => setCompraItems(p => p.filter((_,i) => i !== idx))}
                    className="text-hm-muted hover:text-red-400 transition-colors text-sm pb-1">✕</button>
                </div>
              ))}
              <button onClick={() => setCompraItems(p => [...p, { descripcion: '', cantidad: 1, precio_unitario_usd: 0 }])}
                className="text-xs text-hm-muted hover:text-hm-text transition-colors self-start">+ agregar ítem</button>
              <Input label="Notas" value={compraNota} onChange={e => setCompraNota(e.target.value)} placeholder="Referencia, observaciones..." />
              <div className="flex flex-col gap-1">
                <label className="label-mono">Categoría</label>
                <select value={compraCategoria} onChange={e => setCompraCategoria(e.target.value)}
                  className="bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent transition-colors">
                  {CATEGORIAS_COMPRA.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-hm-accent">
                  Total: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                    compraItems.reduce((s, i) => s + Number(i.cantidad || 0) * Number(i.precio_unitario_usd || 0), 0)
                  )}
                </span>
                <Button variant="primary" onClick={handleCrearCompra} disabled={savingCompra}>
                  {savingCompra ? 'GUARDANDO...' : 'REGISTRAR COMPRA'}
                </Button>
              </div>
            </div>
          )}

          {loading ? <div className="h-16 bg-hm-surface2 rounded animate-pulse" />
          : compras.length === 0 ? (
            <div className="text-center text-hm-muted font-mono text-sm py-6">Sin compras registradas.</div>
          ) : (
            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
              {compras.map(c => (
                <div key={c.id} className="flex items-center justify-between bg-hm-surface2/20 border border-hm-border/50 rounded-lg px-3 py-2">
                  <div>
                    <div className="text-sm font-medium">{new Date(c.fecha).toLocaleDateString('es-AR', { day:'2-digit', month:'short', year:'numeric' })}</div>
                    <div className="text-[10px] text-hm-muted">{c.items?.length || 0} ítems · {c.notas || ''}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold">{formatUSD(c.total_usd)}</span>
                    <Badge variant={ESTADO_COMPRA_COLOR[c.estado] || 'default'}>{c.estado}</Badge>
                    <button onClick={() => generateOCPDF(c)}
                      className="text-[9px] font-mono font-bold border border-blue-700/50 text-blue-400/80 rounded px-2 py-1 hover:border-blue-500 hover:text-blue-400 transition-colors">
                      OC PDF
                    </button>
                    {c.estado === 'pendiente' && (
                      <button onClick={() => handleRecibir(c.id)}
                        className="text-[9px] font-mono font-bold border border-green-700/50 text-green-400/80 rounded px-2 py-1 hover:border-green-500 hover:text-green-400 transition-colors">
                        ✓ RECIBIR
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: PAGOS — Proveedor360 */}
      {tab === 'pagos' && (() => {
        // Mock Data — TODO: conectar con tabla cheques_emitidos, pagos_proveedores
        const totalDeuda = compras.filter(c => c.estado === 'pendiente' || c.estado === 'recibido_parcial').reduce((s, c) => s + Number(c.total_usd || 0), 0)
        const risk = calcRiskScore(proveedor)
        const riskBadge = risk >= 70 ? { label: 'ALTO', cls: 'bg-red-500/20 text-red-300 border-red-500/40' }
          : risk >= 40 ? { label: 'MEDIO', cls: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' }
          : { label: 'BAJO', cls: 'bg-green-500/20 text-green-300 border-green-500/40' }
        const MOCK_CHEQUES_EMITIDOS = [
          { id: 1, banco: 'Macro', numero: '00123456', importe: 250000, vencimiento: '2026-06-10', estado: 'emitido', moneda: 'ARS' },
          { id: 2, banco: 'Nación', numero: '00999321', importe: 3200, vencimiento: '2026-05-30', estado: 'por_debitar', moneda: 'USD' },
        ]
        const MOCK_HISTORIAL = [
          { id: 1, fecha: '2026-04-15', monto: 180000, moneda: 'ARS', metodo: 'Transferencia', estado: 'acreditado' },
          { id: 2, fecha: '2026-03-01', monto: 2500, moneda: 'USD', metodo: 'E-Cheq', estado: 'acreditado' },
        ]
        const totalATime = proveedor.entregas_a_tiempo || 0
        const totalTarde = proveedor.entregas_tarde || 0
        const totalEntregas = totalATime + totalTarde
        const cumplimientoPct = totalEntregas > 0 ? Math.round((totalATime / totalEntregas) * 100) : null
        return (
          <div className="flex flex-col gap-5">
            {/* Riesgo Badge arriba */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${riskBadge.cls}`}>
                <span className="w-2 h-2 rounded-full bg-current" />
                RIESGO PROVEEDOR: {riskBadge.label}
              </span>
              <span className="text-xs font-mono text-hm-muted">Score: {risk}/100</span>
            </div>

            {/* A) Condición de pago */}
            <div>
              <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-2">A — Condición de Pago</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  ['Forma habitual', proveedor.condicion_pago || 'Base preparada'],
                  ['Plazo', `${proveedor.tiempo_entrega_dias || '?'} días`],
                  ['Anticipo', 'Sin datos'],
                  ['Saldo', 'Sin datos'],
                  ['Cuotas', 'Sin datos'],
                  ['Moneda', 'ARS / USD'],
                ].map(([k, v]) => (
                  <div key={k} className="bg-hm-surface2/20 border border-hm-border/40 rounded-lg p-3">
                    <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-0.5">{k}</div>
                    <div className="text-sm font-medium">{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tiempo entrega + cumplimiento */}
            <div>
              <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-2">Desempeño Operativo</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="bg-hm-surface2/20 border border-hm-border/40 rounded-lg p-3">
                  <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-0.5">Tiempo prom. entrega</div>
                  <div className="text-xl font-bold">{proveedor.tiempo_entrega_dias ? `${proveedor.tiempo_entrega_dias}d` : 'Sin datos'}</div>
                </div>
                <div className="bg-hm-surface2/20 border border-hm-border/40 rounded-lg p-3">
                  <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-0.5">Entregas en tiempo</div>
                  <div className="text-xl font-bold text-green-400">{totalATime}</div>
                </div>
                <div className="bg-hm-surface2/20 border border-hm-border/40 rounded-lg p-3">
                  <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-0.5">Cumplimiento</div>
                  {cumplimientoPct !== null ? (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-2 bg-hm-surface2 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${cumplimientoPct >= 80 ? 'bg-green-500' : cumplimientoPct >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{width:`${cumplimientoPct}%`}} />
                      </div>
                      <span className="text-xs font-mono font-bold">{cumplimientoPct}%</span>
                    </div>
                  ) : <div className="text-sm text-hm-muted">Sin datos</div>}
                </div>
              </div>
            </div>

            {/* B) Cheques emitidos */}
            <div>
              <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-2">B — Cheques / E-Cheqs Emitidos</div>
              <div className="flex flex-col gap-2">
                {MOCK_CHEQUES_EMITIDOS.map(c => {
                  const venc = new Date(c.vencimiento + 'T00:00:00')
                  const dias = Math.ceil((venc - new Date()) / (1000*60*60*24))
                  const alerta = dias <= 7
                  return (
                    <div key={c.id} className={`flex items-center justify-between rounded-lg px-4 py-3 border ${alerta ? 'bg-red-500/10 border-red-500/30' : 'bg-hm-surface2/20 border-hm-border/50'}`}>
                      <div>
                        <div className={`text-xs font-mono mb-0.5 ${alerta ? 'text-red-300' : 'text-hm-muted'}`}>Vence: {venc.toLocaleDateString('es-AR')} {alerta && `(¡${dias}d!)`}</div>
                        <div className="font-bold text-sm">{c.banco} — #{c.numero}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-bold">
                          {c.moneda === 'USD' ? `USD ${c.importe.toLocaleString()}` : new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS'}).format(c.importe)}
                        </span>
                        <span className={`text-[10px] font-mono border rounded px-2 py-0.5 uppercase ${c.estado === 'por_debitar' ? 'border-red-500/50 text-red-400 bg-red-500/10' : 'border-blue-500/50 text-blue-400 bg-blue-500/10'}`}>{c.estado.replace('_',' ')}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* C) Pagos pendientes */}
            <div>
              <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-2">C — Pagos Pendientes / Vencidos</div>
              <div className="flex flex-col gap-2">
                {compras.filter(c => c.estado === 'pendiente' || c.estado === 'recibido_parcial').map(c => (
                  <div key={c.id} className="flex items-center justify-between bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                    <div>
                      <div className="font-mono text-xs text-red-300 mb-0.5">
                        Venc. est.: {new Date(new Date(c.fecha).getTime() + (proveedor.tiempo_entrega_dias || 30)*24*60*60*1000).toLocaleDateString('es-AR')}
                      </div>
                      <div className="font-bold text-sm text-red-100">OC {c.id.slice(0,8)}…</div>
                    </div>
                    <div className="font-mono text-sm font-bold text-red-400">{formatUSD(c.total_usd)}</div>
                  </div>
                ))}
                {compras.filter(c => c.estado === 'pendiente' || c.estado === 'recibido_parcial').length === 0 && (
                  <div className="text-center text-sm text-hm-muted p-4 bg-hm-surface2/20 border border-hm-border/50 rounded-lg">✅ Sin deuda pendiente con este proveedor</div>
                )}
              </div>
            </div>

            {/* D) Historial */}
            <div>
              <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-2">D — Historial de Pagos</div>
              <div className="flex flex-col gap-2">
                {MOCK_HISTORIAL.map(h => (
                  <div key={h.id} className="flex items-center justify-between bg-hm-surface2/20 border border-hm-border/50 rounded-lg px-4 py-3">
                    <div>
                      <div className="text-xs font-mono text-hm-muted">{new Date(h.fecha + 'T00:00:00').toLocaleDateString('es-AR')}</div>
                      <div className="text-sm font-medium mt-0.5">{h.metodo}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold">
                        {h.moneda === 'USD' ? `USD ${h.monto.toLocaleString()}` : new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS'}).format(h.monto)}
                      </span>
                      <span className="text-[10px] font-mono border border-green-500/50 text-green-400 bg-green-500/10 rounded px-2 py-0.5 uppercase">{h.estado}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* F) Alertas financieras */}
            <div>
              <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-2">F — Alertas</div>
              <div className="flex flex-col gap-2">
                {totalDeuda > 0 && (
                  <div className="bg-red-500/10 border-l-4 border-red-500 rounded-r-lg p-3">
                    <div className="text-red-400 font-bold text-sm">⚠️ Deuda con proveedor</div>
                    <div className="text-xs text-red-200 mt-0.5">Total adeudado: {formatUSD(totalDeuda)}</div>
                  </div>
                )}
                {MOCK_CHEQUES_EMITIDOS.some(c => Math.ceil((new Date(c.vencimiento+'T00:00:00') - new Date())/(1000*60*60*24)) <= 7) && (
                  <div className="bg-orange-500/10 border-l-4 border-orange-500 rounded-r-lg p-3">
                    <div className="text-orange-400 font-bold text-sm">📅 Cheque emitido por vencer (&lt;7d)</div>
                    <div className="text-xs text-orange-200 mt-0.5">Verificar disponibilidad bancaria para el débito.</div>
                  </div>
                )}
                {risk >= 70 && (
                  <div className="bg-red-500/10 border-l-4 border-red-500 rounded-r-lg p-3">
                    <div className="text-red-400 font-bold text-sm">🚨 Proveedor de alto riesgo</div>
                    <div className="text-xs text-red-200 mt-0.5">Score de riesgo: {risk}/100. Evaluar alternativas.</div>
                  </div>
                )}
                {cumplimientoPct !== null && cumplimientoPct < 60 && (
                  <div className="bg-yellow-500/10 border-l-4 border-yellow-500 rounded-r-lg p-3">
                    <div className="text-yellow-400 font-bold text-sm">⏰ Bajo cumplimiento de entregas</div>
                    <div className="text-xs text-yellow-200 mt-0.5">{cumplimientoPct}% de entregas en tiempo. Revisar relación comercial.</div>
                  </div>
                )}
                {totalDeuda === 0 && risk < 70 && !MOCK_CHEQUES_EMITIDOS.some(c => Math.ceil((new Date(c.vencimiento+'T00:00:00') - new Date())/(1000*60*60*24)) <= 7) && (
                  <div className="text-center py-6 text-hm-muted text-sm">✅ Sin alertas financieras con este proveedor</div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Tab: REPUESTOS */}
      {tab === 'repuestos' && (
        <div className="max-h-[300px] overflow-y-auto">
          {loading ? <div className="h-16 bg-hm-surface2 rounded animate-pulse" />
          : repuestos.length === 0 ? (
            <div className="text-center text-hm-muted font-mono text-sm py-6">Sin repuestos vinculados.</div>
          ) : (
            <table className="w-full text-left">
              <thead className="border-b border-hm-border">
                <tr>
                  {['Repuesto','SKU','Stock actual','Precio USD','Entrega','Principal'].map(h => (
                    <th key={h} className="pb-2 font-mono text-[9px] text-hm-muted uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {repuestos.map(r => (
                  <tr key={r.id} className="border-b border-hm-border/30 hover:bg-hm-surface2/20 transition-colors">
                    <td className="py-2 pr-3 text-sm font-medium">{r.repuesto?.nombre || '—'}</td>
                    <td className="py-2 pr-3 font-mono text-xs text-hm-muted">{r.repuesto?.sku || '—'}</td>
                    <td className="py-2 pr-3 text-sm">{r.repuesto?.stock_actual ?? '—'} {r.repuesto?.unidad || ''}</td>
                    <td className="py-2 pr-3 font-mono text-sm">{r.precio_usd ? `$${r.precio_usd}` : '—'}</td>
                    <td className="py-2 pr-3 text-xs text-hm-muted">{r.tiempo_entrega_dias ? `${r.tiempo_entrega_dias}d` : '—'}</td>
                    <td className="py-2">{r.es_principal ? <span className="text-hm-accent text-xs">✓</span> : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      {/* Tab: ACTIVOS */}
      {tab === 'activos' && (
        <div className="flex flex-col gap-3">
          <button onClick={() => setShowVincular(v => !v)}
            className="text-xs font-mono font-bold border border-hm-accent/40 text-hm-accent rounded-lg px-4 py-2 hover:bg-hm-accent/10 transition-colors self-start">
            {showVincular ? '✕ Cancelar' : '+ Vincular activo'}
          </button>

          {showVincular && (
            <div className="bg-hm-surface2/20 border border-hm-border rounded-lg p-4 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="label-mono">Activo (máquina)</label>
                  <select value={vincForm.maquina_id} onChange={e => setVincForm(p => ({ ...p, maquina_id: e.target.value }))}
                    className="bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent transition-colors">
                    <option value="">— Seleccionar —</option>
                    {maquinasDisp.map(m => <option key={m.id} value={m.id}>{m.nombre_unidad} {m.marca ? `· ${m.marca}` : ''}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="label-mono">Tipo de relación</label>
                  <select value={vincForm.tipo_relacion} onChange={e => setVincForm(p => ({ ...p, tipo_relacion: e.target.value }))}
                    className="bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent transition-colors">
                    {TIPOS_RELACION_ACTIVO.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <Input label="Notas" value={vincForm.notas} onChange={e => setVincForm(p => ({ ...p, notas: e.target.value }))} placeholder="Observaciones sobre este vínculo..." />
              <div className="flex justify-end">
                <Button variant="primary" onClick={handleVincularActivo} disabled={savingVinc || !vincForm.maquina_id}>
                  {savingVinc ? 'VINCULANDO...' : 'VINCULAR'}
                </Button>
              </div>
            </div>
          )}

          {loading ? <div className="h-16 bg-hm-surface2 rounded animate-pulse" />
          : activos.length === 0 ? (
            <div className="text-center text-hm-muted font-mono text-sm py-6">Sin activos vinculados.</div>
          ) : (
            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
              {activos.map(a => (
                <div key={a.id} className="flex items-center justify-between bg-hm-surface2/20 border border-hm-border/50 rounded-lg px-3 py-2">
                  <div>
                    <div className="text-sm font-medium">{a.maquina?.nombre_unidad || '—'}</div>
                    <div className="text-[10px] text-hm-muted font-mono uppercase">
                      {a.tipo_relacion}
                      {a.maquina?.tipo ? ` · ${a.maquina.tipo}` : ''}
                      {a.maquina?.marca ? ` · ${a.maquina.marca}` : ''}
                      {a.notas ? ` — ${a.notas}` : ''}
                    </div>
                  </div>
                  <button onClick={() => handleDesvincular(a.maquina_id)}
                    className="text-[9px] font-mono font-bold border border-red-700/50 text-red-400/70 rounded px-2 py-1 hover:border-red-500 hover:text-red-400 transition-colors">
                    DESVINCULAR
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: RIESGO */}
      {tab === 'riesgo' && (
        <div className="flex flex-col gap-6">
          <div className={`p-6 rounded-xl border ${risk.bg} ${risk.color} border-current flex items-center gap-6`}>
            <div className="text-5xl font-black">{calcRiskScore(proveedor)}</div>
            <div>
              <div className="text-xl font-bold">Riesgo {risk.label.toUpperCase()}</div>
              <p className="text-sm opacity-80 mt-1">Este score se calcula en base a las entregas a tiempo, atrasos registrados e incidencias directas reportadas para este proveedor.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-hm-surface2/20 border border-green-500/30 rounded-lg p-4 text-center">
              <div className="text-xs font-mono text-green-400 mb-1 uppercase tracking-widest">Entregas a Tiempo</div>
              <div className="text-3xl font-bold">{proveedor.entregas_a_tiempo || 0}</div>
            </div>
            <div className="bg-hm-surface2/20 border border-yellow-500/30 rounded-lg p-4 text-center">
              <div className="text-xs font-mono text-yellow-400 mb-1 uppercase tracking-widest">Atrasos Registrados</div>
              <div className="text-3xl font-bold">{proveedor.entregas_tarde || 0}</div>
            </div>
            <div className="bg-hm-surface2/20 border border-red-500/30 rounded-lg p-4 text-center">
              <div className="text-xs font-mono text-red-400 mb-1 uppercase tracking-widest">Incidencias Críticas</div>
              <div className="text-3xl font-bold">{proveedor.incidencias || 0}</div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default function Proveedores() {
  const { proveedores, loading, error, createProveedor, updateProveedor, deactivateProveedor } = useProveedores()
  const { isOwner } = useAuth()
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState('todos')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [detalle, setDetalle]     = useState(null)
  const [archivando, setArchivando] = useState(null)
  const [loadingArchive, setLoadingArchive] = useState(false)

  useEffect(() => { setPage(1) }, [search, filterEstado])

  const filtrados = useMemo(() => {
    const q = search.toLowerCase()
    return proveedores.filter(p => {
      const matchQ = p.empresa.toLowerCase().includes(q) || (p.rubro || '').toLowerCase().includes(q) || (p.contacto_nombre || '').toLowerCase().includes(q)
      const matchE = filterEstado === 'todos' || p.estado === filterEstado
      return matchQ && matchE
    })
  }, [proveedores, search, filterEstado])

  const paginados = useMemo(() => filtrados.slice((page-1)*PER_PAGE, page*PER_PAGE), [filtrados, page])

  const handleConfirm = async (payload) => {
    try {
      if (editing) { await updateProveedor(editing.id, payload); toast.success('Proveedor actualizado') }
      else          { await createProveedor(payload); toast.success('Proveedor creado') }
      setModalOpen(false); setEditing(null)
    } catch (err) { toast.error(err.message); throw err }
  }

  const handleArchive = async () => {
    setLoadingArchive(true)
    try { await deactivateProveedor(archivando.id); toast.success(`${archivando.empresa} desactivado`); setArchivando(null) }
    catch (err) { toast.error(err.message) }
    finally { setLoadingArchive(false) }
  }

  // KPIs
  const kpis = {
    total:    proveedores.length,
    preferidos: proveedores.filter(p => p.estado === 'preferido').length,
    riesgosos:  proveedores.filter(p => p.estado === 'riesgoso').length,
  }

  if (error) return <div className="p-6 text-red-400 font-mono">Error: {error}</div>

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-hm-border pb-4">
        <div>
          <h1 className="text-2xl font-bold">Proveedores</h1>
          <p className="text-sm text-hm-muted mt-1">{proveedores.length} proveedores activos</p>
        </div>
        <Button variant="primary" onClick={() => { setEditing(null); setModalOpen(true) }}>
          + NUEVO PROVEEDOR
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-2xl font-bold">{kpis.total}</div>
          <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mt-0.5">Activos</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-hm-accent">
          <div className="text-2xl font-bold text-hm-accent">{kpis.preferidos}</div>
          <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mt-0.5">Preferidos</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-red-500">
          <div className="text-2xl font-bold text-red-400">{kpis.riesgosos}</div>
          <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mt-0.5">Riesgosos</div>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap items-end">
        <div className="flex-1 min-w-[200px]">
          <Input placeholder="Buscar por empresa, rubro o contacto..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1">
          {['todos','activo','preferido','riesgoso','inactivo'].map(e => (
            <button key={e} onClick={() => setFilterEstado(e)}
              className={`px-3 py-2 text-xs font-mono font-bold rounded-lg border transition-colors ${
                filterEstado === e ? 'bg-hm-accent/10 border-hm-accent text-hm-accent' : 'border-hm-border text-hm-muted hover:text-hm-text'
              }`}>
              {e.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <Card className="overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-hm-surface2/50 border-b border-hm-border">
            <tr>
              {['EMPRESA','RUBRO','CONTACTO','ESTADO','RATING','RIESGO','ENTREGA','PAGO',''].map(h => (
                <th key={h} className="p-4 font-mono text-xs text-hm-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1,2,3].map(i => (
                <tr key={i} className="border-b border-hm-border">
                  {[1,2,3,4,5,6,7,8,9].map(j => (
                    <td key={j} className="p-4"><div className="h-4 bg-hm-surface2 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : filtrados.length === 0 ? (
              <tr><td colSpan={9} className="p-8 text-center text-hm-muted font-mono text-sm">No se encontraron proveedores.</td></tr>
            ) : paginados.map(p => (
              <tr key={p.id} onClick={() => setDetalle(p)}
                className="border-b border-hm-border hover:bg-hm-surface2/30 transition-colors group cursor-pointer">
                <td className="p-4">
                  <div className="font-medium text-sm">{p.empresa}</div>
                </td>
                <td className="p-4 text-sm text-hm-muted">{p.rubro || '—'}</td>
                <td className="p-4 text-sm text-hm-muted">{p.contacto_nombre || '—'}</td>
                <td className="p-4">
                  <span className={`text-[9px] font-mono font-bold border rounded px-2 py-0.5 uppercase ${ESTADO_COLOR[p.estado]}`}>
                    {p.estado}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(n => (
                      <span key={n} className={`text-xs ${n <= (p.rating||3) ? 'text-yellow-400' : 'text-hm-border'}`}>★</span>
                    ))}
                  </div>
                </td>
                <td className="p-4">
                  {(() => { const r = riskLabel(calcRiskScore(p)); return (
                    <span className={`text-[9px] font-mono font-bold border rounded px-2 py-0.5 ${r.bg} ${r.color}`}>
                      {r.label.toUpperCase()} · {calcRiskScore(p)}
                    </span>
                  )})()}
                </td>
                <td className="p-4 text-sm text-hm-muted">{p.tiempo_entrega_dias ? `${p.tiempo_entrega_dias}d` : '—'}</td>
                <td className="p-4 text-xs text-hm-muted">{p.condicion_pago || '—'}</td>
                <td className="p-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={e => { e.stopPropagation(); setEditing(p); setModalOpen(true) }}
                      className="px-3 py-1 text-xs font-mono font-bold border border-hm-border rounded hover:border-hm-accent hover:text-hm-accent transition-colors">
                      EDITAR
                    </button>
                    {isOwner && (
                      <button onClick={e => { e.stopPropagation(); setArchivando(p) }}
                        className="px-3 py-1 text-xs font-mono font-bold border border-hm-border rounded hover:border-red-500 hover:text-red-400 transition-colors">
                        DESACT.
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination total={filtrados.length} page={page} perPage={PER_PAGE} onPageChange={setPage} />
      </Card>

      <ModalProveedor isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditing(null) }} proveedor={editing} onConfirm={handleConfirm} />

      <ProveedorDetalle proveedor={detalle} isOpen={!!detalle} onClose={() => setDetalle(null)}
        onEdit={p => { setDetalle(null); setEditing(p); setModalOpen(true) }} />

      <ModalConfirm isOpen={!!archivando} onClose={() => setArchivando(null)} onConfirm={handleArchive}
        loading={loadingArchive} title="Desactivar proveedor"
        message={`¿Desactivás a "${archivando?.empresa}"? Dejará de aparecer en la lista activa.`}
        confirmLabel="Desactivar" variant="danger" />
    </div>
  )
}
