import Modal from '../../ui/Modal'
import Badge from '../../ui/Badge'
import { useCliente360, calcServiceState } from '../../../hooks/useCliente360'
import { useDolar } from '../../../context/DolarContext'
import { useState } from 'react'
import Timeline360 from '../timeline/Timeline360'
import FichaMaquina from '../maquinas/FichaMaquina'

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
  const [selectedActivo, setSelectedActivo] = useState(null)
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
    <>
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
        <TabBtn active={tab==='financiero'}    onClick={() => handleTabChange('financiero')}>💰 FINANCIERO</TabBtn>
        <TabBtn active={tab==='flota'}         onClick={() => handleTabChange('flota')}>ACTIVOS / FLOTA ({flota.length})</TabBtn>
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

            {/* 6. ACTIVOS / FLOTA */}
            {tab === 'flota' && (
              <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2">
                {flota.length === 0 ? (
                  <div className="col-span-full">
                    <EmptyState icon="🚜" title="Sin equipos" desc="No hay activos o máquinas registradas para este cliente." />
                  </div>
                ) : flota.map(m => {
                  const svc = calcServiceState(m)
                  const scoreDisp = m.score_disponibilidad || 100
                  return (
                    <div 
                      key={m.id} 
                      onClick={() => setSelectedActivo(m)}
                      className="bg-hm-surface2/20 border border-hm-border/50 rounded-lg p-4 flex flex-col md:flex-row gap-4 justify-between hover:border-hm-accent/50 cursor-pointer transition-colors group"
                    >
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-base truncate group-hover:text-hm-accent transition-colors">{m.nombre_unidad}</span>
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

                        {svc && (
                          <div className="mt-4 max-w-xs">
                            <div className="flex justify-between text-[9px] font-mono text-hm-muted mb-1">
                              <span>Próximo Service</span>
                              <span className={svc.color === 'red' ? 'text-red-400 font-bold' : svc.color === 'yellow' ? 'text-yellow-400 font-bold' : 'text-green-400'}>
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

                      <div className="grid grid-cols-2 gap-3 md:gap-6 text-right shrink-0">
                        <div className="flex flex-col items-end justify-center">
                          <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-0.5">Riesgo / Estado</div>
                          <div className={`text-sm font-bold ${ESTADO_OT_BADGE[m.estado_operativo] ? '' : ESTADO_OP_COLOR[m.estado_operativo] || 'text-hm-muted'}`}>
                            {m.estado_operativo || 'Operativo'}
                          </div>
                        </div>
                        <div className="flex flex-col items-end justify-center">
                          <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-0.5">Disponibilidad</div>
                          <div className={`text-sm font-bold ${scoreDisp < 80 ? 'text-red-400' : 'text-green-400'}`}>{scoreDisp}%</div>
                        </div>
                        <div className="flex flex-col items-end justify-center">
                          <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-0.5">Downtime Acumulado</div>
                          <div className="text-sm font-bold text-orange-400">{m.tiempo_detenido_horas || 0} hs</div>
                        </div>
                        <div className="flex flex-col items-end justify-center">
                          <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-0.5">Garantía <span className="bg-hm-surface2/50 px-1 rounded border border-hm-border">MOCK</span></div>
                          <div className="text-sm font-bold text-green-400">Vigente (3m)</div>
                        </div>
                      </div>
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

            {/* FINANCIERO */}
            {tab === 'financiero' && (() => {
              // Mock Data — TODO: conectar con tabla cobranzas, transacciones, cheques_recibidos
              const estadoCliente = kpis.deudaPendiente > 5000 ? 'moroso'
                : kpis.deudaPendiente > 1000 ? 'riesgoso'
                : kpis.facturadoTotal > 10000 ? 'estratégico'
                : 'normal'
              const ESTADO_BADGE = {
                normal:      'bg-green-500/20 text-green-300 border-green-500/40',
                estratégico: 'bg-hm-accent/20 text-hm-accent border-hm-accent/40',
                riesgoso:    'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
                moroso:      'bg-red-500/20 text-red-300 border-red-500/40',
              }
              const MOCK_CHEQUES = [
                { id: 1, banco: 'Santander', numero: '00234501', importe: 150000, vencimiento: '2026-06-20', estado: 'en_cartera', moneda: 'ARS' },
                { id: 2, banco: 'Galicia',   numero: '00198712', importe: 2500,   vencimiento: '2026-05-28', estado: 'por_vencer', moneda: 'USD' },
              ]
              const MOCK_PROMESAS = [
                { id: 1, fecha: '2026-05-30', monto: 180000, estado: 'pendiente', notas: 'Prometió transferir antes de fin de mes' },
              ]
              const scoreLabel = { normal: 'SIN MORA', estratégico: 'CLIENTE VIP', riesgoso: 'RIESGO MODERADO', moroso: 'MOROSO' }
              const factPend = kpis.deudaPendiente
              const creditoUsado = kpis.facturadoTotal > 0 ? Math.min(Math.round((factPend / (factPend + 20000)) * 100), 100) : 0
              return (
                <div className="flex flex-col gap-5">
                  {/* Badge estado cliente */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${ESTADO_BADGE[estadoCliente]}`}>
                      <span className="w-2 h-2 rounded-full bg-current" />
                      {estadoCliente.toUpperCase()}
                    </span>
                    <span className="text-xs text-hm-muted font-mono">{scoreLabel[estadoCliente]}</span>
                  </div>

                  {/* A) Condiciones de pago */}
                  <div>
                    <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-2">A — Condiciones de Pago</div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {[['Forma habitual', 'Transferencia / Cheque'],['Plazo promedio', '30 días'],['Moneda', 'ARS / USD mixto'],['Límite de crédito', formatUSD(50000)],['Cond. IVA', cliente.condicion_iva || '—'],['Observaciones', 'Base preparada']].map(([k,v]) => (
                        <div key={k} className="bg-hm-surface2/20 border border-hm-border/40 rounded-lg p-3">
                          <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-0.5">{k}</div>
                          <div className="text-sm font-medium">{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* B) KPIs financieros */}
                  <div>
                    <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-2">B — KPIs Financieros</div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="bg-hm-surface2/20 border border-hm-border/40 rounded-lg p-3">
                        <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-0.5">Deuda actual</div>
                        <div className={`text-xl font-bold ${factPend > 0 ? 'text-red-400' : 'text-green-400'}`}>{factPend > 0 ? formatUSD(factPend) : 'Sin deuda'}</div>
                      </div>
                      <div className="bg-hm-surface2/20 border border-hm-border/40 rounded-lg p-3">
                        <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-0.5">Score mora</div>
                        <div className={`text-xl font-bold ${estadoCliente === 'moroso' ? 'text-red-400' : estadoCliente === 'riesgoso' ? 'text-yellow-400' : 'text-green-400'}`}>{estadoCliente === 'moroso' ? 'ALTO' : estadoCliente === 'riesgoso' ? 'MEDIO' : 'BAJO'}</div>
                      </div>
                      <div className="bg-hm-surface2/20 border border-hm-border/40 rounded-lg p-3">
                        <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-0.5">Días prom. pago</div>
                        <div className="text-xl font-bold">Base preparada</div>
                      </div>
                      <div className="bg-hm-surface2/20 border border-hm-border/40 rounded-lg p-3">
                        <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-0.5">Facturas pendientes</div>
                        <div className={`text-xl font-bold ${kpis.otsAbiertas > 0 ? 'text-yellow-400' : 'text-green-400'}`}>{kpis.otsAbiertas}</div>
                      </div>
                      <div className="bg-hm-surface2/20 border border-hm-border/40 rounded-lg p-3">
                        <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-0.5">Facturas vencidas</div>
                        <div className={`text-xl font-bold ${factPend > 0 ? 'text-red-400' : 'text-green-400'}`}>{factPend > 0 ? 1 : 0}</div>
                      </div>
                      <div className="bg-hm-surface2/20 border border-hm-border/40 rounded-lg p-3">
                        <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-0.5">Crédito usado</div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-2 bg-hm-surface2 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${creditoUsado > 80 ? 'bg-red-500' : creditoUsado > 50 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{width:`${creditoUsado}%`}} />
                          </div>
                          <span className="text-xs font-mono font-bold">{creditoUsado}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* C) Cobranza / Promesas */}
                  <div>
                    <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-2">C — Promesas de Pago</div>
                    {MOCK_PROMESAS.length === 0 ? (
                      <div className="text-sm text-hm-muted">Sin promesas registradas.</div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {MOCK_PROMESAS.map(p => (
                          <div key={p.id} className="flex items-center justify-between bg-hm-surface2/20 border border-hm-border/50 rounded-lg px-4 py-3">
                            <div>
                              <div className="text-xs font-mono text-hm-muted">{fmtFecha(p.fecha)}</div>
                              <div className="text-sm font-medium mt-0.5">{p.notas}</div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-sm font-bold">{new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS'}).format(p.monto)}</span>
                              <span className={`text-[10px] font-mono border rounded px-2 py-0.5 uppercase ${p.estado === 'pendiente' ? 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10' : 'border-green-500/50 text-green-400 bg-green-500/10'}`}>{p.estado}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* D) Cheques / E-Cheqs */}
                  <div>
                    <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-2">D — Cheques y E-Cheqs Recibidos</div>
                    <div className="flex flex-col gap-2">
                      {MOCK_CHEQUES.map(c => {
                        const venc = new Date(c.vencimiento + 'T00:00:00')
                        const diasRestantes = Math.ceil((venc - new Date()) / (1000*60*60*24))
                        const alerta = diasRestantes <= 10
                        return (
                          <div key={c.id} className={`flex items-center justify-between rounded-lg px-4 py-3 border ${alerta ? 'bg-red-500/10 border-red-500/30' : 'bg-hm-surface2/20 border-hm-border/50'}`}>
                            <div>
                              <div className={`text-xs font-mono mb-0.5 ${alerta ? 'text-red-300' : 'text-hm-muted'}`}>Vence: {venc.toLocaleDateString('es-AR')} {alerta && `(¡${diasRestantes}d!)`}</div>
                              <div className="font-bold text-sm">{c.banco} — #{c.numero}</div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-sm font-bold">{c.moneda === 'USD' ? `USD ${c.importe.toLocaleString()}` : new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS'}).format(c.importe)}</span>
                              <span className={`text-[10px] font-mono border rounded px-2 py-0.5 uppercase ${c.estado === 'por_vencer' ? 'border-red-500/50 text-red-400 bg-red-500/10' : 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10'}`}>{c.estado.replace('_',' ')}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* E) Alertas financieras */}
                  <div>
                    <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-2">E — Alertas Financieras</div>
                    <div className="flex flex-col gap-2">
                      {factPend > 0 && (
                        <div className="bg-red-500/10 border-l-4 border-red-500 rounded-r-lg p-3">
                          <div className="text-red-400 font-bold text-sm">⚠️ Factura vencida</div>
                          <div className="text-xs text-red-200 mt-0.5">Deuda total: {formatUSD(factPend)} — Requiere gestión inmediata.</div>
                        </div>
                      )}
                      {MOCK_CHEQUES.some(c => { const d = Math.ceil((new Date(c.vencimiento+'T00:00:00') - new Date())/(1000*60*60*24)); return d <= 10 }) && (
                        <div className="bg-orange-500/10 border-l-4 border-orange-500 rounded-r-lg p-3">
                          <div className="text-orange-400 font-bold text-sm">🏦 Cheque próximo a vencer</div>
                          <div className="text-xs text-orange-200 mt-0.5">Hay cheques con vencimiento en los próximos 10 días.</div>
                        </div>
                      )}
                      {creditoUsado > 80 && (
                        <div className="bg-yellow-500/10 border-l-4 border-yellow-500 rounded-r-lg p-3">
                          <div className="text-yellow-400 font-bold text-sm">💳 Límite de crédito casi superado</div>
                          <div className="text-xs text-yellow-200 mt-0.5">Crédito utilizado al {creditoUsado}% del límite asignado.</div>
                        </div>
                      )}
                      {estadoCliente === 'moroso' && (
                        <div className="bg-red-500/10 border-l-4 border-red-500 rounded-r-lg p-3">
                          <div className="text-red-400 font-bold text-sm">🚨 Cliente moroso</div>
                          <div className="text-xs text-red-200 mt-0.5">Evaluar condiciones de venta futuras con este cliente.</div>
                        </div>
                      )}
                      {factPend === 0 && !MOCK_CHEQUES.some(c => Math.ceil((new Date(c.vencimiento+'T00:00:00') - new Date())/(1000*60*60*24)) <= 10) && creditoUsado <= 80 && estadoCliente !== 'moroso' && (
                        <div className="text-center py-6 text-hm-muted text-sm">✅ Sin alertas financieras activas</div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* 9. RENTABILIDAD CLIENTE */}
            {tab === 'rentabilidad' && (() => {
              // Cálculos reales desde OTs y transacciones
              const ingresosServicios = ots.filter(o => o.estado === 'completada' || o.estado === 'facturada')
                .reduce((s, o) => s + Number(o.total_usd || 0), 0)
              const ingresosTotal = kpis.facturadoTotal || ingresosServicios
              const costoTotal = totalCostoServicios
              const margenBruto = ingresosTotal - costoTotal
              const margenPct = ingresosTotal > 0 ? ((margenBruto / ingresosTotal) * 100).toFixed(1) : 0
              const deuda = kpis.deudaPendiente || 0

              // Badge negocio
              const riesgoNegocio = margenPct < 10 ? 'bajo_retorno'
                : deuda > ingresosTotal * 0.3 ? 'riesgoso'
                : ingresosTotal > 10000 ? 'alto_valor'
                : 'estable'
              const RIESGO_BADGE = {
                alto_valor:  { label: 'ALTO VALOR', cls: 'bg-hm-accent/20 text-hm-accent border-hm-accent/40' },
                estable:     { label: 'ESTABLE', cls: 'bg-green-500/20 text-green-300 border-green-500/40' },
                riesgoso:    { label: 'RIESGOSO', cls: 'bg-red-500/20 text-red-300 border-red-500/40' },
                bajo_retorno:{ label: 'BAJO RETORNO', cls: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' },
              }
              const badge = RIESGO_BADGE[riesgoNegocio]

              // Timeline económico real
              const eventos = []
              transacciones.forEach(t => {
                if (t.estado_pago === 'cobrado' && t.fecha_cobro) {
                  eventos.push({
                    tipo: 'cobro', label: `Cobro recibido: ${t.tipo_documento || 'Recibo'}`,
                    fechaRaw: new Date(t.fecha_cobro), fecha: fmtFecha(t.fecha_cobro),
                    valor: t.monto_total_usd, color: 'text-blue-400', dot: 'bg-blue-500'
                  })
                }
                eventos.push({
                  tipo: 'factura', label: `Emisión: ${t.tipo_documento || 'Factura'} ${t.numero_comprobante || ''}`,
                  fechaRaw: new Date(t.fecha_emision), fecha: fmtFecha(t.fecha_emision),
                  valor: t.monto_total_usd, color: 'text-green-400', dot: 'bg-green-500'
                })
                if (t.estado_pago === 'pendiente') {
                  const dias = Math.floor((new Date() - new Date(t.fecha_emision)) / 86400000)
                  if (dias > 30) {
                    eventos.push({
                      tipo: 'mora', label: `Deuda vencida (${dias}d): ${t.tipo_documento || 'Factura'}`,
                      fechaRaw: new Date(t.fecha_emision), fecha: fmtFecha(t.fecha_emision),
                      valor: -t.monto_total_usd, color: 'text-red-400', dot: 'bg-red-500'
                    })
                  }
                }
              })
              ots.filter(o => ['completada','facturada'].includes(o.estado)).forEach(o => {
                eventos.push({
                  tipo: 'ot', label: `OT Completada #${o.numero_ot} ${o.maquina?.nombre_unidad ? `— ${o.maquina.nombre_unidad}` : ''}`,
                  fechaRaw: new Date(o.fecha_ingreso), fecha: fmtFecha(o.fecha_ingreso),
                  valor: o.total_usd || 0, color: 'text-hm-accent', dot: 'bg-hm-accent'
                })
              })
              const TIMELINE_ECO = eventos.sort((a,b) => b.fechaRaw - a.fechaRaw).slice(0, 20)

              return (
                <div className="flex flex-col gap-5">
                  {/* Badge negocio */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${badge.cls}`}>
                      <span className="w-2 h-2 rounded-full bg-current" />{badge.label}
                    </span>
                    <span className="text-xs text-hm-muted font-mono">{ots.length} OTs históricas · {flota.length} activos</span>
                  </div>

                  {/* A) Ingresos históricos */}
                  <div>
                    <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-2">A — Ingresos Históricos</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: 'Ventas / Servicios', value: ingresosTotal, real: true, color: 'text-green-400' },
                        { label: 'Alquileres', value: 0, real: false, color: 'text-blue-400' },
                        { label: 'Repuestos vendidos', value: totalRepuestos, real: true, color: 'text-orange-400' },
                        { label: 'Otros ingresos', value: 0, real: false, color: 'text-hm-accent' },
                      ].map(({ label, value, real, color }) => (
                        <div key={label} className="bg-hm-surface2/20 border border-hm-border/40 rounded-lg p-3">
                          <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-0.5">{label}</div>
                          <div className={`text-lg font-bold ${real && value > 0 ? color : 'text-hm-muted/50'}`}>
                            {real && value > 0 ? formatUSD(value) : (
                              <span className="text-[10px] bg-hm-surface2/50 px-1.5 py-0.5 rounded border border-hm-border">[BASE PREPARADA]</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* B) Cobros */}
                  <div>
                    <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-2">B — Cobros e Historial</div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="bg-hm-surface2/20 border border-hm-border/40 rounded-lg p-3">
                        <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-0.5">Deuda pendiente</div>
                        <div className={`text-lg font-bold ${deuda > 0 ? 'text-red-400' : 'text-green-400'}`}>{deuda > 0 ? formatUSD(deuda) : 'Sin deuda'}</div>
                      </div>
                      <div className="bg-hm-surface2/20 border border-hm-border/40 rounded-lg p-3">
                        <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-0.5">Mora histórica</div>
                        <div className="mt-1">
                          <span className="text-[10px] bg-hm-surface2/50 px-1.5 py-0.5 rounded border border-hm-border text-hm-muted/50">[SIN DATOS]</span>
                        </div>
                      </div>
                      <div className="bg-hm-surface2/20 border border-hm-border/40 rounded-lg p-3">
                        <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-0.5">Cumplimiento pago</div>
                        <div className="mt-1">
                          <span className="text-[10px] bg-hm-surface2/50 px-1.5 py-0.5 rounded border border-hm-border text-hm-muted/50">[SIN DATOS]</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* C) Margen cliente */}
                  <div>
                    <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-2">C — Margen del Cliente</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3">
                        <div className="text-[9px] font-mono text-green-400 uppercase mb-0.5">Ingreso total</div>
                        <div className="text-xl font-bold text-green-400">{formatUSD(ingresosTotal)}</div>
                      </div>
                      <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                        <div className="text-[9px] font-mono text-red-400 uppercase mb-0.5">Costo total</div>
                        <div className="text-xl font-bold text-red-400">{formatUSD(costoTotal)}</div>
                        <div className="text-[10px] text-hm-muted mt-0.5">Rep: {formatUSD(totalRepuestos)} · MO: {formatUSD(totalManoObra)}</div>
                      </div>
                      <div className={`rounded-lg p-3 border ${margenBruto >= 0 ? 'bg-hm-accent/5 border-hm-accent/20' : 'bg-red-500/5 border-red-500/20'}`}>
                        <div className={`text-[9px] font-mono uppercase mb-0.5 ${margenBruto >= 0 ? 'text-hm-accent' : 'text-red-400'}`}>Margen bruto</div>
                        <div className={`text-xl font-bold ${margenBruto >= 0 ? 'text-hm-accent' : 'text-red-400'}`}>{formatUSD(margenBruto)}</div>
                      </div>
                      <div className="bg-hm-surface2/20 border border-hm-border/40 rounded-lg p-3">
                        <div className="text-[9px] font-mono text-hm-muted uppercase mb-0.5">Margen %</div>
                        <div className={`text-xl font-bold ${Number(margenPct) >= 20 ? 'text-green-400' : Number(margenPct) >= 10 ? 'text-yellow-400' : 'text-red-400'}`}>{margenPct}%</div>
                        <div className="h-1.5 bg-hm-surface2 rounded-full overflow-hidden mt-2">
                          <div className={`h-full rounded-full ${Number(margenPct) >= 20 ? 'bg-green-500' : Number(margenPct) >= 10 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(Math.abs(Number(margenPct)), 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* D) Riesgo negocio */}
                  <div>
                    <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-2">D — Riesgo del Negocio</div>
                    <div className="bg-hm-surface2/20 border border-hm-border/50 rounded-xl p-4 flex flex-wrap gap-4 items-center">
                      <div className="flex-1 min-w-[200px]">
                        <div className="text-sm font-bold mb-1">Evaluación comercial</div>
                        <div className="text-xs text-hm-muted">
                          {riesgoNegocio === 'alto_valor' && 'Cliente estratégico con alta facturación y buen margen. Mantener relación y priorizar servicio.'}
                          {riesgoNegocio === 'estable' && 'Cliente estable con pagos regulares y margen aceptable. Sin señales de alerta.'}
                          {riesgoNegocio === 'riesgoso' && 'Alta deuda respecto a facturación. Evaluar condiciones de crédito antes de nuevos trabajos.'}
                          {riesgoNegocio === 'bajo_retorno' && 'Margen muy bajo o nulo. Revisar precios o costos operativos asociados a este cliente.'}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 text-xs">
                        {[
                          { label: 'OTs completadas', value: ots.filter(o => ['completada','facturada'].includes(o.estado)).length },
                          { label: 'OTs pendientes', value: ots.filter(o => !['completada','facturada','cancelada'].includes(o.estado)).length },
                          { label: 'Activos en flota', value: flota.length },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex justify-between gap-4">
                            <span className="text-hm-muted">{label}</span>
                            <span className="font-bold">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* E) Timeline económico */}
                  <div>
                    <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-2">E — Timeline Económico</div>
                    <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-2">
                      {TIMELINE_ECO.map((ev, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-hm-surface2/20 border border-hm-border/40 rounded-lg">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${ev.dot}`} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{ev.label}</div>
                            <div className="text-[10px] text-hm-muted font-mono">{ev.fecha}</div>
                          </div>
                          <div className={`font-mono text-sm font-bold shrink-0 ${ev.color}`}>
                            {ev.valor > 0 ? '+' : ''}{formatUSD(ev.valor)}
                          </div>
                        </div>
                      ))}
                      {TIMELINE_ECO.length === 0 && (
                        <div className="text-xs text-hm-muted italic p-3 text-center bg-hm-surface2/10 rounded-lg border border-white/5">
                          Sin movimientos económicos recientes para este cliente.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })()}


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

    {/* Modal FichaMáquina */}
    {selectedActivo && (
      <FichaMaquina 
        maquina={selectedActivo} 
        isOpen={!!selectedActivo} 
        onClose={() => setSelectedActivo(null)} 
      />
    )}
    </>
  )
}
