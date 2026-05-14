import { useState } from 'react'
import { toast } from 'sonner'
import Modal from '../../ui/Modal'
import Input from '../../ui/Input'
import Button from '../../ui/Button'
import { useDolar } from '../../../context/DolarContext'

export default function ModalFinalizarOT({ isOpen, onClose, ot, onConfirm }) {
  const { formatUSD } = useDolar()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    horometro_final: ot?.maquina?.horometro_actual || 0,
    mantenimiento_completo: false,
    horas_mano_obra: ot?.horas_mano_obra || 0,
    precio_hora_usd: ot?.precio_hora_usd || 45,
    notas_internas: ot?.notas_internas || '',
    estado: 'completada',
    nps_score: null,
  })

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onConfirm({
        ...formData,
        horometro_final: Number(formData.horometro_final),
        horas_mano_obra: Number(formData.horas_mano_obra),
        precio_hora_usd: Number(formData.precio_hora_usd)
      })
      onClose()
    } catch (error) {
      toast.error('Error al cerrar la OT: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Cálculos dinámicos
  const totalManoObra = Number(formData.horas_mano_obra) * Number(formData.precio_hora_usd)
  const totalRepuestos = Number(ot?.total_repuestos_usd || 0)
  const totalOT = totalManoObra + totalRepuestos

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Finalizar OT #${ot?.numero_ot || ''}`} maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        
        {/* SECCIÓN MÁQUINA */}
        <div className="bg-hm-surface2/30 p-4 border border-hm-border rounded">
          <h3 className="font-mono text-hm-accent mb-4 tracking-widest text-sm">DATOS DE LA UNIDAD</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Horómetro Final" 
              name="horometro_final"
              type="number" 
              value={formData.horometro_final}
              onChange={handleChange}
              required
            />
            <div className="flex items-center gap-3 pt-6">
              <input 
                type="checkbox" 
                id="mantenimiento_completo"
                name="mantenimiento_completo"
                checked={formData.mantenimiento_completo}
                onChange={handleChange}
                className="w-5 h-5 accent-hm-accent bg-hm-surface2 border-hm-border rounded focus:ring-hm-accent"
              />
              <label htmlFor="mantenimiento_completo" className="text-sm font-medium cursor-pointer">
                Resetear Alerta de Service
              </label>
            </div>
          </div>
        </div>

        {/* SECCIÓN MANO DE OBRA Y COSTOS */}
        <div className="bg-hm-surface2/30 p-4 border border-hm-border rounded">
          <h3 className="font-mono text-hm-accent mb-4 tracking-widest text-sm">COSTOS DEL TRABAJO</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Horas Trabajadas" 
              name="horas_mano_obra"
              type="number" 
              step="0.5"
              value={formData.horas_mano_obra}
              onChange={handleChange}
              required
            />
            <Input 
              label="Precio Hora (USD)" 
              name="precio_hora_usd"
              type="number" 
              step="0.01"
              value={formData.precio_hora_usd}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        {/* SECCIÓN DETALLES */}
        <div>
          <label className="block text-xs font-mono text-hm-muted mb-1 uppercase tracking-wider">
            Notas de Reparación (Internas)
          </label>
          <textarea 
            name="notas_internas"
            value={formData.notas_internas}
            onChange={handleChange}
            className="w-full bg-hm-surface2 border border-hm-border rounded-lg p-3 text-hm-text focus:outline-none focus:border-hm-accent focus:ring-1 focus:ring-hm-accent/30 transition-colors min-h-[100px]"
            placeholder="Detalles técnicos de la reparación, observaciones para el cliente..."
          />
        </div>

        {/* NPS */}
        <div className="bg-hm-surface2/30 p-4 border border-hm-border rounded">
          <h3 className="font-mono text-hm-accent mb-3 tracking-widest text-sm">NPS CLIENTE — OPCIONAL</h3>
          <p className="text-xs text-hm-muted mb-3">Puntuación del cliente al cerrar el servicio (1 = muy insatisfecho, 10 = muy satisfecho)</p>
          <div className="flex gap-1.5 flex-wrap">
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setFormData(p => ({ ...p, nps_score: p.nps_score === n ? null : n }))}
                className={`w-9 h-9 rounded text-xs font-bold border transition-all ${
                  formData.nps_score === n
                    ? n <= 6 ? 'bg-red-500 border-red-500 text-white'
                      : n <= 8 ? 'bg-yellow-500 border-yellow-500 text-black'
                      : 'bg-green-500 border-green-500 text-white'
                    : 'bg-hm-surface2 border-hm-border text-hm-muted hover:border-hm-accent/50'
                }`}
              >
                {n}
              </button>
            ))}
            {formData.nps_score && (
              <button type="button" onClick={() => setFormData(p => ({ ...p, nps_score: null }))}
                className="px-2 text-xs text-hm-muted hover:text-red-400 transition-colors">✕</button>
            )}
          </div>
        </div>

        {/* RESUMEN FINAL */}
        <div className="bg-hm-surface2 p-4 rounded flex justify-between items-center border border-hm-border">
          <div className="flex flex-col">
            <span className="text-xs font-mono text-hm-muted uppercase">Total Repuestos: {formatUSD(totalRepuestos)}</span>
            <span className="text-xs font-mono text-hm-muted uppercase">Total Mano de Obra: {formatUSD(totalManoObra)}</span>
          </div>
          <div className="text-right">
            <div className="text-xs font-mono text-hm-muted uppercase mb-1">Costo Total</div>
            <div className="text-2xl font-bold text-green-400">{formatUSD(totalOT)}</div>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex items-center justify-between pt-4 border-t border-hm-border">
          <div className="flex items-center gap-2">
            <select 
              name="estado" 
              value={formData.estado} 
              onChange={handleChange}
              className="bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent focus:ring-1 focus:ring-hm-accent/30 transition-colors"
            >
              <option value="completada">Marcar como Completada</option>
              <option value="facturada">Marcar y pasar a Facturada</option>
            </select>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" type="button" onClick={onClose} disabled={loading}>
              CANCELAR
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'GUARDANDO...' : 'CERRAR ORDEN'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
