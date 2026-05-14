import { useState, useMemo, useEffect } from 'react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { useLeads, calcularScore } from '../../hooks/useLeads'
import { useAuth } from '../../context/AuthContext'
import Modal from '../../components/ui/Modal'
import ModalConfirm from '../../components/ui/ModalConfirm'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Pagination from '../../components/ui/Pagination'

const PER_PAGE = 12

const ESTADOS = ['Nuevo', 'Contactado', 'Cotizado', 'Negociacion', 'Ganado', 'Perdido']
const ORIGENES = ['Manual', 'Meta', 'Web', 'WhatsApp', 'Referido', 'Licitacion']
const RUBROS   = ['Mineria', 'Agro', 'Vial', 'Construccion', 'Industrial', 'Municipio']

const ESTADO_VARIANT = {
  Nuevo:       'info',
  Contactado:  'warn',
  Cotizado:    'alq',
  Negociacion: 'ventas',
  Ganado:      'ok',
  Perdido:     'danger',
}

const GRADE_STYLE = {
  A: 'bg-red-500/20 text-red-300 border-red-500/40',
  B: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  C: 'bg-hm-surface2 text-hm-muted border-hm-border',
}

const NEXT_ESTADO = {
  Nuevo: 'Contactado', Contactado: 'Cotizado', Cotizado: 'Negociacion', Negociacion: 'Ganado',
}

const EMPTY = {
  nombre: '', empresa: '', telefono: '', email: '',
  origen: 'Manual', rubro: '', producto_interes: '', mensaje: '', notas: '',
}

function ScorePreview({ rubro, origen, mensaje, empresa }) {
  const { score, grade } = calcularScore(rubro, origen, mensaje, empresa)
  return (
    <div className="flex items-center gap-3 bg-hm-surface2/50 rounded-lg p-3 border border-hm-border">
      <div>
        <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-0.5">Score estimado</div>
        <div className="text-2xl font-bold">{score}<span className="text-sm text-hm-muted">/100</span></div>
      </div>
      <div className={`ml-auto px-3 py-1.5 rounded border text-lg font-black ${GRADE_STYLE[grade]}`}>{grade}</div>
    </div>
  )
}

function ModalLead({ isOpen, onClose, lead, onConfirm }) {
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm(lead ? {
      nombre: lead.nombre || '', empresa: lead.empresa || '',
      telefono: lead.telefono || '', email: lead.email || '',
      origen: lead.origen || 'Manual', rubro: lead.rubro || '',
      producto_interes: lead.producto_interes || '',
      mensaje: lead.mensaje || '', notas: lead.notas || '',
    } : EMPTY)
  }, [lead, isOpen])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try { await onConfirm(form) }
    finally { setSaving(false) }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={lead ? 'Editar Lead' : 'Nuevo Lead'} maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <ScorePreview rubro={form.rubro} origen={form.origen} mensaje={form.mensaje} empresa={form.empresa} />

        <div className="grid grid-cols-2 gap-4">
          <Input label="Nombre" value={form.nombre} onChange={e => set('nombre', e.target.value)} />
          <Input label="Empresa" value={form.empresa} onChange={e => set('empresa', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Teléfono" value={form.telefono} onChange={e => set('telefono', e.target.value)} />
          <Input label="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="label-mono">Origen</label>
            <select value={form.origen} onChange={e => set('origen', e.target.value)} className="select-hm">
              {ORIGENES.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="label-mono">Rubro</label>
            <select value={form.rubro} onChange={e => set('rubro', e.target.value)} className="select-hm">
              <option value="">— Sin especificar —</option>
              {RUBROS.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <Input label="Producto / Interés" value={form.producto_interes} onChange={e => set('producto_interes', e.target.value)} placeholder="Ej: Cotización excavadora, alquiler grúa..." />
        <div className="flex flex-col gap-1">
          <label className="label-mono">Mensaje / Descripción</label>
          <textarea
            value={form.mensaje} onChange={e => set('mensaje', e.target.value)} rows={3}
            className="bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent focus:ring-1 focus:ring-hm-accent/30 resize-none"
          />
        </div>
        <Input label="Notas internas" value={form.notas} onChange={e => set('notas', e.target.value)} />

        <div className="flex justify-end gap-3 pt-4 border-t border-hm-border">
          <Button variant="outline" type="button" onClick={onClose} disabled={saving}>CANCELAR</Button>
          <Button type="submit" variant="primary" disabled={saving || (!form.nombre && !form.empresa)}>
            {saving ? 'GUARDANDO...' : lead ? 'GUARDAR CAMBIOS' : 'CREAR LEAD'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Leads() {
  const { leads, loading, error, crearLead, actualizarLead, avanzarEstado, convertirACliente } = useLeads()
  const { canEdit } = useAuth()

  const [busqueda, setBusqueda]       = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroGrade, setFiltroGrade]   = useState('todos')
  const [page, setPage]               = useState(1)
  const [modalOpen, setModalOpen]     = useState(false)
  const [editando, setEditando]       = useState(null)
  const [convirtiendo, setConvirtiendo] = useState(null)

  useEffect(() => { setPage(1) }, [busqueda, filtroEstado, filtroGrade])

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase()
    return leads.filter(l => {
      const matchQ = !q ||
        (l.nombre || '').toLowerCase().includes(q) ||
        (l.empresa || '').toLowerCase().includes(q) ||
        (l.telefono || '').includes(q) ||
        (l.producto_interes || '').toLowerCase().includes(q)
      const matchEstado = filtroEstado === 'todos' || l.estado === filtroEstado
      const matchGrade  = filtroGrade  === 'todos' || l.lead_grade === filtroGrade
      return matchQ && matchEstado && matchGrade
    })
  }, [leads, busqueda, filtroEstado, filtroGrade])

  const paginados = useMemo(() => filtrados.slice((page - 1) * PER_PAGE, page * PER_PAGE), [filtrados, page])

  // KPIs
  const activos   = leads.filter(l => !['Ganado', 'Perdido'].includes(l.estado)).length
  const gradeA    = leads.filter(l => l.lead_grade === 'A').length
  const ganados   = leads.filter(l => l.estado === 'Ganado').length
  const conversion = leads.length > 0 ? Math.round((ganados / leads.length) * 100) : 0

  // Conteos por estado para pills
  const countPorEstado = useMemo(() => {
    const m = {}
    ESTADOS.forEach(e => { m[e] = leads.filter(l => l.estado === e).length })
    return m
  }, [leads])

  const handleConfirm = async (form) => {
    try {
      if (editando) {
        await actualizarLead(editando.id, form)
        toast.success('Lead actualizado')
      } else {
        await crearLead(form)
        toast.success('Lead creado')
      }
      setModalOpen(false); setEditando(null)
    } catch (err) { toast.error(err.message); throw err }
  }

  const handleAvanzar = async (lead) => {
    const next = NEXT_ESTADO[lead.estado]
    if (!next) return
    try {
      await avanzarEstado(lead.id, next)
      toast.success(`Lead movido a ${next}`)
    } catch (err) { toast.error(err.message) }
  }

  const handleConvertir = async () => {
    try {
      const cliente = await convertirACliente(convirtiendo)
      toast.success(`Cliente "${cliente.razon_social}" creado correctamente`)
      setConvirtiendo(null)
    } catch (err) { toast.error(err.message) }
  }

  const handleExportExcel = () => {
    if (!filtrados.length) { toast.error('No hay datos para exportar'); return }
    const rows = filtrados.map(l => ({
      EMPRESA:    l.empresa || l.nombre || '—',
      NOMBRE:     l.nombre || '—',
      TELEFONO:   l.telefono || '—',
      EMAIL:      l.email || '—',
      ORIGEN:     l.origen || '—',
      RUBRO:      l.rubro || '—',
      INTERES:    l.producto_interes || '—',
      GRADO:      l.lead_grade || '—',
      SCORE:      l.lead_score || 0,
      ESTADO:     l.estado || '—',
      COTIZACIONES: l.cotizaciones?.[0]?.count || 0,
      FECHA:      new Date(l.created_at).toLocaleDateString('es-AR'),
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Leads')
    XLSX.writeFile(wb, `Leads_${new Date().toISOString().slice(0,10)}.xlsx`)
    toast.success('Excel generado')
  }

  if (error) return (
    <div className="p-6">
      <Card className="p-6 border-red-800 bg-red-900/20 text-red-400">
        <p className="font-mono text-sm">{error}</p>
      </Card>
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-hm-border pb-4">
        <div>
          <h1 className="text-2xl font-bold">Leads CRM</h1>
          <p className="text-sm text-hm-muted mt-1">{leads.length} leads registrados</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportExcel}>EXPORTAR EXCEL</Button>
          <Button variant="primary" onClick={() => { setEditando(null); setModalOpen(true) }}>
            + NUEVO LEAD
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-hm-accent bg-hm-surface2/30">
          <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-1">Leads activos</div>
          <div className="text-3xl font-bold">{activos}</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-red-500 bg-hm-surface2/30">
          <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-1">Grado A</div>
          <div className="text-3xl font-bold text-red-400">{gradeA}</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-green-500 bg-hm-surface2/30">
          <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-1">Ganados</div>
          <div className="text-3xl font-bold text-green-400">{ganados}</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-blue-500 bg-hm-surface2/30">
          <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-1">Conversión</div>
          <div className="text-3xl font-bold text-blue-400">{conversion}%</div>
        </Card>
      </div>

      {/* Pipeline pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFiltroEstado('todos')}
          className={`px-3 py-1.5 rounded text-[10px] font-bold tracking-widest border transition-all ${filtroEstado === 'todos' ? 'bg-hm-accent border-hm-accent text-white' : 'bg-hm-surface border-hm-border text-hm-muted hover:border-hm-accent/50'}`}
        >
          TODOS ({leads.length})
        </button>
        {ESTADOS.map(e => (
          <button
            key={e}
            onClick={() => setFiltroEstado(filtroEstado === e ? 'todos' : e)}
            className={`px-3 py-1.5 rounded text-[10px] font-bold tracking-widest border transition-all ${filtroEstado === e ? 'bg-hm-accent border-hm-accent text-white' : 'bg-hm-surface border-hm-border text-hm-muted hover:border-hm-accent/50'}`}
          >
            {e.toUpperCase()} ({countPorEstado[e]})
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-4 items-end bg-hm-surface2/20 p-4 rounded-lg border border-hm-border/50">
        <div className="flex-1">
          <label className="text-[10px] font-mono text-hm-muted mb-1 block uppercase tracking-widest">Buscar</label>
          <Input placeholder="Nombre, empresa, teléfono, producto..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {['todos', 'A', 'B', 'C'].map(g => (
            <button
              key={g}
              onClick={() => setFiltroGrade(g)}
              className={`px-3 py-2 rounded text-[10px] font-bold tracking-widest border transition-all ${filtroGrade === g ? 'bg-hm-accent border-hm-accent text-white' : 'bg-hm-surface border-hm-border text-hm-muted hover:border-hm-accent/50'}`}
            >
              {g === 'todos' ? 'TODOS' : `GRADO ${g}`}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <Card className="overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-hm-surface2/50 border-b border-hm-border">
            <tr>
              <th className="p-4 font-mono text-xs text-hm-muted">LEAD</th>
              <th className="p-4 font-mono text-xs text-hm-muted">CONTACTO</th>
              <th className="p-4 font-mono text-xs text-hm-muted">ORIGEN</th>
              <th className="p-4 font-mono text-xs text-hm-muted">INTERÉS</th>
              <th className="p-4 font-mono text-xs text-hm-muted text-center">GRADO</th>
              <th className="p-4 font-mono text-xs text-hm-muted text-center">COTIZ.</th>
              <th className="p-4 font-mono text-xs text-hm-muted">ESTADO</th>
              <th className="p-4 font-mono text-xs text-hm-muted">FECHA</th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1,2,3,4,5].map(i => (
                <tr key={i} className="border-b border-hm-border">
                  {[1,2,3,4,5,6,7].map(j => <td key={j} className="p-4"><div className="h-4 bg-hm-surface2 rounded animate-pulse" /></td>)}
                  <td className="p-4" />
                </tr>
              ))
            ) : filtrados.length === 0 ? (
              <tr>
                <td colSpan="8" className="p-8 text-center text-hm-muted font-mono text-sm">
                  No hay leads con los filtros aplicados.
                </td>
              </tr>
            ) : (
              paginados.map(lead => (
                <tr key={lead.id} className="border-b border-hm-border hover:bg-hm-surface2/30 transition-colors group">
                  <td className="p-4">
                    <div className="font-medium text-sm">{lead.empresa || lead.nombre || '—'}</div>
                    {lead.empresa && lead.nombre && <div className="text-xs text-hm-muted">{lead.nombre}</div>}
                    {lead.rubro && <div className="text-[10px] font-mono text-hm-muted/70 mt-0.5">{lead.rubro}</div>}
                  </td>
                  <td className="p-4">
                    {lead.telefono && <div className="font-mono text-xs">{lead.telefono}</div>}
                    {lead.email    && <div className="text-xs text-hm-muted">{lead.email}</div>}
                  </td>
                  <td className="p-4"><Badge variant="default">{lead.origen}</Badge></td>
                  <td className="p-4 text-sm text-hm-muted max-w-[180px] truncate">{lead.producto_interes || '—'}</td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full border text-xs font-black ${GRADE_STYLE[lead.lead_grade]}`}>
                      {lead.lead_grade}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    {lead.cotizaciones?.[0]?.count > 0 ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold border border-teal-500/40">
                        {lead.cotizaciones[0].count}
                      </span>
                    ) : (
                      <span className="text-hm-muted text-xs">—</span>
                    )}
                  </td>
                  <td className="p-4"><Badge variant={ESTADO_VARIANT[lead.estado]}>{lead.estado}</Badge></td>
                  <td className="p-4 font-mono text-xs text-hm-muted">{new Date(lead.created_at).toLocaleDateString('es-AR')}</td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditando(lead); setModalOpen(true) }}
                        className="px-2 py-1 text-[10px] font-mono font-bold border border-hm-border rounded hover:border-hm-accent hover:text-hm-accent transition-colors"
                      >
                        EDITAR
                      </button>
                      {NEXT_ESTADO[lead.estado] && (
                        <button
                          onClick={() => handleAvanzar(lead)}
                          className="px-2 py-1 text-[10px] font-mono font-bold border border-hm-border rounded hover:border-green-500 hover:text-green-400 transition-colors"
                        >
                          → {NEXT_ESTADO[lead.estado].toUpperCase()}
                        </button>
                      )}
                      {lead.estado === 'Ganado' && !lead.cliente_id && (
                        <button
                          onClick={() => setConvirtiendo(lead)}
                          className="px-2 py-1 text-[10px] font-mono font-bold bg-green-500/10 border border-green-500/40 text-green-400 rounded hover:bg-green-500/20 transition-colors"
                        >
                          CONVERTIR
                        </button>
                      )}
                      {lead.estado === 'Ganado' && lead.cliente_id && (
                        <span className="px-2 py-1 text-[10px] font-mono text-green-400/60">✓ CLIENTE</span>
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

      <ModalLead
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditando(null) }}
        lead={editando}
        onConfirm={handleConfirm}
      />

      <ModalConfirm
        isOpen={!!convirtiendo}
        onClose={() => setConvirtiendo(null)}
        onConfirm={handleConvertir}
        title="Convertir a cliente"
        message={`¿Convertís a "${convirtiendo?.empresa || convirtiendo?.nombre}" en cliente? Se creará un registro en la base de clientes.`}
        confirmLabel="Convertir"
        variant="primary"
      />
    </div>
  )
}
