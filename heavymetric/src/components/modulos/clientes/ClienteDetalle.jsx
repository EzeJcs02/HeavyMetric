import Modal from '../../ui/Modal'
import Badge from '../../ui/Badge'
import { useCliente360, calcServiceState } from '../../../hooks/useCliente360'
import { useDolar } from '../../../context/DolarContext'
import { useState } from 'react'
import Timeline360 from '../timeline/Timeline360'
import FichaMaquina from '../maquinas/FichaMaquina'

// ─── Constantes de estilo ────────────────────────────────────────────────────

const PROP_STYLE = {
  A: 'bg-red-500/20 text-red-300 border-red-500/40',
  B: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  C: 'bg-white/5 text-neutral-500 border-white/10',
}

const ESTADO_OP_COLOR = {
  'Operativo':           'text-emerald-400',
  'En mantenimiento':    'text-yellow-400',
  'En taller':           'text-orange-400',
  'Esperando repuesto':  'text-red-400',
  'Fuera de servicio':   'text-red-400',
  'Baja':                'text-neutral-600',
}

const SERVICE_BAR = {
  vencido: 'bg-red-500',
  urgente: 'bg-red-400',
  proximo: 'bg-yellow-400',
  ok:      'bg-emerald-500',
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtFecha(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Badge de origen de dato
function DataBadge({ type }) {
  if (type === 'real')    return <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-px font-mono text-[8px] uppercase tracking-wider text-emerald-400">Real</span>
  if (type === 'prep')    return <span className="rounded border border-white/[0.07] bg-white/[0.03] px-1.5 py-px font-mono text-[8px] uppercase tracking-wider text-neutral-600">Prep</span>
  if (type === 'demo')    return <span className="rounded border border-cyan-400/20 bg-cyan-400/[0.07] px-1.5 py-px font-mono text-[8px] uppercase tracking-wider text-cyan-500">Demo</span>
  return null
}

// KPI card premium
function Kpi({ label, value, sub, color = 'text-neutral-200', badge }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-white/[0.06] bg-black/20 p-3.5">
      <div className="flex items-start justify-between gap-1">
        <div className={`text-xl font-black leading-none tabular-nums ${color}`}>{value}</div>
        {badge && <DataBadge type={badge} />}
      </div>
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-neutral-600">{label}</div>
      {sub && <div className="text-[10px] text-neutral-600 leading-tight">{sub}</div>}
    </div>
  )
}

// Tab button
function TabBtn({ active, onClick, children, alert }) {
  return (
    <button
      onClick={onClick}
      className={`relative shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 font-mono text-[10px] font-bold uppercase tracking-wider transition-all ${
        active
          ? 'border-cyan-400 text-cyan-300'
          : 'border-transparent text-neutral-600 hover:text-neutral-300'
      }`}
    >
      {children}
      {alert && (
        <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-red-500" />
      )}
    </button>
  )
}

// Estado vacío
function EmptyState({ icon, title, desc }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-14 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.02] text-xl">
        {icon}
      </div>
      <div>
        <div className="text-sm font-semibold text-neutral-300">{title}</div>
        <div className="mt-0.5 max-w-xs text-xs text-neutral-600">{desc}</div>
      </div>
    </div>
  )
}

// Sección con label y badge
function Section({ label, badge, children }) {
  return (
    <div>
      <div className="mb-2.5 flex items-center gap-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-neutral-600">{label}</span>
        {badge && <DataBadge type={badge} />}
      </div>
      {children}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ClienteDetalle({ cliente, isOpen, onClose, onEdit }) {
  const [tab, setTab] = useState('resumen')
  const [selectedActivo, setSelectedActivo] = useState(null)
  const { formatUSD } = useDolar()
  const { flota, leads, cotizaciones, ots, transacciones, kpis, loading } = useCliente360(cliente?.id, isOpen)

  if (!cliente) return null

  // ── Alertas
  const hayDeuda = kpis.deudaPendiente > 0
  const servicesCriticos = flota.filter(m => {
    const svc = calcServiceState(m)
    return svc && ['vencido', 'urgente'].includes(svc.estado)
  })
  const hayServicesUrgentes = servicesCriticos.length > 0
  const tieneAlertas = hayDeuda || hayServicesUrgentes

  // ── Health Score (0–100)
  const healthScore = (() => {
    let s = 100
    if (kpis.deudaPendiente > 0) s -= Math.min(35, Math.floor(kpis.deudaPendiente / 400))
    if (kpis.flotaDetenidos > 0) s -= kpis.flotaDetenidos * 8
    if (servicesCriticos.length > 0) s -= servicesCriticos.length * 10
    if (kpis.otsAbiertas > 3)    s -= 5
    return Math.max(0, Math.min(100, s))
  })()
  const healthColor = healthScore >= 75 ? 'text-emerald-400' : healthScore >= 45 ? 'text-yellow-400' : 'text-red-400'
  const healthLabel = healthScore >= 75 ? 'Saludable' : healthScore >= 45 ? 'Atención' : 'Crítico'

  // ── Rentabilidad
  const totalRepuestos = ots.reduce((acc, o) => acc + Number(o.total_repuestos_usd || 0), 0)
  const totalManoObra  = ots.reduce((acc, o) => acc + Number(o.total_mano_obra_usd  || 0), 0)
  const totalCostoServicios = totalRepuestos + totalManoObra

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="max-w-6xl">

        {/* ── Header ejecutivo ───────────────────────────────────────────── */}
        <div className="-mt-2 mb-5 flex flex-col gap-4 border-b border-white/[0.06] pb-5 sm:flex-row sm:items-start sm:justify-between">

          {/* Left: identidad */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {cliente.propension_compra && (
                <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-black ${PROP_STYLE[cliente.propension_compra]}`}>
                  {cliente.propension_compra}
                </span>
              )}
              <h2 className="text-xl font-black tracking-tight text-neutral-100 sm:text-2xl truncate">
                {cliente.razon_social}
              </h2>
              {cliente.nombre_comercial && cliente.nombre_comercial !== cliente.razon_social && (
                <span className="text-sm text-neutral-500 truncate">{cliente.nombre_comercial}</span>
              )}
              {tieneAlertas && (
                <span className="flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 font-mono text-[10px] font-bold text-red-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                  RIESGO
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {cliente.rubro       && <Badge variant="default">{cliente.rubro}</Badge>}
              {cliente.condicion_iva && <Badge variant="info">{cliente.condicion_iva}</Badge>}
              {cliente.cuit        && <span className="font-mono text-[10px] text-neutral-600">{cliente.cuit}</span>}
            </div>
          </div>

          {/* Right: health score + acciones */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Health score */}
            {!loading && (
              <div className="flex flex-col items-center rounded-xl border border-white/[0.06] bg-black/20 px-4 py-2.5 min-w-[80px]">
                <div className={`text-2xl font-black tabular-nums leading-none ${healthColor}`}>
                  {healthScore}
                </div>
                <div className="mt-0.5 font-mono text-[8px] uppercase tracking-widest text-neutral-600">Health</div>
                <div className={`mt-0.5 font-mono text-[9px] font-bold ${healthColor}`}>{healthLabel}</div>
              </div>
            )}

            <button
              onClick={() => onEdit(cliente)}
              className="flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 font-mono text-xs font-bold text-neutral-500 hover:border-cyan-400/30 hover:text-cyan-300 transition-colors shrink-0"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              EDITAR
            </button>
          </div>
        </div>

        {/* ── Tabs ──────────────────────────────────────────────────────── */}
        <div className="mb-5 flex gap-0 overflow-x-auto border-b border-white/[0.05] no-scrollbar">
          {[
            { id: 'resumen',      label: 'Resumen' },
            { id: 'contactos',    label: 'Contactos' },
            { id: 'comercial',    label: `Comercial (${leads.length + cotizaciones.length})` },
            { id: 'facturacion',  label: 'Facturación' },
            { id: 'cobranzas',    label: 'Cobranzas' },
            { id: 'financiero',   label: 'Financiero' },
            { id: 'flota',        label: `Activos (${flota.length})` },
            { id: 'ots',          label: `Servicios (${ots.length})` },
            { id: 'garantias',    label: 'Reclamos' },
            { id: 'rentabilidad', label: 'Rentabilidad' },
            { id: 'timeline',     label: 'Timeline' },
            { id: 'alertas',      label: tieneAlertas ? 'Alertas (!)' : 'Alertas', alert: tieneAlertas },
          ].map(t => (
            <TabBtn key={t.id} active={tab === t.id} onClick={() => setTab(t.id)} alert={t.alert}>
              {t.label}
            </TabBtn>
          ))}
        </div>

        {/* ── Contenido ────────────────────────────────────────────────── */}
        <div className="min-h-[400px]">
          {loading ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="h-24 animate-pulse rounded-xl border border-white/[0.04] bg-white/[0.02]" />
              ))}
            </div>
          ) : (
            <>
              {/* 1 · RESUMEN ─────────────────────────────────────────────── */}
              {tab === 'resumen' && (
                <div className="flex flex-col gap-5">
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <Kpi
                      label="Activos / Flota"
                      value={kpis.flotaCount}
                      sub={kpis.flotaDetenidos > 0 ? `${kpis.flotaDetenidos} detenidos` : 'Todos operativos'}
                      color={kpis.flotaDetenidos > 0 ? 'text-orange-400' : 'text-emerald-400'}
                      badge="real"
                    />
                    <Kpi
                      label="Services Críticos"
                      value={servicesCriticos.length}
                      sub={servicesCriticos.length > 0 ? 'Requieren atención' : 'Al día'}
                      color={servicesCriticos.length > 0 ? 'text-red-400' : 'text-emerald-400'}
                      badge="real"
                    />
                    <Kpi
                      label="OTs Abiertas"
                      value={kpis.otsAbiertas}
                      sub={kpis.otsAbiertas > 0 ? 'En progreso / Taller' : 'Sin pendientes'}
                      color={kpis.otsAbiertas > 0 ? 'text-yellow-400' : 'text-emerald-400'}
                      badge="real"
                    />
                    <Kpi
                      label="Deuda / Riesgo"
                      value={kpis.deudaPendiente > 0 ? formatUSD(kpis.deudaPendiente) : 'Sin deuda'}
                      sub={hayDeuda ? 'Riesgo financiero' : 'Riesgo bajo'}
                      color={kpis.deudaPendiente > 0 ? 'text-red-400' : 'text-emerald-400'}
                      badge="real"
                    />
                  </div>

                  {/* Banner riesgo integral */}
                  <div className={`flex flex-col items-start gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                    tieneAlertas
                      ? 'border-red-500/20 bg-red-500/[0.04]'
                      : 'border-emerald-500/20 bg-emerald-500/[0.03]'
                  }`}>
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-widest text-neutral-600 mb-1">
                        Cruce 360° Operativo y Financiero
                      </div>
                      <div className="text-sm text-neutral-400">
                        <strong className="text-neutral-200">{flota.length}</strong> activos vinculados ·{' '}
                        <strong className="text-neutral-200">{servicesCriticos.length}</strong> services críticos ·{' '}
                        <strong className="text-neutral-200">{kpis.otsAbiertas}</strong> OTs abiertas
                      </div>
                    </div>
                    <div className={`shrink-0 rounded-xl border px-4 py-2 font-mono text-sm font-black whitespace-nowrap ${
                      tieneAlertas
                        ? 'border-red-500/30 bg-red-500/10 text-red-400'
                        : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    }`}>
                      Riesgo: {tieneAlertas ? 'ALTO' : 'ESTABLE'}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    {[
                      { label: 'Ubicación Principal',  value: cliente.direccion || '—' },
                      { label: 'Tipo de Cliente',       value: 'B2B / Industrial' },
                      { label: 'Estado en Sistema',     value: 'Activo', color: 'text-emerald-400' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="rounded-xl border border-white/[0.06] bg-black/20 p-3.5">
                        <div className="font-mono text-[9px] uppercase tracking-widest text-neutral-600 mb-1">{label}</div>
                        <div className={`text-sm font-semibold ${color || 'text-neutral-300'}`}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2 · CONTACTOS ───────────────────────────────────────────── */}
              {tab === 'contactos' && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-white/[0.06] bg-black/20 p-5">
                    <div className="mb-4 flex items-center gap-3 border-b border-white/[0.05] pb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10 text-lg font-black text-cyan-300">
                        {cliente.contacto_nombre ? cliente.contacto_nombre.charAt(0).toUpperCase() : 'C'}
                      </div>
                      <div>
                        <div className="font-semibold text-neutral-200">{cliente.contacto_nombre || 'Contacto Principal'}</div>
                        <div className="text-xs text-neutral-600">Responsable Comercial / Operativo</div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 text-sm">
                      {[
                        { label: 'Email',    value: cliente.email    || '—' },
                        { label: 'Teléfono', value: cliente.telefono || '—' },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between gap-3">
                          <span className="text-neutral-600">{label}</span>
                          <span className="font-medium text-neutral-300">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-white/[0.07] bg-white/[0.01] p-5 text-center text-sm text-neutral-700 transition-colors hover:border-white/[0.12] hover:bg-white/[0.03] hover:text-neutral-400">
                    + Agregar nuevo contacto
                  </div>
                </div>
              )}

              {/* 3 · COMERCIAL ───────────────────────────────────────────── */}
              {tab === 'comercial' && (
                <div className="flex flex-col gap-6 lg:flex-row">
                  <div className="flex-1">
                    <Section label={`Leads & Oportunidades (${leads.length})`} badge="real">
                      {leads.length === 0 ? (
                        <div className="text-sm text-neutral-600">Sin leads.</div>
                      ) : (
                        <div className="flex max-h-[350px] flex-col gap-2 overflow-y-auto pr-2">
                          {leads.map(l => (
                            <div key={l.id} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/20 p-3">
                              <div>
                                <div className="font-semibold text-sm text-neutral-200">{l.empresa || l.nombre || '—'}</div>
                                <div className="text-xs text-neutral-600 mt-0.5">{l.pipeline} — {fmtFecha(l.ultimo_contacto)}</div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <Badge variant="default">{l.estado}</Badge>
                                <span className={`inline-flex h-5 w-5 items-center justify-center rounded border text-[9px] font-black ${PROP_STYLE[l.lead_grade] || 'bg-white/5 text-neutral-600 border-white/10'}`}>{l.lead_grade}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Section>
                  </div>
                  <div className="flex-1">
                    <Section label={`Cotizaciones (${cotizaciones.length})`} badge="real">
                      {cotizaciones.length === 0 ? (
                        <div className="text-sm text-neutral-600">Sin cotizaciones.</div>
                      ) : (
                        <div className="flex max-h-[350px] flex-col gap-2 overflow-y-auto pr-2">
                          {cotizaciones.map(c => (
                            <div key={c.id} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/20 p-3">
                              <div>
                                <div className="font-mono text-[10px] text-neutral-600 mb-0.5">{fmtFecha(c.created_at)}</div>
                                <div className="font-semibold text-sm text-neutral-200">{c.numero_cotizacion || '—'}</div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <Badge variant={ESTADO_COT_BADGE[c.estado] || 'default'}>{c.estado}</Badge>
                                <span className="font-mono text-sm font-bold text-neutral-200">{formatUSD(c.total_usd)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Section>
                  </div>
                </div>
              )}

              {/* 4 · FACTURACIÓN ─────────────────────────────────────────── */}
              {tab === 'facturacion' && (
                <div className="max-h-[400px] overflow-y-auto">
                  {transacciones.length === 0 ? (
                    <EmptyState icon="🧾" title="Sin facturación" desc="Este cliente aún no registra transacciones o comprobantes facturados." />
                  ) : (
                    <table className="w-full text-left">
                      <thead className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#07090d]">
                        <tr>
                          {['Fecha', 'Comprobante', 'Tipo', 'Monto', 'Estado'].map(h => (
                            <th key={h} className="pb-2 font-mono text-[9px] uppercase tracking-widest text-neutral-600">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {transacciones.map(t => (
                          <tr key={t.id} className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.02]">
                            <td className="py-3 pr-3 font-mono text-[10px] text-neutral-600">{fmtFecha(t.fecha_emision)}</td>
                            <td className="py-3 pr-3 font-mono text-sm text-neutral-200">{t.numero_comprobante || '—'}</td>
                            <td className="py-3 pr-3 text-xs text-neutral-500">{t.tipo_documento || '—'}</td>
                            <td className="py-3 pr-3 font-mono text-sm font-bold text-neutral-200">{formatUSD(t.monto_total_usd)}</td>
                            <td className="py-3">
                              <span className={`rounded border px-2 py-0.5 font-mono text-[9px] font-bold ${
                                t.estado_pago === 'pagado'    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' :
                                t.estado_pago === 'pendiente' ? 'border-red-500/30 bg-red-500/10 text-red-400' :
                                'border-white/[0.07] bg-white/[0.03] text-neutral-600'
                              }`}>{t.estado_pago || '—'}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* 5 · COBRANZAS ───────────────────────────────────────────── */}
              {tab === 'cobranzas' && (
                <div className="flex flex-col gap-5">
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                    <Kpi label="Saldo Deudor" value={formatUSD(kpis.deudaPendiente)} color={kpis.deudaPendiente > 0 ? 'text-red-400' : 'text-emerald-400'} badge="real" />
                    <Kpi label="Cond. de Pago" value="A 30 Días" sub="Habitual" badge="prep" />
                    <Kpi label="Límite Crédito" value={formatUSD(15000)} sub="Crédito aprobado" badge="prep" />
                    <div className="flex flex-col justify-center rounded-xl border border-white/[0.06] bg-black/20 p-3.5">
                      <div className="mb-1 font-mono text-[9px] uppercase tracking-widest text-neutral-600">Score Mora</div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded font-black text-xs ${
                          kpis.deudaPendiente > 5000 ? 'bg-red-500/20 text-red-400' :
                          kpis.deudaPendiente > 0    ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {kpis.deudaPendiente > 5000 ? 'C' : kpis.deudaPendiente > 0 ? 'B' : 'A'}
                        </span>
                        <span className="text-xs font-bold text-neutral-300">
                          {kpis.deudaPendiente > 5000 ? 'Riesgo Alto' : kpis.deudaPendiente > 0 ? 'Atrasos Leves' : 'Al Día'}
                        </span>
                      </div>
                    </div>
                    <Kpi label="Promedio Pago" value="18 días" sub="Últimos 12 meses" badge="prep" />
                  </div>

                  {kpis.deudaPendiente > 0 ? (
                    <Section label="Deuda Activa">
                      <div className="flex max-h-[250px] flex-col gap-2 overflow-y-auto pr-2">
                        {transacciones.filter(t => t.estado_pago === 'pendiente').map(t => (
                          <div key={t.id} className="flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/[0.04] p-3">
                            <div>
                              <div className="font-mono text-[10px] text-red-400/70 mb-0.5">{fmtFecha(t.fecha_emision)}</div>
                              <div className="font-semibold text-sm text-red-200">{t.numero_comprobante || 'Documento Pendiente'}</div>
                            </div>
                            <div className="font-mono text-sm font-bold text-red-400">{formatUSD(t.monto_total_usd)}</div>
                          </div>
                        ))}
                      </div>
                    </Section>
                  ) : (
                    <EmptyState icon="✅" title="Cliente al día" desc="No se registran comprobantes pendientes de pago." />
                  )}
                </div>
              )}

              {/* 6 · FINANCIERO ──────────────────────────────────────────── */}
              {tab === 'financiero' && (() => {
                const estadoCliente = kpis.deudaPendiente > 5000 ? 'moroso'
                  : kpis.deudaPendiente > 1000 ? 'riesgoso'
                  : kpis.facturadoTotal > 10000 ? 'estratégico'
                  : 'normal'

                const ESTADO_BADGE = {
                  normal:       'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
                  estratégico:  'border-cyan-400/30 bg-cyan-400/10 text-cyan-300',
                  riesgoso:     'border-yellow-500/30 bg-yellow-500/10 text-yellow-300',
                  moroso:       'border-red-500/30 bg-red-500/10 text-red-300',
                }
                const scoreLabel = { normal: 'SIN MORA', estratégico: 'CLIENTE VIP', riesgoso: 'RIESGO MODERADO', moroso: 'MOROSO' }

                const factPend = kpis.deudaPendiente
                const facturasPendientes = transacciones.filter(t => t.estado_pago === 'pendiente')
                const facturasCobradas = transacciones.filter(t => ['cobrado', 'pagado'].includes(t.estado_pago))
                const facturasVencidas = facturasPendientes.filter(t => {
                  if (!t.fecha_emision) return false
                  const dias = Math.floor((new Date() - new Date(t.fecha_emision)) / 86400000)
                  return dias > 30
                })
                const totalCobrado = facturasCobradas.reduce((s, t) => s + Number(t.monto_total_usd || 0), 0)
                const ultimoPago = facturasCobradas
                  .filter(t => t.fecha_cobro || t.fecha_emision)
                  .sort((a, b) => new Date(b.fecha_cobro || b.fecha_emision) - new Date(a.fecha_cobro || a.fecha_emision))[0]
                const creditoBase = Math.max(kpis.facturadoTotal || 0, factPend + totalCobrado, 1)
                const creditoUsado = Math.min(Math.round((factPend / creditoBase) * 100), 100)

                return (
                  <div className="flex flex-col gap-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-xs font-bold ${ESTADO_BADGE[estadoCliente]}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {estadoCliente.toUpperCase()}
                      </span>
                      <span className="font-mono text-xs text-neutral-600">{scoreLabel[estadoCliente]}</span>
                    </div>

                    <Section label="A — Condiciones de Pago" badge="prep">
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                        {[
                          ['Forma habitual',  'Transferencia / Cheque'],
                          ['Plazo promedio',  '30 días'],
                          ['Moneda',          'ARS / USD mixto'],
                          ['Límite de crédito', formatUSD(50000)],
                          ['Cond. IVA',        cliente.condicion_iva || '—'],
                          ['Observaciones',    'Base preparada'],
                        ].map(([k, v]) => (
                          <div key={k} className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                            <div className="font-mono text-[9px] uppercase tracking-widest text-neutral-600 mb-0.5">{k}</div>
                            <div className="text-sm font-medium text-neutral-300">{v}</div>
                          </div>
                        ))}
                      </div>
                    </Section>

                    <Section label="B — KPIs Financieros" badge="real">
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                        <Kpi label="Deuda actual" value={factPend > 0 ? formatUSD(factPend) : 'Sin deuda'} color={factPend > 0 ? 'text-red-400' : 'text-emerald-400'} badge="real" />
                        <Kpi label="Score mora" value={estadoCliente === 'moroso' ? 'ALTO' : estadoCliente === 'riesgoso' ? 'MEDIO' : 'BAJO'} color={estadoCliente === 'moroso' ? 'text-red-400' : estadoCliente === 'riesgoso' ? 'text-yellow-400' : 'text-emerald-400'} badge="real" />
                        <Kpi label="Último pago" value={ultimoPago ? fmtFecha(ultimoPago.fecha_cobro || ultimoPago.fecha_emision) : 'Sin pagos'} badge="real" />
                        <Kpi label="Facturas pendientes" value={facturasPendientes.length} color={facturasPendientes.length > 0 ? 'text-yellow-400' : 'text-emerald-400'} badge="real" />
                        <Kpi label="Facturas vencidas" value={facturasVencidas.length} color={facturasVencidas.length > 0 ? 'text-red-400' : 'text-emerald-400'} badge="real" />
                        <div className="flex flex-col gap-1.5 rounded-xl border border-white/[0.06] bg-black/20 p-3.5">
                          <div className="flex items-center justify-between">
                            <div className="font-mono text-[9px] uppercase tracking-widest text-neutral-600">Crédito usado</div>
                            <DataBadge type="prep" />
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                              <div className={`h-full rounded-full ${creditoUsado > 80 ? 'bg-red-500' : creditoUsado > 50 ? 'bg-yellow-500' : 'bg-emerald-500'}`} style={{ width: `${creditoUsado}%` }} />
                            </div>
                            <span className="font-mono text-xs font-bold text-neutral-300">{creditoUsado}%</span>
                          </div>
                        </div>
                      </div>
                    </Section>

                    <Section label="C — Cuenta corriente" badge="real">
                      <div className="flex flex-col gap-2">
                        {transacciones.length === 0 ? (
                          <EmptyState icon="🧾" title="Sin movimientos financieros" desc="Todavía no hay facturas, recibos o comprobantes vinculados a este cliente." />
                        ) : (
                          transacciones.slice(0, 8).map(t => (
                            <div key={t.id} className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                              t.estado_pago === 'pendiente' ? 'border-red-500/20 bg-red-500/[0.04]' : 'border-white/[0.06] bg-black/20'
                            }`}>
                              <div>
                                <div className="font-mono text-[10px] text-neutral-600">{fmtFecha(t.fecha_emision)}</div>
                                <div className="mt-0.5 text-sm font-medium text-neutral-300">
                                  {t.tipo_documento || 'Documento'} {t.numero_comprobante || ''}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={`font-mono text-sm font-bold ${t.estado_pago === 'pendiente' ? 'text-red-400' : 'text-emerald-400'}`}>
                                  {t.estado_pago === 'pendiente' ? '-' : '+'}{formatUSD(t.monto_total_usd)}
                                </span>
                                <span className={`rounded border px-2 py-0.5 font-mono text-[9px] uppercase ${
                                  t.estado_pago === 'pendiente' ? 'border-red-500/30 bg-red-500/10 text-red-400' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                                }`}>{t.estado_pago || '—'}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </Section>

                    <Section label="D — Últimos cobros" badge="real">
                      <div className="flex flex-col gap-2">
                        {facturasCobradas.length === 0 ? (
                          <EmptyState icon="💳" title="Sin cobros registrados" desc="No hay pagos cobrados asociados a este cliente en la base actual." />
                        ) : (
                          facturasCobradas.slice(0, 5).map(t => (
                            <div key={t.id} className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] px-4 py-3">
                              <div>
                                <div className="font-mono text-[10px] text-emerald-400/70">{fmtFecha(t.fecha_cobro || t.fecha_emision)}</div>
                                <div className="mt-0.5 text-sm font-medium text-emerald-100">{t.numero_comprobante || 'Cobro registrado'}</div>
                              </div>
                              <div className="font-mono text-sm font-bold text-emerald-400">{formatUSD(t.monto_total_usd)}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </Section>

                    <Section label="E — Alertas Financieras" badge="real">
                      <div className="flex flex-col gap-2">
                        {factPend > 0 && (
                          <div className="rounded-r-xl border-l-4 border-red-500 bg-red-500/[0.06] p-3">
                            <div className="font-bold text-sm text-red-400">Factura vencida</div>
                            <div className="mt-0.5 text-xs text-red-300/80">Deuda total: {formatUSD(factPend)} — Requiere gestión inmediata.</div>
                          </div>
                        )}
                        {facturasVencidas.length > 0 && (
                          <div className="rounded-r-xl border-l-4 border-orange-500 bg-orange-500/[0.06] p-3">
                            <div className="font-bold text-sm text-orange-400">Comprobantes vencidos</div>
                            <div className="mt-0.5 text-xs text-orange-300/80">{facturasVencidas.length} documento(s) superan los 30 días desde su emisión.</div>
                          </div>
                        )}
                        {creditoUsado > 80 && (
                          <div className="rounded-r-xl border-l-4 border-yellow-500 bg-yellow-500/[0.06] p-3">
                            <div className="font-bold text-sm text-yellow-400">Límite de crédito casi superado</div>
                            <div className="mt-0.5 text-xs text-yellow-300/80">Crédito utilizado al {creditoUsado}% del límite asignado.</div>
                          </div>
                        )}
                        {factPend === 0 && creditoUsado <= 80 && estadoCliente !== 'moroso' && facturasVencidas.length === 0 && (
                          <EmptyState icon="✅" title="Sin alertas financieras" desc="No se detectan anomalías financieras activas." />
                        )}
                      </div>
                    </Section>
                  </div>
                )
              })()}

              {/* 7 · ACTIVOS / FLOTA ─────────────────────────────────────── */}
              {tab === 'flota' && (
                <div className="flex max-h-[420px] flex-col gap-3 overflow-y-auto pr-2">
                  {flota.length === 0 ? (
                    <EmptyState icon="🚜" title="Sin equipos" desc="No hay activos o máquinas registradas para este cliente." />
                  ) : flota.map(m => {
                    const svc       = calcServiceState(m)
                    const scoreDisp = m.score_disponibilidad || 100
                    return (
                      <div
                        key={m.id}
                        onClick={() => setSelectedActivo(m)}
                        className="group flex cursor-pointer flex-col gap-4 rounded-xl border border-white/[0.06] bg-black/20 p-4 transition-colors hover:border-cyan-400/25 hover:bg-cyan-400/[0.03] md:flex-row md:justify-between"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="truncate font-semibold text-neutral-200 group-hover:text-cyan-300 transition-colors">
                              {m.nombre_unidad}
                            </span>
                            {m.tipo && (
                              <span className="shrink-0 rounded border border-white/[0.07] bg-white/[0.03] px-1.5 py-px font-mono text-[9px] text-neutral-600">
                                {m.tipo}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-neutral-600 truncate">
                            {[m.marca, m.modelo, m.anio].filter(Boolean).join(' · ')}
                            {m.patente && ` — ${m.patente}`}
                          </div>

                          {svc && (
                            <div className="mt-4 max-w-xs">
                              <div className="mb-1 flex justify-between font-mono text-[9px] text-neutral-600">
                                <span>Próximo Service</span>
                                <span className={svc.color === 'red' ? 'font-bold text-red-400' : svc.color === 'yellow' ? 'font-bold text-yellow-400' : 'text-emerald-400'}>
                                  {svc.estado === 'vencido' ? `VENCIDO ${Math.abs(svc.restantes).toFixed(0)}hs` : `${svc.restantes.toFixed(0)}hs restantes`}
                                </span>
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                                <div className={`h-full rounded-full ${SERVICE_BAR[svc.estado]}`} style={{ width: `${Math.min(svc.pct, 100)}%` }} />
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-right md:shrink-0">
                          {[
                            { label: 'Estado',        value: m.estado_operativo || 'Operativo', color: ESTADO_OP_COLOR[m.estado_operativo] || 'text-neutral-400' },
                            { label: 'Disponibilidad', value: `${scoreDisp}%`,                  color: scoreDisp < 80 ? 'text-red-400' : 'text-emerald-400' },
                            { label: 'Downtime',       value: `${m.tiempo_detenido_horas || 0} hs`, color: 'text-orange-400' },
                          ].map(({ label, value, color, badge }) => (
                            <div key={label} className="flex flex-col items-end">
                              <div className="flex items-center gap-1">
                                <div className="font-mono text-[9px] uppercase tracking-widest text-neutral-600">{label}</div>
                                {badge && <DataBadge type={badge} />}
                              </div>
                              <div className={`text-sm font-bold ${color}`}>{value}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* 8 · OTs ─────────────────────────────────────────────────── */}
              {tab === 'ots' && (
                <div className="max-h-[400px] overflow-y-auto pr-2">
                  {ots.length === 0 ? (
                    <EmptyState icon="🔧" title="Sin historial de servicios" desc="No se han registrado órdenes de trabajo para los equipos de este cliente." />
                  ) : (
                    <table className="w-full text-left">
                      <thead className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#07090d]">
                        <tr>
                          {['OT', 'Equipo', 'Ingreso', 'Estado', 'Total USD'].map(h => (
                            <th key={h} className="pb-2 font-mono text-[9px] uppercase tracking-widest text-neutral-600">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {ots.map(o => (
                          <tr key={o.id} className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.02]">
                            <td className="py-3 pr-3 font-mono text-sm text-neutral-200">{o.numero_ot || '—'}</td>
                            <td className="py-3 pr-3 max-w-[150px] truncate text-sm font-medium text-neutral-300">{o.maquina?.nombre_unidad || '—'}</td>
                            <td className="py-3 pr-3 font-mono text-[10px] text-neutral-600">{fmtFecha(o.fecha_ingreso)}</td>
                            <td className="py-3 pr-3"><Badge variant={ESTADO_OT_BADGE[o.estado] || 'default'}>{o.estado}</Badge></td>
                            <td className="py-3 font-mono text-sm font-bold text-neutral-200">{formatUSD(o.total_usd)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* 9 · RECLAMOS ────────────────────────────────────────────── */}
              {tab === 'garantias' && (
                <EmptyState icon="🛡️" title="Sin incidencias activas" desc="El sistema no registra reclamos abiertos ni garantías ejecutadas recientemente." />
              )}

              {/* 10 · RENTABILIDAD ───────────────────────────────────────── */}
              {tab === 'rentabilidad' && (() => {
                const ingresosServicios = ots.filter(o => ['completada','facturada'].includes(o.estado))
                  .reduce((s, o) => s + Number(o.total_usd || 0), 0)
                const ingresosTotal = kpis.facturadoTotal || ingresosServicios
                const costoTotal    = totalCostoServicios
                const margenBruto   = ingresosTotal - costoTotal
                const margenPct     = ingresosTotal > 0 ? ((margenBruto / ingresosTotal) * 100).toFixed(1) : 0
                const deuda         = kpis.deudaPendiente || 0

                const riesgoNegocio = margenPct < 10 ? 'bajo_retorno'
                  : deuda > ingresosTotal * 0.3 ? 'riesgoso'
                  : ingresosTotal > 10000 ? 'alto_valor'
                  : 'estable'

                const RIESGO_BADGE = {
                  alto_valor:   { label: 'ALTO VALOR',   cls: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300' },
                  estable:      { label: 'ESTABLE',       cls: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' },
                  riesgoso:     { label: 'RIESGOSO',      cls: 'border-red-500/30 bg-red-500/10 text-red-300' },
                  bajo_retorno: { label: 'BAJO RETORNO',  cls: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300' },
                }
                const badge = RIESGO_BADGE[riesgoNegocio]

                const eventos = []
                transacciones.forEach(t => {
                  if (t.estado_pago === 'cobrado' && t.fecha_cobro)
                    eventos.push({ tipo: 'cobro', label: `Cobro: ${t.tipo_documento || 'Recibo'}`, fechaRaw: new Date(t.fecha_cobro), fecha: fmtFecha(t.fecha_cobro), valor: t.monto_total_usd, color: 'text-blue-400', dot: 'bg-blue-500' })
                  eventos.push({ tipo: 'factura', label: `Emisión: ${t.tipo_documento || 'Factura'} ${t.numero_comprobante || ''}`, fechaRaw: new Date(t.fecha_emision), fecha: fmtFecha(t.fecha_emision), valor: t.monto_total_usd, color: 'text-emerald-400', dot: 'bg-emerald-500' })
                  if (t.estado_pago === 'pendiente') {
                    const dias = Math.floor((new Date() - new Date(t.fecha_emision)) / 86400000)
                    if (dias > 30) eventos.push({ tipo: 'mora', label: `Deuda vencida (${dias}d)`, fechaRaw: new Date(t.fecha_emision), fecha: fmtFecha(t.fecha_emision), valor: -t.monto_total_usd, color: 'text-red-400', dot: 'bg-red-500' })
                  }
                })
                ots.filter(o => ['completada','facturada'].includes(o.estado)).forEach(o =>
                  eventos.push({ tipo: 'ot', label: `OT #${o.numero_ot}${o.maquina?.nombre_unidad ? ` — ${o.maquina.nombre_unidad}` : ''}`, fechaRaw: new Date(o.fecha_ingreso), fecha: fmtFecha(o.fecha_ingreso), valor: o.total_usd || 0, color: 'text-cyan-400', dot: 'bg-cyan-400' })
                )
                const TIMELINE_ECO = eventos.sort((a, b) => b.fechaRaw - a.fechaRaw).slice(0, 20)

                return (
                  <div className="flex flex-col gap-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-xs font-bold ${badge.cls}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />{badge.label}
                      </span>
                      <span className="font-mono text-xs text-neutral-600">{ots.length} OTs · {flota.length} activos</span>
                    </div>

                    <Section label="A — Ingresos Históricos" badge="real">
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        {[
                          { label: 'Ventas / Servicios', value: ingresosTotal, real: true,  color: 'text-emerald-400' },
                          { label: 'Alquileres',          value: 0,            real: false, color: 'text-blue-400' },
                          { label: 'Repuestos vendidos',  value: totalRepuestos, real: true, color: 'text-orange-400' },
                          { label: 'Otros ingresos',      value: 0,            real: false, color: 'text-cyan-400' },
                        ].map(({ label, value, real, color }) => (
                          <div key={label} className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                            <div className="mb-1 font-mono text-[9px] uppercase tracking-widest text-neutral-600">{label}</div>
                            <div className={`text-lg font-black ${real && value > 0 ? color : 'text-neutral-700'}`}>
                              {real && value > 0 ? formatUSD(value) : <DataBadge type="prep" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Section>

                    <Section label="B — Cobros e Historial" badge="real">
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                        <Kpi label="Deuda pendiente" value={deuda > 0 ? formatUSD(deuda) : 'Sin deuda'} color={deuda > 0 ? 'text-red-400' : 'text-emerald-400'} badge="real" />
                        <div className="flex flex-col gap-1 rounded-xl border border-white/[0.06] bg-black/20 p-3.5">
                          <div className="font-mono text-[9px] uppercase tracking-widest text-neutral-600">Mora histórica</div>
                          <DataBadge type="prep" />
                        </div>
                        <div className="flex flex-col gap-1 rounded-xl border border-white/[0.06] bg-black/20 p-3.5">
                          <div className="font-mono text-[9px] uppercase tracking-widest text-neutral-600">Cumplimiento pago</div>
                          <DataBadge type="prep" />
                        </div>
                      </div>
                    </Section>

                    <Section label="C — Margen del Cliente" badge="real">
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-3">
                          <div className="mb-0.5 font-mono text-[9px] uppercase tracking-widest text-emerald-500/70">Ingreso total</div>
                          <div className="text-xl font-black text-emerald-400">{formatUSD(ingresosTotal)}</div>
                        </div>
                        <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-3">
                          <div className="mb-0.5 font-mono text-[9px] uppercase tracking-widest text-red-500/70">Costo total</div>
                          <div className="text-xl font-black text-red-400">{formatUSD(costoTotal)}</div>
                          <div className="mt-0.5 text-[10px] text-neutral-600">Rep: {formatUSD(totalRepuestos)} · MO: {formatUSD(totalManoObra)}</div>
                        </div>
                        <div className={`rounded-xl border p-3 ${margenBruto >= 0 ? 'border-cyan-400/20 bg-cyan-400/[0.04]' : 'border-red-500/20 bg-red-500/[0.04]'}`}>
                          <div className={`mb-0.5 font-mono text-[9px] uppercase tracking-widest ${margenBruto >= 0 ? 'text-cyan-500/70' : 'text-red-500/70'}`}>Margen bruto</div>
                          <div className={`text-xl font-black ${margenBruto >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>{formatUSD(margenBruto)}</div>
                        </div>
                        <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                          <div className="mb-0.5 font-mono text-[9px] uppercase tracking-widest text-neutral-600">Margen %</div>
                          <div className={`text-xl font-black ${Number(margenPct) >= 20 ? 'text-emerald-400' : Number(margenPct) >= 10 ? 'text-yellow-400' : 'text-red-400'}`}>{margenPct}%</div>
                          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                            <div className={`h-full rounded-full ${Number(margenPct) >= 20 ? 'bg-emerald-500' : Number(margenPct) >= 10 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${Math.min(Math.abs(Number(margenPct)), 100)}%` }} />
                          </div>
                        </div>
                      </div>
                    </Section>

                    <Section label="D — Riesgo del Negocio" badge="real">
                      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-white/[0.06] bg-black/20 p-4">
                        <div className="flex-1 min-w-[200px]">
                          <div className="mb-1 font-semibold text-sm text-neutral-200">Evaluación comercial</div>
                          <div className="text-xs text-neutral-500">
                            {riesgoNegocio === 'alto_valor'  && 'Cliente estratégico con alta facturación y buen margen. Mantener relación y priorizar servicio.'}
                            {riesgoNegocio === 'estable'     && 'Cliente estable con pagos regulares y margen aceptable. Sin señales de alerta.'}
                            {riesgoNegocio === 'riesgoso'    && 'Alta deuda respecto a facturación. Evaluar condiciones de crédito antes de nuevos trabajos.'}
                            {riesgoNegocio === 'bajo_retorno'&& 'Margen muy bajo o nulo. Revisar precios o costos operativos asociados a este cliente.'}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 text-xs">
                          {[
                            { label: 'OTs completadas', value: ots.filter(o => ['completada','facturada'].includes(o.estado)).length },
                            { label: 'OTs pendientes',  value: ots.filter(o => !['completada','facturada','cancelada'].includes(o.estado)).length },
                            { label: 'Activos en flota', value: flota.length },
                          ].map(({ label, value }) => (
                            <div key={label} className="flex justify-between gap-4">
                              <span className="text-neutral-600">{label}</span>
                              <span className="font-bold text-neutral-200">{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Section>

                    <Section label="E — Timeline Económico" badge="real">
                      <div className="flex max-h-[200px] flex-col gap-2 overflow-y-auto pr-2">
                        {TIMELINE_ECO.length === 0 ? (
                          <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-4 text-center text-xs text-neutral-700">
                            Sin movimientos económicos recientes.
                          </div>
                        ) : TIMELINE_ECO.map((ev, i) => (
                          <div key={i} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-black/20 p-3">
                            <div className={`h-2 w-2 shrink-0 rounded-full ${ev.dot}`} />
                            <div className="flex-1 min-w-0">
                              <div className="truncate text-sm font-medium text-neutral-300">{ev.label}</div>
                              <div className="font-mono text-[10px] text-neutral-600">{ev.fecha}</div>
                            </div>
                            <div className={`shrink-0 font-mono text-sm font-bold ${ev.color}`}>
                              {ev.valor > 0 ? '+' : ''}{formatUSD(ev.valor)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Section>
                  </div>
                )
              })()}

              {/* 11 · TIMELINE ───────────────────────────────────────────── */}
              {tab === 'timeline' && (
                <div className="max-h-[500px] overflow-y-auto pr-2">
                  <Timeline360 clienteId={cliente.id} orgId={cliente.organization_id} />
                </div>
              )}

              {/* 12 · ALERTAS ────────────────────────────────────────────── */}
              {tab === 'alertas' && (
                <div className="flex max-h-[400px] flex-col gap-3 overflow-y-auto pr-2">
                  {!tieneAlertas ? (
                    <EmptyState icon="✅" title="Sin alertas críticas" desc="No se detectan anomalías comerciales ni operativas urgentes." />
                  ) : (
                    <>
                      {hayDeuda && (
                        <div className="rounded-r-xl border-l-4 border-red-500 bg-red-500/[0.06] p-4">
                          <div className="mb-1 font-bold text-red-400">Cobranza Crítica</div>
                          <div className="text-sm text-red-300/80">Deuda total de <strong>{formatUSD(kpis.deudaPendiente)}</strong> en transacciones pendientes.</div>
                        </div>
                      )}
                      {servicesCriticos.map(m => (
                        <div key={m.id} className="rounded-r-xl border-l-4 border-yellow-500 bg-yellow-500/[0.06] p-4">
                          <div className="mb-1 font-bold text-yellow-400">Mantenimiento Urgente: {m.nombre_unidad}</div>
                          <div className="text-sm text-yellow-300/80">El equipo ha superado su límite de horas operativo y requiere service preventivo inmediato.</div>
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
