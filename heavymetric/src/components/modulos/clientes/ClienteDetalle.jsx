import Modal from '../../ui/Modal'
import Badge from '../../ui/Badge'
import { useCliente360, calcServiceState } from '../../../hooks/useCliente360'
import { useDolar } from '../../../context/DolarContext'
import { useState } from 'react'
import Timeline360 from '../timeline/Timeline360'

const PROP_STYLE = {
  A: 'bg-red-500/20 text-red-300 border-red-500/40',
  B: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  C: 'bg-hm-surface2 text-hm-muted border-hm-border',
}

const ESTADO_OP_COLOR = {
  'Operativo':           'text-green-400',
  'En mantenimiento':    'text-yellow-400',
  'En taller':           'text-orange-400',
  'Esperando repuesto':  'text-red-400',
  'Fuera de servicio':   'text-red-400',
  'Baja':                'text-hm-muted',
}

const SERVICE_BAR = {
  vencido: 'bg-red-500',
  urgente: 'bg-red-400',
  proximo: 'bg-yellow-400',
  ok:      'bg-green-500',
}

const ESTADO_OT_BADGE = {
  borrador:    'default',
  en_progreso: 'warning',
  completada:  'success',
  facturada:   'info',
  cancelada:   'danger',
}

const ESTADO_COT_BADGE = {
  Borrador:  'default',
  Enviada:   'warning',
  Aceptada:  'success',
  Rechazada: 'danger',
}

function fmtFecha(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function Kpi({ label, value, sub, color = '' }) {
  return (
    <div className="bg-hm-surface2/30 border border-hm-border/50 rounded-lg p-3 flex flex-col gap-0.5">
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest">{label}</div>
      {sub && <div className="text-[10px] text-hm-muted">{sub}</div>}
    </div>
  )
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-xs font-mono font-bold border-b-2 transition-all ${
        active ? 'border-hm-accent text-hm-accent' : 'border-transparent text-hm-muted hover:text-hm-text'
      }`}
    >
      {children}
    </button>
  )
}

export default function ClienteDetalle({ cliente, isOpen, onClose, onEdit }) {
  const [tab, setTab] = useState('resumen')
  const { formatUSD } = useDolar()
  const { flota, leads, cotizaciones, ots, transacciones, kpis, loading } = useCliente360(cliente?.id, isOpen)

  if (!cliente) return null

  // Reset tab on open
  const handleTabChange = (t) => setTab(t)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5 -mt-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {cliente.propension_compra && (
              <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full border text-sm font-black ${PROP_STYLE[cliente.propension_compra]}`}>
                {cliente.propension_compra}
              </span>
            )}
            <h2 className="text-xl font-bold truncate">{cliente.razon_social}</h2>
            {cliente.nombre_comercial && cliente.nombre_comercial !== cliente.razon_social && (
              <span className="text-sm text-hm-muted">{cliente.nombre_comercial}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {cliente.rubro    && <Badge variant="default">{cliente.rubro}</Badge>}
            {cliente.condicion_iva && <Badge variant="info">{cliente.condicion_iva}</Badge>}
            {cliente.cuit     && <span className="text-[10px] font-mono text-hm-muted">{cliente.cuit}</span>}
          </div>
        </div>
        <button
          onClick={() => onEdit(cliente)}
          className="text-xs font-mono font-bold border border-hm-border text-hm-muted rounded px-3 py-1.5 hover:border-hm-accent hover:text-hm-accent transition-colors shrink-0"
        >
          ✏️ Editar
        </button>
      </div>

      {/* KPIs */}
      {loading ? (
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[1,2,3,4].map(i => <div key={i} className="h-16 bg-hm-surface2 rounded animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <Kpi label="Flota activa" value={kpis.flotaCount}
            sub={kpis.flotaDetenidos > 0 ? `${kpis.flotaDetenidos} detenidos` : 'todos operativos'}
            color={kpis.flotaDetenidos > 0 ? 'text-orange-400' : 'text-green-400'}
          />
          <Kpi label="Leads activos" value={kpis.leadsActivos} />
          <Kpi label="OTs abiertas" value={kpis.otsAbiertas}
            color={kpis.otsAbiertas > 0 ? 'text-yellow-400' : ''}
          />
          <Kpi label="Deuda pendiente"
            value={kpis.deudaPendiente > 0 ? formatUSD(kpis.deudaPendiente) : 'Sin deuda'}
            color={kpis.deudaPendiente > 0 ? 'text-red-400' : 'text-green-400'}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0 border-b border-hm-border mb-4 overflow-x-auto">
        <TabBtn active={tab==='resumen'}       onClick={() => handleTabChange('resumen')}>RESUMEN</TabBtn>
        <TabBtn active={tab==='timeline'}      onClick={() => handleTabChange('timeline')}>TIMELINE</TabBtn>
        <TabBtn active={tab==='flota'}         onClick={() => handleTabChange('flota')}>FLOTA ({flota.length})</TabBtn>
        <TabBtn active={tab==='crm'}           onClick={() => handleTabChange('crm')}>CRM ({leads.length})</TabBtn>
        <TabBtn active={tab==='cotizaciones'}  onClick={() => handleTabChange('cotizaciones')}>COTIZ. ({cotizaciones.length})</TabBtn>
        <TabBtn active={tab==='postventa'}     onClick={() => handleTabChange('postventa')}>OTs ({ots.length})</TabBtn>
        <TabBtn active={tab==='facturacion'}   onClick={() => handleTabChange('facturacion')}>FACTURACIÓN</TabBtn>
      </div>

      {/* ── Tab: RESUMEN ── */}
      {tab === 'resumen' && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            ['Email',      cliente.email],
            ['Teléfono',   cliente.telefono],
            ['Contacto',   cliente.contacto_nombre],
            ['Dirección',  cliente.direccion],
            ['Rubro',      cliente.rubro],
            ['Cond. IVA',  cliente.condicion_iva],
          ].map(([label, val]) => (
            <div key={label} className="bg-hm-surface2/20 border border-hm-border/40 rounded-lg p-3">
              <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-0.5">{label}</div>
              <div className="text-sm font-medium truncate">{val || '—'}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab: TIMELINE ── */}
      {tab === 'timeline' && (
        <div className="max-h-[500px] overflow-y-auto pr-2">
          <Timeline360 clienteId={cliente.id} orgId={cliente.organization_id} />
        </div>
      )}

      {/* ── Tab: FLOTA ── */}
      {tab === 'flota' && (
        <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="h-24 bg-hm-surface2 rounded animate-pulse" />
          ) : flota.length === 0 ? (
            <div className="text-center text-hm-muted font-mono text-sm py-8">
              Sin equipos registrados para este cliente.
            </div>
          ) : flota.map(m => {
            const svc = calcServiceState(m)
            return (
              <div key={m.id} className="bg-hm-surface2/20 border border-hm-border/50 rounded-lg p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm truncate">{m.nombre_unidad}</span>
                      {m.tipo && (
                        <span className="text-[9px] font-mono bg-hm-surface2 text-hm-muted border border-hm-border rounded px-1.5 py-0.5 shrink-0">
                          {m.tipo}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-hm-muted">
                      {[m.marca, m.modelo, m.anio].filter(Boolean).join(' · ')}
                      {m.patente && ` — ${m.patente}`}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-xs font-mono font-bold ${ESTADO_OT_BADGE[m.estado_operativo] ? '' : ESTADO_OP_COLOR[m.estado_operativo] || 'text-hm-muted'}`}>
                      {m.estado_operativo || 'Operativo'}
                    </div>
                    <div className="text-[10px] text-hm-muted">{m.horometro_actual || 0} hs</div>
                  </div>
                </div>

                {/* Service progress bar */}
                {svc && (
                  <div className="mt-2">
                    <div className="flex justify-between text-[9px] font-mono text-hm-muted mb-1">
                      <span>Service</span>
                      <span className={svc.color === 'red' ? 'text-red-400' : svc.color === 'yellow' ? 'text-yellow-400' : 'text-green-400'}>
                        {svc.estado === 'vencido' ? `VENCIDO ${Math.abs(svc.restantes).toFixed(0)}hs` : `${svc.restantes.toFixed(0)}hs restantes`}
                      </span>
                    </div>
                    <div className="h-1.5 bg-hm-surface2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${SERVICE_BAR[svc.estado]}`}
                        style={{ width: `${Math.min(svc.pct, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Tab: CRM ── */}
      {tab === 'crm' && (
        <div className="max-h-[400px] overflow-y-auto">
          {loading ? <div className="h-20 bg-hm-surface2 rounded animate-pulse" />
          : leads.length === 0 ? (
            <div className="text-center text-hm-muted font-mono text-sm py-8">Sin leads registrados.</div>
          ) : (
            <table className="w-full text-left">
              <thead className="border-b border-hm-border">
                <tr>
                  {['Lead', 'Pipeline', 'Estado', 'Grade', 'Último contacto'].map(h => (
                    <th key={h} className="pb-2 font-mono text-[9px] text-hm-muted uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leads.map(l => (
                  <tr key={l.id} className="border-b border-hm-border/30 hover:bg-hm-surface2/20 transition-colors">
                    <td className="py-2 pr-3">
                      <div className="text-sm font-medium">{l.empresa || l.nombre || '—'}</div>
                    </td>
                    <td className="py-2 pr-3">
                      <span className="text-[9px] font-mono text-hm-muted">{l.pipeline || 'ventas'}</span>
                    </td>
                    <td className="py-2 pr-3">
                      <Badge variant="default">{l.estado}</Badge>
                    </td>
                    <td className="py-2 pr-3">
                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded border text-[9px] font-black ${
                        PROP_STYLE[l.lead_grade] || 'bg-hm-surface2 text-hm-muted border-hm-border'
                      }`}>{l.lead_grade}</span>
                    </td>
                    <td className="py-2 text-[10px] font-mono text-hm-muted">
                      {l.ultimo_contacto ? fmtFecha(l.ultimo_contacto) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Tab: COTIZACIONES ── */}
      {tab === 'cotizaciones' && (
        <div className="max-h-[400px] overflow-y-auto">
          {loading ? <div className="h-20 bg-hm-surface2 rounded animate-pulse" />
          : cotizaciones.length === 0 ? (
            <div className="text-center text-hm-muted font-mono text-sm py-8">Sin cotizaciones.</div>
          ) : (
            <table className="w-full text-left">
              <thead className="border-b border-hm-border">
                <tr>
                  {['N°', 'Fecha', 'Estado', 'Total'].map(h => (
                    <th key={h} className="pb-2 font-mono text-[9px] text-hm-muted uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cotizaciones.map(c => (
                  <tr key={c.id} className="border-b border-hm-border/30 hover:bg-hm-surface2/20 transition-colors">
                    <td className="py-2 pr-3 font-mono text-sm">{c.numero_cotizacion || '—'}</td>
                    <td className="py-2 pr-3 text-[10px] text-hm-muted">{fmtFecha(c.created_at)}</td>
                    <td className="py-2 pr-3">
                      <Badge variant={ESTADO_COT_BADGE[c.estado] || 'default'}>{c.estado}</Badge>
                    </td>
                    <td className="py-2 font-mono text-sm font-bold">{formatUSD(c.total_usd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Tab: POSTVENTA ── */}
      {tab === 'postventa' && (
        <div className="max-h-[400px] overflow-y-auto">
          {loading ? <div className="h-20 bg-hm-surface2 rounded animate-pulse" />
          : ots.length === 0 ? (
            <div className="text-center text-hm-muted font-mono text-sm py-8">Sin órdenes de trabajo.</div>
          ) : (
            <table className="w-full text-left">
              <thead className="border-b border-hm-border">
                <tr>
                  {['OT', 'Equipo', 'Estado', 'Ingreso', 'Total'].map(h => (
                    <th key={h} className="pb-2 font-mono text-[9px] text-hm-muted uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ots.map(o => (
                  <tr key={o.id} className="border-b border-hm-border/30 hover:bg-hm-surface2/20 transition-colors">
                    <td className="py-2 pr-3 font-mono text-sm">{o.numero_ot || '—'}</td>
                    <td className="py-2 pr-3 text-sm text-hm-muted truncate max-w-[140px]">
                      {o.maquina?.nombre_unidad || '—'}
                    </td>
                    <td className="py-2 pr-3">
                      <Badge variant={ESTADO_OT_BADGE[o.estado] || 'default'}>{o.estado}</Badge>
                    </td>
                    <td className="py-2 pr-3 text-[10px] text-hm-muted">{fmtFecha(o.fecha_ingreso)}</td>
                    <td className="py-2 font-mono text-sm font-bold">{formatUSD(o.total_usd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Tab: FACTURACIÓN ── */}
      {tab === 'facturacion' && (
        <div className="flex flex-col gap-3">
          {kpis.deudaPendiente > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2.5 flex items-center justify-between">
              <span className="text-xs font-mono text-red-400">⚠️ DEUDA PENDIENTE</span>
              <span className="text-sm font-bold text-red-300">{formatUSD(kpis.deudaPendiente)}</span>
            </div>
          )}
          <div className="max-h-[340px] overflow-y-auto">
            {loading ? <div className="h-20 bg-hm-surface2 rounded animate-pulse" />
            : transacciones.length === 0 ? (
              <div className="text-center text-hm-muted font-mono text-sm py-8">Sin transacciones registradas.</div>
            ) : (
              <table className="w-full text-left">
                <thead className="border-b border-hm-border">
                  <tr>
                    {['Comprobante', 'Tipo', 'Fecha', 'Monto', 'Estado'].map(h => (
                      <th key={h} className="pb-2 font-mono text-[9px] text-hm-muted uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transacciones.map(t => (
                    <tr key={t.id} className="border-b border-hm-border/30 hover:bg-hm-surface2/20 transition-colors">
                      <td className="py-2 pr-3 font-mono text-sm">{t.numero_comprobante || '—'}</td>
                      <td className="py-2 pr-3 text-xs text-hm-muted">{t.tipo_documento || '—'}</td>
                      <td className="py-2 pr-3 text-[10px] text-hm-muted">{fmtFecha(t.fecha_emision)}</td>
                      <td className="py-2 pr-3 font-mono text-sm font-bold">{formatUSD(t.monto_total_usd)}</td>
                      <td className="py-2">
                        <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${
                          t.estado_pago === 'pagado'   ? 'text-green-400 bg-green-500/10 border-green-500/30' :
                          t.estado_pago === 'pendiente'? 'text-red-400 bg-red-500/10 border-red-500/30' :
                          'text-hm-muted bg-hm-surface2 border-hm-border'
                        }`}>
                          {t.estado_pago || '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
