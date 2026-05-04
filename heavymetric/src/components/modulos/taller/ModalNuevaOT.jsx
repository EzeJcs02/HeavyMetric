import { useState } from 'react'
import Modal from '../../ui/Modal'
import Input from '../../ui/Input'
import Button from '../../ui/Button'
import { useAuth } from '../../../context/AuthContext'

export default function ModalNuevaOT({ isOpen, onClose, maquinas, clientes, onConfirm }) {
  const { user, perfil } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    maquina_id: '',
    cliente_id: '',
    fecha_ingreso: new Date().toISOString().split('T')[0],
    descripcion_trabajo: '',
    horas_mano_obra: 0,
    precio_hora_usd: 45,
    prioridad: 'normal', // normal, urgente
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.maquina_id || !formData.cliente_id) return
    setLoading(true)
    try {
      await onConfirm({
        ...formData,
        horas_mano_obra: Number(formData.horas_mano_obra),
        precio_hora_usd: Number(formData.precio_hora_usd),
        estado: 'en_progreso',
        supervisor_id: user?.id,
        organization_id: perfil?.organization_id,
      })
      onClose()
      setFormData({
        maquina_id: '', cliente_id: '',
        fecha_ingreso: new Date().toISOString().split('T')[0],
        descripcion_trabajo: '', horas_mano_obra: 0, precio_hora_usd: 45, prioridad: 'normal'
      })
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const maquinasDisponibles = maquinas.filter(m => m.activa && !m.en_alquiler)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nueva Orden de Trabajo" maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">

        {/* SELECCIÓN MÁQUINA Y CLIENTE */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-mono text-hm-muted tracking-wider">MÁQUINA</label>
            <select
              name="maquina_id"
              value={formData.maquina_id}
              onChange={handleChange}
              required
              className="bg-hm-surface2 border border-hm-border rounded p-2 text-sm text-white focus:outline-none focus:border-hm-accent"
            >
              <option value="">Seleccionar Unidad...</option>
              {maquinasDisponibles.map(m => (
                <option key={m.id} value={m.id}>
                  {m.nombre_unidad} — {m.marca} {m.modelo}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-mono text-hm-muted tracking-wider">CLIENTE RESPONSABLE</label>
            <select
              name="cliente_id"
              value={formData.cliente_id}
              onChange={handleChange}
              required
              className="bg-hm-surface2 border border-hm-border rounded p-2 text-sm text-white focus:outline-none focus:border-hm-accent"
            >
              <option value="">Seleccionar Cliente...</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.razon_social}</option>
              ))}
            </select>
          </div>
        </div>

        {/* FECHAS Y PRIORIDAD */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Fecha de Ingreso"
            name="fecha_ingreso"
            type="date"
            value={formData.fecha_ingreso}
            onChange={handleChange}
            required
          />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-mono text-hm-muted tracking-wider">PRIORIDAD</label>
            <select
              name="prioridad"
              value={formData.prioridad}
              onChange={handleChange}
              className="bg-hm-surface2 border border-hm-border rounded p-2 text-sm text-white focus:outline-none focus:border-hm-accent"
            >
              <option value="normal">Normal</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>
        </div>

        {/* DESCRIPCIÓN */}
        <div>
          <label className="block text-xs font-mono text-hm-muted mb-1 uppercase tracking-wider">
            Descripción del Trabajo *
          </label>
          <textarea
            name="descripcion_trabajo"
            value={formData.descripcion_trabajo}
            onChange={handleChange}
            required
            className="w-full bg-hm-surface2 border border-hm-border rounded p-3 text-white focus:outline-none focus:border-hm-accent transition-colors min-h-[100px] text-sm"
            placeholder="Describí el trabajo a realizar: diagnóstico, reparación, mantenimiento preventivo..."
          />
        </div>

        {/* MANO DE OBRA ESTIMADA */}
        <div className="bg-hm-surface2/30 p-4 border border-hm-border rounded">
          <h3 className="font-mono text-hm-accent mb-4 tracking-widest text-sm">MANO DE OBRA (ESTIMACIÓN INICIAL)</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Horas Estimadas"
              name="horas_mano_obra"
              type="number"
              step="0.5"
              min="0"
              value={formData.horas_mano_obra}
              onChange={handleChange}
            />
            <Input
              label="Precio Hora (USD)"
              name="precio_hora_usd"
              type="number"
              step="0.01"
              min="0"
              value={formData.precio_hora_usd}
              onChange={handleChange}
            />
          </div>
          <div className="mt-3 text-right text-xs font-mono text-hm-muted">
            M.O. Estimada:{' '}
            <span className="text-white">
              USD {(Number(formData.horas_mano_obra) * Number(formData.precio_hora_usd)).toFixed(2)}
            </span>
          </div>
        </div>

        {/* ACCIONES */}
        <div className="flex justify-end gap-3 pt-4 border-t border-hm-border">
          <Button variant="outline" type="button" onClick={onClose} disabled={loading}>
            CANCELAR
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading || !formData.maquina_id || !formData.cliente_id || !formData.descripcion_trabajo}
          >
            {loading ? 'CREANDO...' : 'CREAR ORDEN'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
