export default function ModalConfirm({
  isOpen,
  titulo, title,
  mensaje, message,
  onConfirm,
  onClose,
  loading = false,
  variantConfirm = 'danger',
  variant,
  confirmLabel = 'Confirmar',
}) {
  if (!isOpen) return null

  const resolvedVariant = variant ?? variantConfirm
  const confirmClass = resolvedVariant === 'danger'
    ? 'bg-red-600 hover:bg-red-500 text-white'
    : 'bg-hm-accent hover:brightness-110 text-hm-bg'

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-hm-surface border border-hm-border rounded-xl p-6 w-full max-w-sm shadow-2xl">
        <h2 className="font-semibold text-base mb-2">{title ?? titulo}</h2>
        <p className="text-sm text-hm-muted mb-6">{message ?? mensaje}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-hm-border text-hm-muted text-sm hover:border-hm-accent/50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${confirmClass}`}
          >
            {loading ? 'Procesando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
