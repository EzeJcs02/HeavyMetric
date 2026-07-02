import { useState } from 'react'
import Modal from '../../ui/Modal'
import Card from '../../ui/Card'
import Badge from '../../ui/Badge'
import { useDolar } from '../../../context/DolarContext'

const TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'workflow', label: 'Workflow & Estados' },
  { id: 'checklists', label: 'Checklists' },
  { id: 'evidencias', label: 'Evidencias & Firmas' },
  { id: 'repuestos', label: 'Repuestos' },
  { id: 'costos', label: 'Costos' },
  { id: 'timeline', label: 'Timeline' }
]

const ESTADOS = [
  'nueva', 'asignada', 'en_diagnostico', 'esperando_repuestos',
  'en_reparacion', 'en_prueba', 'finalizada', 'facturada', 'cerrada', 'cancelada'
]
// Removed mock checklists

export default function FichaOT({ isOpen, onClose, ot, onUpdateEstado }) {
  const [activeTab, setActiveTab] = useState('resumen')
  const { formatUSD } = useDolar()
  if (!isOpen || !ot) return null

  const renderTab = () => {
    switch (activeTab) {
      case 'resumen':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4 bg-hm-surface2/30">
                <div className="text-xs font-mono text-hm-muted mb-2">CLIENTE ASOCIADO</div>
                <div className="text-lg font-bold">{ot.cliente?.razon_social || 'Desconocido'}</div>
                <div className="text-sm text-hm-muted mt-1">Ver Cliente 360 ↗</div>
              </Card>
              <Card className="p-4 bg-hm-surface2/30">
                <div className="text-xs font-mono text-hm-muted mb-2">MÁQUINA / ACTIVO</div>
                <div className="text-lg font-bold">{ot.maquina?.nombre_unidad || 'Desconocida'}</div>
                <div className="text-sm text-hm-muted mt-1">{ot.maquina?.marca} {ot.maquina?.modelo}</div>
                <div className="text-sm text-hm-accent mt-1 cursor-pointer">Ver Ficha Activo 360 ↗</div>
              </Card>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-[#111] rounded border border-white/5">
                <div className="text-[10px] text-hm-muted font-mono mb-1">INGRESO</div>
                <div className="font-medium text-sm">{ot.fecha_ingreso}</div>
              </div>
              <div className="p-3 bg-[#111] rounded border border-white/5">
                <div className="text-[10px] text-hm-muted font-mono mb-1">ESTADO</div>
                <Badge variant="info">{ot.estado?.toUpperCase().replace('_', ' ')}</Badge>
              </div>
              <div className="p-3 bg-[#111] rounded border border-white/5">
                <div className="text-[10px] text-hm-muted font-mono mb-1">TOTAL REPUESTOS</div>
                <div className="font-bold text-sm text-hm-accent">{formatUSD(ot.total_repuestos_usd || 0)}</div>
              </div>
              <div className="p-3 bg-[#111] rounded border border-white/5">
                <div className="text-[10px] text-hm-muted font-mono mb-1">TOTAL MANO OBRA</div>
                <div className="font-bold text-sm text-green-400">{formatUSD(ot.total_mano_obra_usd || 0)}</div>
              </div>
            </div>
          </div>
        )
      
      case 'workflow':
        return (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-hm-muted font-mono uppercase">Cambio de Estado</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {ESTADOS.map(est => (
                <button
                  key={est}
                  onClick={() => onUpdateEstado && onUpdateEstado(ot.id, est)}
                  className={`p-3 text-xs font-bold rounded-lg border transition-all text-center ${
                    ot.estado === est 
                      ? 'bg-hm-accent/20 border-hm-accent text-hm-accent' 
                      : 'bg-hm-surface2 border-white/10 text-hm-muted hover:border-hm-accent/50'
                  }`}
                >
                  {est.replace(/_/g, ' ').toUpperCase()}
                </button>
              ))}
            </div>
            
            <Card className="p-4 bg-orange-500/5 border-orange-500/20 mt-6">
              <div className="flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <div className="text-sm font-bold text-orange-400">Atención: Máquina Detenida</div>
                  <div className="text-xs text-orange-400/70 mt-1">Al pasar a "Esperando Repuestos", el Activo marcará penalización en su Health Score Automáticamente.</div>
                </div>
              </div>
            </Card>
          </div>
        )

      case 'checklists':
        return (
          <div className="flex flex-col items-center justify-center p-10 text-center border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
            <span className="text-4xl mb-3">📋</span>
            <div className="text-sm font-bold text-neutral-300">Sin Checklists</div>
            <div className="text-xs text-neutral-500 mt-1">No hay checklists asociados a esta orden de trabajo.</div>
          </div>
        )

      case 'evidencias':
        return (
          <div className="flex flex-col items-center justify-center p-10 text-center border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
            <span className="text-4xl mb-3">📷</span>
            <div className="text-sm font-bold text-neutral-300">Sin Evidencias o Firmas</div>
            <div className="text-xs text-neutral-500 mt-1">No se han subido documentos o firmas para esta orden de trabajo.</div>
          </div>
        )

      case 'costos': {
        const repuestos   = Number(ot.total_repuestos_usd || 0)
        const manoObra    = Number(ot.total_mano_obra_usd || 0)
        const costoTotal  = repuestos + manoObra
        const estimado    = Number(ot.costo_estimado_usd || 0)
        const desvio      = estimado > 0 ? costoTotal - estimado : 0
        const desviosPct  = estimado > 0 ? ((desvio / estimado) * 100).toFixed(1) : null
        const facturado   = Number(ot.total_usd || 0)
        const margen      = facturado > 0 ? facturado - costoTotal : null
        const margenPct   = facturado > 0 && costoTotal > 0 ? (((facturado - costoTotal) / facturado) * 100).toFixed(1) : null

        // Alertas automáticas
        const esNoRentable    = margen !== null && margen < 0
        const esSobreCosto    = desvio > 0 && Number(desviosPct) > 20
        const diasAbierta     = ot.fecha_ingreso
          ? Math.floor((new Date() - new Date(ot.fecha_ingreso)) / (1000 * 60 * 60 * 24)) : 0
        const esDemorada      = diasAbierta > 7 && !['finalizada','facturada','cerrada','cancelada'].includes(ot.estado)

        return (
          <div className="space-y-5">
            {/* Alertas automáticas */}
            {(esNoRentable || esSobreCosto || esDemorada) && (
              <div className="flex flex-col gap-2">
                {esNoRentable && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <span className="text-red-400 text-sm">⚠️</span>
                    <span className="text-red-300 text-xs font-bold">OT NO RENTABLE — El costo supera el monto facturado</span>
                  </div>
                )}
                {esSobreCosto && (
                  <div className="flex items-center gap-2 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                    <span className="text-orange-400 text-sm">📈</span>
                    <span className="text-orange-300 text-xs font-bold">OT SOBRE COSTO — {desviosPct}% por encima del estimado</span>
                  </div>
                )}
                {esDemorada && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <span className="text-yellow-400 text-sm">⏱️</span>
                    <span className="text-yellow-300 text-xs font-bold">OT DEMORADA — {diasAbierta} días abierta sin cerrar</span>
                  </div>
                )}
              </div>
            )}

            {/* A) Mano de Obra */}
            <div>
              <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-2">A — Mano de Obra</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3">
                  <div className="text-[9px] font-mono text-green-400 uppercase mb-0.5">M.O. Facturada</div>
                  <div className="text-xl font-bold text-green-400">{formatUSD(manoObra)}</div>
                </div>
                <div className="bg-hm-surface2/20 border border-hm-border/40 rounded-lg p-3">
                  <div className="text-[9px] font-mono text-hm-muted uppercase mb-0.5">Horas trabajadas</div>
                  <div className="text-xl font-bold text-hm-muted/50">Base preparada</div>
                </div>
              </div>
            </div>

            {/* B) Repuestos */}
            <div>
              <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-2">B — Repuestos</div>
              <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 flex justify-between items-center">
                <div>
                  <div className="text-[9px] font-mono text-red-400 uppercase mb-0.5">Costo repuestos</div>
                  <div className="text-xl font-bold text-red-400">{formatUSD(repuestos)}</div>
                </div>
                {repuestos > 0 && (
                  <div className="text-right">
                    <div className="text-[9px] font-mono text-hm-muted uppercase mb-0.5">% del costo</div>
                    <div className="text-base font-bold text-red-400">{costoTotal > 0 ? Math.round((repuestos/costoTotal)*100) : 0}%</div>
                  </div>
                )}
              </div>
            </div>

            {/* C) Tiempo */}
            <div>
              <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-2">C — Tiempo</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-hm-surface2/20 border border-hm-border/40 rounded-lg p-3">
                  <div className="text-[9px] font-mono text-hm-muted uppercase mb-0.5">Días abierta</div>
                  <div className={`text-xl font-bold ${esDemorada ? 'text-yellow-400' : 'text-hm-text'}`}>{diasAbierta}d</div>
                </div>
                <div className="bg-hm-surface2/20 border border-hm-border/40 rounded-lg p-3">
                  <div className="text-[9px] font-mono text-hm-muted uppercase mb-0.5">Fecha ingreso</div>
                  <div className="text-sm font-bold">{ot.fecha_ingreso || 'Sin datos'}</div>
                </div>
              </div>
            </div>

            {/* D) Costo total + Desvío */}
            <div>
              <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-2">D — Costo Total vs Estimado</div>
              <div className="bg-gradient-to-br from-[#111] to-[#0a0a0a] border border-white/5 rounded-xl p-5">
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-3 border-b border-white/5">
                    <span className="text-hm-muted text-sm">Costo Repuestos</span>
                    <span className="font-bold">{formatUSD(repuestos)}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-white/5">
                    <span className="text-hm-muted text-sm">Mano de Obra</span>
                    <span className="font-bold">{formatUSD(manoObra)}</span>
                  </div>
                  {estimado > 0 && (
                    <div className="flex justify-between items-center pb-3 border-b border-white/5">
                      <span className="text-hm-muted text-sm">Estimado original</span>
                      <span className="font-mono text-hm-muted">{formatUSD(estimado)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-hm-accent font-bold">COSTO TOTAL</span>
                    <span className="text-xl font-black text-hm-accent">{formatUSD(costoTotal)}</span>
                  </div>
                  {estimado > 0 && (
                    <div className={`flex justify-between items-center pt-1 border-t border-white/5 ${esSobreCosto ? 'text-orange-400' : 'text-green-400'}`}>
                      <span className="text-sm font-bold">Desvío vs estimado</span>
                      <span className="font-bold font-mono">{desvio >= 0 ? '+' : ''}{formatUSD(desvio)} ({desviosPct}%)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* E) Rentabilidad del trabajo */}
            {facturado > 0 && (
              <div>
                <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-2">E — Rentabilidad del Trabajo</div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
                    <div className="text-[9px] font-mono text-blue-400 uppercase mb-0.5">Facturado</div>
                    <div className="text-lg font-bold text-blue-400">{formatUSD(facturado)}</div>
                  </div>
                  <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                    <div className="text-[9px] font-mono text-red-400 uppercase mb-0.5">Costo</div>
                    <div className="text-lg font-bold text-red-400">{formatUSD(costoTotal)}</div>
                  </div>
                  <div className={`rounded-lg p-3 border ${margen >= 0 ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                    <div className={`text-[9px] font-mono uppercase mb-0.5 ${margen >= 0 ? 'text-green-400' : 'text-red-400'}`}>Margen</div>
                    <div className={`text-lg font-bold ${margen >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatUSD(margen)}</div>
                    {margenPct && <div className="text-[10px] font-mono text-hm-muted">{margenPct}%</div>}
                  </div>
                </div>
              </div>
            )}
            {facturado === 0 && (
              <div className="text-xs text-hm-muted italic text-center p-3 bg-hm-surface2/10 rounded-lg">
                Sin monto facturado — completar para ver rentabilidad del trabajo
              </div>
            )}
          </div>
        )
      }


      case 'timeline':
        return (
          <div className="flex flex-col items-center justify-center p-10 text-center border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
            <span className="text-4xl mb-3">⏱️</span>
            <div className="text-sm font-bold text-neutral-300">Historial Vacío</div>
            <div className="text-xs text-neutral-500 mt-1">Aún no hay eventos registrados en la línea de tiempo.</div>
          </div>
        )
      
      case 'repuestos':
        return (
          <div className="space-y-4">
            <table className="w-full text-left">
              <thead className="bg-hm-surface2/50">
                <tr>
                  <th className="p-3 text-xs font-mono text-hm-muted">ITEM</th>
                  <th className="p-3 text-xs font-mono text-hm-muted">CANT</th>
                  <th className="p-3 text-xs font-mono text-hm-muted">PRECIO</th>
                  <th className="p-3 text-xs font-mono text-hm-muted">SUBTOTAL</th>
                </tr>
              </thead>
              <tbody>
                {ot.repuestos?.length > 0 ? ot.repuestos.map(r => (
                  <tr key={r.id} className="border-b border-white/5">
                    <td className="p-3 text-sm">{r.nombre}</td>
                    <td className="p-3 text-sm">{r.cantidad}</td>
                    <td className="p-3 text-sm">{formatUSD(r.precio_unitario_usd)}</td>
                    <td className="p-3 text-sm font-bold">{formatUSD(r.subtotal_usd)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" className="p-6 text-center text-sm text-hm-muted">No se cargaron repuestos.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`OT 360: #${ot.numero_ot}`} maxWidth="max-w-5xl">
      <div className="flex flex-col md:flex-row gap-6 min-h-[600px]">
        
        {/* SIDEBAR TABS */}
        <div className="w-full md:w-64 shrink-0 flex flex-col gap-1 border-r border-white/5 pr-4">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`text-left px-4 py-3 rounded-lg text-sm font-bold transition-colors ${
                activeTab === tab.id 
                  ? 'bg-hm-accent text-black shadow-lg shadow-hm-accent/20' 
                  : 'text-hm-muted hover:bg-white/5 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* CONTENT */}
        <div className="flex-1 pb-10">
          <div className="mb-6 flex justify-between items-center pb-4 border-b border-white/10">
            <div>
              <h2 className="text-2xl font-black">Proceso / Trazabilidad</h2>
              <p className="text-sm text-hm-muted mt-1">Audit Trail & Control Operativo</p>
            </div>
            {ot.estado === 'completada' && (
               <Badge variant="info">LISTA PARA FACTURAR</Badge>
            )}
          </div>
          
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            {renderTab()}
          </div>
        </div>
      </div>
    </Modal>
  )
}
