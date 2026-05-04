import { useState } from 'react'
import Modal from '../../ui/Modal'
import Input from '../../ui/Input'
import Button from '../../ui/Button'
import { useAuth } from '../../../context/AuthContext'

export default function ModalNuevoContrato({ isOpen, onClose, maquinasDisponibles, clientes, onConfirm }) {
  const { user, perfil } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    cliente_id: '',
    maquina_id: '',
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin: '',
    tarifa_diaria_usd: 150,
    deposito_usd: 0,
    condiciones: ''
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onConfirm({
        ...formData,
        tarifa_diaria_usd: Number(formData.tarifa_diaria_usd),
        deposito_usd: Number(formData.deposito_usd),
        supervisor_id: user.id,
        organization_id: perfil?.organization_id
      })
      onClose()
      // Reset form
      setFormData({
        cliente_id: '', maquina_id: '', 
        fecha_inicio: new Date().toISOString().split('T')[0],
        fecha_fin: '', tarifa_diaria_usd: 150, deposito_usd: 0, condiciones: ''
      })
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const diasEstimados = formData.fecha_fin 
    ? Math.max(0, Math.ceil((new Date(formData.fecha_fin) - new Date(formData.fecha_inicio)) / (1000 * 60 * 60 * 24))) 
    : 0
  const totalEstimado = diasEstimados * Number(formData.tarifa_diaria_usd)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuevo Contrato de Alquiler" maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        
        {/* SELECCIÓN PRINCIPAL */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-mono text-hm-muted tracking-wider">CLIENTE</label>
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
          
          <div className="flex flex-col gap-1">
            <label className="text-xs font-mono text-hm-muted tracking-wider">MÁQUINA (DISPONIBLES)</label>
            <select 
              name="maquina_id" 
              value={formData.maquina_id} 
              onChange={handleChange}
              required
              className="bg-hm-surface2 border border-hm-border rounded p-2 text-sm text-white focus:outline-none focus:border-hm-accent"
            >
              <option value="">Seleccionar Unidad...</option>
              {maquinasDisponibles.map(m => (
                <option key={m.id} value={m.id}>{m.nombre_unidad} ({m.modelo})</option>
              ))}
            </select>
          </div>
        </div>

        {/* FECHAS */}
        <div className="bg-hm-surface2/30 p-4 border border-hm-border rounded">
          <h3 className="font-mono text-hm-accent mb-4 tracking-widest text-sm">PERÍODO DE ALQUILER</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Fecha de Inicio" 
              name="fecha_inicio"
              type="date" 
              value={formData.fecha_inicio}
              onChange={handleChange}
              required
            />
            <Input 
              label="Fecha de Fin" 
              name="fecha_fin"
              type="date" 
              min={formData.fecha_inicio}
              value={formData.fecha_fin}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        {/* TARIFAS */}
        <div className="grid grid-cols-2 gap-4">
          <Input 
            label="Tarifa Diaria (USD)" 
            name="tarifa_diaria_usd"
            type="number" 
            step="0.01"
            min="0"
            value={formData.tarifa_diaria_usd}
            onChange={handleChange}
            required
          />
          <Input 
            label="Depósito de Garantía (USD)" 
            name="deposito_usd"
            type="number" 
            step="0.01"
            min="0"
            value={formData.deposito_usd}
            onChange={handleChange}
          />
        </div>

        {/* DETALLES */}
        <div>
          <label className="block text-xs font-mono text-hm-muted mb-1 tracking-wider">
            CONDICIONES ESPECIALES (Opcional)
          </label>
          <textarea 
            name="condiciones"
            value={formData.condiciones}
            onChange={handleChange}
            className="w-full bg-hm-surface2 border border-hm-border rounded p-3 text-white focus:outline-none focus:border-hm-accent transition-colors min-h-[80px] text-sm"
            placeholder="Lugar de entrega, responsabilidades de traslado..."
          />
        </div>

        {/* RESUMEN */}
        <div className="bg-hm-surface2 p-4 rounded flex justify-between items-center border border-hm-border">
          <div className="text-xs font-mono text-hm-muted">
            Duración estimada: <span className="text-white">{diasEstimados} días</span>
          </div>
          <div className="text-right">
            <div className="text-xs font-mono text-hm-muted mb-1">PROYECCIÓN TOTAL</div>
            <div className="text-xl font-bold text-hm-alq">USD {totalEstimado.toFixed(2)}</div>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex justify-end gap-3 pt-4 border-t border-hm-border">
          <Button variant="outline" type="button" onClick={onClose} disabled={loading}>
            CANCELAR
          </Button>
          <Button type="submit" variant="primary" disabled={loading || !formData.cliente_id || !formData.maquina_id || !formData.fecha_fin}>
            {loading ? 'CREANDO...' : 'CREAR CONTRATO'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
