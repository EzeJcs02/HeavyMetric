import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import Modal from '../../ui/Modal'
import Badge from '../../ui/Badge'
import Input from '../../ui/Input'
import {
  fetchActividades, agregarActividad,
  fetchTareas, crearTarea, completarTarea,
} from '../../../hooks/useLeads'

const TIPO_ICON = {
  nota:           '📝',
  cambio_estado:  '🔄',
  contacto:       '📞',
  tarea_creada:   '✅',
  cotizacion:     '📋',
  sistema:        '⚙️',
}

const PRIORIDAD_STYLE = {
  alta:  'text-red-400 bg-red-500/10 border-red-500/30',
  media: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  baja:  'text-hm-muted bg-hm-surface2 border-hm-border',
}

const GRADE_STYLE = {
  A: 'bg-red-500/20 text-red-300 border-red-500/40',
  B: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  C: 'bg-hm-surface2 text-hm-muted border-hm-border',
}

function fmtFecha(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d + 'T12:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
}

export default function LeadDetalle({ lead, isOpen, onClose, onUpdate, onRegistrarContacto }) {
  const [tab, setTab]               = useState('timeline')
  const [actividades, setActividades] = useState([])
  const [tareas, setTareas]         = useState([])
  const [loadingAct, setLoadingAct] = useState(false)
  const [nota, setNota]             = useState('')
  const [savingNota, setSavingNota] = useState(false)
  const [nuevaTarea, setNuevaTarea] = useState({ titulo: '', vencimiento: '' })
  const [savingTarea, setSavingTarea] = useState(false)

  useEffect(() => {
    if (!lead || !isOpen) return
    setTab('timeline')
    setNota('')
    recargar()
  }, [lead?.id, isOpen])

  const recargar = async () => {
    if (!lead) return
    setLoadingAct(true)
    const [acts, tasks] = await Promise.all([fetchActividades(lead.id), fetchTareas(lead.id)])
    setActividades(acts)
    setTareas(tasks)
    setLoadingAct(false)
  }

  const handleAgregarNota = async (e) => {
    e.preventDefault()
    if (!nota.trim()) return
    setSavingNota(true)
    try {
      await agregarActividad(lead.id, 'nota', nota.trim())
      setNota('')
      await recargar()
      toast.success('Nota agregada')
    } catch (err) { toast.error(err.message) }
    finally { setSavingNota(false) }
  }

  const handleCrearTarea = async (e) => {
    e.preventDefault()
    if (!nuevaTarea.titulo.trim()) return
    setSavingTarea(true)
    try {
      await crearTarea(lead.id, {
        titulo: nuevaTarea.titulo.trim(),
        vencimiento: nuevaTarea.vencimiento || null,
      })
      setNuevaTarea({ titulo: '', vencimiento: '' })
      await recargar()
      toast.success('Tarea creada')
    } catch (err) { toast.error(err.message) }
    finally { setSavingTarea(false) }
  }

  const handleCompletarTarea = async (tareaId) => {
    try {
      await completarTarea(tareaId, lead.id)
      await recargar()
      toast.success('Tarea completada')
    } catch (err) { toast.error(err.message) }
  }

  const handleRegistrarContacto = async () => {
    try {
      await onRegistrarContacto(lead.id)
      await recargar()
      toast.success('Contacto registrado')
    } catch (err) { toast.error(err.message) }
  }

  if (!lead) return null

  const tareasPendientes = tareas.filter(t => !t.completada)
  const tareasCompletas  = tareas.filter(t => t.completada)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 -mt-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full border text-sm font-black ${GRADE_STYLE[lead.lead_grade]}`}>
              {lead.lead_grade}
            </span>
            <h2 className="text-xl font-bold truncate">{lead.empresa || lead.nombre || '—'}</h2>
            {lead.empresa && lead.nombre && (
              <span className="text-sm text-hm-muted">{lead.nombre}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className={`text-[9px] font-bold border rounded px-2 py-0.5 uppercase ${PRIORIDAD_STYLE[lead.prioridad || 'media']}`}>
              {lead.prioridad || 'media'}
            </span>
            <Badge variant="info">{lead.pipeline || 'ventas'}</Badge>
            <Badge variant="default">{lead.estado}</Badge>
            {lead.rubro && <Badge variant="default">{lead.rubro}</Badge>}
            {lead.origen && <Badge variant="default">{lead.origen}</Badge>}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-bold">{lead.lead_score}<span className="text-sm text-hm-muted">/100</span></div>
          <div className="text-[10px] font-mono text-hm-muted">score</div>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 p-4 bg-hm-surface2/20 rounded-lg border border-hm-border/50">
        {[
          ['Teléfono',    lead.telefono],
          ['Email',       lead.email],
          ['Responsable', lead.asignado?.nombre_completo],
          ['Producto',    lead.producto_interes],
          ['Último contacto', lead.ultimo_contacto ? fmtFecha(lead.ultimo_contacto) : null],
          ['Próx. seguimiento', lead.proximo_seguimiento ? fmtDate(lead.proximo_seguimiento) : null],
          ['Creado', fmtFecha(lead.created_at)],
          ['Cotizaciones', lead.cotizaciones?.[0]?.count || 0],
        ].map(([label, val]) => (
          <div key={label}>
            <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-0.5">{label}</div>
            <div className="text-sm font-medium truncate">{val || '—'}</div>
          </div>
        ))}
      </div>

      {/* Acciones rápidas */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <button
          onClick={handleRegistrarContacto}
          className="text-xs font-mono font-bold border border-green-700/50 text-green-400/80 rounded px-3 py-1.5 hover:border-green-500 hover:text-green-400 transition-colors"
        >
          📞 Registrar contacto
        </button>
        <button
          onClick={() => onUpdate(lead)}
          className="text-xs font-mono font-bold border border-hm-border text-hm-muted rounded px-3 py-1.5 hover:border-hm-accent hover:text-hm-accent transition-colors"
        >
          ✏️ Editar lead
        </button>
        {lead.notas && (
          <div className="w-full text-xs text-hm-muted bg-hm-surface2/30 border border-hm-border/50 rounded px-3 py-2 italic">
            {lead.notas}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-hm-border mb-4">
        {[
          ['timeline', `Timeline (${actividades.length})`],
          ['tareas',   `Tareas (${tareasPendientes.length})`],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-xs font-mono font-bold border-b-2 transition-all ${
              tab === key
                ? 'border-hm-accent text-hm-accent'
                : 'border-transparent text-hm-muted hover:text-hm-text'
            }`}
          >
            {label.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Tab: Timeline */}
      {tab === 'timeline' && (
        <div className="flex flex-col gap-4">
          {/* Agregar nota */}
          <form onSubmit={handleAgregarNota} className="flex gap-2">
            <input
              value={nota}
              onChange={e => setNota(e.target.value)}
              placeholder="Agregar nota, comentario o novedad..."
              className="flex-1 bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text placeholder-hm-muted/50 focus:outline-none focus:border-hm-accent transition-colors"
            />
            <button
              type="submit"
              disabled={savingNota || !nota.trim()}
              className="px-4 py-2 text-xs font-mono font-bold bg-hm-accent/10 border border-hm-accent/40 text-hm-accent rounded-lg hover:bg-hm-accent/20 disabled:opacity-40 transition-colors"
            >
              {savingNota ? '...' : 'AGREGAR'}
            </button>
          </form>

          {/* Actividades */}
          {loadingAct ? (
            <div className="h-20 bg-hm-surface2 rounded animate-pulse" />
          ) : actividades.length === 0 ? (
            <div className="text-center text-hm-muted font-mono text-sm py-8">Sin actividades registradas.</div>
          ) : (
            <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto pr-1">
              {actividades.map(act => (
                <div key={act.id} className="flex gap-3 items-start">
                  <div className="shrink-0 w-6 h-6 flex items-center justify-center text-sm mt-0.5">
                    {TIPO_ICON[act.tipo] || '•'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-hm-text">{act.descripcion}</div>
                    <div className="text-[10px] font-mono text-hm-muted mt-0.5">
                      {fmtFecha(act.created_at)}
                      {act.creado_por?.nombre_completo && ` · ${act.creado_por.nombre_completo}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Tareas */}
      {tab === 'tareas' && (
        <div className="flex flex-col gap-4">
          {/* Nueva tarea */}
          <form onSubmit={handleCrearTarea} className="flex gap-2 items-end">
            <div className="flex-1">
              <Input
                label="Nueva tarea"
                value={nuevaTarea.titulo}
                onChange={e => setNuevaTarea(p => ({ ...p, titulo: e.target.value }))}
                placeholder="Ej: Llamar para confirmar reunión"
              />
            </div>
            <div className="w-36">
              <Input
                label="Vence"
                type="date"
                value={nuevaTarea.vencimiento}
                onChange={e => setNuevaTarea(p => ({ ...p, vencimiento: e.target.value }))}
              />
            </div>
            <button
              type="submit"
              disabled={savingTarea || !nuevaTarea.titulo.trim()}
              className="pb-0.5 px-4 py-2.5 text-xs font-mono font-bold bg-hm-accent/10 border border-hm-accent/40 text-hm-accent rounded-lg hover:bg-hm-accent/20 disabled:opacity-40 transition-colors"
            >
              {savingTarea ? '...' : '+ CREAR'}
            </button>
          </form>

          {/* Lista pendientes */}
          {loadingAct ? (
            <div className="h-16 bg-hm-surface2 rounded animate-pulse" />
          ) : tareasPendientes.length === 0 ? (
            <div className="text-center text-hm-muted font-mono text-sm py-6">Sin tareas pendientes.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {tareasPendientes.map(t => {
                const venc = t.vencimiento ? new Date(t.vencimiento + 'T12:00') : null
                const vencida = venc && venc < new Date()
                return (
                  <div key={t.id} className="flex items-center gap-3 bg-hm-surface2/20 border border-hm-border/50 rounded-lg px-3 py-2">
                    <button
                      onClick={() => handleCompletarTarea(t.id)}
                      className="w-4 h-4 rounded border border-hm-border hover:border-green-500 hover:bg-green-500/20 transition-colors shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">{t.titulo}</div>
                      {t.descripcion && <div className="text-xs text-hm-muted">{t.descripcion}</div>}
                    </div>
                    {t.vencimiento && (
                      <span className={`text-[10px] font-mono shrink-0 ${vencida ? 'text-red-400' : 'text-hm-muted'}`}>
                        {vencida ? '⚠️ ' : ''}{fmtDate(t.vencimiento)}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Completadas (colapsadas) */}
          {tareasCompletas.length > 0 && (
            <details className="text-xs text-hm-muted font-mono cursor-pointer">
              <summary className="hover:text-hm-text transition-colors">
                {tareasCompletas.length} tarea{tareasCompletas.length !== 1 ? 's' : ''} completada{tareasCompletas.length !== 1 ? 's' : ''}
              </summary>
              <div className="flex flex-col gap-1 mt-2 pl-2 opacity-50">
                {tareasCompletas.map(t => (
                  <div key={t.id} className="line-through text-xs">{t.titulo}</div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </Modal>
  )
}
