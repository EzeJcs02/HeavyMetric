import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getCache, queueMutation, setCache } from '../../lib/syncQueue'
import { ChevronLeft, Play, Pause, Square, CheckSquare, Camera, PenTool, Wrench, Save, CheckCircle2 } from 'lucide-react'
import SignatureCanvas from 'react-signature-canvas'
import { toast } from 'sonner'
import { uploadDocument } from '../../lib/integrations/storage'
import { isIntegrationEnabled } from '../../config/integrations'

export default function OTMobileDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isOffline } = useOutletContext()
  
  const [ot, setOt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('reloj') // reloj, checklist, evidencia, firma, repuestos

  // Estados Checklist
  const [checklists, setChecklists] = useState([])
  
  // Estados Firma
  const sigCanvasCliente = useRef({})
  const sigCanvasTecnico = useRef({})
  const [firmaClienteName, setFirmaClienteName] = useState('')

  useEffect(() => {
    loadOtData()
  }, [id])

  const loadOtData = async () => {
    setLoading(true)
    try {
      const localOts = await getCache('my_ots') || []
      const foundOt = localOts.find(o => o.id === id)
      if (foundOt) {
        setOt(foundOt)
      } else {
        toast.error('OT no encontrada en caché')
        navigate('/campo')
      }

      const localChecks = await getCache('ot_checklists') || []
      const otChecks = localChecks.filter(c => c.orden_trabajo_id === id)
      if (otChecks.length > 0) {
        setChecklists(otChecks)
      } else {
        // Inicializar checklist por defecto
        const defaultChecks = [
          { categoria: 'seguridad', item: 'EPP completo y colocado', estado: 'na' },
          { categoria: 'niveles', item: 'Nivel aceite motor', estado: 'na' },
          { categoria: 'niveles', item: 'Nivel refrigerante', estado: 'na' },
          { categoria: 'fugas', item: 'Inspección visual de fugas hidráulicas', estado: 'na' },
          { categoria: 'limpieza', item: 'Limpieza de zona de trabajo post-servicio', estado: 'na' }
        ]
        setChecklists(defaultChecks)
      }

    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // ==== FUNCIONES GEOLOCALIZACIÓN ====
  const getGPSCoords = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ lat: null, lng: null })
        return
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve({ lat: null, lng: null }),
        { timeout: 5000 }
      )
    })
  }

  // ==== ACCIONES DE RELOJ ====
  const handleClockAction = async (action, newStatus) => {
    const coords = await getGPSCoords()
    
    // 1. Guardar evento de tiempo
    await queueMutation({
      type: 'INSERT',
      table: 'ot_tiempos',
      payload: {
        orden_trabajo_id: ot.id,
        tecnico_id: user.id,
        accion: action,
        latitud: coords.lat,
        longitud: coords.lng
      }
    })

    // 2. Actualizar estado OT
    const otPayload = { estado: newStatus }
    await queueMutation({
      type: 'UPDATE',
      table: 'ordenes_trabajo',
      pk: 'id',
      payload: { id: ot.id, ...otPayload }
    })

    // Update local state and cache
    const updatedOt = { ...ot, estado: newStatus }
    setOt(updatedOt)
    
    const localOts = await getCache('my_ots') || []
    const newOts = localOts.map(o => o.id === id ? updatedOt : o)
    await setCache('my_ots', newOts)

    toast.success(`OT marcada como ${newStatus}`)
    if (newStatus === 'completada') {
      navigate('/campo')
    }
  }

  // ==== ACCIONES CHECKLIST ====
  const handleChecklistChange = (index, status) => {
    const newChecks = [...checklists]
    newChecks[index].estado = status
    setChecklists(newChecks)
  }

  const saveChecklist = async () => {
    // Si la db local no tiene IDs, son nuevos. Simplificaremos asumiendo INSERT
    for (const check of checklists) {
      if (check.id) {
        // UPDATE (No implementado en el mock para simplificar)
      } else {
        await queueMutation({
          type: 'INSERT',
          table: 'ot_checklists',
          payload: {
            orden_trabajo_id: ot.id,
            categoria: check.categoria,
            item: check.item,
            estado: check.estado
          }
        })
      }
    }
    toast.success('Checklist guardado en cola (Offline)')
  }

  // ==== ACCIONES FIRMA ====
  const saveSignatures = async () => {
    const coords = await getGPSCoords()
    
    if (!sigCanvasCliente.current.isEmpty() && firmaClienteName) {
      const firmaCliente = sigCanvasCliente.current.getTrimmedCanvas().toDataURL('image/png')
      let firmaUrlOrBase64 = firmaCliente

      if (navigator.onLine && isIntegrationEnabled('storage')) {
        toast.info('Subiendo firma de cliente...')
        const res = await uploadDocument(firmaCliente, `firmas/ot-${ot.id}-cliente.png`)
        if (res.success) firmaUrlOrBase64 = res.url
      }

      await queueMutation({
        type: 'INSERT',
        table: 'ot_firmas',
        payload: {
          orden_trabajo_id: ot.id,
          tipo: 'cliente',
          nombre_firmante: firmaClienteName,
          firma_base64: firmaUrlOrBase64,
          latitud: coords.lat,
          longitud: coords.lng
        }
      })
    }

    if (!sigCanvasTecnico.current.isEmpty()) {
      const firmaTecnico = sigCanvasTecnico.current.getTrimmedCanvas().toDataURL('image/png')
      let firmaUrlOrBase64 = firmaTecnico

      if (navigator.onLine && isIntegrationEnabled('storage')) {
        toast.info('Subiendo firma de técnico...')
        const res = await uploadDocument(firmaTecnico, `firmas/ot-${ot.id}-tecnico.png`)
        if (res.success) firmaUrlOrBase64 = res.url
      }

      await queueMutation({
        type: 'INSERT',
        table: 'ot_firmas',
        payload: {
          orden_trabajo_id: ot.id,
          tipo: 'tecnico',
          nombre_firmante: ot.operativo_id, // idealmente nombre del tecnico
          firma_base64: firmaUrlOrBase64,
          latitud: coords.lat,
          longitud: coords.lng
        }
      })
    }
    toast.success('Firmas guardadas localmente')
  }

  if (loading || !ot) return <div className="p-4 text-white">Cargando...</div>

  return (
    <div className="flex flex-col h-full bg-neutral-900 pb-20">
      {/* HEADER SECUNDARIO */}
      <div className="bg-neutral-950 p-4 border-b border-white/5 flex items-center gap-3">
        <button onClick={() => navigate('/campo')} className="p-2 -ml-2 rounded-full text-neutral-400 hover:text-white hover:bg-white/10">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div>
          <h2 className="text-white font-semibold text-lg leading-tight">OT #{ot.numero_ot}</h2>
          <p className="text-neutral-400 text-sm truncate">{ot.maquinas?.nombre_unidad}</p>
        </div>
      </div>

      {/* TABS */}
      <div className="flex overflow-x-auto no-scrollbar border-b border-white/10 bg-neutral-950 px-2">
        {[
          { id: 'reloj', label: 'Reloj', icon: Clock },
          { id: 'checklist', label: 'Checklist', icon: CheckSquare },
          { id: 'evidencia', label: 'Evidencia', icon: Camera },
          { id: 'firma', label: 'Firma', icon: PenTool },
          { id: 'repuestos', label: 'Partes', icon: Wrench },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id 
                ? 'border-orange-500 text-orange-500' 
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* CONTENIDO TABS */}
      <div className="p-4 flex-1 overflow-y-auto">
        
        {/* TAB: RELOJ */}
        {activeTab === 'reloj' && (
          <div className="space-y-6">
            <div className="bg-neutral-950 border border-white/10 rounded-2xl p-6 text-center shadow-lg">
              <h3 className="text-neutral-400 text-sm mb-2 font-medium">Estado Actual</h3>
              <div className="text-3xl font-bold text-white mb-6 uppercase tracking-wider">
                {ot.estado.replace('_', ' ')}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => handleClockAction('iniciar', 'en_progreso')}
                  disabled={ot.estado === 'en_progreso' || ot.estado === 'completada'}
                  className="flex flex-col items-center justify-center gap-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed p-4 rounded-xl border border-emerald-500/20 transition-colors"
                >
                  <Play className="w-8 h-8" />
                  <span className="font-semibold text-sm">Iniciar</span>
                </button>
                
                <button 
                  onClick={() => handleClockAction('pausar', 'pausada')}
                  disabled={ot.estado !== 'en_progreso'}
                  className="flex flex-col items-center justify-center gap-2 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 disabled:opacity-50 disabled:cursor-not-allowed p-4 rounded-xl border border-yellow-500/20 transition-colors"
                >
                  <Pause className="w-8 h-8" />
                  <span className="font-semibold text-sm">Pausar</span>
                </button>
              </div>

              <button 
                onClick={() => {
                  if(window.confirm('¿Estás seguro de finalizar la OT?')) {
                    handleClockAction('cerrar', 'completada')
                  }
                }}
                disabled={ot.estado === 'completada'}
                className="w-full mt-3 flex items-center justify-center gap-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed p-4 rounded-xl border border-red-500/20 transition-colors font-semibold"
              >
                <Square className="w-6 h-6" />
                Finalizar Servicio
              </button>
            </div>
            
            <p className="text-xs text-neutral-500 text-center flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Las acciones registran posición GPS local.
            </p>
          </div>
        )}

        {/* TAB: CHECKLIST */}
        {activeTab === 'checklist' && (
          <div className="space-y-4">
            {checklists.map((check, idx) => (
              <div key={idx} className="bg-neutral-950 border border-white/5 rounded-xl p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="pr-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-orange-500 mb-1 block">
                      {check.categoria}
                    </span>
                    <p className="text-sm font-medium text-white">{check.item}</p>
                  </div>
                </div>
                <div className="flex bg-neutral-900 rounded-lg p-1 border border-white/5 overflow-hidden">
                  <button 
                    onClick={() => handleChecklistChange(idx, 'ok')}
                    className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${check.estado === 'ok' ? 'bg-emerald-500/20 text-emerald-400' : 'text-neutral-500'}`}
                  >
                    OK
                  </button>
                  <button 
                    onClick={() => handleChecklistChange(idx, 'falla')}
                    className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${check.estado === 'falla' ? 'bg-red-500/20 text-red-400' : 'text-neutral-500'}`}
                  >
                    FALLA
                  </button>
                  <button 
                    onClick={() => handleChecklistChange(idx, 'na')}
                    className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${check.estado === 'na' ? 'bg-neutral-700 text-neutral-300' : 'text-neutral-500'}`}
                  >
                    N/A
                  </button>
                </div>
              </div>
            ))}
            
            <button 
              onClick={saveChecklist}
              className="w-full bg-orange-600 hover:bg-orange-500 text-white font-medium py-3.5 rounded-xl shadow-lg transition-colors flex justify-center items-center gap-2 mt-4"
            >
              <Save className="w-5 h-5" />
              Guardar Checklist
            </button>
          </div>
        )}

        {/* TAB: EVIDENCIA (Mock, requiere inputs file nativos o capacitor) */}
        {activeTab === 'evidencia' && (
          <div className="space-y-4">
            <div className="bg-neutral-950 border border-white/10 rounded-2xl p-6 text-center">
              <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4 text-neutral-400">
                <Camera className="w-8 h-8" />
              </div>
              <h3 className="text-white font-medium mb-2">Tomar Fotografía</h3>
              <p className="text-xs text-neutral-500 mb-6">La evidencia se subirá al conectarse a la red.</p>
              
              <label className="w-full flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white p-4 rounded-xl border border-white/10 transition-colors font-medium cursor-pointer">
                <input type="file" accept="image/*" capture="environment" className="hidden" />
                <Camera className="w-5 h-5" />
                Abrir Cámara
              </label>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">Observaciones Generales</label>
              <textarea 
                className="w-full bg-neutral-950 border border-white/10 rounded-xl p-3 text-white placeholder-neutral-600 focus:outline-none focus:border-orange-500 h-32"
                placeholder="Notas de campo..."
              ></textarea>
            </div>
            
            <button className="w-full bg-white/10 text-white font-medium py-3.5 rounded-xl hover:bg-white/20 transition-colors flex justify-center items-center gap-2">
              <Save className="w-5 h-5" />
              Guardar Evidencia
            </button>
          </div>
        )}

        {/* TAB: FIRMA */}
        {activeTab === 'firma' && (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white mb-2">Firma del Cliente</label>
              <input 
                type="text" 
                placeholder="Aclaración (Nombre Completo)"
                value={firmaClienteName}
                onChange={e => setFirmaClienteName(e.target.value)}
                className="w-full bg-neutral-950 border border-white/10 rounded-xl p-3 mb-2 text-white placeholder-neutral-600 focus:outline-none focus:border-orange-500"
              />
              <div className="bg-white rounded-xl overflow-hidden border-2 border-white/10 touch-none">
                <SignatureCanvas 
                  ref={sigCanvasCliente} 
                  penColor="black"
                  canvasProps={{ className: 'w-full h-40 bg-neutral-200' }} 
                />
              </div>
              <button onClick={() => sigCanvasCliente.current.clear()} className="text-xs text-orange-500 mt-1">Limpiar Firma Cliente</button>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-white mb-2">Firma del Técnico</label>
              <div className="bg-white rounded-xl overflow-hidden border-2 border-white/10 touch-none">
                <SignatureCanvas 
                  ref={sigCanvasTecnico} 
                  penColor="blue"
                  canvasProps={{ className: 'w-full h-40 bg-neutral-200' }} 
                />
              </div>
              <button onClick={() => sigCanvasTecnico.current.clear()} className="text-xs text-orange-500 mt-1">Limpiar Firma Técnico</button>
            </div>

            <button 
              onClick={saveSignatures}
              className="w-full bg-orange-600 hover:bg-orange-500 text-white font-medium py-3.5 rounded-xl shadow-lg transition-colors flex justify-center items-center gap-2"
            >
              <Save className="w-5 h-5" />
              Guardar Firmas
            </button>
          </div>
        )}

        {/* TAB: REPUESTOS (Mock simple) */}
        {activeTab === 'repuestos' && (
          <div className="space-y-4">
            <div className="bg-neutral-950 border border-orange-500/30 rounded-xl p-5 text-center">
              <Wrench className="w-8 h-8 text-orange-500 mx-auto mb-3" />
              <h3 className="text-white font-medium mb-1">Agregar Repuestos</h3>
              <p className="text-xs text-neutral-500 mb-4">Selecciona repuestos desde el catálogo offline.</p>
              
              <button className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-medium py-3 rounded-lg transition-colors border border-white/5">
                + Buscar en Catálogo
              </button>
            </div>
            
            <p className="text-xs text-neutral-500 text-center">No hay repuestos registrados en esta OT.</p>
          </div>
        )}

      </div>
    </div>
  )
}
