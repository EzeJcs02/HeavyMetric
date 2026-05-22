import { useState } from 'react'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'

// ─── Mock Data ─── TODO: conectar con tablas SQL en próxima etapa
const MOCK_CAJAS = [
  { id: 1, nombre: 'Caja Fija (Mostrador)', saldo: 152000, moneda: 'ARS' },
  { id: 2, nombre: 'Caja Fuerte (Gerencia)', saldo: 4500, moneda: 'USD' },
]
const MOCK_BANCOS = [
  { id: 1, banco: 'Santander', cuenta: 'CC 000-12345/6', saldo: 1450000, moneda: 'ARS' },
  { id: 2, banco: 'Galicia', cuenta: 'CA 123-45678/9', saldo: 2300, moneda: 'USD' },
]
const MOCK_CHEQUES_RECIBIDOS = [
  { id: 1, banco: 'Macro', numero: '00123456', importe: 250000, vencimiento: '2026-06-15', estado: 'en_cartera', emisor: 'Constructora Sur S.A.', moneda: 'ARS' },
  { id: 2, banco: 'BBVA', numero: '00987654', importe: 120000, vencimiento: '2026-05-25', estado: 'depositado', emisor: 'Vialidad Provincial', moneda: 'ARS' },
  { id: 3, banco: 'Nación', numero: '00555555', importe: 500000, vencimiento: '2026-05-30', estado: 'en_cartera', emisor: 'Transportes Hnos.', moneda: 'ARS' },
]
const MOCK_CHEQUES_EMITIDOS = [
  { id: 1, banco: 'Macro', numero: '00234501', importe: 180000, vencimiento: '2026-06-10', estado: 'emitido', beneficiario: 'Repuestos Sur S.A.', moneda: 'ARS' },
  { id: 2, banco: 'Santander', numero: '00876543', importe: 3200, vencimiento: '2026-05-29', estado: 'por_debitar', beneficiario: 'Proveedor USA Parts', moneda: 'USD' },
]
const MOCK_COBRANZAS = [
  { id: 1, cliente: 'Constructora Sur S.A.', factura: 'FC-00123', importe: 450000, vencimiento: '2026-05-28', estado: 'vencida', moneda: 'ARS' },
  { id: 2, cliente: 'Vialidad Provincial', factura: 'FC-00118', importe: 6500, vencimiento: '2026-06-15', estado: 'pendiente', moneda: 'USD' },
  { id: 3, cliente: 'Transportes Hnos.', factura: 'FC-00130', importe: 320000, vencimiento: '2026-06-30', estado: 'pendiente', moneda: 'ARS' },
]
const MOCK_PAGOS_PROXIMOS = [
  { id: 1, proveedor: 'Repuestos Sur S.A.', concepto: 'OC #4521 — Filtros', importe: 180000, vencimiento: '2026-06-05', estado: 'programado', moneda: 'ARS' },
  { id: 2, proveedor: 'USA Parts Intl.', concepto: 'E-Cheq USD', importe: 3200, vencimiento: '2026-05-29', estado: 'urgente', moneda: 'USD' },
  { id: 3, proveedor: 'Lubricentro Central', concepto: 'Aceites y aditivos', importe: 95000, vencimiento: '2026-06-18', estado: 'programado', moneda: 'ARS' },
]
const FLUJO_PROYECTADO = [
  { label: '7 días',  cobrar: 120000, pagar: 183200, saldo: -63200 },
  { label: '15 días', cobrar: 570000, pagar: 183200, saldo: 386800 },
  { label: '30 días', cobrar: 770000, pagar: 275000, saldo: 495000 },
  { label: '60 días', cobrar: 770000, pagar: 275000, saldo: 495000 },
  { label: '90 días', cobrar: 770000, pagar: 275000, saldo: 495000 },
]

export default function Tesoreria() {
  const [tab, setTab] = useState('resumen')

  const totalCajaArs = MOCK_CAJAS.reduce((s, c) => s + (c.moneda === 'ARS' ? c.saldo : 0), 0)
  const totalBancosArs = MOCK_BANCOS.reduce((s, c) => s + (c.moneda === 'ARS' ? c.saldo : 0), 0)
  const totalChequesCartera = MOCK_CHEQUES_RECIBIDOS.filter(c => c.estado === 'en_cartera').reduce((s, c) => s + c.importe, 0)
  const totalACobrar = MOCK_COBRANZAS.reduce((s, c) => s + (c.moneda === 'ARS' ? c.importe : c.importe * 1000), 0)
  const totalAPagar = MOCK_PAGOS_PROXIMOS.reduce((s, p) => s + (p.moneda === 'ARS' ? p.importe : p.importe * 1000), 0)
  const saldoProyectado = totalCajaArs + totalBancosArs + totalChequesCartera + totalACobrar - totalAPagar
  const chequesProximos = [...MOCK_CHEQUES_RECIBIDOS, ...MOCK_CHEQUES_EMITIDOS].filter(c => {
    const dias = Math.ceil((new Date(c.vencimiento + 'T00:00:00') - new Date()) / (1000*60*60*24))
    return dias >= 0 && dias <= 15
  }).length

  const fmtArs = (v) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(v)
  const fmtUsd = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v)
  const fmtMoneda = (importe, moneda) => moneda === 'USD' ? fmtUsd(importe) : fmtArs(importe)
  const fmtFecha = (d) => new Date(d + 'T00:00:00').toLocaleDateString('es-AR', { day:'2-digit', month:'short' })

  const TABS = [
    ['resumen', 'RESUMEN'],
    ['cajas', 'CAJAS & BANCOS'],
    ['cheques_recibidos', 'CHEQUES RECIBIDOS'],
    ['cheques_emitidos', 'CHEQUES EMITIDOS'],
    ['cobranzas', 'COBRANZAS'],
    ['pagos', 'PAGOS PRÓXIMOS'],
    ['flujo', 'FLUJO PROYECTADO'],
    ['proyeccion', '📈 PROYECCIÓN'],
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-hm-border pb-4">
        <div>
          <h1 className="text-2xl font-bold">Tesorería PYME</h1>
          <p className="text-sm text-hm-muted mt-1">Control de caja, bancos, valores, cobranzas y flujo de caja.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">+ Nuevo Ingreso</Button>
          <Button variant="outline">+ Nuevo Egreso</Button>
        </div>
      </div>

      <div className="bg-hm-accent/10 border border-hm-accent/30 text-hm-accent text-xs p-3 rounded-lg font-mono">
        MODO DEMO — Datos simulados (Mock). Próxima etapa: conexión con motor SQL para asentar pagos, cobros y valores reales.
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-hm-border overflow-x-auto no-scrollbar">
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-3 py-2 text-xs font-mono font-bold border-b-2 transition-all whitespace-nowrap ${tab === k ? 'border-hm-accent text-hm-accent' : 'border-transparent text-hm-muted hover:text-hm-text'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* ── RESUMEN ── */}
      {tab === 'resumen' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Total Caja (ARS)', value: fmtArs(totalCajaArs), color: 'border-l-green-500' },
              { label: 'Total Bancos (ARS)', value: fmtArs(totalBancosArs), color: 'border-l-blue-500' },
              { label: 'Cheques en Cartera', value: fmtArs(totalChequesCartera), color: 'border-l-yellow-500' },
              { label: 'Total a Cobrar', value: fmtArs(totalACobrar), color: 'border-l-orange-500' },
              { label: 'Total a Pagar', value: fmtArs(totalAPagar), color: 'border-l-red-500' },
            ].map(({ label, value, color }) => (
              <Card key={label} className={`p-5 border-l-4 ${color}`}>
                <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-1">{label}</div>
                <div className="text-xl font-bold">{value}</div>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className={`p-5 ${saldoProyectado >= 0 ? 'bg-green-500/5 border-green-500/30' : 'bg-red-500/5 border-red-500/30'}`}>
              <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-1">Saldo Proyectado 30d</div>
              <div className={`text-2xl font-black ${saldoProyectado >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtArs(saldoProyectado)}</div>
            </Card>
            <Card className="p-5">
              <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-1">Cheques Próx. Vencer</div>
              <div className={`text-2xl font-black ${chequesProximos > 0 ? 'text-orange-400' : 'text-green-400'}`}>{chequesProximos}</div>
              <div className="text-[10px] text-hm-muted mt-1">en los próx. 15 días</div>
            </Card>
            <Card className="p-5">
              <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-1">Facturas Vencidas</div>
              <div className={`text-2xl font-black ${MOCK_COBRANZAS.filter(c => c.estado === 'vencida').length > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {MOCK_COBRANZAS.filter(c => c.estado === 'vencida').length}
              </div>
            </Card>
            <Card className="p-5">
              <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-1">Pagos Vencidos</div>
              <div className={`text-2xl font-black ${MOCK_PAGOS_PROXIMOS.filter(p => p.estado === 'urgente').length > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {MOCK_PAGOS_PROXIMOS.filter(p => p.estado === 'urgente').length}
              </div>
            </Card>
          </div>

          {/* Alertas banner */}
          <div className="flex flex-col gap-2">
            {MOCK_COBRANZAS.some(c => c.estado === 'vencida') && (
              <div className="bg-red-500/10 border-l-4 border-red-500 rounded-r-lg p-3 flex justify-between items-center">
                <div>
                  <div className="text-red-400 font-bold text-sm">⚠️ Facturas de clientes vencidas</div>
                  <div className="text-xs text-red-200 mt-0.5">Hay cobranzas vencidas. Gestionar urgente.</div>
                </div>
              </div>
            )}
            {MOCK_PAGOS_PROXIMOS.some(p => p.estado === 'urgente') && (
              <div className="bg-orange-500/10 border-l-4 border-orange-500 rounded-r-lg p-3">
                <div className="text-orange-400 font-bold text-sm">📅 Pagos urgentes próximos</div>
                <div className="text-xs text-orange-200 mt-0.5">Verificar disponibilidad para los pagos inminentes.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CAJAS & BANCOS ── */}
      {tab === 'cajas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b border-hm-border bg-hm-surface2/30">
              <h3 className="font-bold font-mono uppercase tracking-widest text-xs">Cajas Físicas</h3>
            </div>
            {MOCK_CAJAS.map(c => (
              <div key={c.id} className="p-4 border-b border-hm-border/50 flex justify-between items-center hover:bg-hm-surface2/20">
                <div className="font-medium text-sm">{c.nombre}</div>
                <div className="font-bold font-mono">{c.moneda === 'ARS' ? fmtArs(c.saldo) : fmtUsd(c.saldo)}</div>
              </div>
            ))}
          </Card>
          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b border-hm-border bg-hm-surface2/30">
              <h3 className="font-bold font-mono uppercase tracking-widest text-xs">Cuentas Bancarias</h3>
            </div>
            {MOCK_BANCOS.map(b => (
              <div key={b.id} className="p-4 border-b border-hm-border/50 flex justify-between items-center hover:bg-hm-surface2/20">
                <div>
                  <div className="font-medium text-sm">{b.banco}</div>
                  <div className="text-xs text-hm-muted font-mono">{b.cuenta}</div>
                </div>
                <div className="font-bold font-mono text-blue-400">{b.moneda === 'ARS' ? fmtArs(b.saldo) : fmtUsd(b.saldo)}</div>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* ── CHEQUES RECIBIDOS ── */}
      {tab === 'cheques_recibidos' && (
        <Card className="overflow-hidden p-0">
          <div className="p-4 border-b border-hm-border bg-hm-surface2/30">
            <h3 className="font-bold font-mono uppercase tracking-widest text-xs">Cheques y E-Cheqs Recibidos (Cartera)</h3>
          </div>
          <table className="w-full text-left">
            <thead className="bg-hm-surface2/30 border-b border-hm-border">
              <tr>{['NRO','BANCO','EMISOR','VENCIMIENTO','IMPORTE','ESTADO'].map(h => (
                <th key={h} className="p-4 font-mono text-xs text-hm-muted">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {MOCK_CHEQUES_RECIBIDOS.map(c => {
                const dias = Math.ceil((new Date(c.vencimiento+'T00:00:00') - new Date()) / (1000*60*60*24))
                const urgente = dias <= 10 && dias >= 0
                return (
                  <tr key={c.id} className={`border-b border-hm-border/50 ${urgente ? 'bg-yellow-500/5' : 'hover:bg-hm-surface2/20'}`}>
                    <td className="p-4 font-mono text-xs">{c.numero}</td>
                    <td className="p-4 text-sm font-medium">{c.banco}</td>
                    <td className="p-4 text-sm text-hm-muted">{c.emisor}</td>
                    <td className={`p-4 font-mono text-xs ${urgente ? 'text-yellow-400 font-bold' : ''}`}>{fmtFecha(c.vencimiento)} {urgente && `(${dias}d)`}</td>
                    <td className="p-4 font-mono text-sm font-bold text-right">{fmtMoneda(c.importe, c.moneda)}</td>
                    <td className="p-4 text-center">
                      <span className={`text-[10px] font-mono border rounded px-2 py-0.5 uppercase ${c.estado === 'en_cartera' ? 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10' : 'border-blue-500/50 text-blue-400 bg-blue-500/10'}`}>
                        {c.estado.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* ── CHEQUES EMITIDOS ── */}
      {tab === 'cheques_emitidos' && (
        <Card className="overflow-hidden p-0">
          <div className="p-4 border-b border-hm-border bg-hm-surface2/30">
            <h3 className="font-bold font-mono uppercase tracking-widest text-xs">Cheques y E-Cheqs Emitidos (A Pagar)</h3>
          </div>
          <table className="w-full text-left">
            <thead className="bg-hm-surface2/30 border-b border-hm-border">
              <tr>{['NRO','BANCO','BENEFICIARIO','VENCIMIENTO','IMPORTE','ESTADO'].map(h => (
                <th key={h} className="p-4 font-mono text-xs text-hm-muted">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {MOCK_CHEQUES_EMITIDOS.map(c => {
                const dias = Math.ceil((new Date(c.vencimiento+'T00:00:00') - new Date()) / (1000*60*60*24))
                const urgente = dias <= 7 && dias >= 0
                return (
                  <tr key={c.id} className={`border-b border-hm-border/50 ${urgente ? 'bg-red-500/5' : 'hover:bg-hm-surface2/20'}`}>
                    <td className="p-4 font-mono text-xs">{c.numero}</td>
                    <td className="p-4 text-sm font-medium">{c.banco}</td>
                    <td className="p-4 text-sm text-hm-muted">{c.beneficiario}</td>
                    <td className={`p-4 font-mono text-xs ${urgente ? 'text-red-400 font-bold' : ''}`}>{fmtFecha(c.vencimiento)} {urgente && `(${dias}d)`}</td>
                    <td className="p-4 font-mono text-sm font-bold text-right">{fmtMoneda(c.importe, c.moneda)}</td>
                    <td className="p-4 text-center">
                      <span className={`text-[10px] font-mono border rounded px-2 py-0.5 uppercase ${c.estado === 'por_debitar' ? 'border-red-500/50 text-red-400 bg-red-500/10' : 'border-blue-500/50 text-blue-400 bg-blue-500/10'}`}>
                        {c.estado.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* ── COBRANZAS ── */}
      {tab === 'cobranzas' && (
        <Card className="overflow-hidden p-0">
          <div className="p-4 border-b border-hm-border bg-hm-surface2/30">
            <h3 className="font-bold font-mono uppercase tracking-widest text-xs">Cobranzas Pendientes (Por Cliente)</h3>
          </div>
          <table className="w-full text-left">
            <thead className="bg-hm-surface2/30 border-b border-hm-border">
              <tr>{['CLIENTE','FACTURA','VENCIMIENTO','IMPORTE','ESTADO'].map(h => (
                <th key={h} className="p-4 font-mono text-xs text-hm-muted">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {MOCK_COBRANZAS.map(c => (
                <tr key={c.id} className={`border-b border-hm-border/50 ${c.estado === 'vencida' ? 'bg-red-500/5' : 'hover:bg-hm-surface2/20'}`}>
                  <td className="p-4 text-sm font-medium">{c.cliente}</td>
                  <td className="p-4 font-mono text-xs text-hm-muted">{c.factura}</td>
                  <td className={`p-4 font-mono text-xs ${c.estado === 'vencida' ? 'text-red-400 font-bold' : ''}`}>{fmtFecha(c.vencimiento)}</td>
                  <td className="p-4 font-mono text-sm font-bold">{fmtMoneda(c.importe, c.moneda)}</td>
                  <td className="p-4">
                    <span className={`text-[10px] font-mono border rounded px-2 py-0.5 uppercase ${c.estado === 'vencida' ? 'border-red-500/50 text-red-400 bg-red-500/10' : 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10'}`}>
                      {c.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* ── PAGOS PRÓXIMOS ── */}
      {tab === 'pagos' && (
        <Card className="overflow-hidden p-0">
          <div className="p-4 border-b border-hm-border bg-hm-surface2/30">
            <h3 className="font-bold font-mono uppercase tracking-widest text-xs">Pagos Próximos (A Proveedores)</h3>
          </div>
          <table className="w-full text-left">
            <thead className="bg-hm-surface2/30 border-b border-hm-border">
              <tr>{['PROVEEDOR','CONCEPTO','VENCIMIENTO','IMPORTE','ESTADO'].map(h => (
                <th key={h} className="p-4 font-mono text-xs text-hm-muted">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {MOCK_PAGOS_PROXIMOS.map(p => (
                <tr key={p.id} className={`border-b border-hm-border/50 ${p.estado === 'urgente' ? 'bg-red-500/5' : 'hover:bg-hm-surface2/20'}`}>
                  <td className="p-4 text-sm font-medium">{p.proveedor}</td>
                  <td className="p-4 text-sm text-hm-muted">{p.concepto}</td>
                  <td className={`p-4 font-mono text-xs ${p.estado === 'urgente' ? 'text-red-400 font-bold' : ''}`}>{fmtFecha(p.vencimiento)}</td>
                  <td className="p-4 font-mono text-sm font-bold">{fmtMoneda(p.importe, p.moneda)}</td>
                  <td className="p-4">
                    <span className={`text-[10px] font-mono border rounded px-2 py-0.5 uppercase ${p.estado === 'urgente' ? 'border-red-500/50 text-red-400 bg-red-500/10' : 'border-blue-500/50 text-blue-400 bg-blue-500/10'}`}>
                      {p.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* ── FLUJO PROYECTADO ── */}
      {tab === 'flujo' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {FLUJO_PROYECTADO.map(f => (
              <Card key={f.label} className={`p-5 ${f.saldo >= 0 ? 'border-green-500/20' : 'border-red-500/30'}`}>
                <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-3">{f.label}</div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-green-400">+ Cobrar</span>
                    <span className="font-mono font-bold text-green-400">{fmtArs(f.cobrar)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-red-400">- Pagar</span>
                    <span className="font-mono font-bold text-red-400">{fmtArs(f.pagar)}</span>
                  </div>
                  <div className="border-t border-hm-border/50 pt-1.5 flex justify-between text-xs">
                    <span className="text-hm-muted font-bold">= Saldo</span>
                    <span className={`font-mono font-black ${f.saldo >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtArs(f.saldo)}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card className="p-5">
            <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-4">Representación Visual del Flujo (30 días)</div>
            <div className="h-40 flex items-end justify-around gap-4 p-4 bg-hm-surface2/10 border border-hm-border/30 rounded-xl">
              <div className="flex flex-col items-center gap-2 flex-1">
                <div className="w-full bg-green-500/70 rounded-t" style={{height:'80%'}} />
                <span className="text-[10px] font-mono text-green-400">+ Ingresos</span>
              </div>
              <div className="flex flex-col items-center gap-2 flex-1">
                <div className="w-full bg-red-500/70 rounded-t" style={{height:'35%'}} />
                <span className="text-[10px] font-mono text-red-400">- Egresos</span>
              </div>
              <div className="flex flex-col items-center gap-2 flex-1">
                <div className="w-full bg-hm-accent/70 rounded-t" style={{height:'55%'}} />
                <span className="text-[10px] font-mono text-hm-accent">= Flujo Neto</span>
              </div>
            </div>
            <div className="text-center text-xs text-hm-muted italic mt-3">
              Proyección basada en mock data. Próxima etapa: cálculo real desde facturas, OTs y compras.
            </div>
          </Card>
        </div>
      )}

      {/* ── PROYECCIÓN DE NEGOCIO ── */}
      {tab === 'proyeccion' && (() => {
        const saldo7  = FLUJO_PROYECTADO[0].saldo
        const saldo30 = FLUJO_PROYECTADO[2].saldo
        const presion = saldo7 < 0 ? 'alta' : saldo30 < 0 ? 'media' : 'baja'
        const PRESION_CONFIG = {
          alta:  { label: 'PRESIÓN ALTA', cls: 'bg-red-500/20 text-red-300 border-red-500/40', dot: 'bg-red-500 animate-pulse', desc: 'Los pagos próximos superan las cobranzas esperadas. Revisar liquidez inmediata.' },
          media: { label: 'PRESIÓN MEDIA', cls: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40', dot: 'bg-yellow-500', desc: 'Equilibrio frágil. Monitorear cobranzas y postergar pagos no urgentes si es posible.' },
          baja:  { label: 'FLUJO POSITIVO', cls: 'bg-green-500/20 text-green-300 border-green-500/40', dot: 'bg-green-500', desc: 'Posición financiera saludable. Cobranzas superan pagos próximos.' },
        }
        const pc = PRESION_CONFIG[presion]

        return (
          <div className="flex flex-col gap-6">
            {/* Semáforo de presión financiera */}
            <div className={`border rounded-xl p-5 ${pc.cls}`}>
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-3 h-3 rounded-full ${pc.dot}`} />
                <div className="font-bold text-sm">{pc.label}</div>
              </div>
              <div className="text-xs opacity-80">{pc.desc}</div>
            </div>

            {/* KPIs de caja estimada */}
            <div>
              <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-3">Caja estimada disponible</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: '7 días', value: saldo7, dias: 7 },
                  { label: '15 días', value: FLUJO_PROYECTADO[1].saldo, dias: 15 },
                  { label: '30 días', value: saldo30, dias: 30 },
                  { label: '90 días', value: FLUJO_PROYECTADO[4].saldo, dias: 90 },
                ].map(({ label, value }) => (
                  <div key={label} className={`rounded-xl p-4 border ${value >= 0 ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/10 border-red-500/30'}`}>
                    <div className="text-[9px] font-mono text-hm-muted uppercase mb-1">{label}</div>
                    <div className={`text-xl font-bold font-mono ${value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {value >= 0 ? '+' : ''}{fmtArs(value)}
                    </div>
                    <div className="text-[10px] text-hm-muted mt-0.5">{value >= 0 ? 'Flujo positivo' : 'Flujo negativo'}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cobranzas vs Pagos próximos */}
            <div>
              <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-3">Cobranzas vs Pagos (próximos 30 días)</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
                  <div className="text-[9px] font-mono text-green-400 uppercase mb-1">A cobrar</div>
                  <div className="text-2xl font-bold text-green-400">{fmtArs(totalACobrar)}</div>
                  <div className="text-xs text-hm-muted mt-1">{MOCK_COBRANZAS.length} facturas pendientes</div>
                </div>
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                  <div className="text-[9px] font-mono text-red-400 uppercase mb-1">A pagar</div>
                  <div className="text-2xl font-bold text-red-400">{fmtArs(totalAPagar)}</div>
                  <div className="text-xs text-hm-muted mt-1">{MOCK_PAGOS_PROXIMOS.length} pagos programados</div>
                </div>
                <div className={`border rounded-xl p-4 ${totalACobrar - totalAPagar >= 0 ? 'bg-hm-accent/5 border-hm-accent/20' : 'bg-red-500/10 border-red-500/30'}`}>
                  <div className={`text-[9px] font-mono uppercase mb-1 ${totalACobrar - totalAPagar >= 0 ? 'text-hm-accent' : 'text-red-400'}`}>Resultado neto</div>
                  <div className={`text-2xl font-bold ${totalACobrar - totalAPagar >= 0 ? 'text-hm-accent' : 'text-red-400'}`}>
                    {totalACobrar - totalAPagar >= 0 ? '+' : ''}{fmtArs(totalACobrar - totalAPagar)}
                  </div>
                </div>
              </div>
            </div>

            {/* Mini tabla flujo */}
            <div>
              <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-3">Detalle de flujo proyectado</div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-hm-border">
                      <th className="pb-2 font-mono text-hm-muted uppercase">Horizonte</th>
                      <th className="pb-2 font-mono text-green-400 uppercase">Cobrar</th>
                      <th className="pb-2 font-mono text-red-400 uppercase">Pagar</th>
                      <th className="pb-2 font-mono text-hm-accent uppercase">Flujo neto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FLUJO_PROYECTADO.map(r => (
                      <tr key={r.label} className="border-b border-hm-border/30">
                        <td className="py-2 font-mono text-hm-muted">{r.label}</td>
                        <td className="py-2 font-bold text-green-400">{fmtArs(r.cobrar)}</td>
                        <td className="py-2 font-bold text-red-400">{fmtArs(r.pagar)}</td>
                        <td className={`py-2 font-bold font-mono ${r.saldo >= 0 ? 'text-hm-accent' : 'text-red-400'}`}>
                          {r.saldo >= 0 ? '+' : ''}{fmtArs(r.saldo)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="text-xs text-hm-muted italic text-center mt-3">
                Proyección basada en mock data — TODO: conectar con facturas, OTs y compras reales
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
