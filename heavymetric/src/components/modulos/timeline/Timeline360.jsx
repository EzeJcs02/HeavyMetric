import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useRubro } from '../../../context/RubroContext'

const EVENT_CONFIG = {
  nota: ['Nota', '●', 'text-zinc-300', 'bg-zinc-500/10', 'border-zinc-500/20'],
  llamada: ['Llamada', 'TEL', 'text-indigo-400', 'bg-indigo-500/10', 'border-indigo-500/20'],
  whatsapp: ['WhatsApp', 'WSP', 'text-emerald-400', 'bg-emerald-500/10', 'border-emerald-500/20'],
  correo: ['Correo', 'MAIL', 'text-sky-400', 'bg-sky-500/10', 'border-sky-500/20'],
  reunion: ['Reunión', 'MEET', 'text-violet-400', 'bg-violet-500/10', 'border-violet-500/20'],

  cotizacion_enviada: ['Cotización enviada', 'COT', 'text-cyan-400', 'bg-cyan-500/10', 'border-cyan-500/20'],
  cotizacion_seguimiento: ['Seguimiento cotización', 'CRM', 'text-blue-400', 'bg-blue-500/10', 'border-blue-500/20'],
  cotizacion_aprobada: ['Cotización aprobada', 'OK', 'text-emerald-400', 'bg-emerald-500/10', 'border-emerald-500/20'],
  cotizacion_rechazada: ['Cotización rechazada', 'NO', 'text-red-400', 'bg-red-500/10', 'border-red-500/20'],

  apertura_ot: ['Apertura orden', 'OT', 'text-blue-400', 'bg-blue-500/10', 'border-blue-500/20'],
  cierre_ot: ['Cierre orden', 'ISO', 'text-emerald-400', 'bg-emerald-500/10', 'border-emerald-500/20'],
  evidencia: ['Evidencia', 'IMG', 'text-cyan-400', 'bg-cyan-500/10', 'border-cyan-500/20'],
  firma: ['Firma', 'SIGN', 'text-violet-400', 'bg-violet-500/10', 'border-violet-500/20'],
  sync_offline: ['Sincronización offline', 'SYNC', 'text-amber-400', 'bg-amber-500/10', 'border-amber-500/20'],

  factura_emitida: ['Factura emitida', 'FAC', 'text-green-400', 'bg-green-500/10', 'border-green-500/20'],
  pago_recibido: ['Pago recibido', '$', 'text-emerald-400', 'bg-emerald-500/10', 'border-emerald-500/20'],
  reclamo: ['Reclamo', '!', 'text-red-400', 'bg-red-500/10', 'border-red-500/20'],
  postventa: ['Postventa', 'PV', 'text-orange-400', 'bg-orange-500/10', 'border-orange-500/20'],

  default: ['Evento', '•', 'text-hm-muted', 'bg-hm-surface2', 'border-hm-border'],
}

const CRITICIDAD = {
  critica: 'bg-red-500/15 text-red-400 border-red-500/20',
  alta: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  media: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  baja: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
}

export default function Timeline360({
  clienteId,
  activoId,
  cotizacionId,
  ordenTrabajoId,
  ventaId,
  facturaId,
  proveedorId,
  repuestoId,
  orgId,
}) {
  const { taxonomia } = useRubro()

  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [tipoEvento, setTipoEvento] = useState('nota')
  const [criticidad, setCriticidad] = useState('media')
  const [descripcion, setDescripcion] = useState('')

  const activoSingular = taxonomia?.activoSingular || 'Activo'
  const ordenTrabajo = taxonomia?.ordenTrabajo || 'Orden de trabajo'
  const repuesto = taxonomia?.repuesto || 'Repuesto'

  const cargarEventos = async () => {
    if (!orgId) return

    setLoading(true)

    let query = supabase
      .from('timeline_eventos_360')
      .select('*')
      .eq('organization_id', orgId)

    if (clienteId) query = query.eq('cliente_id', clienteId)
    if (activoId) query = query.eq('activo_id', activoId)
    if (cotizacionId) query = query.eq('cotizacion_id', cotizacionId)
    if (ordenTrabajoId) query = query.eq('orden_trabajo_id', ordenTrabajoId)
    if (ventaId) query = query.eq('venta_id', ventaId)
    if (facturaId) query = query.eq('factura_id', facturaId)
    if (proveedorId) query = query.eq('proveedor_id', proveedorId)
    if (repuestoId) query = query.eq('repuesto_id', repuestoId)

    const { data, error } = await query.order('fecha', { ascending: false })

    if (!error) setEventos(data || [])
    setLoading(false)
  }

  useEffect(() => {
    cargarEventos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    orgId,
    clienteId,
    activoId,
    cotizacionId,
    ordenTrabajoId,
    ventaId,
    facturaId,
    proveedorId,
    repuestoId,
  ])

  const resumen = useMemo(() => {
    return {
      total: eventos.length,
      criticos: eventos.filter((e) => e.criticidad === 'critica').length,
      crm: eventos.filter((e) => String(e.tipo_evento || '').includes('cotizacion')).length,
      iso: eventos.filter((e) => e.metadata_iso || e.tipo_evento === 'cierre_ot').length,
      offline: eventos.filter((e) => e.origen === 'offline' || e.metadata_iso?.origen === 'offline').length,
    }
  }, [eventos])

  const agregarEvento = async (e) => {
    e.preventDefault()
    if (!descripcion.trim() || !orgId) return

    setSaving(true)

    const user = await supabase.auth.getUser()
    const currentUser = user?.data?.user

    const payload = {
      organization_id: orgId,

      cliente_id: clienteId || null,
      activo_id: activoId || null,
      cotizacion_id: cotizacionId || null,
      orden_trabajo_id: ordenTrabajoId || null,
      venta_id: ventaId || null,
      factura_id: facturaId || null,
      proveedor_id: proveedorId || null,
      repuesto_id: repuestoId || null,

      autor_id: currentUser?.id || null,
      tipo_evento: tipoEvento,
      descripcion: descripcion.trim(),
      criticidad,
      origen: 'manual',
      fecha: new Date().toISOString(),

      metadata_iso: {
        origen: 'timeline_manual',
        fecha_hora: new Date().toISOString(),
        responsable: currentUser?.email || null,
        trazabilidad: true,
      },
    }

    const { error } = await supabase
      .from('timeline_notas')
      .insert(payload)

    if (!error) {
      setDescripcion('')
      setTipoEvento('nota')
      setCriticidad('media')
      cargarEventos()
    }

    setSaving(false)
  }

  const eventOptions = [
    ['nota', 'Nota operativa'],
    ['llamada', 'Llamada'],
    ['whatsapp', 'WhatsApp'],
    ['correo', 'Correo'],
    ['reunion', 'Reunión'],
    ['cotizacion_seguimiento', 'Seguimiento cotización'],
    ['cotizacion_enviada', 'Cotización enviada'],
    ['reclamo', 'Reclamo'],
    ['postventa', 'Postventa'],
    ['apertura_ot', `Apertura ${ordenTrabajo}`],
    ['cierre_ot', `Cierre ${ordenTrabajo}`],
    ['factura_emitida', 'Factura emitida'],
    ['pago_recibido', 'Pago recibido'],
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-[#07090d] border border-white/5 rounded-2xl p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-white text-lg font-semibold">
              Historial 360
            </h2>
            <p className="text-neutral-500 text-xs mt-1">
              Timeline comercial, operativo, financiero e ISO del sistema.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div className="bg-neutral-900 border border-white/5 rounded-xl px-3 py-2">
              <div className="text-white font-bold text-lg">{resumen.total}</div>
              <div className="text-[10px] uppercase tracking-wider text-neutral-500">Eventos</div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2">
              <div className="text-blue-400 font-bold text-lg">{resumen.crm}</div>
              <div className="text-[10px] uppercase tracking-wider text-blue-400/70">CRM</div>
            </div>

            <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl px-3 py-2">
              <div className="text-cyan-400 font-bold text-lg">{resumen.iso}</div>
              <div className="text-[10px] uppercase tracking-wider text-cyan-400/70">ISO</div>
            </div>

            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              <div className="text-red-400 font-bold text-lg">{resumen.criticos}</div>
              <div className="text-[10px] uppercase tracking-wider text-red-400/70">Críticos</div>
            </div>
          </div>
        </div>
      </div>

      <form
        onSubmit={agregarEvento}
        className="bg-[#07090d] border border-white/5 rounded-2xl p-4 flex flex-col gap-3"
      >
        <div className="grid grid-cols-1 lg:grid-cols-[220px_180px_1fr_120px] gap-2">
          <select
            value={tipoEvento}
            onChange={(e) => setTipoEvento(e.target.value)}
            className="bg-hm-surface2 border border-hm-border rounded-xl px-3 py-3 text-sm text-hm-text"
          >
            {eventOptions.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <select
            value={criticidad}
            onChange={(e) => setCriticidad(e.target.value)}
            className="bg-hm-surface2 border border-hm-border rounded-xl px-3 py-3 text-sm text-hm-text"
          >
            <option value="baja">Criticidad baja</option>
            <option value="media">Criticidad media</option>
            <option value="alta">Criticidad alta</option>
            <option value="critica">Criticidad crítica</option>
          </select>

          <input
            type="text"
            placeholder={`Registrar seguimiento comercial, ${activoSingular.toLowerCase()}, ${repuesto.toLowerCase()}, servicio, pago o trazabilidad...`}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="bg-hm-surface2 border border-hm-border rounded-xl px-4 py-3 text-sm text-hm-text focus:outline-none focus:border-hm-accent"
          />

          <button
            type="submit"
            disabled={saving || !descripcion.trim()}
            className="bg-hm-accent hover:bg-hm-accent/90 text-white px-5 py-3 rounded-xl text-sm font-bold disabled:opacity-50 transition-colors"
          >
            {saving ? '...' : 'REGISTRAR'}
          </button>
        </div>
      </form>

      <div className="relative border-l border-white/10 ml-3 flex flex-col gap-5 pt-1">
        {loading ? (
          <div className="animate-pulse flex flex-col gap-4 pl-6">
            <div className="h-20 bg-hm-surface2 rounded-2xl w-3/4" />
            <div className="h-20 bg-hm-surface2 rounded-2xl w-full" />
            <div className="h-20 bg-hm-surface2 rounded-2xl w-5/6" />
          </div>
        ) : eventos.length === 0 ? (
          <div className="pl-6 text-sm text-hm-muted">
            No hay eventos registrados en el historial.
          </div>
        ) : (
          eventos.map((ev, i) => {
            const [label, icon, color, bg, border] =
              EVENT_CONFIG[ev.tipo_evento] || EVENT_CONFIG.default

            return (
              <div key={`${ev.id || ev.evento_id || i}`} className="relative pl-7 group">
                <div
                  className={`absolute -left-[14px] top-1 flex items-center justify-center w-7 h-7 rounded-full border text-[8px] font-black tracking-wider shadow-sm ${bg} ${border} ${color}`}
                >
                  {icon}
                </div>

                <div className="bg-[#0d1117] border border-white/5 rounded-2xl p-4 hover:border-cyan-400/20 transition-all">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`text-[10px] font-bold uppercase tracking-[0.18em] ${color}`}>
                          {label}
                        </span>

                        {ev.criticidad && (
                          <span className={`px-2 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider ${CRITICIDAD[ev.criticidad] || CRITICIDAD.media}`}>
                            {ev.criticidad}
                          </span>
                        )}

                        {(ev.origen === 'offline' || ev.metadata_iso?.origen === 'offline') && (
                          <span className="px-2 py-1 rounded-lg border border-amber-500/20 bg-amber-500/10 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                            Offline
                          </span>
                        )}

                        {ev.metadata_iso && (
                          <span className="px-2 py-1 rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                            ISO
                          </span>
                        )}
                      </div>

                      <div className="text-sm text-white leading-relaxed">
                        {ev.descripcion}
                      </div>

                      <div className="flex flex-wrap gap-4 mt-3 text-[11px] text-neutral-500">
                        {ev.fecha && (
                          <span>
                            {format(new Date(ev.fecha), 'dd MMM yyyy · HH:mm', { locale: es })}
                          </span>
                        )}

                        {ev.metadata_iso?.responsable && (
                          <span>Responsable: {ev.metadata_iso.responsable}</span>
                        )}

                        {ev.cliente_id && <span>Cliente vinculado</span>}
                        {ev.activo_id && <span>{activoSingular} vinculado</span>}
                        {ev.cotizacion_id && <span>Cotización vinculada</span>}
                        {ev.orden_trabajo_id && <span>{ordenTrabajo} vinculada</span>}
                        {ev.factura_id && <span>Factura vinculada</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}