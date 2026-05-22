import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useMaquinaDetalle } from '../../../hooks/useMaquinaDetalle'
import { useMaquinas } from '../../../hooks/useMaquinas'
import { useDolar } from '../../../context/DolarContext'
import { useAuth } from '../../../context/AuthContext'
import { useRubro } from '../../../context/RubroContext'
import { exportarOTPdf } from '../../../lib/exportOT'
import { supabase } from '../../../lib/supabase'
import { calcServiceState, predecirService } from '../../../hooks/useCliente360'
import Modal from '../../ui/Modal'
import ModalConfirm from '../../ui/ModalConfirm'
import Badge from '../../ui/Badge'
import Button from '../../ui/Button'
import Input from '../../ui/Input'
import Timeline360 from '../timeline/Timeline360'

const ESTADO_OP_COLOR = {
  'Operativo':           'text-green-400',
  'En mantenimiento':    'text-yellow-400',
  'En taller':           'text-orange-400',
  'Esperando repuesto':  'text-red-400',
  'Fuera de servicio':   'text-red-400',
  'Baja':                'text-hm-muted',
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

export default function FichaMaquina({ isOpen, onClose, maquinaId }) {
  const [tab, setTab] = useState('resumen')
  const { maquina, ots, contratos, stats, loading, error } = useMaquinaDetalle(maquinaId)
  const { deactivateMaquina } = useMaquinas()
  const { formatUSD } = useDolar()
  const { isOwner } = useAuth()
  const { taxonomia } = useRubro()
  
  const [confirmBaja, setConfirmBaja] = useState(false)
  const [loadingBaja, setLoadingBaja] = useState(false)
  const [horometros, setHorometros] = useState([])
  const [loadingHoro, setLoadingHoro] = useState(false)
  const [horoForm, setHoroForm] = useState({ horometro_valor: '', fecha_lectura: new Date().toISOString().slice(0, 10), observacion: '' })
  const [savingHoro, setSavingHoro] = useState(false)

  useEffect(() => {
    if (!maquinaId) return
    setLoadingHoro(true)
    supabase.from('historial_horometros').select('*').eq('maquina_id', maquinaId).order('fecha_lectura', { ascending: false })
      .then(({ data }) => { setHorometros(data || []); setLoadingHoro(false) })
  }, [maquinaId])

  const handleAddHorometro = async (e) => {
    e.preventDefault()
    if (!horoForm.horometro_valor) return
    setSavingHoro(true)
    try {
      const { error } = await supabase.from('historial_horometros').insert({ maquina_id: maquinaId, lectura_horas: Number(horoForm.horometro_valor), fecha_lectura: horoForm.fecha_lectura, notas: horoForm.observacion || null })
      if (error) throw error
      toast.success('Lectura registrada')
      setHoroForm(p => ({ ...p, horometro_valor: '', observacion: '' }))
      const { data } = await supabase.from('historial_horometros').select('*').eq('maquina_id', maquinaId).order('fecha_lectura', { ascending: false })
      setHorometros(data || [])
    } catch (err) { toast.error(err.message) }
    finally { setSavingHoro(false) }
  }

  if (!maquinaId) return null

  const handleDarDeBaja = async () => {
    setLoadingBaja(true)
    try {
      await deactivateMaquina(maquinaId)
      toast.success(`${maquina.nombre_unidad} dada de baja correctamente`)
      setConfirmBaja(false)
      onClose()
    } catch (err) {
      toast.error('Error al dar de baja: ' + err.message)
    } finally {
      setLoadingBaja(false)
    }
  }

  // Cálculos derivados de OT para costos
  const totalRepuestos = ots.reduce((acc, o) => acc + Number(o.total_repuestos_usd || 0), 0)
  const totalManoObra = ots.reduce((acc, o) => acc + Number(o.total_mano_obra_usd || 0), 0)

  // Service State (Alertas)
  const svc = maquina ? calcServiceState(maquina) : null
  const svcAlert = svc && ['vencido', 'urgente'].includes(svc.estado)
  const opAlert = maquina && ['Fuera de servicio', 'Esperando repuesto', 'En taller'].includes(maquina.estado_operativo)
  const tieneAlertas = svcAlert || opAlert

  // Health Score Cálculo Predictivo
  let healthScore = maquina?.score_disponibilidad || 100
  if (svc?.estado === 'vencido') healthScore -= 20
  if (svc?.estado === 'urgente') healthScore -= 10
  if (maquina?.estado_operativo === 'Fuera de servicio') healthScore -= 30
  if (maquina?.estado_operativo === 'En taller') healthScore -= 15
  if (maquina?.estado_operativo === 'Esperando repuesto') healthScore -= 25
  healthScore = Math.max(0, Math.min(100, healthScore))
  const hsColor = healthScore >= 80 ? 'text-green-400' : healthScore >= 50 ? 'text-orange-400' : 'text-red-500'

  // --- CONTINUIDAD OPERATIVA & RIESGO (Heurística Determinística) ---
  const fallasRepetidas = Math.max(0, ots.length > 0 ? ots.length - 1 : 0) // Mock determinístico basado en OTs
  const isRental = maquina?.en_alquiler
  const costOfDowntimePorHora = isRental ? 150 : 45
  const costoDowntimeTotal = (maquina?.tiempo_detenido_horas || 0) * costOfDowntimePorHora
  
  let nivelRiesgo = 'ESTABLE'
  if (healthScore < 50 || fallasRepetidas > 3 || svcAlert) nivelRiesgo = 'CRÍTICA'
  else if (healthScore < 80 || fallasRepetidas > 1 || opAlert) nivelRiesgo = 'OBSERVAR'
  else if (isRental) nivelRiesgo = 'RENTABLE'

  const RIESGO_STYLE = {
    'CRÍTICA': 'bg-red-500/10 border-red-500/20 text-red-400',
    'OBSERVAR': 'bg-orange-500/10 border-orange-500/20 text-orange-400',
    'ESTABLE': 'bg-green-500/10 border-green-500/20 text-green-400',
    'RENTABLE': 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="max-w-5xl">
        {loading ? (
          <div className="p-20 text-center animate-pulse font-mono text-hm-muted">Cargando Activo 360...</div>
        ) : error ? (
          <div className="p-10 text-center text-red-400">Error: {error}</div>
        ) : (
          <div className="flex flex-col">
            {/* Header - ACTIVO 360 */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5 -mt-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h2 className="text-2xl font-bold truncate">{maquina.nombre_unidad}</h2>
                  <Badge variant={maquina.en_taller ? 'taller' : maquina.en_alquiler ? 'info' : 'success'}>
                    {maquina.en_taller ? 'EN TALLER' : maquina.en_alquiler ? 'ALQUILADA' : 'DISPONIBLE'}
                  </Badge>
                  <span className={`text-xs font-mono font-bold ${ESTADO_OP_COLOR[maquina.estado_operativo] || 'text-hm-muted'}`}>
                    • {maquina.estado_operativo || 'Operativo'}
                  </span>
                </div>
                <div className="text-sm text-hm-muted">
                  {[maquina.marca, maquina.modelo, maquina.anio].filter(Boolean).join(' · ')} 
                  {maquina.patente && ` — Patente: ${maquina.patente}`}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {tieneAlertas && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold animate-pulse">
                    ⚠️ ACTIVO EN RIESGO
                  </div>
                )}
                <div className="bg-hm-surface2 rounded px-3 py-1 text-right">
                  <div className="text-[10px] font-mono text-hm-muted tracking-widest uppercase">{taxonomia.medidor}</div>
                  <div className="text-lg font-bold text-hm-accent">{maquina.horometro_actual} <span className="text-xs font-normal">{taxonomia.medidorUnidad}</span></div>
                </div>
              </div>
            </div>

            {/* Tabs ACTIVO 360 */}
            <div className="flex gap-2 border-b border-hm-border mb-4 overflow-x-auto no-scrollbar scroll-smooth">
              <TabBtn active={tab==='datos'}         onClick={() => setTab('datos')}>DATOS</TabBtn>
              <TabBtn active={tab==='operacion'}     onClick={() => setTab('operacion')}>OPERACIÓN</TabBtn>
              <TabBtn active={tab==='taller'}        onClick={() => setTab('taller')}>TALLER</TabBtn>
              <TabBtn active={tab==='costos'}        onClick={() => setTab('costos')}>COSTOS</TabBtn>
              <TabBtn active={tab==='rentabilidad'}  onClick={() => setTab('rentabilidad')}>RENTABILIDAD</TabBtn>
              <TabBtn active={tab==='documentacion'} onClick={() => setTab('documentacion')}>DOCUMENTACIÓN</TabBtn>
              <TabBtn active={tab==='garantias'}     onClick={() => setTab('garantias')}>GARANTÍAS</TabBtn>
              <TabBtn active={tab==='rental'}        onClick={() => setTab('rental')}>RENTAL</TabBtn>
              <TabBtn active={tab==='riesgo'}        onClick={() => setTab('riesgo')}>RIESGO</TabBtn>
              <TabBtn active={tab==='timeline'}      onClick={() => setTab('timeline')}>TIMELINE</TabBtn>
            </div>

            {/* Content Container */}
            <div className="min-h-[400px]">
              
              {/* 1. DATOS (Resumen) */}
              {tab === 'datos' && (
                <div className="flex flex-col gap-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Kpi label="Cliente Asociado" value={maquina.cliente?.razon_social || 'Propia'} />
                    <Kpi label="Ubicación" value="Base / Taller" sub="Teórica" />
                    <Kpi label="Criticidad" value={maquina.en_alquiler ? 'Alta (Renta)' : 'Media'} color={maquina.en_alquiler ? 'text-amber-400' : 'text-green-400'} />
                    <Kpi label="Health Score" value={`${healthScore}/100`} color={hsColor} sub="Salud general predictiva" />
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {[
                      ['N° Interno', maquina.interno],
                      ['Patente', maquina.patente],
                      ['Tipo', maquina.tipo],
                      ['Marca', maquina.marca],
                      ['Modelo', maquina.modelo],
                      ['Año', maquina.anio],
                      ['N° Chasis', maquina.chasis || maquina.numero_serie],
                      ['Motor', maquina.motor],
                      ['Responsable', maquina.responsable],
                    ].map(([label, val]) => (
                      <div key={label} className="bg-hm-surface2/20 border border-hm-border/40 rounded-lg p-3">
                        <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-0.5">{label}</div>
                        <div className={`text-sm font-medium ${!val ? 'text-hm-muted/50' : 'text-hm-text'}`}>
                          {val || '—'}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t border-hm-border flex justify-between">
                    {isOwner && (
                      <Button variant="danger" onClick={() => setConfirmBaja(true)} disabled={loadingBaja}>
                        Dar de baja unidad
                      </Button>
                    )}
                    <Button variant="ghost" onClick={onClose} className={!isOwner ? 'ml-auto' : ''}>
                      Cerrar ficha
                    </Button>
                  </div>
                </div>
              )}

              {/* 2. OPERACIÓN / CONTINUIDAD OPERATIVA */}
              {tab === 'operacion' && (
                <div className="flex flex-col gap-6">
                  {/* Diferenciadores Continuidad Operativa */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
                    <div className="bg-hm-surface2/20 border border-hm-border/40 rounded-lg p-3">
                      <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-1">
                        Disponibilidad Real (Uptime)
                      </div>
                      <div className={`text-xl font-bold ${hsColor}`}>{healthScore}%</div>
                      <div className="text-[10px] text-hm-muted mt-0.5">Basado en historial</div>
                    </div>
                    <div className="bg-hm-surface2/20 border border-hm-border/40 rounded-lg p-3">
                      <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-1">
                        Downtime Acumulado
                      </div>
                      <div className="text-xl font-bold text-orange-400">{maquina.tiempo_detenido_horas || 0} <span className="text-xs font-normal">{taxonomia.medidorUnidad}</span></div>
                      <div className="text-[10px] text-hm-muted mt-0.5">Tiempo fuera de servicio</div>
                    </div>
                    <div className="bg-hm-surface2/20 border border-hm-border/40 rounded-lg p-3">
                      <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-1">
                        Cost of Downtime
                      </div>
                      <div className="text-xl font-bold text-red-400">{formatUSD(costoDowntimeTotal)}</div>
                      <div className="text-[10px] text-hm-muted mt-0.5">{formatUSD(costOfDowntimePorHora)}/h estimado</div>
                    </div>
                    <div className="bg-hm-surface2/20 border border-hm-border/40 rounded-lg p-3">
                      <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-1">
                        Fallas Repetidas (12m)
                      </div>
                      <div className={`text-xl font-bold ${fallasRepetidas > 2 ? 'text-red-400' : fallasRepetidas > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                        {fallasRepetidas}
                      </div>
                      <div className="text-[10px] text-hm-muted mt-0.5">Reincidencias</div>
                    </div>
                  </div>

                  <div className="bg-hm-surface2/20 border border-hm-border/40 rounded-lg p-3 mb-2 flex justify-between items-center">
                     <div>
                       <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-0.5">Lectura Actual de {taxonomia.medidor}</div>
                       <div className="text-sm text-hm-muted">Última actualización: hoy</div>
                     </div>
                     <div className="text-xl font-bold text-hm-text">{maquina.horometro_actual || 0} <span className="text-xs font-normal">{taxonomia.medidorUnidad}</span></div>
                  </div>

                  <form onSubmit={handleAddHorometro} className="bg-hm-surface2/30 border border-hm-border rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <Input label={`Lectura (${taxonomia.medidorUnidad})`} type="number" value={horoForm.horometro_valor} onChange={e => setHoroForm(p => ({ ...p, horometro_valor: e.target.value }))} required />
                    <Input label="Fecha" type="date" value={horoForm.fecha_lectura} onChange={e => setHoroForm(p => ({ ...p, fecha_lectura: e.target.value }))} />
                    <Input label="Nota" value={horoForm.observacion} onChange={e => setHoroForm(p => ({ ...p, observacion: e.target.value }))} placeholder="Opcional" />
                    <Button type="submit" variant="primary" disabled={savingHoro} className="w-full h-[42px]">
                      {savingHoro ? 'GUARDANDO...' : 'REGISTRAR LECTURA'}
                    </Button>
                  </form>

                  <div className="max-h-[300px] overflow-y-auto pr-2">
                    {loadingHoro ? <div className="h-20 bg-hm-surface2 rounded animate-pulse" /> : 
                     horometros.length === 0 ? <EmptyState icon="⏱️" title="Sin lecturas" desc="No hay historial de horómetros registrado." /> : (
                      <div className="flex flex-col gap-2">
                        {horometros.map(h => (
                          <div key={h.id} className="flex items-center justify-between bg-hm-surface2/20 rounded px-4 py-3 border border-hm-border/50 text-sm hover:bg-hm-surface2/40 transition-colors">
                            <span className="font-mono text-hm-accent font-bold text-lg">{h.lectura_horas}</span>
                            <div className="text-right">
                              <span className="text-xs font-mono text-hm-muted block">{h.fecha_lectura}</span>
                              {h.notas && <span className="text-xs text-hm-muted max-w-[200px] truncate block">{h.notas}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 3. TALLER (Services + OTs) */}
              {tab === 'taller' && (
                <div className="flex flex-col gap-5">
                  {svc ? (
                    <div className="bg-hm-surface2/30 border border-hm-border p-6 rounded-xl mb-2">
                      <h3 className="font-bold text-lg mb-4">Estado del Mantenimiento</h3>
                      <div className="flex justify-between text-sm font-mono text-hm-muted mb-2">
                        <span>PRÓXIMO SERVICE</span>
                        <span className={svc.color === 'red' ? 'text-red-400 font-bold' : svc.color === 'yellow' ? 'text-yellow-400 font-bold' : 'text-green-400 font-bold'}>
                          {svc.estado === 'vencido' ? `VENCIDO ${Math.abs(svc.restantes).toFixed(0)}${taxonomia.medidorUnidad}` : `${svc.restantes.toFixed(0)}${taxonomia.medidorUnidad} restantes`}
                        </span>
                      </div>
                      <div className="h-3 bg-hm-surface2 rounded-full overflow-hidden mb-3">
                        <div className={`h-full rounded-full transition-all ${
                          svc.estado === 'vencido' ? 'bg-red-500' : 
                          svc.estado === 'urgente' ? 'bg-red-400' : 
                          svc.estado === 'proximo' ? 'bg-yellow-400' : 'bg-green-500'
                        }`} style={{ width: `${Math.min(svc.pct, 100)}%` }} />
                      </div>
                      
                      {(() => {
                        const pred = predecirService(maquina, horometros)
                        if (!pred) return null
                        return (
                          <div className={`text-xs font-mono p-3 rounded-lg border ${pred.alerta ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-hm-surface2 border-hm-border text-hm-muted'}`}>
                            ⏱ Predicción de sistema: <strong>{pred.label}</strong> (Ritmo: {pred.horasPorDia}{taxonomia.medidorUnidad}/día)
                          </div>
                        )
                      })()}
                    </div>
                  ) : (
                    <EmptyState icon="⚙️" title="Sin métricas de mantenimiento" desc="No se ha configurado la frecuencia de service para este activo." />
                  )}

                  <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-1 mt-2">Historial de OTs</div>
                  <div className="max-h-[300px] overflow-y-auto pr-2 flex flex-col gap-3">
                    {ots.length === 0 ? (
                      <EmptyState icon="🔧" title="Sin OTs" desc="No registra órdenes de trabajo históricas." />
                    ) : (
                      ots.map(ot => (
                        <div key={ot.id} className="bg-hm-surface2/20 p-4 rounded-lg border border-hm-border/50 hover:border-hm-accent/30 transition-colors group/ot">
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-bold text-hm-accent">OT #{ot.numero_ot}</span>
                            <Badge variant={ot.estado === 'completada' || ot.estado === 'facturada' ? 'success' : ot.estado === 'cancelada' ? 'danger' : 'warning'}>
                              {ot.estado.replace('_',' ').toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-hm-text mb-3">{ot.descripcion_trabajo || 'Sin descripción'}</p>
                          <div className="flex justify-between items-center text-xs font-mono text-hm-muted">
                            <span>Fecha: {ot.fecha_ingreso}</span>
                            <div className="flex items-center gap-3">
                              <span>Mano Obra: {ot.horas_mano_obra || 0}h</span>
                              <span className="text-hm-text font-bold">TOTAL: {formatUSD(ot.total_usd)}</span>
                              <button
                                onClick={() => exportarOTPdf(ot, maquina)}
                                className="text-hm-muted hover:text-hm-accent border border-hm-border rounded px-2 py-1 hover:border-hm-accent transition-colors"
                              >
                                PDF ↓
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* 5. DOCUMENTACION */}
              {tab === 'documentacion' && (
                <EmptyState icon="📄" title="Documentación Técnica" desc="Base preparada para subir manuales, seguros y habilitaciones del activo." />
              )}

              {/* 6. GARANTÍAS */}
              {tab === 'garantias' && (
                <EmptyState icon="🛡️" title="Garantía de Fábrica: No Vigente" desc="No se registran planes de garantía activos para este chasis." />
              )}

              {/* 7. COSTOS */}
              {tab === 'costos' && (() => {
                // Datos reales desde OTs
                const costoTotalMaq = stats.totalGastos || 0
                const repuestosMaq = totalRepuestos || 0
                const manoObraMaq = totalManoObra || 0
                const ingresosMaq = stats.totalIngresos || 0

                // Distribución porcentual
                const pctRep = costoTotalMaq > 0 ? Math.round((repuestosMaq / costoTotalMaq) * 100) : 0
                const pctMO  = costoTotalMaq > 0 ? Math.round((manoObraMaq / costoTotalMaq) * 100) : 0

                return (
                  <div className="flex flex-col gap-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
                        <div className="text-xs font-mono text-red-400 mb-2 tracking-widest">TOTAL REPUESTOS (HISTÓRICO)</div>
                        <div className="text-3xl font-bold text-hm-text mb-1">{formatUSD(repuestosMaq)}</div>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 h-1.5 bg-hm-surface2 rounded-full overflow-hidden">
                            <div className="h-full bg-red-500 rounded-full" style={{width:`${pctRep}%`}} />
                          </div>
                          <span className="text-xs font-mono text-red-400">{pctRep}%</span>
                        </div>
                      </div>
                      <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-5">
                        <div className="text-xs font-mono text-orange-400 mb-2 tracking-widest">TOTAL MANO DE OBRA (HISTÓRICO)</div>
                        <div className="text-3xl font-bold text-hm-text mb-1">{formatUSD(manoObraMaq)}</div>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 h-1.5 bg-hm-surface2 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-500 rounded-full" style={{width:`${pctMO}%`}} />
                          </div>
                          <span className="text-xs font-mono text-orange-400">{pctMO}%</span>
                        </div>
                      </div>
                    </div>

                    {/* A) Costos operativos desglosados */}
                    <div>
                      <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-2">A — Desglose de Costos</div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {[
                          { label: 'Mantenimiento', value: repuestosMaq, color: 'text-red-400' },
                          { label: 'Mano de Obra', value: manoObraMaq, color: 'text-orange-400' },
                          { label: 'Cubiertas', value: null, color: 'text-hm-muted', placeholder: true },
                          { label: 'Combustible', value: null, color: 'text-yellow-400', placeholder: true },
                          { label: 'Otros', value: null, color: 'text-hm-muted', placeholder: true },
                        ].map(({ label, value, color, placeholder }) => (
                          <div key={label} className="bg-hm-surface2/20 border border-hm-border/40 rounded-lg p-3 flex flex-col justify-between">
                            <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-0.5">{label}</div>
                            <div className={`text-base font-bold mt-1 ${placeholder ? 'text-hm-muted/40' : color}`}>
                              {placeholder ? <span className="text-[9px] bg-hm-surface2/50 px-1.5 py-0.5 rounded border border-hm-border font-normal">[PREP]</span> : formatUSD(value)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* B) Horas productivas */}
                    <div>
                      <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-2">B — Horas</div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="bg-hm-surface2/20 border border-hm-border/40 rounded-lg p-3">
                          <div className="text-[9px] font-mono text-hm-muted uppercase mb-0.5">{taxonomia.medidor} actual</div>
                          <div className="text-lg font-bold">{maquina.horometro_actual ? `${maquina.horometro_actual}${taxonomia.medidorUnidad}` : 'Sin datos'}</div>
                        </div>
                        <div className="bg-hm-surface2/20 border border-hm-border/40 rounded-lg p-3">
                          <div className="text-[9px] font-mono text-hm-muted uppercase mb-0.5">Horas detenidas</div>
                          <div className="text-lg font-bold text-red-400">{maquina.tiempo_detenido_horas ? `${maquina.tiempo_detenido_horas}h` : '0h'}</div>
                        </div>
                        <div className="bg-hm-surface2/20 border border-hm-border/40 rounded-lg p-3">
                          <div className="text-[9px] font-mono text-hm-muted uppercase mb-0.5">OTs de taller</div>
                          <div className="text-lg font-bold text-orange-400">{ots.length}</div>
                        </div>
                      </div>
                    </div>

                    {/* C.A.T */}
                    <div className="bg-hm-surface2/30 border border-hm-border rounded-xl p-5 flex justify-between items-center">
                      <div>
                        <div className="text-xs font-mono text-hm-muted mb-1 tracking-widest">COSTO ACUMULADO TOTAL (C.A.T)</div>
                        <div className="text-sm text-hm-muted">Suma de repuestos, servicios y otros gastos imputados.</div>
                      </div>
                      <div className="text-2xl font-bold font-mono">{formatUSD(costoTotalMaq)}</div>
                    </div>
                  </div>
                )
              })()}

              {/* 8. RENTABILIDAD */}
              {tab === 'rentabilidad' && (() => {
                const ingresosMaq = stats.totalIngresos || 0
                const gastosMaq = stats.totalGastos || 0
                const rentabilidad = ingresosMaq - gastosMaq
                const roi = gastosMaq > 0 ? ((rentabilidad / gastosMaq) * 100).toFixed(1) : 0
                const disponibilidad = maquina.score_disponibilidad || 100
                const horasDetenidas = maquina.tiempo_detenido_horas || 0
                const horometro = maquina.horometro_actual || 0

                const riesgoActivo = rentabilidad < 0 ? 'critica'
                  : disponibilidad < 70 ? 'observar'
                  : 'rentable'
                const RIESGO_ACTIVO = {
                  rentable: { label: 'RENTABLE', cls: 'bg-green-500/20 text-green-300 border-green-500/40' },
                  observar: { label: 'OBSERVAR', cls: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' },
                  critica:  { label: 'CRÍTICA', cls: 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse' },
                }
                const badgeActivo = RIESGO_ACTIVO[riesgoActivo]

                return (
                  <div className="flex flex-col gap-5">
                    {/* Badge */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${badgeActivo.cls}`}>
                        <span className="w-2 h-2 rounded-full bg-current" />{badgeActivo.label}
                      </span>
                      <span className="text-xs text-hm-muted font-mono">{ots.length} OTs · Disponibilidad: {disponibilidad}%</span>
                    </div>

                    {/* C) Rentabilidad */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-blue-500/5 border-l-4 border-l-blue-500 p-5 rounded-r-xl">
                        <div className="text-xs font-mono text-blue-400 mb-1 uppercase">Ingresos generados</div>
                        <div className="text-2xl font-bold text-hm-text">{formatUSD(ingresosMaq)}</div>
                        <div className="text-[10px] text-hm-muted mt-1">Alquileres, contratos, OTs</div>
                      </div>
                      <div className="bg-red-500/5 border-l-4 border-l-red-500 p-5 rounded-r-xl">
                        <div className="text-xs font-mono text-red-400 mb-1 uppercase">Costo acumulado</div>
                        <div className="text-2xl font-bold text-hm-text">{formatUSD(gastosMaq)}</div>
                        <div className="text-[10px] text-hm-muted mt-1">Repuestos + Mano de Obra</div>
                      </div>
                      <div className={`border-l-4 p-5 rounded-r-xl ${rentabilidad >= 0 ? 'bg-green-500/5 border-l-green-500' : 'bg-orange-500/5 border-l-orange-500'}`}>
                        <div className={`text-xs font-mono mb-1 uppercase ${rentabilidad >= 0 ? 'text-green-400' : 'text-orange-400'}`}>Rentabilidad neta</div>
                        <div className="text-2xl font-bold text-hm-text">{formatUSD(rentabilidad)}</div>
                        <div className={`text-[10px] mt-1 font-mono font-bold ${Number(roi) >= 0 ? 'text-green-400' : 'text-red-400'}`}>ROI: {roi}%</div>
                      </div>
                    </div>

                    {/* Disponibilidad */}
                    <div>
                      <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-2">Disponibilidad Operativa</div>
                      <div className="bg-hm-surface2/20 border border-hm-border rounded-xl p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-4xl font-black text-hm-text">{disponibilidad}%</div>
                          <div className="text-right">
                            <div className="text-xs text-hm-muted">Horas detenidas</div>
                            <div className="text-sm font-bold text-red-400">{horasDetenidas}h</div>
                          </div>
                        </div>
                        <div className="h-3 bg-hm-surface2 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${disponibilidad >= 85 ? 'bg-green-500' : disponibilidad >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{width:`${disponibilidad}%`}} />
                        </div>
                        <div className="flex justify-between text-[10px] text-hm-muted mt-1">
                          <span>0%</span><span>50%</span><span>100%</span>
                        </div>
                      </div>
                    </div>

                    {/* Historial Contratos */}
                    <h3 className="font-mono text-sm text-hm-muted mt-2 tracking-widest uppercase">Historial de Rentas (Contratos)</h3>
                    <div className="max-h-[200px] overflow-y-auto pr-2 flex flex-col gap-2">
                      {contratos.length === 0 ? <p className="text-xs text-hm-muted italic">Sin contratos registrados.</p> : (
                        contratos.map(c => (
                          <div key={c.id} className="bg-hm-surface2/20 p-3 rounded-lg border border-hm-border/50 flex justify-between items-center text-sm">
                            <div>
                              <div className="font-bold text-blue-400">Contrato #{c.numero_contrato}</div>
                              <div className="text-xs text-hm-muted">{c.cliente?.razon_social} | {c.fecha_inicio} a {c.fecha_fin}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-hm-muted">{formatUSD(c.tarifa_diaria_usd)}/día</div>
                              <div className="font-bold">{formatUSD(c.total_contrato_usd)}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )
              })()}

              {/* 9. DISPONIBILIDAD */}
              {tab === 'disponibilidad' && (
                <div className="flex flex-col gap-6">
                  <div className="bg-hm-surface2/20 border border-hm-border rounded-xl p-6 text-center">
                    <div className="text-5xl font-black text-hm-text mb-2">
                      {maquina.score_disponibilidad || 100}%
                    </div>
                    <div className="text-sm font-bold text-hm-muted uppercase tracking-widest">Uptime Histórico</div>
                    <div className="text-xs text-hm-muted mt-2 max-w-md mx-auto">
                      Basado en los días que el equipo estuvo fuera de servicio o esperando repuesto, relativo a sus días de vida activa.
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Kpi label="Tiempo Detenido Acumulado" value={`${maquina.tiempo_detenido_horas || 0} horas`} sub="Total histórico" />
                    <Kpi label="Estado Actual" value={maquina.estado_operativo || 'Operativo'} color={ESTADO_OP_COLOR[maquina.estado_operativo]} />
                  </div>
                </div>
              )}

              {/* 9. RENTAL Y RIESGO */}
              {tab === 'rental' && (
                <EmptyState icon="🚜" title="Gestión de Alquileres" desc="Este módulo centraliza los contratos de alquiler, remitos de entrega y devoluciones del activo. (Base Preparada)" />
              )}

              {tab === 'riesgo' && (
                <div className="flex flex-col gap-4">
                  <div className="flex justify-center mb-2">
                    <div className={`px-6 py-3 rounded-xl border flex flex-col items-center ${RIESGO_STYLE[nivelRiesgo]}`}>
                      <div className="text-xs font-mono uppercase tracking-widest opacity-80 mb-1">Estado de Riesgo</div>
                      <div className="text-2xl font-black tracking-tight">{nivelRiesgo}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-hm-surface2/30 border border-hm-border p-5 rounded-xl text-center flex flex-col items-center">
                      <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-2 flex gap-2">
                        Fallas Repetidas (Últimos 12m) 
                      </div>
                      <div className={`text-4xl font-bold mb-1 ${fallasRepetidas > 2 ? 'text-red-400' : fallasRepetidas > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                        {fallasRepetidas}
                      </div>
                      <div className="text-xs text-hm-muted mt-1">
                        {fallasRepetidas > 2 ? 'Patrón anómalo detectado. Activo inestable.' : fallasRepetidas > 0 ? 'Posibles reincidencias, monitorear.' : 'Activo sin patrones de falla repetitiva.'}
                      </div>
                    </div>
                    
                    <div className="bg-hm-surface2/30 border border-hm-border p-5 rounded-xl text-center flex flex-col items-center">
                      <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-2">Vencimientos Críticos</div>
                      <div className={`text-xl font-bold mb-1 ${svcAlert ? 'text-red-400' : 'text-green-400'}`}>
                        {svcAlert ? 'SERVICE URGENTE' : 'AL DÍA'}
                      </div>
                      <div className="text-xs text-hm-muted mt-1">
                        {svcAlert ? 'El equipo requiere mantenimiento inmediato para evitar fallas mayores.' : 'Sin vencimientos operativos a corto plazo.'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 10. TIMELINE */}
              {tab === 'timeline' && <Timeline360 maquinaId={maquina.id} />}
              
            </div>
          </div>
        )}
      </Modal>

      <ModalConfirm
        isOpen={confirmBaja}
        onClose={() => setConfirmBaja(false)}
        onConfirm={handleDarDeBaja}
        loading={loadingBaja}
        title="Dar de baja unidad"
        message={`¿Confirmás que querés dar de baja "${maquina?.nombre_unidad}"? La unidad quedará inactiva y no aparecerá en la flota ni en alquileres.`}
        confirmLabel="Dar de baja"
        variant="danger"
      />
    </>
  )
}
