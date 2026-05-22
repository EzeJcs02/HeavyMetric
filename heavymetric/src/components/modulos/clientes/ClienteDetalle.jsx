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
      <div className={`text-xl font-bold truncate ${color}`}>{value}</div>
      <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest truncate">{label}</div>
      {sub && <div className="text-[10px] text-hm-muted truncate">{sub}</div>}
    </div>
  )
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 text-[10px] sm:text-xs font-mono font-bold border-b-2 transition-all whitespace-nowrap shrink-0 ${
        active ? 'border-hm-accent text-hm-accent' : 'border-transparent text-hm-muted hover:text-hm-text'
      }`}
    >
      {children}
    </button>
  )
}

function EmptyState({ icon, title, desc }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-hm-surface2 border border-hm-border flex items-center justify-center text-xl mb-4">
        {icon}
      </div>
      <div className="text-sm font-bold text-hm-text">{title}</div>
      <div className="text-xs text-hm-muted mt-1 max-w-sm">{desc}</div>
    </div>
  )
}

export default function ClienteDetalle({ cliente, isOpen, onClose, onEdit }) {
  const [tab, setTab] = useState('resumen')
  const { formatUSD } = useDolar()
  const { flota, leads, cotizaciones, ots, transacciones, kpis, loading } = useCliente360(cliente?.id, isOpen)

  if (!cliente) return null

  // Alertas Inteligentes
  const hayDeuda = kpis.deudaPendiente > 0
  const servicesCriticos = flota.filter(m => {
    const svc = calcServiceState(m)
    return svc && ['vencido', 'urgente'].includes(svc.estado)
  })
  const hayServicesUrgentes = servicesCriticos.length > 0
  
  const tieneAlertas = hayDeuda || hayServicesUrgentes

  // Rentabilidad / Costos extraídos de OTs
  const totalRepuestos = ots.reduce((acc, o) => acc + Number(o.total_repuestos_usd || 0), 0)
  const totalManoObra = ots.reduce((acc, o) => acc + Number(o.total_mano_obra_usd || 0), 0)
  const totalCostoServicios = totalRepuestos + totalManoObra

  const handleTabChange = (t) => setTab(t)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5 -mt-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {cliente.propension_compra && (
              <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full border text-sm font-black shrink-0 ${PROP_STYLE[cliente.propension_compra]}`}>
                {cliente.propension_compra}
              </span>
            )}
            <h2 className="text-xl sm:text-2xl font-bold truncate">{cliente.razon_social}</h2>
            {cliente.nombre_comercial && cliente.nombre_comercial !== cliente.razon_social && (
              <span className="text-sm text-hm-muted truncate">{cliente.nombre_comercial}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {cliente.rubro    && <Badge variant="default">{cliente.rubro}</Badge>}
            {cliente.condicion_iva && <Badge variant="info">{cliente.condicion_iva}</Badge>}
            {cliente.cuit     && <span className="text-[10px] sm:text-xs font-mono text-hm-muted">{cliente.cuit}</span>}
          </div>
        </div>
        
        <div className="flex items-center gap-3 shrink-0">
          {tieneAlertas && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold animate-pulse">
              ⚠️ RIESGO / ALERTAS
            </div>
          )}
          <button
            onClick={() => onEdit(cliente)}
            className="text-xs font-mono font-bold border border-hm-border text-hm-muted rounded px-3 py-1.5 hover:border-hm-accent hover:text-hm-accent transition-colors shrink-0"
          >
            ✏️ EDITAR
          </button>
        </div>
      </div>

      {/* Tabs (11 pestañas) */}
      <div className="flex gap-2 border-b border-hm-border mb-4 overflow-x-auto no-scrollbar scroll-smooth">
        <TabBtn active={tab==='resumen'}       onClick={() => handleTabChange('resumen')}>RESUMEN</TabBtn>
        <TabBtn active={tab==='contactos'}     onClick={() => handleTabChange('contactos')}>CONTACTOS</TabBtn>
        <TabBtn active={tab==='comercial'}     onClick={() => handleTabChange('comercial')}>COMERCIAL ({leads.length + cotizaciones.length})</TabBtn>
        <TabBtn active={tab==='facturacion'}   onClick={() => handleTabChange('facturacion')}>FACTURACIÓN</TabBtn>
        <TabBtn active={tab==='cobranzas'}     onClick={() => handleTabChange('cobranzas')}>COBRANZAS</TabBtn>
        <TabBtn active={tab==='flota'}         onClick={() => handleTabChange('flota')}>FLOTA ({flota.length})</TabBtn>
        <TabBtn active={tab==='ots'}           onClick={() => handleTabChange('ots')}>SERVICIOS ({ots.length})</TabBtn>
        <TabBtn active={tab==='garantias'}     onClick={() => handleTabChange('garantias')}>RECLAMOS</TabBtn>
        <TabBtn active={tab==='rentabilidad'}  onClick={() => handleTabChange('rentabilidad')}>RENTABILIDAD</TabBtn>
        <TabBtn active={tab==='timeline'}      onClick={() => handleTabChange('timeline')}>TIMELINE</TabBtn>
        <TabBtn active={tab==='alertas'}       onClick={() => handleTabChange('alertas')}>
          {tieneAlertas ? <span className="text-red-400">ALERTAS (!)</span> : 'ALERTAS'}
        </TabBtn>
      </div>

      <div className="min-h-[400px]">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-24 bg-hm-surface2 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* 1. RESUMEN */}
            {tab === 'resumen' && (
              <div className="flex flex-col gap-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Kpi label="Flota activa" value={kpis.flotaCount} sub={kpis.flotaDetenidos > 0 ? `${kpis.flotaDetenidos} detenidos` : 'todos operativos'} color={kpis.flotaDetenidos > 0 ? 'text-orange-400' : 'text-green-400'} />
                  <Kpi label="Leads activos" value={kpis.leadsActivos} />
                  <Kpi label="OTs abiertas" value={kpis.otsAbiertas} color={kpis.otsAbiertas > 0 ? 'text-yellow-400' : ''} />
                  <Kpi label="Deuda pendiente" value={kpis.deudaPendiente > 0 ? formatUSD(kpis.deudaPendiente) : 'Sin deuda'} color={kpis.deudaPendiente > 0 ? 'text-red-400' : 'text-green-400'} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-hm-surface2/20 border border-hm-border/40 rounded-lg p-3">
                    <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-0.5">Ubicación Principal</div>
                    <div className="text-sm font-medium">{cliente.direccion || '—'}</div>
                  </div>
                  <div className="bg-hm-surface2/20 border border-hm-border/40 rounded-lg p-3">
                    <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-0.5">Tipo de Cliente</div>
                    <div className="text-sm font-medium">B2B / Industrial</div>
                  </div>
                  <div className="bg-hm-surface2/20 border border-hm-border/40 rounded-lg p-3">
                    <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-0.5">Estado en Sistema</div>
                    <div className="text-sm font-bold text-green-400">Activo</div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. CONTACTOS */}
            {tab === 'contactos' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-hm-surface2/20 border border-hm-border/50 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-4 border-b border-hm-border/50 pb-3">
                    <div className="w-10 h-10 rounded-full bg-hm-accent/20 text-hm-accent flex items-center justify-center font-bold text-lg">
                      {cliente.contacto_nombre ? cliente.contacto_nombre.charAt(0).toUpperCase() : 'C'}
                    </div>
                    <div>
                      <h3 className="font-bold">{cliente.contacto_nombre || 'Contacto Principal'}</h3>
                      <p className="text-xs text-hm-muted">Responsable Comercial / Operativo</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-hm-muted">Email:</span>
                      <span className="font-medium text-hm-text">{cliente.email || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-hm-muted">Teléfono:</span>
                      <span className="font-medium text-hm-text">{cliente.telefono || '—'}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-hm-surface2/20 border border-hm-border/50 border-dashed rounded-xl p-5 flex items-center justify-center text-center text-sm text-hm-muted hover:border-hm-border hover:bg-hm-surface2/40 cursor-pointer transition-colors">
                  + Agregar nuevo contacto
                </div>
              </div>
            )}

            {/* 3. COMERCIAL */}
            {tab === 'comercial' && (
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Leads */}
                <div className="flex-1">
                  <h3 className="text-xs font-mono font-bold text-hm-muted tracking-widest uppercase mb-3">Leads & Oportunidades ({leads.length})</h3>
                  {leads.length === 0 ? <div className="text-sm text-hm-muted">Sin leads.</div> : (
                    <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-2">
                      {leads.map(l => (
                        <div key={l.id} className="bg-hm-surface2/30 border border-hm-border/50 rounded-lg p-3 flex justify-between items-center">
                          <div>
                            <div className="font-bold text-sm">{l.empresa || l.nombre || '—'}</div>
                            <div className="text-xs text-hm-muted mt-0.5">{l.pipeline} — {fmtFecha(l.ultimo_contacto)}</div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant="default">{l.estado}</Badge>
                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded border text-[9px] font-black ${PROP_STYLE[l.lead_grade] || 'bg-hm-surface2 text-hm-muted border-hm-border'}`}>{l.lead_grade}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Cotizaciones */}
                <div className="flex-1">
                  <h3 className="text-xs font-mono font-bold text-hm-muted tracking-widest uppercase mb-3">Cotizaciones ({cotizaciones.length})</h3>
                  {cotizaciones.length === 0 ? <div className="text-sm text-hm-muted">Sin cotizaciones.</div> : (
                    <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-2">
                      {cotizaciones.map(c => (
                        <div key={c.id} className="bg-hm-surface2/30 border border-hm-border/50 rounded-lg p-3 flex justify-between items-center">
                          <div>
                            <div className="font-mono text-xs text-hm-muted mb-0.5">{fmtFecha(c.created_at)}</div>
                            <div className="font-bold text-sm">{c.numero_cotizacion || '—'}</div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant={ESTADO_COT_BADGE[c.estado] || 'default'}>{c.estado}</Badge>
                            <span className="font-mono text-sm font-bold">{formatUSD(c.total_usd)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4. FACTURACIÓN */}
            {tab === 'facturacion' && (
              <div className="max-h-[400px] overflow-y-auto">
                {transacciones.length === 0 ? (
                  <EmptyState icon="🧾" title="Sin facturación" desc="Este cliente aún no registra transacciones o comprobantes facturados." />
                ) : (
                  <table className="w-full text-left">
                    <thead className="border-b border-hm-border sticky top-0 bg-hm-surface z-10">
                      <tr>
                        {['Fecha', 'Comprobante', 'Tipo', 'Monto', 'Estado'].map(h => (
                          <th key={h} className="pb-2 font-mono text-[9px] text-hm-muted uppercase tracking-widest">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {transacciones.map(t => (
                        <tr key={t.id} className="border-b border-hm-border/30 hover:bg-hm-surface2/20 transition-colors">
                          <td className="py-3 pr-3 text-[10px] text-hm-muted">{fmtFecha(t.fecha_emision)}</td>
                          <td className="py-3 pr-3 font-mono text-sm">{t.numero_comprobante || '—'}</td>
                          <td className="py-3 pr-3 text-xs text-hm-muted">{t.tipo_documento || '—'}</td>
                          <td className="py-3 pr-3 font-mono text-sm font-bold">{formatUSD(t.monto_total_usd)}</td>
                          <td className="py-3">
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
            )}

            {/* 5. COBRANZAS */}
            {tab === 'cobranzas' && (
              <div className="flex flex-col gap-5">
                {/* KPIs Financieros */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <Kpi label="Saldo Deudor" value={formatUSD(kpis.deudaPendiente)} color={kpis.deudaPendiente > 0 ? 'text-red-400' : 'text-green-400'} />
                  <Kpi label="Cond. de Pago" value="A 30 Días" sub="Habitual" />
                  <Kpi label="Límite Crédito" value={formatUSD(15000)} sub="Crédito aprobado" />
                  <div className="bg-hm-surface2/30 border border-hm-border/50 rounded-lg p-3 flex flex-col justify-center">
                    <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-1">Score Mora</div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded font-black text-xs ${
                        kpis.deudaPendiente > 5000 ? 'bg-red-500/20 text-red-400' : kpis.deudaPendiente > 0 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'
                      }`}>
                        {kpis.deudaPendiente > 5000 ? 'C' : kpis.deudaPendiente > 0 ? 'B' : 'A'}
                      </span>
                      <span className="text-xs font-bold">{kpis.deudaPendiente > 5000 ? 'Riesgo Alto' : kpis.deudaPendiente > 0 ? 'Atrasos Leves' : 'Al Día'}</span>
                    </div>
                  </div>
                  <Kpi label="Promedio Pago" value="18 días" sub="Últimos 12 meses" />
                </div>
                
                {kpis.deudaPendiente > 0 ? (
                  <div className="mt-2">
                    <h3 className="text-xs font-mono font-bold text-hm-muted tracking-widest uppercase mb-3">Historial de Cobranzas / Deuda Activa</h3>
                    <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto pr-2">
                      {transacciones.filter(t => t.estado_pago === 'pendiente').map(t => (
                        <div key={t.id} className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 flex justify-between items-center">
                          <div>
                            <div className="font-mono text-xs text-red-300 mb-0.5">{fmtFecha(t.fecha_emision)}</div>
                            <div className="font-bold text-sm text-red-100">{t.numero_comprobante || 'Documento Pendiente'}</div>
                          </div>
                          <div className="font-mono text-sm font-bold text-red-400">
                            {formatUSD(t.monto_total_usd)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <EmptyState icon="✅" title="Cliente al día" desc="No se registran comprobantes pendientes de pago." />
                )}
              </div>
            )}

            {/* 6. FLOTA */}
            {tab === 'flota' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
                {flota.length === 0 ? (
                  <div className="col-span-full">
                    <EmptyState icon="🚜" title="Sin equipos" desc="No hay activos o máquinas registradas para este cliente." />
                  </div>
                ) : flota.map(m => {
                  const svc = calcServiceState(m)
                  return (
                    <div key={m.id} className="bg-hm-surface2/20 border border-hm-border/50 rounded-lg p-4 flex flex-col justify-between">
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm truncate">{m.nombre_unidad}</span>
                            {m.tipo && (
                              <span className="text-[9px] font-mono bg-hm-surface2 text-hm-muted border border-hm-border rounded px-1.5 py-0.5 shrink-0">
                                {m.tipo}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-hm-muted truncate">
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

                      {svc && (
                        <div className="mt-auto">
                          <div className="flex justify-between text-[9px] font-mono text-hm-muted mb-1">
                            <span>Mantenimiento</span>
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

            {/* 7. OTs */}
            {tab === 'ots' && (
              <div className="max-h-[400px] overflow-y-auto pr-2">
                {ots.length === 0 ? (
                  <EmptyState icon="🔧" title="Sin historial de servicios" desc="No se han registrado órdenes de trabajo para los equipos de este cliente." />
                ) : (
                  <table className="w-full text-left">
                    <thead className="border-b border-hm-border sticky top-0 bg-hm-surface z-10">
                      <tr>
                        {['OT', 'Equipo', 'Ingreso', 'Estado', 'Total USD'].map(h => (
                          <th key={h} className="pb-2 font-mono text-[9px] text-hm-muted uppercase tracking-widest">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ots.map(o => (
                        <tr key={o.id} className="border-b border-hm-border/30 hover:bg-hm-surface2/20 transition-colors">
                          <td className="py-3 pr-3 font-mono text-sm">{o.numero_ot || '—'}</td>
                          <td className="py-3 pr-3 text-sm font-medium truncate max-w-[150px]">
                            {o.maquina?.nombre_unidad || '—'}
                          </td>
                          <td className="py-3 pr-3 text-xs text-hm-muted">{fmtFecha(o.fecha_ingreso)}</td>
                          <td className="py-3 pr-3">
                            <Badge variant={ESTADO_OT_BADGE[o.estado] || 'default'}>{o.estado}</Badge>
                          </td>
                          <td className="py-3 font-mono text-sm font-bold">{formatUSD(o.total_usd)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* 8. GARANTIAS / RECLAMOS */}
            {tab === 'garantias' && (
              <EmptyState icon="🛡️" title="Sin incidencias activas" desc="El sistema no registra reclamos abiertos ni garantías ejecutadas recientemente." />
            )}

            {/* 9. RENTABILIDAD */}
            {tab === 'rentabilidad' && (
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-hm-surface2/20 border border-green-500/20 rounded-xl p-5">
                    <div className="text-xs font-mono text-green-400 mb-2 tracking-widest">INGRESOS HISTÓRICOS</div>
                    <div className="text-2xl font-bold text-hm-text mb-1">{formatUSD(kpis.facturadoTotal)}</div>
                    <div className="text-[10px] text-hm-muted">Total facturado procesado</div>
                  </div>
                  <div className="bg-hm-surface2/20 border border-orange-500/20 rounded-xl p-5">
                    <div className="text-xs font-mono text-orange-400 mb-2 tracking-widest">GASTOS OPERATIVOS (OT)</div>
                    <div className="text-2xl font-bold text-hm-text mb-1">{formatUSD(totalCostoServicios)}</div>
                    <div className="text-[10px] text-hm-muted">Repuestos: {formatUSD(totalRepuestos)} | MO: {formatUSD(totalManoObra)}</div>
                  </div>
                  <div className="bg-hm-surface2/20 border border-blue-500/20 rounded-xl p-5">
                    <div className="text-xs font-mono text-blue-400 mb-2 tracking-widest">MARGEN BÁSICO BRUTO</div>
                    <div className="text-2xl font-bold text-hm-text mb-1">{formatUSD(kpis.facturadoTotal - totalCostoServicios)}</div>
                    <div className="text-[10px] text-hm-muted">Ingresos - Gastos OTs</div>
                  </div>
                </div>
                <div className="text-center text-xs text-hm-muted italic p-4 bg-hm-surface2/10 rounded-lg">
                  La rentabilidad es un cálculo teórico estimado basado en facturación pagada vs costos imputados en órdenes de trabajo completadas.
                </div>
              </div>
            )}

            {/* 10. TIMELINE */}
            {tab === 'timeline' && (
              <div className="max-h-[500px] overflow-y-auto pr-2">
                <Timeline360 clienteId={cliente.id} orgId={cliente.organization_id} />
              </div>
            )}

            {/* 11. ALERTAS */}
            {tab === 'alertas' && (
              <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-2">
                {!tieneAlertas ? (
                   <EmptyState icon="✅" title="Sin alertas críticas" desc="No se detectan anomalías comerciales ni operativas urgentes." />
                ) : (
                  <>
                    {hayDeuda && (
                      <div className="bg-red-500/10 border-l-4 border-red-500 rounded-r-lg p-4">
                        <div className="text-red-400 font-bold mb-1">Cobranza Crítica</div>
                        <div className="text-sm text-red-200">El cliente mantiene una deuda total de <strong>{formatUSD(kpis.deudaPendiente)}</strong> en transacciones pendientes.</div>
                      </div>
                    )}
                    {servicesCriticos.map(m => (
                       <div key={m.id} className="bg-yellow-500/10 border-l-4 border-yellow-500 rounded-r-lg p-4">
                        <div className="text-yellow-400 font-bold mb-1">Mantenimiento Urgente: {m.nombre_unidad}</div>
                        <div className="text-sm text-yellow-200">El equipo ha superado su límite de horas operativo y requiere service preventivo inmediato.</div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

          </>
        )}
      </div>
    </Modal>
  )
}
