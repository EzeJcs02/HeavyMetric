import { useMemo, useState } from 'react'
import Modal from '../../ui/Modal'
import Input from '../../ui/Input'
import Button from '../../ui/Button'
import { useAuth } from '../../../context/AuthContext'
import { useRubro } from '../../../context/RubroContext'

const TIPOS_INTERVENCION = [
  'Mantenimiento preventivo',
  'Mantenimiento correctivo',
  'Diagnóstico',
  'Inspección',
  'Garantía',
  'Instalación',
  'Puesta en marcha',
  'Reparación general',
  'Visita técnica',
  'Otro',
]

export default function ModalNuevaOT({
  isOpen,
  onClose,
  maquinas = [],
  clientes = [],
  onConfirm,
}) {
  const { user, perfil } = useAuth()
  const { taxonomia, hasCapability } = useRubro()

  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    maquina_id: '',
    cliente_id: '',
    fecha_ingreso: new Date().toISOString().split('T')[0],
    descripcion_trabajo: '',
    horas_mano_obra: 0,
    precio_hora_usd: 45,
    prioridad: 'normal',
    tipo_intervencion: 'Mantenimiento correctivo',
    criticidad: 'media',
    origen_operacion: 'interna',
    requiere_evidencia: true,
  })

  const activoSingular =
    taxonomia?.activoSingular || 'Activo'

  const ordenTrabajo =
    taxonomia?.ordenTrabajo || 'Orden de Trabajo'

  const moduloTaller =
    taxonomia?.moduloTaller || 'Taller'

  const permiteAlquileres =
    hasCapability?.('alquileres') === true

  const maquinasDisponibles = useMemo(() => {
    return maquinas.filter((m) => {
      if (!m?.activa) return false

      const propiedadActivo =
        m?.propiedad_activo ||
        (m?.cliente_id ? 'cliente' : 'propio')

      const destinoOperativo =
        m?.destino_operativo ||
        (m?.en_alquiler
          ? 'rental'
          : propiedadActivo === 'cliente'
            ? 'servicio_tecnico'
            : 'uso_interno')

      if (
        !permiteAlquileres &&
        destinoOperativo === 'rental'
      ) {
        return false
      }

      return true
    })
  }, [maquinas, permiteAlquileres])

  const activoSeleccionado = useMemo(() => {
    return maquinasDisponibles.find(
      (m) => String(m.id) === String(formData.maquina_id)
    )
  }, [formData.maquina_id, maquinasDisponibles])

  const propiedadActivo =
    activoSeleccionado?.propiedad_activo ||
    (activoSeleccionado?.cliente_id
      ? 'cliente'
      : 'propio')

  const destinoOperativo =
    activoSeleccionado?.destino_operativo ||
    (activoSeleccionado?.en_alquiler
      ? 'rental'
      : propiedadActivo === 'cliente'
        ? 'servicio_tecnico'
        : 'uso_interno')

  const isRental =
    permiteAlquileres &&
    propiedadActivo === 'propio' &&
    destinoOperativo === 'rental'

  const identificacionActivo =
    activoSeleccionado?.patente ||
    activoSeleccionado?.interno ||
    activoSeleccionado?.numero_serie ||
    activoSeleccionado?.chasis ||
    null

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target

    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? checked
          : value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (
      !formData.maquina_id ||
      !formData.cliente_id
    ) {
      return
    }

    setLoading(true)

    try {
      await onConfirm({
        ...formData,
        horas_mano_obra: Number(formData.horas_mano_obra),
        precio_hora_usd: Number(formData.precio_hora_usd),

        estado: 'en_progreso',

        supervisor_id: user?.id,
        organization_id: perfil?.organization_id,

        metadata_iso: {
          creado_por: user?.id,
          fecha_creacion: new Date().toISOString(),
          criticidad: formData.criticidad,
          requiere_evidencia:
            formData.requiere_evidencia,
          origen_operacion:
            formData.origen_operacion,
          tipo_intervencion:
            formData.tipo_intervencion,
        },
      })

      onClose()

      setFormData({
        maquina_id: '',
        cliente_id: '',
        fecha_ingreso: new Date().toISOString().split('T')[0],
        descripcion_trabajo: '',
        horas_mano_obra: 0,
        precio_hora_usd: 45,
        prioridad: 'normal',
        tipo_intervencion: 'Mantenimiento correctivo',
        criticidad: 'media',
        origen_operacion: 'interna',
        requiere_evidencia: true,
      })
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Nueva ${ordenTrabajo}`}
      maxWidth="max-w-3xl"
    >
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-6"
      >
        <div className="bg-hm-surface2/20 border border-hm-border rounded-xl p-4">
          <div className="text-xs font-mono text-hm-accent uppercase tracking-widest mb-3">
            ACTIVO OPERATIVO
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono text-hm-muted tracking-wider uppercase">
                {activoSingular}
              </label>

              <select
                name="maquina_id"
                value={formData.maquina_id}
                onChange={handleChange}
                required
                className="bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent focus:ring-1 focus:ring-hm-accent/30 transition-colors"
              >
                <option value="">
                  Seleccionar activo...
                </option>

                {maquinasDisponibles.map((m) => (
                  <option
                    key={m.id}
                    value={m.id}
                  >
                    {m.nombre_unidad}
                    {m.tipo ? ` — ${m.tipo}` : ''}
                    {m.marca ? ` — ${m.marca}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono text-hm-muted tracking-wider uppercase">
                Cliente responsable
              </label>

              <select
                name="cliente_id"
                value={formData.cliente_id}
                onChange={handleChange}
                required
                className="bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent focus:ring-1 focus:ring-hm-accent/30 transition-colors"
              >
                <option value="">
                  Seleccionar cliente...
                </option>

                {clientes.map((c) => (
                  <option
                    key={c.id}
                    value={c.id}
                  >
                    {c.razon_social}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {activoSeleccionado && (
            <div className="mt-4 bg-hm-surface2/40 border border-hm-border rounded-lg p-3">
              <div className="flex flex-wrap gap-2 mb-2">
                <span className="text-[10px] font-mono px-2 py-1 rounded border border-hm-border bg-hm-surface2 text-hm-muted uppercase">
                  {activoSeleccionado.tipo || 'Activo'}
                </span>

                {isRental && (
                  <span className="text-[10px] font-mono px-2 py-1 rounded border border-blue-500/30 text-blue-400 bg-blue-500/5 uppercase">
                    RENTAL
                  </span>
                )}

                {propiedadActivo === 'cliente' && (
                  <span className="text-[10px] font-mono px-2 py-1 rounded border border-orange-500/30 text-orange-400 bg-orange-500/5 uppercase">
                    CLIENTE
                  </span>
                )}
              </div>

              <div className="text-sm text-hm-text">
                {activoSeleccionado.nombre_unidad}
              </div>

              <div className="text-xs text-hm-muted mt-1">
                {[activoSeleccionado.marca, activoSeleccionado.modelo]
                  .filter(Boolean)
                  .join(' · ')}

                {identificacionActivo && (
                  <span>
                    {' '}
                    — ID: {identificacionActivo}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Fecha de ingreso"
            name="fecha_ingreso"
            type="date"
            value={formData.fecha_ingreso}
            onChange={handleChange}
            required
          />

          <div className="flex flex-col gap-1">
            <label className="text-xs font-mono text-hm-muted tracking-wider uppercase">
              Prioridad
            </label>

            <select
              name="prioridad"
              value={formData.prioridad}
              onChange={handleChange}
              className="bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent"
            >
              <option value="normal">
                Normal
              </option>

              <option value="urgente">
                Urgente
              </option>

              <option value="critica">
                Crítica
              </option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-mono text-hm-muted tracking-wider uppercase">
              Criticidad operativa
            </label>

            <select
              name="criticidad"
              value={formData.criticidad}
              onChange={handleChange}
              className="bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent"
            >
              <option value="baja">
                Baja
              </option>

              <option value="media">
                Media
              </option>

              <option value="alta">
                Alta
              </option>

              <option value="critica">
                Crítica
              </option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-mono text-hm-muted tracking-wider uppercase">
              Tipo de intervención
            </label>

            <select
              name="tipo_intervencion"
              value={formData.tipo_intervencion}
              onChange={handleChange}
              className="bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent"
            >
              {TIPOS_INTERVENCION.map((tipo) => (
                <option
                  key={tipo}
                  value={tipo}
                >
                  {tipo}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-mono text-hm-muted tracking-wider uppercase">
              Origen operativo
            </label>

            <select
              name="origen_operacion"
              value={formData.origen_operacion}
              onChange={handleChange}
              className="bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent"
            >
              <option value="interna">
                Operación interna
              </option>

              <option value="cliente">
                Servicio a cliente
              </option>

              {permiteAlquileres && (
                <option value="rental">
                  Rental / alquiler
                </option>
              )}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono text-hm-muted mb-1 uppercase tracking-wider">
            Descripción del trabajo
          </label>

          <textarea
            name="descripcion_trabajo"
            value={formData.descripcion_trabajo}
            onChange={handleChange}
            required
            rows={4}
            className="w-full bg-hm-surface2 border border-hm-border rounded-lg p-3 text-hm-text focus:outline-none focus:border-hm-accent focus:ring-1 focus:ring-hm-accent/30 resize-none"
            placeholder={`Describir tareas, falla reportada, diagnóstico o intervención del ${activoSingular.toLowerCase()}...`}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Horas estimadas"
            name="horas_mano_obra"
            type="number"
            value={formData.horas_mano_obra}
            onChange={handleChange}
          />

          <Input
            label="Valor hora (USD)"
            name="precio_hora_usd"
            type="number"
            value={formData.precio_hora_usd}
            onChange={handleChange}
          />
        </div>

        <div className="bg-hm-surface2/20 border border-hm-border rounded-xl p-4">
          <div className="text-xs font-mono text-hm-accent uppercase tracking-widest mb-3">
            TRAZABILIDAD ISO
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm text-hm-text">
                Requerir evidencias
              </div>

              <div className="text-xs text-hm-muted mt-1">
                Preparado para fotos, firma digital, checklist y evidencias offline desde App Campo.
              </div>
            </div>

            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="requiere_evidencia"
                checked={formData.requiere_evidencia}
                onChange={handleChange}
                className="accent-cyan-400"
              />

              <span className="text-xs font-mono text-hm-muted uppercase">
                Evidencia obligatoria
              </span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-hm-border">
          <Button
            variant="outline"
            type="button"
            onClick={onClose}
            disabled={loading}
          >
            CANCELAR
          </Button>

          <Button
            type="submit"
            variant="primary"
            disabled={loading}
          >
            {loading
              ? 'CREANDO...'
              : `CREAR ${ordenTrabajo.toUpperCase()}`}
          </Button>
        </div>
      </form>
    </Modal>
  )
}