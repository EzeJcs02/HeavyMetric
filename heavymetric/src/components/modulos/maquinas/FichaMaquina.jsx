import { useState, useEffect, useMemo, useRef } from 'react'
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
  Operativo: 'text-green-400',
  'En mantenimiento': 'text-yellow-400',
  'En taller': 'text-orange-400',
  'Esperando repuesto': 'text-red-400',
  'Fuera de servicio': 'text-red-400',
  Baja: 'text-hm-muted',
}

const RIESGO_STYLE = {
  CRÍTICA: 'bg-red-500/10 border-red-500/20 text-red-400',
  OBSERVAR: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
  ESTABLE: 'bg-green-500/10 border-green-500/20 text-green-400',
  RENTAL: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
}

const TITULARIDAD_LABEL = {
  propio: 'Propio / empresa',
  cliente: 'Cliente',
  tercero: 'Tercero',
}

const DESTINO_LABEL = {
  uso_interno: 'Uso interno',
  servicio_tecnico: 'Servicio técnico / OT360',
  rental: 'Rental / alquiler',
}

function Kpi({ label, value, sub, color = '' }) {
  return (
    <div className="bg-hm-surface2/30 border border-hm-border/50 rounded-lg p-3 flex flex-col gap-0.5">
      <div className={`text-xl font-bold truncate ${color}`}>{value}</div>
      <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest truncate">
        {label}
      </div>
      {sub && <div className="text-[10px] text-hm-muted truncate">{sub}</div>}
    </div>
  )
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 text-[10px] sm:text-xs font-mono font-bold border-b-2 transition-all whitespace-nowrap shrink-0 ${
        active
          ? 'border-hm-accent text-hm-accent'
          : 'border-transparent text-hm-muted hover:text-hm-text'
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

function DataCard({ label, value }) {
  return (
    <div className="bg-hm-surface2/20 border border-hm-border/40 rounded-lg p-3">
      <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-0.5">
        {label}
      </div>
      <div className={`text-sm font-medium ${!value ? 'text-hm-muted/50' : 'text-hm-text'}`}>
        {value || '—'}
      </div>
    </div>
  )
}

export default function FichaMaquina({ isOpen, onClose, maquinaId }) {
  const [tab, setTab] = useState('datos')
  const { maquina, ots, contratos, stats, loading, error } = useMaquinaDetalle(maquinaId)
  const { deactivateMaquina } = useMaquinas()
  const { formatUSD } = useDolar()
  const { isOwner, orgId, can } = useAuth()
  const { taxonomia, hasCapability } = useRubro()

  const [confirmBaja, setConfirmBaja] = useState(false)
  const [loadingBaja, setLoadingBaja] = useState(false)
  const [horometros, setHorometros] = useState([])
  const [loadingHoro, setLoadingHoro] = useState(false)
  const [horoForm, setHoroForm] = useState({
    horometro_valor: '',
    fecha_lectura: new Date().toISOString().slice(0, 10),
    observacion: '',
  })
  const [savingHoro, setSavingHoro] = useState(false)
  const savingHoroRef = useRef(false)
  const scopeRef = useRef({ maquinaId, orgId })
  scopeRef.current = { maquinaId, orgId }
  const canViewActivo = can('activo.view')
  const canEditActivo = can('activo.edit')
  const canRegisterReading = canEditActivo || can('taller.edit')

  const activoSingular = taxonomia?.activoSingular || 'Activo'
  const ordenTrabajoPlural = taxonomia?.ordenTrabajoPlural || 'Órdenes de Trabajo'
  const moduloTaller = taxonomia?.moduloTaller || 'Taller'
  const medidor = taxonomia?.medidor || 'Horómetro'
  const medidorUnidad = taxonomia?.medidorUnidad || 'hrs'
  const permiteAlquileres = hasCapability?.('alquileres') === true

  const propiedadActivo = useMemo(() => {
    if (maquina?.propiedad_activo) return maquina.propiedad_activo
    if (maquina?.cliente_id || maquina?.cliente?.id) return 'cliente'
    return 'propio'
  }, [maquina])

  const destinoOperativo = useMemo(() => {
    if (maquina?.destino_operativo) return maquina.destino_operativo
    if (maquina?.en_alquiler) return 'rental'
    if (propiedadActivo === 'cliente') return 'servicio_tecnico'
    return 'uso_interno'
  }, [maquina, propiedadActivo])

  const isRental =
    permiteAlquileres &&
    propiedadActivo === 'propio' &&
    destinoOperativo === 'rental'

  const titularidadLabel =
    TITULARIDAD_LABEL[propiedadActivo] || TITULARIDAD_LABEL.propio

  const destinoLabel =
    DESTINO_LABEL[destinoOperativo] || DESTINO_LABEL.uso_interno

  const propietarioLabel = maquina?.cliente?.razon_social || titularidadLabel

  const identificacionActivo =
    maquina?.patente ||
    maquina?.interno ||
    maquina?.numero_serie ||
    maquina?.chasis ||
    null

  useEffect(() => {
    let cancelled = false

    const maquinaValidada =
      isOpen &&
      canViewActivo &&
      orgId &&
      maquina?.id === maquinaId &&
      maquina?.organization_id === orgId

    if (!maquinaValidada) {
      setHorometros([])
      setLoadingHoro(false)
      return () => { cancelled = true }
    }

    setLoadingHoro(true)

    supabase
      .from('historial_horometros')
      .select('*')
      .eq('maquina_id', maquinaId)
      .order('fecha_lectura', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error('Error cargando historial de horómetros:', error.message)
          toast.error('No se pudo cargar el historial de lecturas')
          setHorometros([])
          return
        }
        setHorometros(data || [])
      })
      .catch((err) => {
        if (cancelled) return
        console.error('Error inesperado cargando horómetros:', err)
        toast.error('No se pudo cargar el historial de lecturas')
        setHorometros([])
      })
      .finally(() => {
        if (cancelled) return
        setLoadingHoro(false)
      })

    return () => { cancelled = true }
  }, [isOpen, maquinaId, maquina?.id, maquina?.organization_id, orgId, canViewActivo])

  useEffect(() => {
    if (!isOpen) return

    if (tab === 'rental' && !isRental) {
      setTab('datos')
    }
  }, [isOpen, tab, isRental])

  const handleAddHorometro = async (e) => {
    e.preventDefault()

    if (savingHoroRef.current) return
    if (!canRegisterReading) {
      toast.error('No tenes permisos para registrar lecturas')
      return
    }
    if (!orgId || maquina?.id !== maquinaId || maquina?.organization_id !== orgId) {
      toast.error('No se pudo validar el activo en la organizacion')
      return
    }
    if (!horoForm.horometro_valor) return

    const lecturaHoras = Number(horoForm.horometro_valor)
    if (!Number.isFinite(lecturaHoras) || lecturaHoras < 0) {
      toast.error('La lectura debe ser un numero valido mayor o igual a cero')
      return
    }
    if (!horoForm.fecha_lectura) {
      toast.error('La fecha de lectura es obligatoria')
      return
    }

    const targetMaquinaId = maquinaId
    const targetOrgId = orgId
    savingHoroRef.current = true
    setSavingHoro(true)

    try {
      const { error } = await supabase.from('historial_horometros').insert({
        maquina_id: targetMaquinaId,
        lectura_horas: lecturaHoras,
        fecha_lectura: horoForm.fecha_lectura,
        notas: horoForm.observacion || null,
      })

      if (error) throw error

      toast.success('Lectura registrada')

      setHoroForm((prev) => ({
        ...prev,
        horometro_valor: '',
        observacion: '',
      }))

      const { data: refreshData, error: refreshError } = await supabase
        .from('historial_horometros')
        .select('*')
        .eq('maquina_id', targetMaquinaId)
        .order('fecha_lectura', { ascending: false })

      if (refreshError) {
        console.warn('No se pudo recargar el historial tras insertar:', refreshError.message)
      } else if (
        scopeRef.current.maquinaId === targetMaquinaId &&
        scopeRef.current.orgId === targetOrgId
      ) {
        setHorometros(refreshData || [])
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      savingHoroRef.current = false
      setSavingHoro(false)
    }
  }

  if (!maquinaId) return null

  const handleDarDeBaja = async () => {
    if (loadingBaja) return
    if (!isOwner || !canEditActivo) {
      toast.error('No tenes permisos para dar de baja activos')
      return
    }
    if (!orgId || maquina?.id !== maquinaId || maquina?.organization_id !== orgId) {
      toast.error('No se pudo validar el activo en la organizacion')
      return
    }

    setLoadingBaja(true)

    try {
      await deactivateMaquina(maquinaId)
      toast.success(`${maquina.nombre_unidad} dado de baja correctamente`)
      setConfirmBaja(false)
      onClose()
    } catch (err) {
      toast.error('Error al dar de baja: ' + err.message)
    } finally {
      setLoadingBaja(false)
    }
  }

  const totalRepuestos = ots.reduce((acc, ot) => {
    return acc + Number(ot.total_repuestos_usd || 0)
  }, 0)

  const totalManoObra = ots.reduce((acc, ot) => {
    return acc + Number(ot.total_mano_obra_usd || 0)
  }, 0)

  const svc = maquina ? calcServiceState(maquina) : null
  const svcAlert = svc && ['vencido', 'urgente'].includes(svc.estado)
  const opAlert =
    maquina &&
    ['Fuera de servicio', 'Esperando repuesto', 'En taller'].includes(maquina.estado_operativo)

  const tieneAlertas = svcAlert || opAlert

  let healthScore = maquina?.score_disponibilidad || 100

  if (svc?.estado === 'vencido') healthScore -= 20
  if (svc?.estado === 'urgente') healthScore -= 10
  if (maquina?.estado_operativo === 'Fuera de servicio') healthScore -= 30
  if (maquina?.estado_operativo === 'En taller') healthScore -= 15
  if (maquina?.estado_operativo === 'Esperando repuesto') healthScore -= 25

  healthScore = Math.max(0, Math.min(100, healthScore))

  const hsColor =
    healthScore >= 80
      ? 'text-green-400'
      : healthScore >= 50
        ? 'text-orange-400'
        : 'text-red-500'

  const fallasRepetidas = Math.max(0, ots.length > 0 ? ots.length - 1 : 0)
  const costOfDowntimePorUnidad = isRental ? 150 : 45
  const costoDowntimeTotal =
    Number(maquina?.tiempo_detenido_horas || 0) * costOfDowntimePorUnidad

  let nivelRiesgo = 'ESTABLE'

  if (healthScore < 50 || fallasRepetidas > 3 || svcAlert) {
    nivelRiesgo = 'CRÍTICA'
  } else if (healthScore < 80 || fallasRepetidas > 1 || opAlert) {
    nivelRiesgo = 'OBSERVAR'
  } else if (isRental) {
    nivelRiesgo = 'RENTAL'
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="max-w-5xl">
        {loading ? (
          <div className="p-20 text-center animate-pulse font-mono text-hm-muted">
            Cargando Activo 360...
          </div>
        ) : error ? (
          <div className="p-10 text-center text-red-400">Error: {error}</div>
        ) : (
          <div className="flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5 -mt-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h2 className="text-2xl font-bold truncate">
                    {maquina.nombre_unidad}
                  </h2>

                  <Badge
                    variant={
                      maquina.en_taller
                        ? 'taller'
                        : isRental
                          ? 'info'
                          : propiedadActivo === 'cliente'
                            ? 'default'
                            : 'success'
                    }
                  >
                    {maquina.en_taller
                      ? `EN ${moduloTaller.toUpperCase()}`
                      : isRental
                        ? 'RENTAL'
                        : propiedadActivo === 'cliente'
                          ? 'CLIENTE'
                          : 'OPERATIVO'}
                  </Badge>

                  <span
                    className={`text-xs font-mono font-bold ${
                      ESTADO_OP_COLOR[maquina.estado_operativo] || 'text-hm-muted'
                    }`}
                  >
                    • {maquina.estado_operativo || 'Operativo'}
                  </span>
                </div>

                <div className="text-sm text-hm-muted">
                  {[maquina.marca, maquina.modelo, maquina.anio]
                    .filter(Boolean)
                    .join(' · ')}

                  {identificacionActivo && (
                    <span> — Identificación: {identificacionActivo}</span>
                  )}
                </div>

                <div className="mt-2 flex gap-2 flex-wrap">
                  <span className="text-[10px] font-mono px-2 py-1 rounded border border-hm-border bg-hm-surface2/30 text-hm-muted uppercase">
                    Titularidad: {titularidadLabel}
                  </span>

                  <span className="text-[10px] font-mono px-2 py-1 rounded border border-hm-border bg-hm-surface2/30 text-hm-muted uppercase">
                    Destino: {destinoLabel}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {tieneAlertas && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold animate-pulse">
                    ⚠️ ACTIVO EN RIESGO
                  </div>
                )}

                <div className="bg-hm-surface2 rounded px-3 py-1 text-right">
                  <div className="text-[10px] font-mono text-hm-muted tracking-widest uppercase">
                    {medidor}
                  </div>
                  <div className="text-lg font-bold text-hm-accent">
                    {maquina.horometro_actual || 0}{' '}
                    <span className="text-xs font-normal">{medidorUnidad}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 border-b border-hm-border mb-4 overflow-x-auto no-scrollbar scroll-smooth">
              <TabBtn active={tab === 'datos'} onClick={() => setTab('datos')}>
                DATOS
              </TabBtn>
              <TabBtn active={tab === 'operacion'} onClick={() => setTab('operacion')}>
                OPERACIÓN
              </TabBtn>
              <TabBtn active={tab === 'taller'} onClick={() => setTab('taller')}>
                {moduloTaller.toUpperCase()}
              </TabBtn>
              <TabBtn active={tab === 'costos'} onClick={() => setTab('costos')}>
                COSTOS
              </TabBtn>
              <TabBtn active={tab === 'rentabilidad'} onClick={() => setTab('rentabilidad')}>
                RENTABILIDAD
              </TabBtn>
              <TabBtn
                active={tab === 'documentacion'}
                onClick={() => setTab('documentacion')}
              >
                DOCUMENTACIÓN
              </TabBtn>
              <TabBtn active={tab === 'garantias'} onClick={() => setTab('garantias')}>
                GARANTÍAS
              </TabBtn>

              {isRental && (
                <TabBtn active={tab === 'rental'} onClick={() => setTab('rental')}>
                  RENTAL
                </TabBtn>
              )}

              <TabBtn active={tab === 'riesgo'} onClick={() => setTab('riesgo')}>
                RIESGO
              </TabBtn>
              <TabBtn active={tab === 'timeline'} onClick={() => setTab('timeline')}>
                TIMELINE
              </TabBtn>
            </div>

            <div className="min-h-[400px]">
              {tab === 'datos' && (
                <div className="flex flex-col gap-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Kpi label="Titularidad" value={titularidadLabel} sub={propietarioLabel} />
                    <Kpi label="Destino Operativo" value={destinoLabel} />
                    <Kpi
                      label="Criticidad"
                      value={isRental ? 'Alta Rental' : propiedadActivo === 'cliente' ? 'Cliente' : 'Media'}
                      color={isRental ? 'text-amber-400' : 'text-green-400'}
                    />
                    <Kpi
                      label="Health Score"
                      value={`${healthScore}/100`}
                      color={hsColor}
                      sub="Salud operativa"
                    />
                  </div>

                  <div className="bg-hm-surface2/20 border border-hm-border/40 rounded-xl p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div>
                        <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest">
                          Titularidad del activo
                        </div>
                        <div className="text-sm text-hm-muted mt-1">
                          Preparado para control de permisos: solo perfiles altos deberían modificar propietario o destino operativo.
                        </div>
                      </div>

                      {isOwner && (
                        <div className="text-[10px] font-mono text-hm-accent border border-hm-accent/30 rounded px-2 py-1">
                          EDICIÓN HABILITADA POR ROL
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <DataCard label="Propietario / cliente" value={propietarioLabel} />
                      <DataCard label="Titularidad" value={titularidadLabel} />
                      <DataCard label="Destino operativo" value={destinoLabel} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {[
                      ['N° Interno', maquina.interno],
                      ['Identificación / Serie / Patente', identificacionActivo],
                      ['Tipo', maquina.tipo],
                      ['Marca', maquina.marca],
                      ['Modelo', maquina.modelo],
                      ['Año', maquina.anio],
                      ['N° Chasis / Serie', maquina.chasis || maquina.numero_serie],
                      ['Motor', maquina.motor],
                      ['Responsable', maquina.responsable],
                    ].map(([label, value]) => (
                      <DataCard key={label} label={label} value={value} />
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t border-hm-border flex justify-between">
                    {isOwner && (
                      <Button
                        variant="danger"
                        onClick={() => setConfirmBaja(true)}
                        disabled={loadingBaja}
                      >
                        Dar de baja {activoSingular.toLowerCase()}
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      onClick={onClose}
                      className={!isOwner ? 'ml-auto' : ''}
                    >
                      Cerrar ficha
                    </Button>
                  </div>
                </div>
              )}

              {tab === 'operacion' && (
                <div className="flex flex-col gap-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
                    <div className="bg-hm-surface2/20 border border-hm-border/40 rounded-lg p-3">
                      <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-1">
                        Disponibilidad Real
                      </div>
                      <div className={`text-xl font-bold ${hsColor}`}>{healthScore}%</div>
                      <div className="text-[10px] text-hm-muted mt-0.5">
                        Basado en historial operativo
                      </div>
                    </div>

                    <div className="bg-hm-surface2/20 border border-hm-border/40 rounded-lg p-3">
                      <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-1">
                        Downtime Acumulado
                      </div>
                      <div className="text-xl font-bold text-orange-400">
                        {maquina.tiempo_detenido_horas || 0}{' '}
                        <span className="text-xs font-normal">{medidorUnidad}</span>
                      </div>
                      <div className="text-[10px] text-hm-muted mt-0.5">
                        Tiempo fuera de servicio
                      </div>
                    </div>

                    <div className="bg-hm-surface2/20 border border-hm-border/40 rounded-lg p-3">
                      <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-1">
                        Cost of Downtime
                      </div>
                      <div className="text-xl font-bold text-red-400">
                        {formatUSD(costoDowntimeTotal)}
                      </div>
                      <div className="text-[10px] text-hm-muted mt-0.5">
                        {formatUSD(costOfDowntimePorUnidad)}/{medidorUnidad} estimado
                      </div>
                    </div>

                    <div className="bg-hm-surface2/20 border border-hm-border/40 rounded-lg p-3">
                      <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-1">
                        Fallas Repetidas
                      </div>
                      <div
                        className={`text-xl font-bold ${
                          fallasRepetidas > 2
                            ? 'text-red-400'
                            : fallasRepetidas > 0
                              ? 'text-orange-400'
                              : 'text-green-400'
                        }`}
                      >
                        {fallasRepetidas}
                      </div>
                      <div className="text-[10px] text-hm-muted mt-0.5">
                        Reincidencias
                      </div>
                    </div>
                  </div>

                  <div className="bg-hm-surface2/20 border border-hm-border/40 rounded-lg p-3 mb-2 flex justify-between items-center">
                    <div>
                      <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-0.5">
                        Lectura actual de {medidor}
                      </div>
                      <div className="text-sm text-hm-muted">
                        Registro operativo del activo
                      </div>
                    </div>
                    <div className="text-xl font-bold text-hm-text">
                      {maquina.horometro_actual || 0}{' '}
                      <span className="text-xs font-normal">{medidorUnidad}</span>
                    </div>
                  </div>

                  <form
                    onSubmit={handleAddHorometro}
                    className="bg-hm-surface2/30 border border-hm-border rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
                  >
                    <Input
                      label={`Lectura (${medidorUnidad})`}
                      type="number"
                      value={horoForm.horometro_valor}
                      onChange={(e) =>
                        setHoroForm((prev) => ({
                          ...prev,
                          horometro_valor: e.target.value,
                        }))
                      }
                      required
                    />

                    <Input
                      label="Fecha"
                      type="date"
                      value={horoForm.fecha_lectura}
                      onChange={(e) =>
                        setHoroForm((prev) => ({
                          ...prev,
                          fecha_lectura: e.target.value,
                        }))
                      }
                    />

                    <Input
                      label="Nota"
                      value={horoForm.observacion}
                      onChange={(e) =>
                        setHoroForm((prev) => ({
                          ...prev,
                          observacion: e.target.value,
                        }))
                      }
                      placeholder="Opcional"
                    />

                    <Button
                      type="submit"
                      variant="primary"
                      disabled={savingHoro}
                      className="w-full h-[42px]"
                    >
                      {savingHoro ? 'GUARDANDO...' : 'REGISTRAR LECTURA'}
                    </Button>
                  </form>

                  <div className="max-h-[300px] overflow-y-auto pr-2">
                    {loadingHoro ? (
                      <div className="h-20 bg-hm-surface2 rounded animate-pulse" />
                    ) : horometros.length === 0 ? (
                      <EmptyState
                        icon="⏱️"
                        title="Sin lecturas"
                        desc={`No hay historial de ${medidor.toLowerCase()} registrado.`}
                      />
                    ) : (
                      <div className="flex flex-col gap-2">
                        {horometros.map((h) => (
                          <div
                            key={h.id}
                            className="flex items-center justify-between bg-hm-surface2/20 rounded px-4 py-3 border border-hm-border/50 text-sm hover:bg-hm-surface2/40 transition-colors"
                          >
                            <span className="font-mono text-hm-accent font-bold text-lg">
                              {h.lectura_horas}
                            </span>
                            <div className="text-right">
                              <span className="text-xs font-mono text-hm-muted block">
                                {h.fecha_lectura}
                              </span>
                              {h.notas && (
                                <span className="text-xs text-hm-muted max-w-[200px] truncate block">
                                  {h.notas}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {tab === 'taller' && (
                <div className="flex flex-col gap-5">
                  {svc ? (
                    <div className="bg-hm-surface2/30 border border-hm-border p-6 rounded-xl mb-2">
                      <h3 className="font-bold text-lg mb-4">
                        Estado del mantenimiento
                      </h3>

                      <div className="flex justify-between text-sm font-mono text-hm-muted mb-2">
                        <span>PRÓXIMO SERVICE</span>
                        <span
                          className={
                            svc.color === 'red'
                              ? 'text-red-400 font-bold'
                              : svc.color === 'yellow'
                                ? 'text-yellow-400 font-bold'
                                : 'text-green-400 font-bold'
                          }
                        >
                          {svc.estado === 'vencido'
                            ? `VENCIDO ${Math.abs(svc.restantes).toFixed(0)}${medidorUnidad}`
                            : `${svc.restantes.toFixed(0)}${medidorUnidad} restantes`}
                        </span>
                      </div>

                      <div className="h-3 bg-hm-surface2 rounded-full overflow-hidden mb-3">
                        <div
                          className={`h-full rounded-full transition-all ${
                            svc.estado === 'vencido'
                              ? 'bg-red-500'
                              : svc.estado === 'urgente'
                                ? 'bg-red-400'
                                : svc.estado === 'proximo'
                                  ? 'bg-yellow-400'
                                  : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(svc.pct, 100)}%` }}
                        />
                      </div>

                      {(() => {
                        const pred = predecirService(maquina, horometros)

                        if (!pred) return null

                        return (
                          <div
                            className={`text-xs font-mono p-3 rounded-lg border ${
                              pred.alerta
                                ? 'bg-orange-500/10 border-orange-500/20 text-orange-400'
                                : 'bg-hm-surface2 border-hm-border text-hm-muted'
                            }`}
                          >
                            ⏱ Predicción de sistema: <strong>{pred.label}</strong>{' '}
                            (Ritmo: {pred.horasPorDia}
                            {medidorUnidad}/día)
                          </div>
                        )
                      })()}
                    </div>
                  ) : (
                    <EmptyState
                      icon="⚙️"
                      title="Sin métricas de mantenimiento"
                      desc="No se ha configurado la frecuencia de service para este activo."
                    />
                  )}

                  <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-1 mt-2">
                    Historial de {ordenTrabajoPlural}
                  </div>

                  <div className="max-h-[300px] overflow-y-auto pr-2 flex flex-col gap-3">
                    {ots.length === 0 ? (
                      <EmptyState
                        icon="🔧"
                        title={`Sin ${ordenTrabajoPlural}`}
                        desc="No registra órdenes de trabajo históricas."
                      />
                    ) : (
                      ots.map((ot) => (
                        <div
                          key={ot.id}
                          className="bg-hm-surface2/20 p-4 rounded-lg border border-hm-border/50 hover:border-hm-accent/30 transition-colors group/ot"
                        >
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-bold text-hm-accent">
                              OT #{ot.numero_ot}
                            </span>
                            <Badge
                              variant={
                                ot.estado === 'completada' || ot.estado === 'facturada'
                                  ? 'success'
                                  : ot.estado === 'cancelada'
                                    ? 'danger'
                                    : 'warning'
                              }
                            >
                              {String(ot.estado || 'pendiente').replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>

                          <p className="text-sm text-hm-text mb-3">
                            {ot.descripcion_trabajo || 'Sin descripción'}
                          </p>

                          <div className="flex justify-between items-center text-xs font-mono text-hm-muted">
                            <span>Fecha: {ot.fecha_ingreso}</span>

                            <div className="flex items-center gap-3">
                              <span>Mano de obra: {ot.horas_mano_obra || 0}h</span>
                              <span className="text-hm-text font-bold">
                                TOTAL: {formatUSD(ot.total_usd)}
                              </span>
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

              {tab === 'documentacion' && (
                <EmptyState
                  icon="📄"
                  title="Documentación técnica"
                  desc="Base preparada para manuales, seguros, habilitaciones, certificados, evidencias y documentación ISO del activo."
                />
              )}

              {tab === 'garantias' && (
                <EmptyState
                  icon="🛡️"
                  title="Garantías y cobertura"
                  desc="Base preparada para garantía de fábrica, garantías de servicio, vencimientos y condiciones comerciales asociadas."
                />
              )}

              {tab === 'costos' &&
                (() => {
                  const costoTotalMaq = stats.totalGastos || 0
                  const repuestosMaq = totalRepuestos || 0
                  const manoObraMaq = totalManoObra || 0

                  const pctRep =
                    costoTotalMaq > 0 ? Math.round((repuestosMaq / costoTotalMaq) * 100) : 0

                  const pctMO =
                    costoTotalMaq > 0 ? Math.round((manoObraMaq / costoTotalMaq) * 100) : 0

                  return (
                    <div className="flex flex-col gap-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
                          <div className="text-xs font-mono text-red-400 mb-2 tracking-widest">
                            TOTAL REPUESTOS / INSUMOS
                          </div>
                          <div className="text-3xl font-bold text-hm-text mb-1">
                            {formatUSD(repuestosMaq)}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 h-1.5 bg-hm-surface2 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-red-500 rounded-full"
                                style={{ width: `${pctRep}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono text-red-400">
                              {pctRep}%
                            </span>
                          </div>
                        </div>

                        <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-5">
                          <div className="text-xs font-mono text-orange-400 mb-2 tracking-widest">
                            TOTAL MANO DE OBRA
                          </div>
                          <div className="text-3xl font-bold text-hm-text mb-1">
                            {formatUSD(manoObraMaq)}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 h-1.5 bg-hm-surface2 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-orange-500 rounded-full"
                                style={{ width: `${pctMO}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono text-orange-400">
                              {pctMO}%
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-2">
                          Desglose de costos
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                          {[
                            { label: 'Mantenimiento', value: repuestosMaq, color: 'text-red-400' },
                            { label: 'Mano de obra', value: manoObraMaq, color: 'text-orange-400' },
                            { label: 'Cubiertas', value: null, color: 'text-hm-muted', placeholder: true },
                            { label: 'Combustible', value: null, color: 'text-yellow-400', placeholder: true },
                            { label: 'Otros', value: null, color: 'text-hm-muted', placeholder: true },
                          ].map(({ label, value, color, placeholder }) => (
                            <div
                              key={label}
                              className="bg-hm-surface2/20 border border-hm-border/40 rounded-lg p-3 flex flex-col justify-between"
                            >
                              <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mb-0.5">
                                {label}
                              </div>
                              <div
                                className={`text-base font-bold mt-1 ${
                                  placeholder ? 'text-hm-muted/40' : color
                                }`}
                              >
                                {placeholder ? (
                                  <span className="text-[9px] bg-hm-surface2/50 px-1.5 py-0.5 rounded border border-hm-border font-normal">
                                    [PREP]
                                  </span>
                                ) : (
                                  formatUSD(value)
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-2">
                          Lecturas y uso
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          <div className="bg-hm-surface2/20 border border-hm-border/40 rounded-lg p-3">
                            <div className="text-[9px] font-mono text-hm-muted uppercase mb-0.5">
                              {medidor} actual
                            </div>
                            <div className="text-lg font-bold">
                              {maquina.horometro_actual
                                ? `${maquina.horometro_actual}${medidorUnidad}`
                                : 'Sin datos'}
                            </div>
                          </div>

                          <div className="bg-hm-surface2/20 border border-hm-border/40 rounded-lg p-3">
                            <div className="text-[9px] font-mono text-hm-muted uppercase mb-0.5">
                              Tiempo detenido
                            </div>
                            <div className="text-lg font-bold text-red-400">
                              {maquina.tiempo_detenido_horas
                                ? `${maquina.tiempo_detenido_horas}${medidorUnidad}`
                                : `0${medidorUnidad}`}
                            </div>
                          </div>

                          <div className="bg-hm-surface2/20 border border-hm-border/40 rounded-lg p-3">
                            <div className="text-[9px] font-mono text-hm-muted uppercase mb-0.5">
                              {ordenTrabajoPlural}
                            </div>
                            <div className="text-lg font-bold text-orange-400">
                              {ots.length}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-hm-surface2/30 border border-hm-border rounded-xl p-5 flex justify-between items-center">
                        <div>
                          <div className="text-xs font-mono text-hm-muted mb-1 tracking-widest">
                            COSTO ACUMULADO TOTAL
                          </div>
                          <div className="text-sm text-hm-muted">
                            Suma de repuestos, servicios y otros gastos imputados.
                          </div>
                        </div>
                        <div className="text-2xl font-bold font-mono">
                          {formatUSD(costoTotalMaq)}
                        </div>
                      </div>
                    </div>
                  )
                })()}

              {tab === 'rentabilidad' &&
                (() => {
                  const ingresosMaq = stats.totalIngresos || 0
                  const gastosMaq = stats.totalGastos || 0
                  const rentabilidad = ingresosMaq - gastosMaq
                  const roi =
                    gastosMaq > 0 ? ((rentabilidad / gastosMaq) * 100).toFixed(1) : 0
                  const disponibilidad = maquina.score_disponibilidad || 100
                  const horasDetenidas = maquina.tiempo_detenido_horas || 0

                  const riesgoActivo =
                    rentabilidad < 0
                      ? 'critica'
                      : disponibilidad < 70
                        ? 'observar'
                        : 'rentable'

                  const RIESGO_ACTIVO = {
                    rentable: {
                      label: 'RENTABLE',
                      cls: 'bg-green-500/20 text-green-300 border-green-500/40',
                    },
                    observar: {
                      label: 'OBSERVAR',
                      cls: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
                    },
                    critica: {
                      label: 'CRÍTICA',
                      cls: 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse',
                    },
                  }

                  const badgeActivo = RIESGO_ACTIVO[riesgoActivo]

                  return (
                    <div className="flex flex-col gap-5">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${badgeActivo.cls}`}
                        >
                          <span className="w-2 h-2 rounded-full bg-current" />
                          {badgeActivo.label}
                        </span>
                        <span className="text-xs text-hm-muted font-mono">
                          {ots.length} {ordenTrabajoPlural} · Disponibilidad:{' '}
                          {disponibilidad}%
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-blue-500/5 border-l-4 border-l-blue-500 p-5 rounded-r-xl">
                          <div className="text-xs font-mono text-blue-400 mb-1 uppercase">
                            Ingresos generados
                          </div>
                          <div className="text-2xl font-bold text-hm-text">
                            {formatUSD(ingresosMaq)}
                          </div>
                          <div className="text-[10px] text-hm-muted mt-1">
                            Servicios, contratos u operaciones asociadas
                          </div>
                        </div>

                        <div className="bg-red-500/5 border-l-4 border-l-red-500 p-5 rounded-r-xl">
                          <div className="text-xs font-mono text-red-400 mb-1 uppercase">
                            Costo acumulado
                          </div>
                          <div className="text-2xl font-bold text-hm-text">
                            {formatUSD(gastosMaq)}
                          </div>
                          <div className="text-[10px] text-hm-muted mt-1">
                            Repuestos + mano de obra
                          </div>
                        </div>

                        <div
                          className={`border-l-4 p-5 rounded-r-xl ${
                            rentabilidad >= 0
                              ? 'bg-green-500/5 border-l-green-500'
                              : 'bg-orange-500/5 border-l-orange-500'
                          }`}
                        >
                          <div
                            className={`text-xs font-mono mb-1 uppercase ${
                              rentabilidad >= 0 ? 'text-green-400' : 'text-orange-400'
                            }`}
                          >
                            Rentabilidad neta
                          </div>
                          <div className="text-2xl font-bold text-hm-text">
                            {formatUSD(rentabilidad)}
                          </div>
                          <div
                            className={`text-[10px] mt-1 font-mono font-bold ${
                              Number(roi) >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}
                          >
                            ROI: {roi}%
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-2">
                          Disponibilidad operativa
                        </div>

                        <div className="bg-hm-surface2/20 border border-hm-border rounded-xl p-5">
                          <div className="flex items-center justify-between mb-3">
                            <div className="text-4xl font-black text-hm-text">
                              {disponibilidad}%
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-hm-muted">
                                Tiempo detenido
                              </div>
                              <div className="text-sm font-bold text-red-400">
                                {horasDetenidas}
                                {medidorUnidad}
                              </div>
                            </div>
                          </div>

                          <div className="h-3 bg-hm-surface2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                disponibilidad >= 85
                                  ? 'bg-green-500'
                                  : disponibilidad >= 70
                                    ? 'bg-yellow-500'
                                    : 'bg-red-500'
                              }`}
                              style={{ width: `${disponibilidad}%` }}
                            />
                          </div>

                          <div className="flex justify-between text-[10px] text-hm-muted mt-1">
                            <span>0%</span>
                            <span>50%</span>
                            <span>100%</span>
                          </div>
                        </div>
                      </div>

                      {isRental && (
                        <>
                          <h3 className="font-mono text-sm text-hm-muted mt-2 tracking-widest uppercase">
                            Historial de rental
                          </h3>

                          <div className="max-h-[200px] overflow-y-auto pr-2 flex flex-col gap-2">
                            {contratos.length === 0 ? (
                              <p className="text-xs text-hm-muted italic">
                                Sin contratos registrados.
                              </p>
                            ) : (
                              contratos.map((contrato) => (
                                <div
                                  key={contrato.id}
                                  className="bg-hm-surface2/20 p-3 rounded-lg border border-hm-border/50 flex justify-between items-center text-sm"
                                >
                                  <div>
                                    <div className="font-bold text-blue-400">
                                      Contrato #{contrato.numero_contrato}
                                    </div>
                                    <div className="text-xs text-hm-muted">
                                      {contrato.cliente?.razon_social} |{' '}
                                      {contrato.fecha_inicio} a {contrato.fecha_fin}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xs text-hm-muted">
                                      {formatUSD(contrato.tarifa_diaria_usd)}/día
                                    </div>
                                    <div className="font-bold">
                                      {formatUSD(contrato.total_contrato_usd)}
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })()}

              {tab === 'rental' && isRental && (
                <div className="flex flex-col gap-5">
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-5">
                    <div className="text-xs font-mono text-blue-400 mb-1 uppercase tracking-widest">
                      Gestión rental
                    </div>
                    <div className="text-2xl font-bold text-hm-text">
                      {formatUSD(maquina.tarifa_diaria_usd || 0)}
                      <span className="text-xs font-normal text-hm-muted"> / día</span>
                    </div>
                    <div className="text-xs text-hm-muted mt-2">
                      Este bloque solo aparece si el rubro permite alquileres y el activo está clasificado como propio destinado a rental.
                    </div>
                  </div>

                  <div className="max-h-[260px] overflow-y-auto pr-2 flex flex-col gap-2">
                    {contratos.length === 0 ? (
                      <EmptyState
                        icon="🚜"
                        title="Sin contratos rental"
                        desc="Base preparada para contratos de alquiler, remitos de entrega, devoluciones y trazabilidad de uso."
                      />
                    ) : (
                      contratos.map((contrato) => (
                        <div
                          key={contrato.id}
                          className="bg-hm-surface2/20 p-3 rounded-lg border border-hm-border/50 flex justify-between items-center text-sm"
                        >
                          <div>
                            <div className="font-bold text-blue-400">
                              Contrato #{contrato.numero_contrato}
                            </div>
                            <div className="text-xs text-hm-muted">
                              {contrato.cliente?.razon_social} | {contrato.fecha_inicio} a{' '}
                              {contrato.fecha_fin}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-hm-muted">
                              {formatUSD(contrato.tarifa_diaria_usd)}/día
                            </div>
                            <div className="font-bold">
                              {formatUSD(contrato.total_contrato_usd)}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {tab === 'riesgo' && (
                <div className="flex flex-col gap-4">
                  <div className="flex justify-center mb-2">
                    <div
                      className={`px-6 py-3 rounded-xl border flex flex-col items-center ${RIESGO_STYLE[nivelRiesgo]}`}
                    >
                      <div className="text-xs font-mono uppercase tracking-widest opacity-80 mb-1">
                        Estado de riesgo
                      </div>
                      <div className="text-2xl font-black tracking-tight">
                        {nivelRiesgo}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-hm-surface2/30 border border-hm-border p-5 rounded-xl text-center flex flex-col items-center">
                      <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-2 flex gap-2">
                        Fallas repetidas
                      </div>
                      <div
                        className={`text-4xl font-bold mb-1 ${
                          fallasRepetidas > 2
                            ? 'text-red-400'
                            : fallasRepetidas > 0
                              ? 'text-orange-400'
                              : 'text-green-400'
                        }`}
                      >
                        {fallasRepetidas}
                      </div>
                      <div className="text-xs text-hm-muted mt-1">
                        {fallasRepetidas > 2
                          ? 'Patrón anómalo detectado. Activo inestable.'
                          : fallasRepetidas > 0
                            ? 'Posibles reincidencias, monitorear.'
                            : 'Activo sin patrones de falla repetitiva.'}
                      </div>
                    </div>

                    <div className="bg-hm-surface2/30 border border-hm-border p-5 rounded-xl text-center flex flex-col items-center">
                      <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-2">
                        Vencimientos críticos
                      </div>
                      <div
                        className={`text-xl font-bold mb-1 ${
                          svcAlert ? 'text-red-400' : 'text-green-400'
                        }`}
                      >
                        {svcAlert ? 'SERVICE URGENTE' : 'AL DÍA'}
                      </div>
                      <div className="text-xs text-hm-muted mt-1">
                        {svcAlert
                          ? 'El activo requiere mantenimiento inmediato para evitar fallas mayores.'
                          : 'Sin vencimientos operativos a corto plazo.'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

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
        title={`Dar de baja ${activoSingular.toLowerCase()}`}
        message={`¿Confirmás que querés dar de baja "${maquina?.nombre_unidad}"? El activo quedará inactivo y no aparecerá en la operación activa.`}
        confirmLabel="Dar de baja"
        variant="danger"
      />
    </>
  )
}
