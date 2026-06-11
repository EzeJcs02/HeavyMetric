import { useState, useEffect, useMemo } from 'react'
import Modal from '../../ui/Modal'
import Input from '../../ui/Input'
import Button from '../../ui/Button'
import { useRubro } from '../../../context/RubroContext'

const TIPOS_ACTIVO = [
  'activo operativo',
  'vehículo',
  'camión',
  'camioneta',
  'auto',
  'maquinaria pesada',
  'maquinaria compacta',
  'grupo electrógeno',
  'compresor',
  'bomba',
  'autoelevador',
  'implemento',
  'herramienta',
  'equipo técnico',
  'equipo menor',
  'otro',
]

const ESTADOS_OPERATIVOS = [
  'Operativo',
  'En mantenimiento',
  'En taller',
  'Esperando repuesto',
  'Fuera de servicio',
  'Baja',
]

const EMPTY = {
  nombre_unidad: '',
  tipo: 'activo operativo',
  estado_operativo: 'Operativo',
  marca: '',
  modelo: '',
  patente: '',
  anio: '',
  numero_serie: '',
  horometro_actual: 0,
  ultimo_service_horas: 0,
  frecuencia_service: 250,
  tarifa_diaria_usd: 0,
  cliente_id: '',
  ubicacion: '',
  notas: '',
  propiedad_activo: 'propio',
  destino_operativo: 'uso_interno',
}

function DataBadge({ type = 'real' }) {
  const styles = {
    real: 'border-green-500/30 bg-green-500/10 text-green-300',
    prep: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300',
    empty: 'border-hm-border bg-hm-surface2/40 text-hm-muted',
  }

  const labels = {
    real: 'REAL',
    prep: 'BASE PREPARADA',
    empty: 'SIN DATOS',
  }

  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest ${styles[type]}`}>
      {labels[type]}
    </span>
  )
}

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export default function ModalMaquina({
  isOpen,
  onClose,
  maquina,
  clientes = [],
  onConfirm,
}) {
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)

  const { taxonomia, hasCapability } = useRubro()

  const activoSingular = taxonomia?.activoSingular || 'Activo'
  const activoPlural = taxonomia?.activoPlural || 'Activos'
  const medidor = taxonomia?.medidor || 'Horómetro'
  const medidorUnidad = taxonomia?.medidorUnidad || 'hrs'
  const permiteAlquileres = hasCapability?.('alquileres') === true

  useEffect(() => {
    if (maquina) {
      const esRental = maquina.en_alquiler === true
      const tieneCliente = Boolean(maquina.cliente_id)

      setForm({
        nombre_unidad: maquina.nombre_unidad || '',
        tipo: maquina.tipo || 'activo operativo',
        estado_operativo: maquina.estado_operativo || 'Operativo',
        marca: maquina.marca || '',
        modelo: maquina.modelo || '',
        patente: maquina.patente || '',
        anio: maquina.anio || '',
        numero_serie: maquina.numero_serie || '',
        horometro_actual: maquina.horometro_actual ?? 0,
        ultimo_service_horas: maquina.ultimo_service_horas ?? 0,
        frecuencia_service: maquina.frecuencia_service ?? 250,
        tarifa_diaria_usd: maquina.tarifa_diaria_usd ?? 0,
        cliente_id: maquina.cliente_id || '',
        ubicacion: maquina.ubicacion || '',
        notas: maquina.notas || '',
        propiedad_activo: maquina.propiedad_activo || (tieneCliente ? 'cliente' : 'propio'),
        destino_operativo: maquina.destino_operativo || (
          esRental
            ? 'rental'
            : tieneCliente
              ? 'servicio_tecnico'
              : 'uso_interno'
        ),
      })
    } else if (isOpen) {
      setForm(EMPTY)
    }
  }, [maquina, isOpen])

  useEffect(() => {
    if (!permiteAlquileres && form.destino_operativo === 'rental') {
      setForm((prev) => ({
        ...prev,
        destino_operativo: 'uso_interno',
        tarifa_diaria_usd: 0,
      }))
    }
  }, [permiteAlquileres, form.destino_operativo])

  const mostrarClientePropietario = form.propiedad_activo === 'cliente'

  const mostrarRental =
    permiteAlquileres &&
    form.propiedad_activo === 'propio' &&
    form.destino_operativo === 'rental'

  const titulo = maquina
    ? `Editar — ${maquina.nombre_unidad || activoSingular}`
    : `Nuevo ${activoSingular}`

  const ayudaTitularidad = useMemo(() => {
    if (form.propiedad_activo === 'propio') {
      return `Activo propio de la empresa. Puede usarse internamente o, si el rubro lo permite, destinarse a rental.`
    }

    if (form.propiedad_activo === 'cliente') {
      return `Activo perteneciente a un cliente o empresa externa. Se vincula a Cliente360 y se gestiona principalmente desde OT.`
    }

    return 'Definí la titularidad operativa antes de cargar datos comerciales o técnicos.'
  }, [form.propiedad_activo])

  const ayudaDestino = useMemo(() => {
    if (form.destino_operativo === 'rental') {
      return `La tarifa de alquiler solo aplica para ${activoPlural.toLowerCase()} propios destinados a rental.`
    }

    if (form.destino_operativo === 'servicio_tecnico') {
      return `Uso recomendado para ${activoPlural.toLowerCase()} de clientes que ingresan a servicio técnico, taller u operación de campo.`
    }

    return `Uso interno de la empresa: operación propia, logística, producción, obra o administración.`
  }, [form.destino_operativo, activoPlural])

  const set = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value }

      if (key === 'propiedad_activo') {
        if (value === 'propio') {
          next.cliente_id = ''
          next.destino_operativo = 'uso_interno'
        }

        if (value === 'cliente') {
          next.destino_operativo = 'servicio_tecnico'
          next.tarifa_diaria_usd = 0
        }
      }

      if (key === 'destino_operativo') {
        if (value === 'rental' && !permiteAlquileres) {
          next.destino_operativo = 'uso_interno'
          next.tarifa_diaria_usd = 0
        }

        if (value !== 'rental') {
          next.tarifa_diaria_usd = 0
        }

        if (value === 'rental') {
          next.cliente_id = ''
          next.propiedad_activo = 'propio'
        }
      }

      return next
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!form.nombre_unidad.trim()) return
    if (mostrarClientePropietario && !form.cliente_id) return

    setLoading(true)

    try {
      const esRental = mostrarRental

      const payload = {
        nombre_unidad: form.nombre_unidad.trim(),
        tipo: form.tipo || 'activo operativo',
        estado_operativo: form.estado_operativo || 'Operativo',
        marca: form.marca?.trim() || null,
        modelo: form.modelo?.trim() || null,
        patente: form.patente?.trim() || null,
        anio: form.anio ? toNumber(form.anio, null) : null,
        numero_serie: form.numero_serie?.trim() || null,
        horometro_actual: toNumber(form.horometro_actual, 0),
        ultimo_service_horas: toNumber(form.ultimo_service_horas, 0),
        frecuencia_service: toNumber(form.frecuencia_service, 0),
        tarifa_diaria_usd: esRental ? toNumber(form.tarifa_diaria_usd, 0) : 0,
        cliente_id: mostrarClientePropietario ? form.cliente_id || null : null,
        ubicacion: form.ubicacion?.trim() || null,
        notas: form.notas?.trim() || null,
        propiedad_activo: form.propiedad_activo,
        destino_operativo: esRental ? 'rental' : form.destino_operativo,
        en_alquiler: esRental,
      }

      await onConfirm(payload)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={titulo} maxWidth="max-w-3xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="rounded-xl border border-hm-border bg-hm-surface2/20 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="font-mono text-xs tracking-widest text-hm-accent">
              TITULARIDAD Y DESTINO OPERATIVO
            </p>
            <DataBadge type="real" />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono text-hm-muted tracking-wider uppercase">
                ¿A quién pertenece este {activoSingular.toLowerCase()}?
              </label>

              <select
                value={form.propiedad_activo}
                onChange={(event) => set('propiedad_activo', event.target.value)}
                className="bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent transition-colors"
              >
                <option value="propio">Propio / de la empresa</option>
                <option value="cliente">De un cliente / empresa externa</option>
              </select>

              <span className="text-[10px] text-hm-muted leading-relaxed">
                {ayudaTitularidad}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono text-hm-muted tracking-wider uppercase">
                Destino operativo
              </label>

              <select
                value={form.destino_operativo}
                onChange={(event) => set('destino_operativo', event.target.value)}
                className="bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent transition-colors"
              >
                <option value="uso_interno">Uso interno / operación propia</option>
                <option value="servicio_tecnico">Servicio técnico / OT</option>

                {permiteAlquileres && form.propiedad_activo === 'propio' && (
                  <option value="rental">Rental / disponible para alquiler</option>
                )}
              </select>

              <span className="text-[10px] text-hm-muted leading-relaxed">
                {ayudaDestino}
              </span>
            </div>
          </div>

          {mostrarClientePropietario && (
            <div className="mt-4 flex flex-col gap-1">
              <label className="text-xs font-mono text-hm-muted tracking-wider uppercase">
                Cliente propietario *
              </label>

              <select
                value={form.cliente_id}
                onChange={(event) => set('cliente_id', event.target.value)}
                required={mostrarClientePropietario}
                className="bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent focus:ring-1 focus:ring-hm-accent/30 transition-colors"
              >
                <option value="">Seleccionar cliente...</option>

                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.razon_social || cliente.nombre_comercial || cliente.nombre || 'Cliente sin nombre'}
                  </option>
                ))}
              </select>

              {clientes.length === 0 && (
                <span className="text-[10px] text-yellow-400">
                  No hay clientes cargados para vincular este {activoSingular.toLowerCase()}.
                </span>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label={`Nombre / código del ${activoSingular.toLowerCase()} *`}
            value={form.nombre_unidad}
            onChange={(event) => set('nombre_unidad', event.target.value)}
            required
          />

          <Input
            label="Identificación / interno / serie / patente"
            value={form.patente}
            onChange={(event) => set('patente', event.target.value)}
            placeholder="Opcional. Ej: interno 04, dominio, serie, inventario..."
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-mono text-hm-muted tracking-wider uppercase">
              Tipo de {activoSingular.toLowerCase()}
            </label>

            <select
              value={form.tipo}
              onChange={(event) => set('tipo', event.target.value)}
              className="bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent transition-colors"
            >
              {TIPOS_ACTIVO.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-mono text-hm-muted tracking-wider uppercase">
              Estado operativo
            </label>

            <select
              value={form.estado_operativo}
              onChange={(event) => set('estado_operativo', event.target.value)}
              className="bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent transition-colors"
            >
              {ESTADOS_OPERATIVOS.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Input
            label="Marca"
            value={form.marca}
            onChange={(event) => set('marca', event.target.value)}
          />

          <Input
            label="Modelo"
            value={form.modelo}
            onChange={(event) => set('modelo', event.target.value)}
          />

          <Input
            label="Año"
            type="number"
            value={form.anio}
            onChange={(event) => set('anio', event.target.value)}
          />
        </div>

        <Input
          label="Número de serie / chasis"
          value={form.numero_serie}
          onChange={(event) => set('numero_serie', event.target.value)}
          placeholder="Opcional"
        />

        <div
          className={`grid gap-4 rounded-xl border border-hm-border bg-hm-surface2/20 p-4 ${
            mostrarRental ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'
          }`}
        >
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="font-mono text-xs tracking-widest text-hm-accent">
                {medidor.toUpperCase()} Y SERVICE
              </p>
              <DataBadge type="real" />
            </div>

            <div className="flex flex-col gap-3">
              <Input
                label={`${medidor} actual (${medidorUnidad})`}
                type="number"
                value={form.horometro_actual}
                onChange={(event) => set('horometro_actual', event.target.value)}
              />

              <Input
                label={`Último service (${medidorUnidad})`}
                type="number"
                value={form.ultimo_service_horas}
                onChange={(event) => set('ultimo_service_horas', event.target.value)}
              />

              <Input
                label={`Frecuencia de service (${medidorUnidad})`}
                type="number"
                value={form.frecuencia_service}
                onChange={(event) => set('frecuencia_service', event.target.value)}
              />
            </div>
          </div>

          {mostrarRental && (
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="font-mono text-xs tracking-widest text-hm-accent">
                  TARIFA DE ALQUILER
                </p>
                <DataBadge type="prep" />
              </div>

              <Input
                label="Tarifa diaria (USD)"
                type="number"
                step="0.01"
                value={form.tarifa_diaria_usd}
                onChange={(event) => set('tarifa_diaria_usd', event.target.value)}
              />

              <div className="mt-3 text-[10px] text-hm-muted leading-relaxed border border-blue-500/20 bg-blue-500/5 rounded-lg p-3">
                Esta sección se activa únicamente para {activoPlural.toLowerCase()} propios destinados a rental.
                No aparece para activos de clientes ni rubros sin capacidad de alquiler.
              </div>
            </div>
          )}
        </div>

        <Input
          label="Ubicación"
          value={form.ubicacion}
          onChange={(event) => set('ubicacion', event.target.value)}
          placeholder="Ej: base operativa, depósito, obra, cliente..."
        />

        <div>
          <label className="block text-xs font-mono text-hm-muted mb-1 uppercase tracking-wider">
            Notas internas
          </label>

          <textarea
            value={form.notas}
            onChange={(event) => set('notas', event.target.value)}
            rows={2}
            className="w-full bg-hm-surface2 border border-hm-border rounded-lg p-3 text-hm-text text-sm focus:outline-none focus:border-hm-accent focus:ring-1 focus:ring-hm-accent/30 transition-colors resize-none"
            placeholder="Observaciones técnicas, titularidad, historial relevante..."
          />
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
            disabled={loading || !form.nombre_unidad || (mostrarClientePropietario && !form.cliente_id)}
          >
            {loading
              ? 'GUARDANDO...'
              : maquina
                ? 'GUARDAR CAMBIOS'
                : `AGREGAR ${activoSingular.toUpperCase()}`}
          </Button>
        </div>
      </form>
    </Modal>
  )
}