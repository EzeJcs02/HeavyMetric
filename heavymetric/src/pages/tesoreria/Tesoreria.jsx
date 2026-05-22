import { useState } from 'react'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'

// Mock Data
const CAJAS = [
  { id: 1, nombre: 'Caja Fija (Mostrador)', saldo: 152000, moneda: 'ARS' },
  { id: 2, nombre: 'Caja Fuerte (Gerencia)', saldo: 4500, moneda: 'USD' },
]

const BANCOS = [
  { id: 1, banco: 'Santander', cuenta: 'CC 000-12345/6', saldo: 1450000, moneda: 'ARS' },
  { id: 2, banco: 'Galicia', cuenta: 'CA 123-45678/9', saldo: 2300, moneda: 'USD' },
]

const CHEQUES = [
  { id: 1, banco: 'Macro', numero: '00123456', importe: 250000, vencimiento: '2026-06-15', estado: 'en_cartera', emisor: 'Constructora Sur S.A.' },
  { id: 2, banco: 'BBVA', numero: '00987654', importe: 120000, vencimiento: '2026-05-25', estado: 'depositado', emisor: 'Vialidad Provincial' },
  { id: 3, banco: 'Nación', numero: '00555555', importe: 500000, vencimiento: '2026-05-30', estado: 'en_cartera', emisor: 'Transportes Hnos.' },
]

export default function Tesoreria() {
  const [tab, setTab] = useState('resumen')

  const totalCajaArs = CAJAS.reduce((s, c) => s + (c.moneda === 'ARS' ? c.saldo : 0), 0)
  const totalBancosArs = BANCOS.reduce((s, c) => s + (c.moneda === 'ARS' ? c.saldo : 0), 0)
  const totalCheques = CHEQUES.filter(c => c.estado === 'en_cartera').reduce((s, c) => s + c.importe, 0)
  
  const formatArs = (val) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val)
  const formatUsd = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-hm-border pb-4">
        <div>
          <h1 className="text-2xl font-bold">Tesorería PYME</h1>
          <p className="text-sm text-hm-muted mt-1">Control de caja, bancos, e-cheqs y valores.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">+ Nuevo Ingreso</Button>
          <Button variant="outline">+ Nuevo Egreso</Button>
        </div>
      </div>

      <div className="bg-hm-accent/10 border border-hm-accent/30 text-hm-accent text-xs p-3 rounded-lg font-mono">
        MODO DEMO: Este módulo está preparado con datos simulados (Mock Data). En una próxima etapa se conectará con el motor SQL para asentar pagos, cobros y transferencias.
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-hm-border overflow-x-auto no-scrollbar scroll-smooth">
        {[['resumen','RESUMEN GLOBAL'],['cajas','CAJAS & BANCOS'],['cheques','VALORES EN CARTERA']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-3 py-2 text-xs font-mono font-bold border-b-2 transition-all whitespace-nowrap ${tab===k ? 'border-hm-accent text-hm-accent' : 'border-transparent text-hm-muted hover:text-hm-text'}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'resumen' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-5 border-l-4 border-l-green-500">
              <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-1">Total Caja (Efectivo)</div>
              <div className="text-2xl font-bold">{formatArs(totalCajaArs)}</div>
            </Card>
            <Card className="p-5 border-l-4 border-l-blue-500">
              <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-1">Total Bancos</div>
              <div className="text-2xl font-bold">{formatArs(totalBancosArs)}</div>
            </Card>
            <Card className="p-5 border-l-4 border-l-yellow-500">
              <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-1">Cheques en Cartera</div>
              <div className="text-2xl font-bold">{formatArs(totalCheques)}</div>
            </Card>
            <Card className="p-5 bg-hm-surface2/50">
              <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-1">Disponibilidad Total</div>
              <div className="text-3xl font-black text-hm-accent">{formatArs(totalCajaArs + totalBancosArs + totalCheques)}</div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-5">
              <h3 className="text-sm font-bold mb-4 font-mono uppercase text-hm-muted tracking-widest">Ingresos y Egresos Proyectados (30 días)</h3>
              <div className="h-48 bg-hm-surface2/20 border border-hm-border/30 rounded flex items-end justify-around p-4">
                {/* Mock Chart */}
                <div className="w-16 bg-green-500/80 rounded-t h-[80%] flex items-start justify-center pt-2 text-[10px] font-bold">+ Ingresos</div>
                <div className="w-16 bg-red-500/80 rounded-t h-[40%] flex items-start justify-center pt-2 text-[10px] font-bold">- Egresos</div>
                <div className="w-16 bg-hm-accent/80 rounded-t h-[50%] flex items-start justify-center pt-2 text-[10px] font-bold">= Flujo</div>
              </div>
            </Card>
            <Card className="p-5">
              <h3 className="text-sm font-bold mb-4 font-mono uppercase text-hm-muted tracking-widest">Alerta de Vencimientos (Cheques propios y de 3ros)</h3>
              <div className="flex flex-col gap-2">
                {CHEQUES.map(c => (
                  <div key={c.id} className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex justify-between items-center">
                    <div>
                      <div className="text-xs text-red-300 font-mono mb-0.5">Vence: {new Date(c.vencimiento + 'T00:00:00').toLocaleDateString()}</div>
                      <div className="font-bold text-sm">{c.banco} — {c.emisor}</div>
                    </div>
                    <div className="text-lg font-bold">{formatArs(c.importe)}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === 'cajas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b border-hm-border bg-hm-surface2/30">
              <h3 className="font-bold font-mono uppercase tracking-widest text-xs">Cajas Físicas (Efectivo)</h3>
            </div>
            <div className="flex flex-col">
              {CAJAS.map(c => (
                <div key={c.id} className="p-4 border-b border-hm-border/50 flex justify-between items-center hover:bg-hm-surface2/20">
                  <div className="font-medium text-sm">{c.nombre}</div>
                  <div className="font-bold font-mono">{c.moneda === 'ARS' ? formatArs(c.saldo) : formatUsd(c.saldo)}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b border-hm-border bg-hm-surface2/30">
              <h3 className="font-bold font-mono uppercase tracking-widest text-xs">Cuentas Bancarias</h3>
            </div>
            <div className="flex flex-col">
              {BANCOS.map(b => (
                <div key={b.id} className="p-4 border-b border-hm-border/50 flex justify-between items-center hover:bg-hm-surface2/20">
                  <div>
                    <div className="font-medium text-sm">{b.banco}</div>
                    <div className="text-xs text-hm-muted font-mono">{b.cuenta}</div>
                  </div>
                  <div className="font-bold font-mono text-blue-400">{b.moneda === 'ARS' ? formatArs(b.saldo) : formatUsd(b.saldo)}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'cheques' && (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-left">
            <thead className="bg-hm-surface2/50 border-b border-hm-border">
              <tr>
                <th className="p-4 font-mono text-xs text-hm-muted">NRO</th>
                <th className="p-4 font-mono text-xs text-hm-muted">BANCO</th>
                <th className="p-4 font-mono text-xs text-hm-muted">EMISOR</th>
                <th className="p-4 font-mono text-xs text-hm-muted">VENCIMIENTO</th>
                <th className="p-4 font-mono text-xs text-hm-muted text-right">IMPORTE</th>
                <th className="p-4 font-mono text-xs text-hm-muted text-center">ESTADO</th>
              </tr>
            </thead>
            <tbody>
              {CHEQUES.map(c => (
                <tr key={c.id} className="border-b border-hm-border/50 hover:bg-hm-surface2/20">
                  <td className="p-4 font-mono text-xs">{c.numero}</td>
                  <td className="p-4 text-sm font-medium">{c.banco}</td>
                  <td className="p-4 text-sm text-hm-muted">{c.emisor}</td>
                  <td className="p-4 font-mono text-xs">{new Date(c.vencimiento + 'T00:00:00').toLocaleDateString()}</td>
                  <td className="p-4 font-mono text-sm font-bold text-right">{formatArs(c.importe)}</td>
                  <td className="p-4 text-center">
                    <span className={`text-[10px] font-mono border rounded px-2 py-0.5 uppercase ${c.estado === 'en_cartera' ? 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10' : 'border-blue-500/50 text-blue-400 bg-blue-500/10'}`}>
                      {c.estado.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
