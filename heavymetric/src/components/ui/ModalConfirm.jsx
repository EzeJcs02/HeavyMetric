export default function ModalConfirm({ isOpen, titulo, mensaje, onConfirm, onClose, loading = false, variantConfirm = 'danger' }) {
  if (!isOpen) return null

  const confirmClass = variantConfirm === 'danger'
    ? 'bg-red-600 hover:bg-red-500 text-white'
    : 'bg-hm-accent hover:bg-yellow-500 text-hm-bg'

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-hm-surface border border-hm-border rounded-xl p-6 w-full max-w-sm shadow-2xl">
        <h2 className="font-mono font-bold text-base mb-2">{titulo}</h2>
        <p className="text-sm text-hm-muted mb-6">{mensaje}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded border border-hm-border text-hm-muted text-sm font-mono hover:border-hm-accent/50 transition-colors disabled:opacity-50"
          >
            CANCELAR
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded text-sm font-mono font-bold transition-colors disabled:opacity-50 ${confirmClass}`}
          >
            {loading ? 'PROCESANDO...' : 'CONFIRMAR'}
          </button>
        </div>
      </div>
    </div>
  )
}
