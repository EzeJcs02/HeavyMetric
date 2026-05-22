import { useState, useMemo, useEffect } from 'react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'
import { useLeads, calcularScore } from '../../hooks/useLeads'
import { useAuth } from '../../context/AuthContext'
import { useDolar } from '../../context/DolarContext'
import KanbanBoard from '../../components/modulos/crm/KanbanBoard'
import LeadDetalle from '../../components/modulos/crm/LeadDetalle'
import Modal from '../../components/ui/Modal'
import ModalConfirm from '../../components/ui/ModalConfirm'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Pagination from '../../components/ui/Pagination'
import KpiCard from '../../components/ui/KpiCard'
import AnalyticsCRM from '../../components/modulos/crm/AnalyticsCRM'

const PER_PAGE = 12

// ── Pipelines ────────────────────────────────────────────────────
const PIPELINES = {
  ventas: {
    label: 'Ventas',
    estados: ['Lead','Contactado','Calificado','Cotización','Negociación','Ganado','Perdido'],
    terminales: ['Ganado','Perdido'],
  },
  postventa: {
    label: 'Postventa',
    estados: ['Reclamo','Diagnóstico','OT','Repuestos','Resolución','Cierre'],
    terminales: ['Cierre'],
  },
}

// Compatibilidad: mapear estados viejos al pipeline ventas
const ORIGENES_VENTAS = ['Nuevo','Lead','Contactado','Cotizado','Cotización','Negociación','Negociacion','Ganado','Perdido']

const ESTADO_VARIANT = {
  Lead: 'info', Contactado: 'warn', Calificado: 'warn',
  'Cotización': 'alq', Negociación: 'ventas', Ganado: 'ok', Perdido: 'danger',
  Reclamo: 'danger', Diagnóstico: 'warn', OT: 'alq',
  Repuestos: 'warn', Resolución: 'ventas', Cierre: 'ok',
  // legacy
  Nuevo: 'info', 'Cotizacion Enviada': 'alq', Negociacion: 'ventas',
  'Solicitud Recibida': 'info', Revision: 'warn', 'OT Creada': 'alq',
  'En Proceso': 'ventas', 'Esperando Repuestos': 'danger', Finalizado: 'ok', Facturado: 'ok',
  Cotizado: 'alq',
}

const GRADE_STYLE = {
  A: 'bg-red-500/20 text-red-300 border-red-500/40',
  B: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  C: 'bg-hm-surface2 text-hm-muted border-hm-border',
}
const GRADE_LABEL = { A: 'Caliente', B: 'Tibio', C: 'Frío' }

const ORIGENES = ['Manual','Meta','Web','WhatsApp','Referido','Licitacion']
const RUBROS   = ['Mineria','Agro','Vial','Construccion','Industrial','Municipio']
const EMPTY_FORM = {
  nombre: '', empresa: '', telefono: '', email: '',
  origen: 'Manual', rubro: '', producto_interes: '', mensaje: '', notas: '',
  prioridad: 'media', pipeline: 'ventas', responsable_id: '',
  proximo_seguimiento: '', monto_estimado_usd: 0,
}

// ── ScorePreview ─────────────────────────────────────────────────
function ScorePreview({ rubro, origen, mensaje, empresa }) {
  const { score, grade } = calcularScore(rubro, origen, mensaje, empresa)
  return (
    <div className="flex items-center gap-3 bg-hm-surface2/50 rounded-lg p-3 border border-hm-border">
      <div>
        <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-0.5">Score estimado</div>
        <div className="text-2xl font-bold">{score}<span className="text-sm text-hm-muted">/100</span></div>
      </div>
      <div className={`ml-auto px-3 py-1.5 rounded border text-lg font-black ${GRADE_STYLE[grade]}`}>
        {grade} <span className="text-sm opacity-80 font-normal">({GRADE_LABEL[grade]})</span>
      </div>
    </div>
  )
}

// ── ModalLead ────────────────────────────────────────────────────
function ModalLead({ isOpen, onClose, lead, onConfirm, usuarios }) {
  const [form, setForm]   = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm(lead ? {
      nombre: lead.nombre || '', empresa: lead.empresa || '',
      telefono: lead.telefono || '', email: lead.email || '',
      origen: lead.origen || 'Manual', rubro: lead.rubro || '',
      producto_interes: lead.producto_interes || '',
      mensaje: lead.mensaje || '', notas: lead.notas || '',
      prioridad: lead.prioridad || 'media',
      pipeline: lead.pipeline || 'ventas',
      responsable_id: lead.responsable_id || '',
      proximo_seguimiento: lead.proximo_seguimiento?.slice(0,10) || '',
      monto_estimado_usd: lead.monto_estimado_usd || 0,
    } : EMPTY_FORM)
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
        <div className="grid grid-cols-3 gap-4">
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
          <div className="flex flex-col gap-1">
            <label className="label-mono">Pipeline</label>
            <select value={form.pipeline} onChange={e => set('pipeline', e.target.value)} className="select-hm">
              <option value="ventas">Ventas</option>
              <option value="postventa">Postventa</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <label className="label-mono">Prioridad</label>
            <select value={form.prioridad} onChange={e => set('prioridad', e.target.value)} className="select-hm">
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="label-mono">Responsable</label>
            <select value={form.responsable_id} onChange={e => set('responsable_id', e.target.value)} className="select-hm">
              <option value="">— Sin asignar —</option>
              {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre_completo}</option>)}
            </select>
          </div>
          <Input
            label="Próx. seguimiento"
            type="date"
            value={form.proximo_seguimiento}
            onChange={e => set('proximo_seguimiento', e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Producto / Interés" value={form.producto_interes} onChange={e => set('producto_interes', e.target.value)} />
          <Input label="Monto Estimado (USD)" type="number" min="0" step="0.01" value={form.monto_estimado_usd} onChange={e => set('monto_estimado_usd', e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="label-mono">Mensaje</label>
          <textarea
            value={form.mensaje} onChange={e => set('mensaje', e.target.value)} rows={2}
            className="bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent focus:ring-1 focus:ring-hm-accent/30 resize-none"
          />
        </div>
        <Input label="Notas internas" value={form.notas} onChange={e => set('notas', e.target.value)} />

        <div className="flex justify-end gap-3 pt-4 border-t border-hm-border">
          <Button variant="outline" type="button" onClick={onClose} disabled={saving}>CANCELAR</Button>
          <Button type="submit" variant="primary" disabled={saving || (!form.nombre && !form.empresa)}>
            {saving ? 'GUARDANDO...' : lead ? 'GUARDAR' : 'CREAR LEAD'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Página principal ─────────────────────────────────────────────
export default function Leads() {
  const { leads, loading, error, crearLead, actualizarLead, avanzarEstado, registrarContacto, convertirACliente, convertirAVenta, generarPostventa } = useLeads()
  const { perfil } = useAuth()

  const [pipeline, setPipeline]       = useState('ventas')
  const [viewMode, setViewMode]       = useState('tabla')
  const [busqueda, setBusqueda]       = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroGrade, setFiltroGrade]   = useState('todos')
  const [page, setPage]               = useState(1)
  const [modalOpen, setModalOpen]     = useState(false)
  const [editando, setEditando]       = useState(null)
  const [detalle, setDetalle]         = useState(null)
  const [convirtiendo, setConvirtiendo] = useState(null)
  const [usuarios, setUsuarios]       = useState([])

  useEffect(() => { setPage(1); setFiltroEstado('todos') }, [busqueda, filtroGrade, pipeline])

  // Cargar usuarios para asignación
  useEffect(() => {
    if (!perfil?.organization_id) return
    supabase.from('perfiles').select('id, nombre_completo')
      .eq('organization_id', perfil.organization_id)
      .then(({ data }) => setUsuarios(data || []))
  }, [perfil?.organization_id])

  const pipelineConfig = PIPELINES[pipeline]

  // Filtrar leads por pipeline (incluyendo leads legacy sin pipeline)
  const leadsDelPipeline = useMemo(() => {
    return leads.filter(l => {
      if (pipeline === 'ventas') {
        return !l.pipeline || l.pipeline === 'ventas' ||
          ORIGENES_VENTAS.includes(l.estado)
      }
      return l.pipeline === 'postventa'
    })
  }, [leads, pipeline])

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase()
    return leadsDelPipeline.filter(l => {
      const matchQ = !q ||
        (l.nombre || '').toLowerCase().includes(q) ||
        (l.empresa || '').toLowerCase().includes(q) ||
        (l.telefono || '').includes(q) ||
        (l.producto_interes || '').toLowerCase().includes(q)
      const matchEstado = filtroEstado === 'todos' || l.estado === filtroEstado
      const matchGrade  = filtroGrade === 'todos' || l.lead_grade === filtroGrade
      return matchQ && matchEstado && matchGrade
    })
  }, [leadsDelPipeline, busqueda, filtroEstado, filtroGrade])

  const paginados = useMemo(() =>
    filtrados.slice((page - 1) * PER_PAGE, page * PER_PAGE), [filtrados, page])

  // KPIs del pipeline activo
  const activos    = leadsDelPipeline.filter(l => !pipelineConfig.terminales.includes(l.estado)).length
  const gradeA     = leadsDelPipeline.filter(l => l.lead_grade === 'A').length
  const ganados    = leadsDelPipeline.filter(l => l.estado === 'Ganado' || l.estado === 'Finalizado').length
  const conversion = leadsDelPipeline.length > 0 ? Math.round((ganados / leadsDelPipeline.length) * 100) : 0

  const countPorEstado = useMemo(() => {
    const m = {}
    pipelineConfig.estados.forEach(e => {
      m[e] = leadsDelPipeline.filter(l => l.estado === e).length
    })
    return m
  }, [leadsDelPipeline, pipelineConfig])

  const handleConfirm = async (form) => {
    try {
      const payload = { ...form, responsable_id: form.responsable_id || null, proximo_seguimiento: form.proximo_seguimiento || null }
      if (editando) {
        await actualizarLead(editando.id, payload)
        toast.success('Lead actualizado')
        // Si el detalle estaba abierto, actualizarlo
        if (detalle?.id === editando.id) {
          setDetalle(prev => ({ ...prev, ...payload }))
        }
      } else {
        // Estado inicial según pipeline
        const estadoInicial = pipelineConfig.estados[0]
        await crearLead({ ...payload, estado: estadoInicial })
        toast.success('Lead creado')
      }
      setModalOpen(false); setEditando(null)
    } catch (err) { toast.error(err.message); throw err }
  }

  const handleMoveCard = async (lead, nuevoEstado) => {
    if (!nuevoEstado) return
    try {
      await avanzarEstado(lead.id, nuevoEstado, lead.estado)
      toast.success(`Movido a ${nuevoEstado}`)
    } catch (err) { toast.error(err.message) }
  }

  const handleConvertir = async () => {
    try {
      const cliente = await convertirACliente(convirtiendo)
      toast.success(`Cliente "${cliente.razon_social}" creado`)
      setConvirtiendo(null)
    } catch (err) { toast.error(err.message) }
  }

  const handleCrearVenta = async (lead) => {
    try {
      await convertirAVenta(lead)
    } catch (err) { toast.error(err.message) }
  }

  const handleCrearPostventa = async (lead) => {
    try {
      await generarPostventa(lead)
    } catch (err) { toast.error(err.message) }
  }

  const handleExportExcel = () => {
    if (!filtrados.length) { toast.error('No hay datos para exportar'); return }
    const rows = filtrados.map(l => ({
      PIPELINE:   l.pipeline || 'ventas',
      EMPRESA:    l.empresa || l.nombre || '—',
      NOMBRE:     l.nombre || '—',
      TELEFONO:   l.telefono || '—',
      EMAIL:      l.email || '—',
      ORIGEN:     l.origen || '—',
      RUBRO:      l.rubro || '—',
      INTERES:    l.producto_interes || '—',
      PRIORIDAD:  l.prioridad || '—',
      GRADO:      l.lead_grade || '—',
      SCORE:      l.lead_score || 0,
      ESTADO:     l.estado || '—',
      RESPONSABLE: l.asignado?.nombre_completo || '—',
      'ULTIMO CONTACTO': l.ultimo_contacto ? new Date(l.ultimo_contacto).toLocaleDateString('es-AR') : '—',
      'PROX. SEGUIMIENTO': l.proximo_seguimiento ? new Date(l.proximo_seguimiento).toLocaleDateString('es-AR') : '—',
      FECHA:      new Date(l.created_at).toLocaleDateString('es-AR'),
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Leads')
    XLSX.writeFile(wb, `Leads_${pipeline}_${new Date().toISOString().slice(0,10)}.xlsx`)
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
    <div className="flex flex-col gap-5">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-hm-border pb-4">
        {/* Pipeline toggle */}
        <div className="flex items-center gap-1 bg-hm-surface2/40 rounded-lg p-1 border border-hm-border">
          {Object.entries(PIPELINES).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setPipeline(key)}
              className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${
                pipeline === key
                  ? 'bg-hm-accent text-hm-bg shadow'
                  : 'text-hm-muted hover:text-hm-text'
              }`}
            >
              {cfg.label.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Vista toggle */}
          <div className="flex gap-0.5 bg-hm-surface2/40 rounded-lg p-1 border border-hm-border">
            {[['tabla','☰'],['kanban','⊞'],['analytics','📊']].map(([mode, icon]) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                title={mode}
                className={`px-3 py-1.5 rounded text-sm transition-all ${
                  viewMode === mode ? 'bg-hm-surface2 text-hm-text' : 'text-hm-muted hover:text-hm-text'
                }`}
              >
                {icon}
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={handleExportExcel}>EXCEL</Button>
          <Button variant="primary" onClick={() => { setEditando(null); setModalOpen(true) }}>+ LEAD</Button>
        </div>
      </div>

      {/* ── KPIs ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Activos" value={activos} subtext={pipelineConfig.label} accent="hm-accent" />
        <KpiCard label="Grado A" value={gradeA} subtext="Prioridad máxima" accent="red-400" />
        <KpiCard label={pipeline === 'ventas' ? 'Ganados' : 'Finalizados'} value={ganados} subtext="Total histórico" accent="green-400" />
        <KpiCard label="Conversión" value={`${conversion}%`} subtext="Sobre total" accent="blue-400" />
      </div>

      {/* ── Estado pills ─────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setFiltroEstado('todos')}
          className={`px-3 py-1 rounded text-[10px] font-bold tracking-widest border transition-all ${filtroEstado === 'todos' ? 'bg-hm-accent border-hm-accent text-white' : 'bg-hm-surface border-hm-border text-hm-muted hover:border-hm-accent/50'}`}
        >
          TODOS ({leadsDelPipeline.length})
        </button>
        {pipelineConfig.estados.map(e => (
          <button
            key={e}
            onClick={() => setFiltroEstado(filtroEstado === e ? 'todos' : e)}
            className={`px-3 py-1 rounded text-[10px] font-bold tracking-widest border transition-all ${filtroEstado === e ? 'bg-hm-accent border-hm-accent text-white' : 'bg-hm-surface border-hm-border text-hm-muted hover:border-hm-accent/50'}`}
          >
            {e.toUpperCase()} ({countPorEstado[e] || 0})
          </button>
        ))}
      </div>

      {/* ── Filtros ──────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-3 items-end bg-hm-surface2/20 p-4 rounded-lg border border-hm-border/50">
        <div className="flex-1">
          <label className="text-[10px] font-mono text-hm-muted mb-1 block uppercase tracking-widest">Buscar</label>
          <Input placeholder="Nombre, empresa, teléfono..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
        <div className="flex gap-1.5">
          {['todos','A','B','C'].map(g => (
            <button key={g}
              onClick={() => setFiltroGrade(g)}
              className={`px-3 py-2 rounded text-[10px] font-bold border transition-all ${filtroGrade === g ? 'bg-hm-accent border-hm-accent text-white' : 'bg-hm-surface border-hm-border text-hm-muted hover:border-hm-accent/50'}`}
            >
              {g === 'todos' ? 'TODOS' : `GRADO ${g}`}
            </button>
          ))}
        </div>
      </div>

      {/* ── Vista Kanban ─────────────────────────────────────────── */}
      {viewMode === 'kanban' && (
        <KanbanBoard
          leads={filtrados}
          estados={pipelineConfig.estados}
          loading={loading}
          onCardClick={setDetalle}
          onMoveCard={handleMoveCard}
        />
      )}

      {/* ── Vista Analytics ──────────────────────────────────────── */}
      {viewMode === 'analytics' && (
        <AnalyticsCRM leads={leadsDelPipeline} />
      )}

      {/* ── Vista Tabla ──────────────────────────────────────────── */}
      {viewMode === 'tabla' && (
        <Card className="overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-hm-surface2/50 border-b border-hm-border">
              <tr>
                <th className="p-4 font-mono text-xs text-hm-muted">LEAD</th>
                <th className="p-4 font-mono text-xs text-hm-muted">CONTACTO</th>
                <th className="p-4 font-mono text-xs text-hm-muted">PRIORIDAD</th>
                <th className="p-4 font-mono text-xs text-hm-muted text-center">GRADO</th>
                <th className="p-4 font-mono text-xs text-hm-muted">RESPONSABLE</th>
                <th className="p-4 font-mono text-xs text-hm-muted">SEGUIMIENTO</th>
                <th className="p-4 font-mono text-xs text-hm-muted">ESTADO</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1,2,3,4,5].map(i => (
                  <tr key={i} className="border-b border-hm-border">
                    {[1,2,3,4,5,6,7,8].map(j => <td key={j} className="p-4"><div className="h-4 bg-hm-surface2 rounded animate-pulse" /></td>)}
                  </tr>
                ))
              ) : filtrados.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-10 text-center text-hm-muted font-mono text-sm">
                    No hay leads con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                paginados.map(lead => {
                  const vencido = lead.proximo_seguimiento && new Date(lead.proximo_seguimiento) < new Date()
                  return (
                    <tr
                      key={lead.id}
                      className="border-b border-hm-border hover:bg-hm-surface2/30 transition-colors cursor-pointer group"
                      onClick={() => setDetalle(lead)}
                    >
                      <td className="p-4">
                        <div className="font-medium text-sm">{lead.empresa || lead.nombre || '—'}</div>
                        {lead.empresa && lead.nombre && <div className="text-xs text-hm-muted">{lead.nombre}</div>}
                        {lead.rubro && <div className="text-[10px] font-mono text-hm-muted/70">{lead.rubro}</div>}
                      </td>
                      <td className="p-4">
                        {lead.telefono && <div className="font-mono text-xs">{lead.telefono}</div>}
                        {lead.email    && <div className="text-xs text-hm-muted">{lead.email}</div>}
                      </td>
                      <td className="p-4">
                        <span className={`text-[9px] font-bold uppercase border rounded px-1.5 py-0.5 ${
                          lead.prioridad === 'alta' ? 'text-red-400 border-red-500/30 bg-red-500/10' :
                          lead.prioridad === 'media' ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' :
                          'text-hm-muted border-hm-border bg-hm-surface2'
                        }`}>
                          {lead.prioridad || 'media'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${GRADE_STYLE[lead.lead_grade]}`}>
                          <span className="font-black text-xs">{lead.lead_grade}</span>
                          <span className="opacity-80 uppercase tracking-wider">{GRADE_LABEL[lead.lead_grade]}</span>
                        </span>
                      </td>
                      <td className="p-4 text-sm text-hm-muted">
                        {lead.asignado?.nombre_completo || '—'}
                      </td>
                      <td className="p-4">
                        {lead.proximo_seguimiento ? (
                          <span className={`text-xs font-mono ${vencido ? 'text-red-400' : 'text-hm-muted'}`}>
                            {vencido ? '⚠️ ' : ''}{new Date(lead.proximo_seguimiento).toLocaleDateString('es-AR')}
                          </span>
                        ) : (
                          <span className="text-xs text-hm-muted">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge variant={ESTADO_VARIANT[lead.estado] || 'default'}>{lead.estado}</Badge>
                      </td>
                      <td className="p-4 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setEditando(lead); setModalOpen(true) }}
                            className="px-2 py-1 text-[10px] font-mono border border-hm-border rounded hover:border-hm-accent hover:text-hm-accent transition-colors"
                          >
                            EDITAR
                          </button>
                          {lead.estado === 'Ganado' && !lead.cliente_id && (
                            <button
                              onClick={() => setConvirtiendo(lead)}
                              className="px-2 py-1 text-[10px] font-mono bg-green-500/10 border border-green-500/40 text-green-400 rounded hover:bg-green-500/20 transition-colors"
                            >
                              CREAR CLIENTE
                            </button>
                          )}
                          {lead.estado === 'Ganado' && lead.cliente_id && (
                            <div className="flex gap-1">
                              <button onClick={() => handleCrearVenta(lead)} className="px-2 py-1 text-[10px] font-mono bg-blue-500/10 border border-blue-500/40 text-blue-400 rounded hover:bg-blue-500/20">
                                $ VENTA
                              </button>
                              <button onClick={() => handleCrearPostventa(lead)} className="px-2 py-1 text-[10px] font-mono bg-purple-500/10 border border-purple-500/40 text-purple-400 rounded hover:bg-purple-500/20">
                                ➔ POSTVENTA
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
          <Pagination total={filtrados.length} page={page} perPage={PER_PAGE} onPageChange={setPage} />
        </Card>
      )}

      {/* ── Modales ──────────────────────────────────────────────── */}
      <ModalLead
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditando(null) }}
        lead={editando}
        onConfirm={handleConfirm}
        usuarios={usuarios}
      />

      <LeadDetalle
        lead={detalle}
        isOpen={!!detalle}
        onClose={() => setDetalle(null)}
        onUpdate={(lead) => { setDetalle(null); setEditando(lead); setModalOpen(true) }}
        onRegistrarContacto={registrarContacto}
      />

      <ModalConfirm
        isOpen={!!convirtiendo}
        onClose={() => setConvirtiendo(null)}
        onConfirm={handleConvertir}
        title="Convertir a cliente"
        message={`¿Convertís a "${convirtiendo?.empresa || convirtiendo?.nombre}" en cliente?`}
        confirmLabel="Convertir"
        variant="primary"
      />
    </div>
  )
}
