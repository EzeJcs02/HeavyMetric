export default function Badge({ children, variant = 'info', className = '' }) {
  const variants = {
    default: 'bg-hm-surface2 text-hm-muted border border-hm-border',
    ok: 'bg-green-500/10 text-green-400 border border-green-500/20',
    success: 'bg-green-500/10 text-green-400 border border-green-500/20',
    warn: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
    danger: 'bg-red-500/10 text-red-400 border border-red-500/20',
    info: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    taller: 'bg-red-500/20 text-red-300 border border-red-500/30',
    alq: 'bg-hm-accent/20 text-hm-accent border border-hm-accent/30',
    ventas: 'bg-green-500/20 text-green-300 border border-green-500/30'
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[9px] font-bold tracking-[0.1em] uppercase ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}
