import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useDolar } from '../../context/DolarContext'
import { toast } from 'sonner'

function Badge({ children, variant = 'default' }) {
  const styles = {
    default:  'bg-hm-surface2 text-hm-muted border border-hm-border',
    ok:       'bg-green-500/10 text-green-400 border border-green-500/30',
    warn:     'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30',
    danger:   'bg-red-500/10 text-red-400 border border-red-500/30',
    blue:     'bg-blue-500/10 text-blue-400 border border-blue-500/30',
    accent:   'bg-hm-accent/10 text-hm-accent border border-hm-accent/30',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${styles[variant]}`}>
      {children}
    </span>
  )
}

function SectionTitle({ children }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2 className="font-mono text-xs text-hm-muted tracking-widest uppercase">{children}</h2>
      <div className="flex-1 h-px bg-hm-border" />
    </div>
  )
}

function EmptyState({ text }) {
  return <p className="text-sm text-hm-muted italic py-6 text-center">{text}</p>
}

export default function Portal() {
  const { perfil, clienteId, orgId, can, isCliente } = useAuth()
  const { formatUSD } = useDolar()
  const [data, setData] = useState({ maquinas: [], ots: [], cotizaciones: [], contratos: [], facturas: [] })
  const [loading, setLoading] = useState(true)
  const requestIdRef = useRef(0)
  const canAccessPortal = isCliente && can('portal.view')

  useEffect(() => {
    if (!clienteId || !orgId || !canAccessPortal) {
      requestIdRef.current += 1
      setData({ maquinas: [], ots: [], cotizaciones: [], contratos: [], facturas: [] })
      setLoading(false)
      return
    }
    fetchAll()
  }, [clienteId, orgId, canAccessPortal])

  const fetchAll = async () => {
    if (!clienteId || !orgId || !canAccessPortal) return
    const requestId = ++requestIdRef.current
    setLoading(true)
    const [maqRes, otRes, cotRes, ctrRes, facRes] = await Promise.all([
      supabase.from('maquinas').select('id, nombre_unidad, marca, modelo, horometro_actual, en_taller, en_alquiler').eq('organization_id', orgId).eq('cliente_id', clienteId).eq('activa', true),
      supabase.from('ordenes_trabajo').select('id, numero_ot, fecha_ingreso, descripcion_trabajo, estado, total_usd, maquina:maquinas(nombre_unidad)').eq('organization_id', orgId).eq('cliente_id', clienteId).order('created_at', { ascending: false }).limit(10),
      supabase.from('cotizaciones').select('id, numero_cotizacion, titulo, estado, total_usd, fecha_vencimiento, created_at').eq('organization_id', orgId).eq('cliente_id', clienteId).order('created_at', { ascending: false }).limit(10),
      supabase.from('contratos_alquiler').select('id, numero_contrato, fecha_inicio, fecha_fin, estado, total_contrato_usd, maquina:maquinas(nombre_unidad)').eq('organization_id', orgId).eq('cliente_id', clienteId).eq('estado', 'activo'),
      supabase.from('transacciones').select('id, tipo_documento, numero_comprobante, origen_tipo, monto_total_usd, estado_pago, fecha_emision, fecha_cobro').eq('organization_id', orgId).eq('cliente_id', clienteId).order('fecha_emision', { ascending: false }).limit(20),
    ])
    if (requestId !== requestIdRef.current) return
    setData({
      maquinas:     maqRes.data  || [],
      ots:          otRes.data   || [],
      cotizaciones: cotRes.data  || [],
      contratos:    ctrRes.data  || [],
      facturas:     facRes.data  || [],
    })
    setLoading(false)
  }

  const handleAceptarCotizacion = async (id) => {
    if (!clienteId || !orgId || !canAccessPortal) {
      toast.error('No tenés permisos para realizar esta operación')
      return
    }

    const { data: updated, error } = await supabase
      .from('cotizaciones')
      .update({ estado: 'aceptada' })
      .eq('id', id)
      .eq('organization_id', orgId)
      .eq('cliente_id', clienteId)
      .eq('estado', 'enviada')
      .select('id')
      .maybeSingle()
    if (error) { toast.error(error.message); return }
    if (!updated) { toast.error('La cotización ya fue respondida o no está disponible'); return }
    toast.success('Cotización aceptada')
    await fetchAll()
  }

  const handleRechazarCotizacion = async (id) => {
    if (!clienteId || !orgId || !canAccessPortal) {
      toast.error('No tenés permisos para realizar esta operación')
      return
    }

    const { data: updated, error } = await supabase
      .from('cotizaciones')
      .update({ estado: 'rechazada' })
      .eq('id', id)
      .eq('organization_id', orgId)
      .eq('cliente_id', clienteId)
      .eq('estado', 'enviada')
      .select('id')
      .maybeSingle()
    if (error) { toast.error(error.message); return }
    if (!updated) { toast.error('La cotización ya fue respondida o no está disponible'); return }
    toast.success('Cotización rechazada')
    await fetchAll()
  }

  const estadoOT  = { en_progreso: { label: 'En taller', v: 'warn' }, completada: { label: 'Completado', v: 'ok' }, facturada: { label: 'Facturado', v: 'blue' }, cancelada: { label: 'Cancelado', v: 'danger' } }
  const estadoCot = { enviada: { label: 'Pendiente', v: 'warn' }, aceptada: { label: 'Aceptada', v: 'ok' }, rechazada: { label: 'Rechazada', v: 'danger' }, borrador: { label: 'Borrador', v: 'default' } }
  const estadoPago = { pendiente: { label: 'Pendiente', v: 'warn' }, cobrado: { label: 'Cobrado', v: 'ok' }, anulado: { label: 'Anulado', v: 'danger' } }

  return (
    <div className="min-h-screen bg-hm-bg text-hm-text">
      {/* Header */}
      <header className="bg-hm-surface border-b border-hm-border px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-hm-accent/15 border border-hm-accent/30 flex items-center justify-center">
            <span className="text-hm-accent text-xs font-black">HM</span>
          </div>
          <div>
            <div className="text-sm font-bold leading-none">HeavyMetric</div>
            <div className="text-[10px] font-mono text-hm-muted mt-0.5">Portal Cliente</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-hm-muted">{perfil?.nombre_completo}</span>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-xs font-mono text-hm-muted hover:text-red-400 transition-colors border border-hm-border hover:border-red-800 rounded px-3 py-1.5"
          >
            SALIR
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-10">

        {loading ? (
          <div className="flex flex-col gap-4 mt-8">
            {[1,2,3].map(i => <div key={i} className="h-24 bg-hm-surface2 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* MIS MÁQUINAS */}
            <section>
              <SectionTitle>Mis Máquinas</SectionTitle>
              {data.maquinas.length === 0 ? <EmptyState text="No hay máquinas asignadas." /> : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.maquinas.map(m => {
                    const estado = m.en_taller ? 'warn' : m.en_alquiler ? 'blue' : 'ok'
                    const estadoLabel = m.en_taller ? 'En taller' : m.en_alquiler ? 'En uso' : 'Disponible'
                    return (
                      <div key={m.id} className="bg-hm-surface border border-hm-border rounded-xl p-5 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-base">{m.nombre_unidad}</div>
                          <div className="text-sm text-hm-muted mt-0.5">{m.marca} {m.modelo}</div>
                          <div className="mt-2">
                            <Badge variant={estado}>{estadoLabel}</Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-mono text-hm-muted">Horómetro</div>
                          <div className="text-2xl font-bold text-hm-accent">{m.horometro_actual}</div>
                          <div className="text-xs text-hm-muted">hrs</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* CONTRATOS ACTIVOS */}
            {data.contratos.length > 0 && (
              <section>
                <SectionTitle>Contratos Activos</SectionTitle>
                <div className="flex flex-col gap-3">
                  {data.contratos.map(c => (
                    <div key={c.id} className="bg-hm-surface border border-hm-border rounded-xl p-5 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-sm">Contrato #{c.numero_contrato}</div>
                        <div className="text-xs text-hm-muted mt-0.5">{c.maquina?.nombre_unidad}</div>
                        <div className="text-xs font-mono text-hm-muted mt-1">{c.fecha_inicio} → {c.fecha_fin}</div>
                      </div>
                      <div className="text-right">
                        <Badge variant="blue">Activo</Badge>
                        <div className="text-sm font-bold text-blue-400 mt-2">{formatUSD(c.total_contrato_usd)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* COTIZACIONES */}
            <section>
              <SectionTitle>Cotizaciones</SectionTitle>
              {data.cotizaciones.length === 0 ? <EmptyState text="No hay cotizaciones." /> : (
                <div className="flex flex-col gap-3">
                  {data.cotizaciones.map(c => {
                    const st = estadoCot[c.estado] || { label: c.estado, v: 'default' }
                    const puedeResponder = c.estado === 'enviada'
                    return (
                      <div key={c.id} className="bg-hm-surface border border-hm-border rounded-xl p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-sm">#{c.numero_cotizacion}</span>
                              <Badge variant={st.v}>{st.label}</Badge>
                            </div>
                            <div className="text-sm text-hm-muted">{c.titulo || '—'}</div>
                            {c.fecha_vencimiento && (
                              <div className="text-xs font-mono text-hm-muted mt-1">Válida hasta: {c.fecha_vencimiento}</div>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-lg font-bold text-hm-accent">{formatUSD(c.total_usd)}</div>
                            {puedeResponder && (
                              <div className="flex gap-2 mt-2 justify-end">
                                <button
                                  onClick={() => handleRechazarCotizacion(c.id)}
                                  className="px-3 py-1 text-xs font-mono font-bold border border-red-800/50 text-red-400/80 rounded hover:border-red-600 hover:text-red-400 transition-colors"
                                >
                                  RECHAZAR
                                </button>
                                <button
                                  onClick={() => handleAceptarCotizacion(c.id)}
                                  className="px-3 py-1 text-xs font-mono font-bold bg-green-500/10 border border-green-500/40 text-green-400 rounded hover:bg-green-500/20 transition-colors"
                                >
                                  ACEPTAR
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* FACTURAS */}
            {data.facturas.length > 0 && (
              <section>
                <SectionTitle>Mis Facturas</SectionTitle>
                <div className="flex flex-col gap-3">
                  {data.facturas.map(f => {
                    const sp = estadoPago[f.estado_pago] || { label: f.estado_pago, v: 'default' }
                    return (
                      <div key={f.id} className="bg-hm-surface border border-hm-border rounded-xl p-5 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-mono text-xs text-hm-muted">{f.tipo_documento || 'Factura'}</span>
                            {f.numero_comprobante && <span className="font-mono text-xs text-hm-muted">#{f.numero_comprobante}</span>}
                            <Badge variant={sp.v}>{sp.label}</Badge>
                          </div>
                          <div className="text-xs font-mono text-hm-muted">{f.fecha_emision}</div>
                          {f.fecha_cobro && <div className="text-xs text-green-400 font-mono mt-0.5">Cobrado: {f.fecha_cobro}</div>}
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-hm-accent">{formatUSD(f.monto_total_usd)}</div>
                          <div className="text-[10px] font-mono text-hm-muted capitalize mt-0.5">{f.origen_tipo}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* HISTORIAL DE SERVICIOS */}
            <section>
              <SectionTitle>Historial de Servicios</SectionTitle>
              {data.ots.length === 0 ? <EmptyState text="Sin órdenes de trabajo registradas." /> : (
                <div className="flex flex-col gap-3">
                  {data.ots.map(ot => {
                    const st = estadoOT[ot.estado] || { label: ot.estado, v: 'default' }
                    return (
                      <div key={ot.id} className="bg-hm-surface border border-hm-border rounded-xl p-5 flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs text-hm-muted">OT #{ot.numero_ot}</span>
                            <Badge variant={st.v}>{st.label}</Badge>
                          </div>
                          <div className="text-sm font-medium truncate">{ot.maquina?.nombre_unidad}</div>
                          <div className="text-xs text-hm-muted mt-0.5 line-clamp-1">{ot.descripcion_trabajo}</div>
                        </div>
                        <div className="text-right ml-4 shrink-0">
                          <div className="text-xs font-mono text-hm-muted">{ot.fecha_ingreso}</div>
                          {Number(ot.total_usd) > 0 && (
                            <div className="text-sm font-bold text-hm-accent mt-1">{formatUSD(ot.total_usd)}</div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
