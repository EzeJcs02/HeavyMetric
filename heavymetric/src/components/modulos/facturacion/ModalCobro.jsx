import { useState } from 'react'
import Modal from '../../ui/Modal'
import Button from '../../ui/Button'
import { useDolar } from '../../../context/DolarContext'

export default function ModalCobro({ isOpen, onClose, transaccion, onConfirm }) {
  const { formatUSD } = useDolar()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    medio_pago: 'transferencia',
    notas: ''
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onConfirm(formData)
      onClose()
      setFormData({ medio_pago: 'transferencia', notas: '' })
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  if (!transaccion) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar Cobro" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        
        <div className="bg-hm-surface2 p-4 border border-hm-border rounded flex flex-col gap-2">
          <div className="flex justify-between">
            <span className="text-sm font-mono text-hm-muted">COMPROBANTE</span>
            <span className="font-bold">{transaccion.tipo_documento} #{transaccion.numero_comprobante || transaccion.id.split('-')[0]}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-mono text-hm-muted">CLIENTE</span>
            <span>{transaccion.cliente?.razon_social}</span>
          </div>
          <div className="flex justify-between items-center mt-2 pt-2 border-t border-hm-border">
            <span className="text-sm font-mono text-hm-muted">MONTO A COBRAR</span>
            <span className="text-xl font-bold text-green-400">{formatUSD(transaccion.monto_total_usd)}</span>
          </div>
          <div className="text-right text-xs text-hm-muted">
            Eq. ARS: $ {Number(transaccion.monto_total_ars).toLocaleString('es-AR')}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-mono text-hm-muted tracking-wider">MEDIO DE PAGO</label>
          <select 
            name="medio_pago" 
            value={formData.medio_pago} 
            onChange={handleChange}
            required
            className="bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent focus:ring-1 focus:ring-hm-accent/30 transition-colors"
          >
            <option value="transferencia">Transferencia Bancaria</option>
            <option value="efectivo">Efectivo (USD)</option>
            <option value="efectivo_ars">Efectivo (ARS)</option>
            <option value="cheque">Cheque</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-mono text-hm-muted mb-1 tracking-wider">
            REFERENCIA / NOTAS
          </label>
          <textarea 
            name="notas"
            value={formData.notas}
            onChange={handleChange}
            className="w-full bg-hm-surface2 border border-hm-border rounded-lg p-3 text-hm-text focus:outline-none focus:border-hm-accent focus:ring-1 focus:ring-hm-accent/30 transition-colors min-h-[80px] text-sm"
            placeholder="Nro. de transacción, banco, etc..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-hm-border">
          <Button variant="outline" type="button" onClick={onClose} disabled={loading}>
            CANCELAR
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'PROCESANDO...' : 'CONFIRMAR COBRO'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
