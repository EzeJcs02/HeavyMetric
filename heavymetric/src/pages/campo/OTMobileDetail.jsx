import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useRubro } from '../../context/RubroContext'
import { getCache, queueMutation, setCache } from '../../lib/syncQueue'
import {
  ChevronLeft,
  Play,
  Pause,
  Square,
  CheckSquare,
  Camera,
  PenTool,
  Wrench,
  Save,
  CheckCircle2,
  Clock,
  Wifi,
  WifiOff,
  ShieldCheck,
} from 'lucide-react'
import SignatureCanvas from 'react-signature-canvas'
import { toast } from 'sonner'
import { uploadDocument } from '../../lib/integrations/storage'
import { isIntegrationEnabled } from '../../config/integrations'

const DEFAULT_CHECKLIST = [
  { categoria: 'seguridad', item: 'EPP completo y colocado', estado: 'na' },
  { categoria: 'operación', item: 'Zona de trabajo segura y señalizada', estado: 'na' },
  { categoria: 'diagnóstico', item: 'Diagnóstico confirmado', estado: 'na' },
  { categoria: 'niveles', item: 'Nivel de aceite / fluido verificado', estado: 'na' },
  { categoria: 'niveles', item: 'Nivel de refrigerante / fluido térmico verificado', estado: 'na' },
  { categoria: 'fugas', item: 'Inspección visual de fugas realizada', estado: 'na' },
  { categoria: 'prueba', item: 'Prueba operativa posterior realizada', estado: 'na' },
  { categoria: 'limpieza', item: 'Zona de trabajo limpia post-servicio', estado: 'na' },
]

const safeOnline = () => {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine
}

export default function OTMobileDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { taxonomia } = useRubro()
  const outletContext = useOutletContext() || {}
  const isOffline = outletContext.isOffline ?? !safeOnline()

  const activoSingular = taxonomia?.activoSingular || 'Activo'
  const ordenTrabajo = taxonomia?.ordenTrabajo || 'Orden de trabajo'
  const repuestoPlural = taxonomia?.repuestoPlural || 'Repuestos / Insumos'
  const tecnicoLabel = taxonomia?.tecnico || 'Técnico'
  const medidor = taxonomia?.medidor || 'Uso'
  const medidorUnidad = taxonomia?.medidorUnidad || 'hs'

  const [ot, setOt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('reloj')

  const [checklists, setChecklists] = useState([])
  const [firmaClienteName, setFirmaClienteName] = useState('')
  const [observacionesCampo, setObservacionesCampo] = useState('')
  const [evidenciaDescripcion, setEvidenciaDescripcion] = useState('')
  const [evidenciaPendiente, setEvidenciaPendiente] = useState(false)
  const [repuestosPendientes, setRepuestosPendientes] = useState([])

  const sigCanvasCliente = useRef(null)
  const sigCanvasTecnico = useRef(null)

  useEffect(() => {
    loadOtData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const activoNombre = useMemo(() => {
    return (
      ot?.maquinas?.nombre_unidad ||
      ot?.activo?.nombre_unidad ||
      ot?.activo_nombre ||
      'Activo sin identificar'
    )
  }, [ot])

  const clienteNombre = useMemo(() => {
    return (
      ot?.clientes?.razon_social ||
      ot?.cliente?.razon_social ||
      ot?.cliente_nombre ||
      'Cliente no informado'
    )
  }, [ot])

  const checklistCompleto = useMemo(() => {
    if (!checklists.length) return false
    return checklists.every((check) => ['ok', 'na'].includes(check.estado))
  }, [checklists])

  const tieneFirmaTecnico = () => {
    return sigCanvasTecnico.current && !sigCanvasTecnico.current.isEmpty()
  }

  const tieneFirmaCliente = () => {
    return sigCanvasCliente.current && !sigCanvasCliente.current.isEmpty() && firmaClienteName.trim()
  }

  const assertOTLoaded = () => {
    if (!ot?.id) {
      toast.error(`${ordenTrabajo} no cargada`)
      return false
    }

    return true
  }

  const loadOtData = async () => {
    setLoading(true)

    try {
      const localOts = (await getCache('my_ots')) || []
      const foundOt = localOts.find((item) => String(item.id) === String(id))

      if (foundOt) {
        setOt(foundOt)
      } else {
        toast.error(`${ordenTrabajo} no encontrada en caché`)
        navigate('/campo')
        return
      }

      const localChecks = (await getCache('ot_checklists')) || []
      const otChecks = localChecks.filter((check) => String(check.orden_trabajo_id) === String(id))

      if (otChecks.length > 0) {
        setChecklists(otChecks)
      } else {
        setChecklists(DEFAULT_CHECKLIST)
      }

      const localEvidencias = (await getCache('ot_evidencias_campo')) || []
      const evidenciaOT = localEvidencias.find((ev) => String(ev.orden_trabajo_id) === String(id))

      if (evidenciaOT) {
        setObservacionesCampo(evidenciaOT.observaciones || '')
        setEvidenciaDescripcion(evidenciaOT.descripcion || '')
        setEvidenciaPendiente(true)
      }

      const localRepuestos = (await getCache('ot_repuestos_campo')) || []
      setRepuestosPendientes(localRepuestos.filter((rep) => String(rep.orden_trabajo_id) === String(id)))
    } catch (error) {
      console.error(error)
      toast.error('Error cargando datos locales')
    } finally {
      setLoading(false)
    }
  }

  const getGPSCoords = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ lat: null, lng: null })
        return
      }

      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }),
        () => resolve({ lat: null, lng: null }),
        { timeout: 5000 }
      )
    })
  }

  const updateLocalOT = async (updatedOt) => {
    setOt(updatedOt)

    const localOts = (await getCache('my_ots')) || []
    const newOts = localOts.map((item) => (String(item.id) === String(id) ? updatedOt : item))

    await setCache('my_ots', newOts)
  }

  const handleClockAction = async (action, newStatus) => {
    if (!assertOTLoaded()) return

    const coords = await getGPSCoords()

    await queueMutation({
      type: 'INSERT',
      table: 'ot_tiempos',
      payload: {
        orden_trabajo_id: ot.id,
        tecnico_id: user?.id,
        accion: action,
        latitud: coords.lat,
        longitud: coords.lng,
        created_at: new Date().toISOString(),
        iso_evento: {
          accion: `campo_${action}`,
          entidad: 'orden_trabajo',
          entidad_id: ot.id,
          usuario_id: user?.id || null,
          estado_anterior: ot.estado || null,
          estado_nuevo: newStatus,
          fecha_hora: new Date().toISOString(),
          latitud: coords.lat,
          longitud: coords.lng,
          origen: 'src/pages/campo/OTMobileDetail.jsx',
        },
      },
    })

    await queueMutation({
      type: 'UPDATE',
      table: 'ordenes_trabajo',
      pk: 'id',
      payload: {
        id: ot.id,
        estado: newStatus,
      },
    })

    await updateLocalOT({
      ...ot,
      estado: newStatus,
    })

    toast.success(`${ordenTrabajo} marcada como ${String(newStatus).replace('_', ' ')}`)
  }

  const handleChecklistChange = (index, status) => {
    setChecklists((prev) =>
      prev.map((check, idx) =>
        idx === index ? { ...check, estado: status } : check
      )
    )
  }

  const saveChecklist = async () => {
    if (!assertOTLoaded()) return

    for (const check of checklists) {
      await queueMutation({
        type: check.id ? 'UPDATE' : 'INSERT',
        table: 'ot_checklists',
        pk: check.id ? 'id' : undefined,
        payload: {
          ...(check.id ? { id: check.id } : {}),
          orden_trabajo_id: ot.id,
          categoria: check.categoria,
          item: check.item,
          estado: check.estado,
          updated_at: new Date().toISOString(),
        },
      })
    }

    const localChecks = (await getCache('ot_checklists')) || []
    const withoutCurrent = localChecks.filter((check) => String(check.orden_trabajo_id) !== String(ot.id))

    await setCache('ot_checklists', [
      ...withoutCurrent,
      ...checklists.map((check) => ({
        ...check,
        orden_trabajo_id: ot.id,
        updated_at: new Date().toISOString(),
      })),
    ])

    toast.success('Checklist guardado en cola offline')
  }

  const saveEvidence = async () => {
    if (!assertOTLoaded()) return

    if (!evidenciaDescripcion.trim() && !observacionesCampo.trim()) {
      toast.error('Cargá una descripción u observación antes de guardar evidencia')
      return
    }

    const coords = await getGPSCoords()

    const payload = {
      orden_trabajo_id: ot.id,
      tecnico_id: user?.id || null,
      descripcion: evidenciaDescripcion.trim(),
      observaciones: observacionesCampo.trim(),
      latitud: coords.lat,
      longitud: coords.lng,
      created_at: new Date().toISOString(),
      origen: 'campo_mobile',
      estado_sync: safeOnline() ? 'pendiente_upload' : 'offline_pendiente',
    }

    await queueMutation({
      type: 'INSERT',
      table: 'ot_evidencias',
      payload,
    })

    const localEvidencias = (await getCache('ot_evidencias_campo')) || []
    const withoutCurrent = localEvidencias.filter((ev) => String(ev.orden_trabajo_id) !== String(ot.id))

    await setCache('ot_evidencias_campo', [...withoutCurrent, payload])

    setEvidenciaPendiente(true)
    toast.success('Evidencia guardada localmente')
  }

  const tryUploadSignature = async (firmaBase64, path, label) => {
    if (!safeOnline() || !isIntegrationEnabled('storage')) return firmaBase64

    try {
      toast.info(`Subiendo firma de ${label}...`)
      const res = await uploadDocument(firmaBase64, path)

      if (res?.success && res?.url) return res.url

      console.warn(`No se pudo subir firma de ${label}:`, res?.error || res)
      toast.warning(`Firma de ${label} guardada localmente. Se sincronizará luego.`)
      return firmaBase64
    } catch (error) {
      console.error(`Error subiendo firma de ${label}:`, error)
      toast.warning(`Firma de ${label} guardada localmente. Se sincronizará luego.`)
      return firmaBase64
    }
  }

  const saveSignatures = async () => {
    if (!assertOTLoaded()) return

    const coords = await getGPSCoords()
    let guardoFirma = false

    if (sigCanvasCliente.current && !sigCanvasCliente.current.isEmpty() && firmaClienteName.trim()) {
      const firmaCliente = sigCanvasCliente.current.getTrimmedCanvas().toDataURL('image/png')
      const firmaUrlOrBase64 = await tryUploadSignature(
        firmaCliente,
        `firmas/ot-${ot.id}-cliente.png`,
        'cliente'
      )

      await queueMutation({
        type: 'INSERT',
        table: 'ot_firmas',
        payload: {
          orden_trabajo_id: ot.id,
          tipo: 'cliente',
          nombre_firmante: firmaClienteName.trim(),
          firma_base64: firmaUrlOrBase64,
          latitud: coords.lat,
          longitud: coords.lng,
          created_at: new Date().toISOString(),
        },
      })

      guardoFirma = true
    }

    if (sigCanvasTecnico.current && !sigCanvasTecnico.current.isEmpty()) {
      const firmaTecnico = sigCanvasTecnico.current.getTrimmedCanvas().toDataURL('image/png')
      const firmaUrlOrBase64 = await tryUploadSignature(
        firmaTecnico,
        `firmas/ot-${ot.id}-tecnico.png`,
        tecnicoLabel.toLowerCase()
      )

      await queueMutation({
        type: 'INSERT',
        table: 'ot_firmas',
        payload: {
          orden_trabajo_id: ot.id,
          tipo: 'tecnico',
          nombre_firmante: user?.email || tecnicoLabel,
          firma_base64: firmaUrlOrBase64,
          latitud: coords.lat,
          longitud: coords.lng,
          created_at: new Date().toISOString(),
        },
      })

      guardoFirma = true
    }

    if (!guardoFirma) {
      toast.error('No hay firmas para guardar')
      return
    }

    toast.success('Firmas guardadas localmente')
  }

  const handleCloseOT = async () => {
    if (!assertOTLoaded()) return

    if (!checklistCompleto) {
      toast.error('No podés cerrar: completá el checklist operativo.')
      setActiveTab('checklist')
      return
    }

    if (!evidenciaDescripcion.trim() && !observacionesCampo.trim()) {
      toast.error('No podés cerrar: cargá una evidencia u observación de campo.')
      setActiveTab('evidencia')
      return
    }

    if (!tieneFirmaTecnico()) {
      toast.error(`No podés cerrar: falta firma del ${tecnicoLabel.toLowerCase()}.`)
      setActiveTab('firma')
      return
    }

    const coords = await getGPSCoords()

    await queueMutation({
      type: 'UPDATE',
      table: 'ordenes_trabajo',
      pk: 'id',
      payload: {
        id: ot.id,
        estado: 'completada',
        iso_cierre_campo: {
          accion: 'cerrar_ot_campo',
          entidad: 'orden_trabajo',
          entidad_id: ot.id,
          numero_ot: ot.numero_ot,
          usuario_id: user?.id || null,
          responsable: user?.email || null,
          estado_anterior: ot.estado || null,
          estado_nuevo: 'completada',
          fecha_hora: new Date().toISOString(),
          latitud: coords.lat,
          longitud: coords.lng,
          checklist_completo: checklistCompleto,
          evidencia_cargada: Boolean(evidenciaDescripcion.trim() || observacionesCampo.trim()),
          firma_tecnico: true,
          firma_cliente: Boolean(tieneFirmaCliente()),
          origen: 'src/pages/campo/OTMobileDetail.jsx',
        },
      },
    })

    await updateLocalOT({
      ...ot,
      estado: 'completada',
      iso_cierre_campo: {
        checklist_completo: checklistCompleto,
        evidencia_cargada: true,
        firma_tecnico: true,
        firma_cliente: Boolean(tieneFirmaCliente()),
        fecha_hora: new Date().toISOString(),
      },
    })

    toast.success(`${ordenTrabajo} cerrada y enviada a cola de sincronización`)
    navigate('/campo')
  }

  if (loading || !ot) {
    return <div className="p-4 text-white">Cargando...</div>
  }

  return (
    <div className="flex flex-col h-full bg-neutral-900 pb-20">
      <div className="bg-neutral-950 p-4 border-b border-white/5 flex items-center gap-3">
        <button
          onClick={() => navigate('/campo')}
          className="p-2 -ml-2 rounded-full text-neutral-400 hover:text-white hover:bg-white/10"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <div className="min-w-0 flex-1">
          <h2 className="text-white font-semibold text-lg leading-tight">
            {ordenTrabajo} #{ot.numero_ot}
          </h2>
          <p className="text-neutral-400 text-sm truncate">
            {activoNombre} · {clienteNombre}
          </p>
        </div>

        <div
          className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold uppercase ${
            isOffline
              ? 'bg-red-500/10 text-red-400 border-red-500/30'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
          }`}
        >
          {isOffline ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
          {isOffline ? 'Offline' : 'Online'}
        </div>
      </div>

      <div className="flex overflow-x-auto no-scrollbar border-b border-white/10 bg-neutral-950 px-2">
        {[
          { id: 'reloj', label: 'Reloj', icon: Clock },
          { id: 'checklist', label: 'Checklist', icon: CheckSquare },
          { id: 'evidencia', label: 'Evidencia', icon: Camera },
          { id: 'firma', label: 'Firma', icon: PenTool },
          { id: 'repuestos', label: repuestoPlural, icon: Wrench },
        ].map((tab) => (
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

      <div className="p-4 flex-1 overflow-y-auto">
        {activeTab === 'reloj' && (
          <div className="space-y-6">
            <div className="bg-neutral-950 border border-white/10 rounded-2xl p-6 text-center shadow-lg">
              <h3 className="text-neutral-400 text-sm mb-2 font-medium">Estado actual</h3>

              <div className="text-3xl font-bold text-white mb-6 uppercase tracking-wider">
                {String(ot.estado || 'pendiente').replace('_', ' ')}
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
                onClick={handleCloseOT}
                disabled={ot.estado === 'completada'}
                className="w-full mt-3 flex items-center justify-center gap-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed p-4 rounded-xl border border-red-500/20 transition-colors font-semibold"
              >
                <Square className="w-6 h-6" />
                Cerrar {ordenTrabajo}
              </button>
            </div>

            <div className="bg-neutral-950 border border-white/10 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                Cierre protegido por checklist, evidencia y firma técnica.
              </div>
              <div className="mt-2 text-xs text-neutral-500 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Las acciones registran GPS y quedan en cola offline si no hay conexión.
              </div>
            </div>
          </div>
        )}

        {activeTab === 'checklist' && (
          <div className="space-y-4">
            {checklists.map((check, idx) => (
              <div key={`${check.categoria}-${check.item}-${idx}`} className="bg-neutral-950 border border-white/5 rounded-xl p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="pr-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-orange-500 mb-1 block">
                      {check.categoria}
                    </span>
                    <p className="text-sm font-medium text-white">{check.item}</p>
                  </div>
                </div>

                <div className="flex bg-neutral-900 rounded-lg p-1 border border-white/5 overflow-hidden">
                  {['ok', 'falla', 'na'].map((estado) => (
                    <button
                      key={estado}
                      onClick={() => handleChecklistChange(idx, estado)}
                      className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${
                        check.estado === estado
                          ? estado === 'ok'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : estado === 'falla'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-neutral-700 text-neutral-300'
                          : 'text-neutral-500'
                      }`}
                    >
                      {estado === 'na' ? 'N/A' : estado.toUpperCase()}
                    </button>
                  ))}
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

        {activeTab === 'evidencia' && (
          <div className="space-y-4">
            <div className="bg-neutral-950 border border-white/10 rounded-2xl p-6 text-center">
              <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4 text-neutral-400">
                <Camera className="w-8 h-8" />
              </div>

              <h3 className="text-white font-medium mb-2">Evidencia de campo</h3>
              <p className="text-xs text-neutral-500 mb-6">
                La evidencia se guarda localmente y se sincroniza cuando vuelve la conexión.
              </p>

              <label className="w-full flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white p-4 rounded-xl border border-white/10 transition-colors font-medium cursor-pointer">
                <input type="file" accept="image/*" capture="environment" className="hidden" />
                <Camera className="w-5 h-5" />
                Abrir cámara
              </label>

              {evidenciaPendiente && (
                <div className="mt-3 text-xs text-emerald-400">
                  Evidencia registrada localmente.
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">
                Descripción de evidencia
              </label>
              <textarea
                value={evidenciaDescripcion}
                onChange={(e) => setEvidenciaDescripcion(e.target.value)}
                className="w-full bg-neutral-950 border border-white/10 rounded-xl p-3 text-white placeholder-neutral-600 focus:outline-none focus:border-orange-500 h-24"
                placeholder="Fotos tomadas, estado inicial/final, lecturas, daños, ubicación..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">
                Observaciones de campo
              </label>
              <textarea
                value={observacionesCampo}
                onChange={(e) => setObservacionesCampo(e.target.value)}
                className="w-full bg-neutral-950 border border-white/10 rounded-xl p-3 text-white placeholder-neutral-600 focus:outline-none focus:border-orange-500 h-32"
                placeholder="Notas técnicas, condiciones del activo, pendientes o recomendaciones..."
              />
            </div>

            <button
              onClick={saveEvidence}
              className="w-full bg-white/10 text-white font-medium py-3.5 rounded-xl hover:bg-white/20 transition-colors flex justify-center items-center gap-2"
            >
              <Save className="w-5 h-5" />
              Guardar Evidencia
            </button>
          </div>
        )}

        {activeTab === 'firma' && (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white mb-2">
                Firma del cliente / responsable
              </label>
              <input
                type="text"
                placeholder="Aclaración / nombre completo"
                value={firmaClienteName}
                onChange={(e) => setFirmaClienteName(e.target.value)}
                className="w-full bg-neutral-950 border border-white/10 rounded-xl p-3 mb-2 text-white placeholder-neutral-600 focus:outline-none focus:border-orange-500"
              />
              <div className="bg-white rounded-xl overflow-hidden border-2 border-white/10 touch-none">
                <SignatureCanvas
                  ref={sigCanvasCliente}
                  penColor="black"
                  canvasProps={{ className: 'w-full h-40 bg-neutral-200' }}
                />
              </div>
              <button onClick={() => sigCanvasCliente.current?.clear()} className="text-xs text-orange-500 mt-1">
                Limpiar firma cliente
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-white mb-2">
                Firma del {tecnicoLabel.toLowerCase()}
              </label>
              <div className="bg-white rounded-xl overflow-hidden border-2 border-white/10 touch-none">
                <SignatureCanvas
                  ref={sigCanvasTecnico}
                  penColor="blue"
                  canvasProps={{ className: 'w-full h-40 bg-neutral-200' }}
                />
              </div>
              <button onClick={() => sigCanvasTecnico.current?.clear()} className="text-xs text-orange-500 mt-1">
                Limpiar firma {tecnicoLabel.toLowerCase()}
              </button>
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

        {activeTab === 'repuestos' && (
          <div className="space-y-4">
            <div className="bg-neutral-950 border border-orange-500/30 rounded-xl p-5 text-center">
              <Wrench className="w-8 h-8 text-orange-500 mx-auto mb-3" />
              <h3 className="text-white font-medium mb-1">
                {repuestoPlural}
              </h3>
              <p className="text-xs text-neutral-500 mb-4">
                Base preparada para seleccionar consumos desde catálogo offline.
              </p>

              <button className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-medium py-3 rounded-lg transition-colors border border-white/5">
                + Buscar en catálogo
              </button>
            </div>

            {repuestosPendientes.length === 0 ? (
              <p className="text-xs text-neutral-500 text-center">
                No hay consumos registrados en esta {ordenTrabajo.toLowerCase()}.
              </p>
            ) : (
              repuestosPendientes.map((rep, index) => (
                <div key={index} className="bg-neutral-950 border border-white/5 rounded-xl p-4 text-sm text-white">
                  {rep.nombre || 'Consumo sin descripción'}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}