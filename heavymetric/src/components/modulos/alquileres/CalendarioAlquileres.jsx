import { useMemo } from 'react'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { es } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales: { es },
})

const COLORES = [
  '#f0a500', '#3b82f6', '#22c55e', '#a855f7',
  '#ef4444', '#06b6d4', '#f97316', '#ec4899',
]

export default function CalendarioAlquileres({ contratos }) {
  const eventos = useMemo(() => {
    return contratos
      .filter(c => c.fecha_inicio && c.fecha_fin)
      .map((c, i) => ({
        id:    c.id,
        title: `${c.maquina?.nombre_unidad || 'Máquina'} — ${c.cliente?.razon_social || ''}`,
        start: new Date(c.fecha_inicio + 'T00:00:00'),
        end:   new Date(c.fecha_fin   + 'T23:59:59'),
        color: COLORES[i % COLORES.length],
        contrato: c,
      }))
  }, [contratos])

  const eventStyleGetter = (event) => ({
    style: {
      backgroundColor: event.color + '22',
      border: `1px solid ${event.color}55`,
      color: event.color,
      borderRadius: '6px',
      fontSize: '11px',
      fontWeight: 600,
    },
  })

  const messages = {
    today:    'Hoy',
    previous: '‹',
    next:     '›',
    month:    'Mes',
    week:     'Semana',
    day:      'Día',
    agenda:   'Agenda',
    noEventsInRange: 'Sin contratos en este período.',
  }

  return (
    <div className="calendario-alq" style={{ height: 540 }}>
      <style>{`
        .calendario-alq .rbc-calendar { background: transparent; color: #dde1ec; font-family: 'Barlow', sans-serif; }
        .calendario-alq .rbc-toolbar { margin-bottom: 12px; }
        .calendario-alq .rbc-toolbar button { background: #1a1e2b; color: #5c6278; border: 1px solid #252a38; border-radius: 8px; padding: 4px 12px; font-size: 13px; cursor: pointer; }
        .calendario-alq .rbc-toolbar button:hover, .calendario-alq .rbc-toolbar button.rbc-active { background: #f0a500; color: #0c0e14; border-color: #f0a500; }
        .calendario-alq .rbc-toolbar-label { font-weight: 700; font-size: 15px; color: #dde1ec; }
        .calendario-alq .rbc-month-view, .calendario-alq .rbc-time-view { border: 1px solid #252a38; border-radius: 12px; overflow: hidden; }
        .calendario-alq .rbc-header { background: #141720; border-bottom: 1px solid #252a38; padding: 8px 4px; font-size: 11px; font-weight: 700; color: #5c6278; text-transform: uppercase; letter-spacing: 0.1em; }
        .calendario-alq .rbc-day-bg { background: #0c0e14; }
        .calendario-alq .rbc-day-bg + .rbc-day-bg { border-left: 1px solid #252a38; }
        .calendario-alq .rbc-off-range-bg { background: #0a0c11; }
        .calendario-alq .rbc-today { background: #f0a50008; }
        .calendario-alq .rbc-date-cell { padding: 4px 6px; font-size: 11px; color: #5c6278; }
        .calendario-alq .rbc-date-cell.rbc-now { color: #f0a500; font-weight: 700; }
        .calendario-alq .rbc-row-segment { padding: 1px 2px; }
        .calendario-alq .rbc-show-more { color: #f0a500; font-size: 10px; }
        .calendario-alq .rbc-month-row { border-top: 1px solid #252a38; }
        .calendario-alq .rbc-agenda-view table { border: none; }
        .calendario-alq .rbc-agenda-date-cell, .calendario-alq .rbc-agenda-time-cell, .calendario-alq .rbc-agenda-event-cell { color: #5c6278; font-size: 12px; padding: 8px; border-bottom: 1px solid #252a38; }
        .calendario-alq .rbc-agenda-event-cell { color: #dde1ec; }
      `}</style>
      <Calendar
        localizer={localizer}
        events={eventos}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        eventPropGetter={eventStyleGetter}
        messages={messages}
        culture="es"
        views={['month', 'week', 'agenda']}
        defaultView="month"
        popup
      />
    </div>
  )
}
