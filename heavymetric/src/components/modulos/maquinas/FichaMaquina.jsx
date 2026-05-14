import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useMaquinaDetalle } from '../../../hooks/useMaquinaDetalle'
import { useMaquinas } from '../../../hooks/useMaquinas'
import { useDolar } from '../../../context/DolarContext'
import { useAuth } from '../../../context/AuthContext'
import { exportarOTPdf } from '../../../lib/exportOT'
import { supabase } from '../../../lib/supabase'
import Modal from '../../ui/Modal'
import ModalConfirm from '../../ui/ModalConfirm'
import Card from '../../ui/Card'
import Badge from '../../ui/Badge'
import Button from '../../ui/Button'
import Input from '../../ui/Input'

export default function FichaMaquina({ isOpen, onClose, maquinaId }) {
  const { maquina, ots, contratos, stats, loading, error } = useMaquinaDetalle(maquinaId)
  const { deactivateMaquina } = useMaquinas()
  const { formatUSD } = useDolar()
  const { isOwner } = useAuth()
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
      const { error } = await supabase.from('historial_horometros').insert({ maquina_id: maquinaId, horometro_valor: Number(horoForm.horometro_valor), fecha_lectura: horoForm.fecha_lectura, observacion: horoForm.observacion || null })
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

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Ficha de Unidad" maxWidth="max-w-5xl">
        {loading ? (
          <div className="p-20 text-center animate-pulse font-mono text-hm-muted">Cargando historial de unidad...</div>
        ) : error ? (
          <div className="p-10 text-center text-red-400">Error: {error}</div>
        ) : (
          <div className="flex flex-col gap-6">

            <div className="flex justify-between items-start bg-hm-surface2/30 p-6 rounded-xl border border-hm-border">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-3xl font-bold">{maquina.nombre_unidad}</h2>
                  <Badge variant={maquina.en_taller ? 'taller' : maquina.en_alquiler ? 'info' : 'success'}>
                    {maquina.en_taller ? 'EN TALLER' : maquina.en_alquiler ? 'ALQUILADA' : 'DISPONIBLE'}
                  </Badge>
                </div>
                <p className="text-hm-muted font-mono">{maquina.marca} {maquina.modelo} | PATENTE: {maquina.patente}</p>
              </div>
              <div className="text-right">
                <div className="text-xs font-mono text-hm-muted uppercase tracking-widest">Horómetro Actual</div>
                <div className="text-4xl font-bold text-hm-accent">{maquina.horometro_actual} <span className="text-lg text-hm-muted font-normal">hrs</span></div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4 border-l-4 border-l-blue-500 bg-blue-500/5">
                <div className="text-xs font-mono text-hm-muted mb-1 uppercase">Ingresos Totales (Alquileres)</div>
                <div className="text-2xl font-bold text-blue-400">{formatUSD(stats.totalIngresos)}</div>
              </Card>
              <Card className="p-4 border-l-4 border-l-red-500 bg-red-500/5">
                <div className="text-xs font-mono text-hm-muted mb-1 uppercase">Gastos Totales (Mantenimiento)</div>
                <div className="text-2xl font-bold text-red-400">{formatUSD(stats.totalGastos)}</div>
              </Card>
              <Card className={`p-4 border-l-4 ${stats.rentabilidad >= 0 ? 'border-l-green-500 bg-green-500/5' : 'border-l-orange-500 bg-orange-500/5'}`}>
                <div className="text-xs font-mono text-hm-muted mb-1 uppercase">Balance Neto / Rentabilidad</div>
                <div className={`text-2xl font-bold ${stats.rentabilidad >= 0 ? 'text-green-400' : 'text-orange-400'}`}>
                  {formatUSD(stats.rentabilidad)}
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section>
                <h3 className="font-mono text-sm text-hm-muted mb-3 tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span> HISTORIAL MÉDICO / OTs
                </h3>
                <div className="max-h-[300px] overflow-y-auto pr-2 flex flex-col gap-3">
                  {ots.length === 0 ? (
                    <p className="text-xs text-hm-muted italic p-4 bg-hm-surface2/20 rounded">No registra intervenciones técnicas.</p>
                  ) : (
                    ots.map(ot => (
                      <div key={ot.id} className="bg-hm-surface2/20 p-4 rounded-lg border border-hm-border/50 hover:border-hm-accent/30 transition-colors group/ot">
                        <div className="flex justify-between mb-1">
                          <span className="text-xs font-bold text-hm-accent">OT #{ot.numero_ot}</span>
                          <span className="text-[10px] font-mono text-hm-muted">{ot.fecha_ingreso}</span>
                        </div>
                        <p className="text-xs line-clamp-2 mb-2">{ot.descripcion_trabajo}</p>
                        <div className="flex justify-between items-center text-[10px] font-mono text-hm-muted">
                          <span>Horas: {ot.horas_mano_obra || 0}h</span>
                          <div className="flex items-center gap-3">
                            <span className="text-red-400">COSTO: {formatUSD(ot.total_usd)}</span>
                            <button
                              onClick={() => exportarOTPdf(ot, maquina)}
                              className="opacity-0 group-hover/ot:opacity-100 transition-opacity text-hm-muted hover:text-hm-accent font-mono text-[10px] border border-hm-border rounded px-2 py-0.5 hover:border-hm-accent"
                            >
                              PDF ↓
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section>
                <h3 className="font-mono text-sm text-hm-muted mb-3 tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span> HISTORIAL DE RENTAS
                </h3>
                <div className="max-h-[300px] overflow-y-auto pr-2 flex flex-col gap-3">
                  {contratos.length === 0 ? (
                    <p className="text-xs text-hm-muted italic p-4 bg-hm-surface2/20 rounded">No registra contratos de alquiler.</p>
                  ) : (
                    contratos.map(c => (
                      <div key={c.id} className="bg-hm-surface2/20 p-4 rounded-lg border border-hm-border/50 hover:border-blue-500/30 transition-colors">
                        <div className="flex justify-between mb-1">
                          <span className="text-xs font-bold text-blue-400">CONTRATO #{c.numero_contrato}</span>
                          <span className="text-[10px] font-mono text-hm-muted">{c.fecha_inicio} al {c.fecha_fin}</span>
                        </div>
                        <p className="text-xs mb-2">Cliente: <span className="text-white">{c.cliente?.razon_social}</span></p>
                        <div className="flex justify-between items-center text-[10px] font-mono text-hm-muted">
                          <span>Tarifa: {formatUSD(c.tarifa_diaria_usd)}/día</span>
                          <span className="text-green-400 font-bold">TOTAL: {formatUSD(c.total_contrato_usd)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>

            {/* HISTORIAL HORÓMETROS */}
            <section className="border border-hm-border rounded-xl p-4">
              <h3 className="font-mono text-sm text-hm-muted mb-4 tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-hm-accent"></span> HISTORIAL DE HORÓMETROS
              </h3>
              <div className="flex flex-col gap-4">
                {loadingHoro ? (
                  <div className="h-16 bg-hm-surface2 rounded animate-pulse" />
                ) : horometros.length === 0 ? (
                  <p className="text-xs text-hm-muted italic">Sin lecturas registradas.</p>
                ) : (
                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                    {horometros.map(h => (
                      <div key={h.id} className="flex items-center justify-between bg-hm-surface2/20 rounded px-4 py-2 border border-hm-border/50 text-sm">
                        <span className="font-mono text-hm-accent font-bold">{h.horometro_valor} hrs</span>
                        <span className="text-xs text-hm-muted">{h.fecha_lectura}</span>
                        {h.observacion && <span className="text-xs text-hm-muted truncate max-w-[200px]">{h.observacion}</span>}
                      </div>
                    ))}
                  </div>
                )}
                <form onSubmit={handleAddHorometro} className="grid grid-cols-3 gap-3 border-t border-hm-border pt-3">
                  <Input label="Horómetro (hrs)" type="number" value={horoForm.horometro_valor} onChange={e => setHoroForm(p => ({ ...p, horometro_valor: e.target.value }))} required />
                  <Input label="Fecha" type="date" value={horoForm.fecha_lectura} onChange={e => setHoroForm(p => ({ ...p, fecha_lectura: e.target.value }))} />
                  <Input label="Observación" value={horoForm.observacion} onChange={e => setHoroForm(p => ({ ...p, observacion: e.target.value }))} placeholder="Opcional" />
                  <div className="col-span-3 flex justify-end">
                    <Button type="submit" variant="primary" disabled={savingHoro}>{savingHoro ? 'GUARDANDO...' : '+ REGISTRAR LECTURA'}</Button>
                  </div>
                </form>
              </div>
            </section>

            <div className="flex justify-between items-center pt-4 border-t border-hm-border">
              {isOwner && (
                <Button variant="danger" onClick={() => setConfirmBaja(true)} disabled={loadingBaja}>
                  Dar de baja unidad
                </Button>
              )}
              <Button variant="ghost" onClick={onClose} className="ml-auto">
                Cerrar ficha
              </Button>
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
