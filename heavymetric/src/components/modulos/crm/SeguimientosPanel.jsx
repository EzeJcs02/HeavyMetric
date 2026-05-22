import { useMemo } from 'react'
import Card from '../../ui/Card'
import { computeAlertaLeads } from './WorkflowAlertas'

const TERMINALES = new Set(['Ganado', 'Perdido', 'Cierre'])
const DIAS_SLA = { alta: 2, media: 5, baja: 10 }

const GRADE_STYLE = {
  A: 'bg-red-500/20 text-red-300 border-red-500/40',
  B: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  C: 'bg-hm-surface2 text-hm-muted border-hm-border',
}

function daysSince(dateStr) {
  if (!dateStr) return null
  return Math.floor((Date.now() - new Date(dateStr)) / 86400000)
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr + 'T12:00') - Date.now()) / 86400000)
}

function UrgenciaChip({ lead }) {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const diasSeg = daysUntil(lead.proximo_seguimiento)
  const diasContacto = daysSince(lead.ultimo_contacto)
  const sla = DIAS_SLA[lead.prioridad] || 5

  if (diasSeg !== null && diasSeg < 0)
    return <span className="text-[9px] font-bold bg-red-500/20 text-red-300 border border-red-500/40 px-2 py-0.5 rounded whitespace-nowrap">VENCIDO {Math.abs(diasSeg)}d</span>
  if (diasSeg === 0)
    return <span className="text-[9px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/40 px-2 py-0.5 rounded">HOY</span>
  if (diasSeg === 1)
    return <span className="text-[9px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 px-2 py-0.5 rounded">MAÑANA</span>
  if (diasSeg !== null && diasSeg <= 7)
    return <span className="text-[9px] font-bold bg-hm-surface2 text-hm-muted border border-hm-border px-2 py-0.5 rounded">{diasSeg}d</span>
  if (diasContacto !== null && diasContacto > sla * 2 && (lead.lead_grade === 'A' || lead.lead_grade === 'B'))
    return <span className="text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded whitespace-nowrap">FRÍO {diasContacto}d</span>
  if (!lead.proximo_seguimiento)
    return <span className="text-[9px] text-hm-muted">Sin fecha</span>
  return <span className="text-[9px] text-hm-muted">{diasSeg}d</span>
}

function SeguimientosTable({ leads, onCardClick }) {
  if (!leads.length)
    return <div className="p-6 text-center text-sm font-mono text-hm-muted">Sin leads en este grupo.</div>

  return (
    <table className="w-full text-sm">
      <thead className="bg-hm-surface2/30 border-b border-hm-border/50">
        <tr>
          <th className="px-4 py-2.5 text-left font-mono text-[10px] text-hm-muted uppercase tracking-widest">Lead</th>
          <th className="px-4 py-2.5 text-left font-mono text-[10px] text-hm-muted uppercase tracking-widest">Estado</th>
          <th className="px-4 py-2.5 text-left font-mono text-[10px] text-hm-muted uppercase tracking-widest">Responsable</th>
          <th className="px-4 py-2.5 text-left font-mono text-[10px] text-hm-muted uppercase tracking-widest">Urgencia / SLA</th>
          <th className="px-4 py-2.5 text-left font-mono text-[10px] text-hm-muted uppercase tracking-widest">Último contacto</th>
          <th className="px-4 py-2.5 text-left font-mono text-[10px] text-hm-muted uppercase tracking-widest">Prioridad</th>
        </tr>
      </thead>
      <tbody>
        {leads.map(l => (
          <tr
            key={l.id}
            onClick={() => onCardClick(l)}
            className="border-b border-hm-border/30 hover:bg-hm-surface2/20 cursor-pointer transition-colors"
          >
            <td className="px-4 py-3">
              <div className="flex items-center gap-2">
                {l.lead_grade && (
                  <span className={`shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full border text-[9px] font-black ${GRADE_STYLE[l.lead_grade] || ''}`}>
                    {l.lead_grade}
                  </span>
                )}
                <div className="min-w-0">
                  <div className="font-medium truncate">{l.empresa || l.nombre || '—'}</div>
                  {l.empresa && l.nombre && (
                    <div className="text-xs text-hm-muted truncate">{l.nombre}</div>
                  )}
                </div>
              </div>
            </td>
            <td className="px-4 py-3 text-xs text-hm-muted">{l.estado}</td>
            <td className="px-4 py-3 text-xs text-hm-muted">{l.asignado?.nombre_completo || '—'}</td>
            <td className="px-4 py-3"><UrgenciaChip lead={l} /></td>
            <td className="px-4 py-3 text-xs text-hm-muted">
              {daysSince(l.ultimo_contacto) !== null
                ? `${daysSince(l.ultimo_contacto)}d atrás`
                : 'Sin registro'}
            </td>
            <td className="px-4 py-3">
              <span className={`text-[9px] font-bold uppercase border rounded px-1.5 py-0.5 ${
                l.prioridad === 'alta'  ? 'text-red-400 border-red-500/30 bg-red-500/10' :
                l.prioridad === 'media' ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' :
                'text-hm-muted border-hm-border bg-hm-surface2'
              }`}>
                {l.prioridad || 'media'}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const GRUPOS = [
  { key: 'vencido', label: 'Seguimientos vencidos', color: 'text-red-400',    border: 'border-red-900/30' },
  { key: 'hoy',     label: 'Para hoy',              color: 'text-orange-400', border: 'border-orange-900/30' },
  { key: 'semana',  label: 'Esta semana',            color: 'text-yellow-400', border: 'border-yellow-900/30' },
  { key: 'frio',    label: 'SLA vencido (sin contacto)', color: 'text-blue-400', border: 'border-blue-900/30' },
  { key: 'sinFecha',label: 'Sin seguimiento asignado',   color: 'text-hm-muted',  border: 'border-hm-border/50' },
]

export default function SeguimientosPanel({ leads, allLeads, filtroAlerta, onCardClick, onLimpiarFiltro }) {
  const gruposNormales = useMemo(() => {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
    const manana = new Date(hoy); manana.setDate(hoy.getDate() + 1)
    const enUnaSemana = new Date(hoy); enUnaSemana.setDate(hoy.getDate() + 7)

    const activos = leads.filter(l => !TERMINALES.has(l.estado))
    const grupos = { vencido: [], hoy: [], semana: [], frio: [], sinFecha: [] }

    activos.forEach(l => {
      const sla = DIAS_SLA[l.prioridad] || 5
      const diasContacto = daysSince(l.ultimo_contacto)

      if (l.proximo_seguimiento) {
        const d = new Date(l.proximo_seguimiento + 'T12:00')
        if (d < hoy)           { grupos.vencido.push(l); return }
        if (d >= hoy && d < manana) { grupos.hoy.push(l); return }
        if (d >= manana && d < enUnaSemana) { grupos.semana.push(l); return }
        // beyond next week → not urgent, don't show
        return
      }

      if (diasContacto !== null && diasContacto > sla * 2 && (l.lead_grade === 'A' || l.lead_grade === 'B')) {
        grupos.frio.push(l); return
      }

      grupos.sinFecha.push(l)
    })

    return grupos
  }, [leads])

  // When a workflow alert filter is active, show those leads
  if (filtroAlerta) {
    const filtrados = computeAlertaLeads(allLeads, filtroAlerta)
    const LABEL = {
      vencidos:         'Seguimientos vencidos',
      frios:            'Oportunidades frías (SLA)',
      cotssinrespuesta: 'Cotizaciones sin respuesta',
      reclamoscriticos: 'Reclamos críticos',
    }
    return (
      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-hm-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-hm-accent uppercase tracking-widest">
              {LABEL[filtroAlerta]}
            </span>
            <span className="text-xs bg-hm-surface2 text-hm-muted px-2 py-0.5 rounded font-mono">{filtrados.length}</span>
          </div>
          <button
            onClick={onLimpiarFiltro}
            className="text-[10px] font-mono text-hm-muted hover:text-hm-text border border-hm-border rounded px-2 py-1 transition-colors"
          >
            ✕ ver todos
          </button>
        </div>
        <SeguimientosTable leads={filtrados} onCardClick={onCardClick} />
      </Card>
    )
  }

  const totalUrgentes = gruposNormales.vencido.length + gruposNormales.hoy.length

  return (
    <div className="flex flex-col gap-4">
      {totalUrgentes === 0 && gruposNormales.frio.length === 0 && gruposNormales.sinFecha.length === 0 && (
        <Card className="p-8 text-center">
          <div className="text-2xl mb-2">✅</div>
          <div className="text-sm font-mono text-hm-muted">Sin seguimientos urgentes. Buen trabajo.</div>
        </Card>
      )}

      {GRUPOS.map(grupo => {
        const items = gruposNormales[grupo.key]
        if (!items.length) return null
        return (
          <Card key={grupo.key} className={`overflow-hidden border ${grupo.border}`}>
            <div className="px-4 py-3 border-b border-hm-border/50 flex items-center gap-2">
              <span className={`font-mono text-xs font-bold uppercase tracking-widest ${grupo.color}`}>
                {grupo.label}
              </span>
              <span className="text-xs bg-hm-surface2 text-hm-muted px-2 py-0.5 rounded font-mono">
                {items.length}
              </span>
            </div>
            <SeguimientosTable leads={items} onCardClick={onCardClick} />
          </Card>
        )
      })}
    </div>
  )
}
