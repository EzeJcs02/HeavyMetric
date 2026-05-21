import { useState, useEffect } from 'react'
import Modal from '../../ui/Modal'
import Input from '../../ui/Input'
import Button from '../../ui/Button'

const TIPOS_ACTIVO = [
  'maquinaria pesada', 'maquinaria compacta', 'camión', 'camioneta',
  'autoelevador', 'implemento', 'herramienta', 'equipo menor', 'otro',
]

const ESTADOS_OPERATIVOS = [
  'Operativo', 'En mantenimiento', 'En taller',
  'Esperando repuesto', 'Fuera de servicio', 'Baja',
]

const EMPTY = {
  nombre_unidad: '',
  tipo: 'maquinaria pesada',
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
}

export default function ModalMaquina({ isOpen, onClose, maquina, clientes, onConfirm }) {
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (maquina) {
      setForm({
        nombre_unidad:       maquina.nombre_unidad || '',
        tipo:                maquina.tipo || 'maquinaria pesada',
        estado_operativo:    maquina.estado_operativo || 'Operativo',
        marca:               maquina.marca || '',
        modelo:              maquina.modelo || '',
        patente:             maquina.patente || '',
        anio:                maquina.anio || '',
        numero_serie:        maquina.numero_serie || '',
        horometro_actual:    maquina.horometro_actual || 0,
        ultimo_service_horas:maquina.ultimo_service_horas || 0,
        frecuencia_service:  maquina.frecuencia_service || 250,
        tarifa_diaria_usd:   maquina.tarifa_diaria_usd || 0,
        cliente_id:          maquina.cliente_id || '',
        ubicacion:           maquina.ubicacion || '',
        notas:               maquina.notas || '',
      })
    } else {
      setForm(EMPTY)
    }
  }, [maquina, isOpen])

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onConfirm({
        ...form,
        anio:                form.anio ? Number(form.anio) : null,
        horometro_actual:    Number(form.horometro_actual),
        ultimo_service_horas:Number(form.ultimo_service_horas),
        frecuencia_service:  Number(form.frecuencia_service),
        tarifa_diaria_usd:   Number(form.tarifa_diaria_usd),
        cliente_id:          form.cliente_id || null,
        ubicacion:           form.ubicacion || null,
      })
    } finally {
      setLoading(false)
    }
  }

  const titulo = maquina ? `Editar — ${maquina.nombre_unidad}` : 'Nueva Máquina'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={titulo} maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">

        <div className="grid grid-cols-2 gap-4">
          <Input label="Nombre / Código de Unidad *" value={form.nombre_unidad} onChange={e => set('nombre_unidad', e.target.value)} required />
          <Input label="Patente" value={form.patente} onChange={e => set('patente', e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-mono text-hm-muted tracking-wider">TIPO DE ACTIVO</label>
            <select value={form.tipo} onChange={e => set('tipo', e.target.value)}
              className="bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent transition-colors">
              {TIPOS_ACTIVO.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-mono text-hm-muted tracking-wider">ESTADO OPERATIVO</label>
            <select value={form.estado_operativo} onChange={e => set('estado_operativo', e.target.value)}
              className="bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent transition-colors">
              {ESTADOS_OPERATIVOS.map(e => <option key={e}>{e}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Input label="Marca" value={form.marca} onChange={e => set('marca', e.target.value)} />
          <Input label="Modelo" value={form.modelo} onChange={e => set('modelo', e.target.value)} />
          <Input label="Año" type="number" value={form.anio} onChange={e => set('anio', e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Número de Serie" value={form.numero_serie} onChange={e => set('numero_serie', e.target.value)} />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-mono text-hm-muted tracking-wider">PROPIETARIO (opcional)</label>
            <select
              value={form.cliente_id}
              onChange={e => set('cliente_id', e.target.value)}
              className="bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent focus:ring-1 focus:ring-hm-accent/30 transition-colors"
            >
              <option value="">— Flota propia —</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.razon_social}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 bg-hm-surface2/20 p-4 border border-hm-border rounded">
          <div>
            <p className="font-mono text-hm-accent text-xs tracking-widest mb-3">HORÓMETRO Y SERVICE</p>
            <div className="flex flex-col gap-3">
              <Input label="Horómetro Actual (hrs)" type="number" value={form.horometro_actual} onChange={e => set('horometro_actual', e.target.value)} />
              <Input label="Último Service (hrs)" type="number" value={form.ultimo_service_horas} onChange={e => set('ultimo_service_horas', e.target.value)} />
              <Input label="Frecuencia de Service (hrs)" type="number" value={form.frecuencia_service} onChange={e => set('frecuencia_service', e.target.value)} />
            </div>
          </div>
          <div>
            <p className="font-mono text-hm-accent text-xs tracking-widest mb-3">TARIFA DE ALQUILER</p>
            <Input label="Tarifa Diaria (USD)" type="number" step="0.01" value={form.tarifa_diaria_usd} onChange={e => set('tarifa_diaria_usd', e.target.value)} />
          </div>
        </div>

        <Input label="Ubicación" value={form.ubicacion} onChange={e => set('ubicacion', e.target.value)} placeholder="Ej: Obra Norte, Depósito Central..." />

        <div>
          <label className="block text-xs font-mono text-hm-muted mb-1 uppercase tracking-wider">Notas Internas</label>
          <textarea
            value={form.notas}
            onChange={e => set('notas', e.target.value)}
            rows={2}
            className="w-full bg-hm-surface2 border border-hm-border rounded-lg p-3 text-hm-text text-sm focus:outline-none focus:border-hm-accent focus:ring-1 focus:ring-hm-accent/30 transition-colors resize-none"
            placeholder="Observaciones técnicas, historial relevante..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-hm-border">
          <Button variant="outline" type="button" onClick={onClose} disabled={loading}>CANCELAR</Button>
          <Button type="submit" variant="primary" disabled={loading || !form.nombre_unidad}>
            {loading ? 'GUARDANDO...' : maquina ? 'GUARDAR CAMBIOS' : 'AGREGAR A LA FLOTA'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
