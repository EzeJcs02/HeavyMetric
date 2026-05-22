import { useState, useMemo } from 'react'
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

// Base Checklists
const CHECKLIST_BASE = [
  { id: 'b1', label: 'Seguridad perimetral / EPP', check: false },
  { id: 'b2', label: 'Revisión visual general', check: false },
  { id: 'b3', label: 'Limpieza / Lavado post-servicio', check: false },
  { id: 'b4', label: 'Validación operativa final', check: false }
]

const CHECKLIST_MAQUINA = [
  { id: 'm1', label: 'Sistema Hidráulico (presión)', check: false },
  { id: 'm2', label: 'Control de Fugas', check: false },
  { id: 'm3', label: 'Filtros y Lubricación', check: false },
  { id: 'm4', label: 'Toma de Horómetro Real', check: false }
]

const CHECKLIST_VEHICULO = [
  { id: 'v1', label: 'Niveles de Aceite', check: false },
  { id: 'v2', label: 'Frenos (pastillas/discos)', check: false },
  { id: 'v3', label: 'Presión de Cubiertas', check: false },
  { id: 'v4', label: 'Sistema de Luces', check: false },
  { id: 'v5', label: 'Odómetro Real', check: false }
]

export default function FichaOT({ isOpen, onClose, ot, onUpdateEstado }) {
  const [activeTab, setActiveTab] = useState('resumen')
  const { formatUSD } = useDolar()
  
  // Mocks de estado para Evidencias y Checklists
  const [firmado, setFirmado] = useState(false)
  const [checklist, setChecklist] = useState([...CHECKLIST_BASE, ...CHECKLIST_MAQUINA])

  if (!isOpen || !ot) return null

  const handleToggleCheck = (id) => {
    setChecklist(prev => prev.map(c => c.id === id ? { ...c, check: !c.check } : c))
  }

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
          <div className="space-y-4">
            <div className="text-xs font-mono text-hm-muted uppercase">Checklist Híbrido: Base + Maquinaria Pesada</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {checklist.map(chk => (
                <div key={chk.id} onClick={() => handleToggleCheck(chk.id)} className={`p-4 rounded-lg border cursor-pointer flex items-center justify-between transition-colors ${chk.check ? 'bg-green-500/10 border-green-500/30' : 'bg-[#111] border-white/10 hover:border-white/30'}`}>
                  <span className={`text-sm font-medium ${chk.check ? 'text-green-400' : 'text-gray-300'}`}>{chk.label}</span>
                  {chk.check && <span className="text-green-400">✅</span>}
                </div>
              ))}
            </div>
          </div>
        )

      case 'evidencias':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-4 border-dashed border-2 border-white/10 flex flex-col items-center justify-center min-h-[200px] hover:border-hm-accent/50 transition-colors cursor-pointer group">
                <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">📷</span>
                <span className="text-sm font-bold text-hm-muted group-hover:text-white">Subir Fotografía</span>
                <span className="text-xs text-gray-500 mt-1">(Preparado para Supabase Storage)</span>
              </Card>
              
              <Card className="p-4 border border-white/10 flex flex-col min-h-[200px] relative">
                <div className="text-xs font-mono text-hm-muted mb-4 uppercase">Firma del Técnico/Cliente</div>
                {firmado ? (
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <span className="text-4xl text-hm-accent mb-2">✍️</span>
                    <span className="text-sm font-bold text-green-400">Documento Firmado Digitalmente</span>
                    <span className="text-xs text-hm-muted">ID: HM-SIG-9941</span>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center gap-4">
                    <div className="w-full h-24 bg-white/5 rounded border border-white/10 flex items-center justify-center text-hm-muted text-xs">
                      [Canvas de Firma Mock]
                    </div>
                    <button onClick={() => setFirmado(true)} className="px-4 py-2 bg-hm-accent text-black font-bold text-xs rounded hover:bg-hm-accent/80 transition-colors">
                      Guardar Firma
                    </button>
                  </div>
                )}
              </Card>
            </div>
          </div>
        )

      case 'costos':
        return (
          <div className="space-y-4">
            <Card className="p-6 bg-gradient-to-br from-[#111] to-[#0a0a0a]">
              <h3 className="text-lg font-black mb-6">Rentabilidad de OT</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-white/5">
                  <span className="text-hm-muted">Costo Repuestos</span>
                  <span className="font-bold">{formatUSD(ot.total_repuestos_usd || 0)}</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-white/5">
                  <span className="text-hm-muted">Mano de Obra Facturada</span>
                  <span className="font-bold">{formatUSD(ot.total_mano_obra_usd || 0)}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-hm-accent font-bold">TOTAL FACTURABLE</span>
                  <span className="text-xl font-black text-hm-accent">{formatUSD((ot.total_repuestos_usd || 0) + (ot.total_mano_obra_usd || 0))}</span>
                </div>
              </div>
            </Card>
          </div>
        )

      case 'timeline':
        return (
          <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
            {/* Mock Timeline Entries */}
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-hm-bg bg-hm-accent text-black shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-lg shadow-hm-accent/20 z-10">
                ⚡
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-white/10 bg-[#161616] shadow">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-bold text-sm text-hm-accent">OT Abierta</div>
                  <time className="font-mono text-xs text-hm-muted">14 Oct, 09:00</time>
                </div>
                <div className="text-sm text-gray-300">Juan Pérez creó la OT desde portal web.</div>
              </div>
            </div>

            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-hm-bg bg-blue-500 text-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-lg shadow-blue-500/20 z-10">
                🔧
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-white/10 bg-[#161616] shadow">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-bold text-sm text-blue-400">Estado: En Diagnóstico</div>
                  <time className="font-mono text-xs text-hm-muted">14 Oct, 10:30</time>
                </div>
                <div className="text-sm text-gray-300">Técnico asignado comenzó revisión de fluidos.</div>
              </div>
            </div>
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
