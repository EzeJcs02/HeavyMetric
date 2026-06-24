export default function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-slate-100 border-slate-200 text-slate-600',
    green:   'bg-emerald-50 border-emerald-200 text-emerald-700',
    amber:   'bg-amber-50 border-amber-200 text-amber-700',
    blue:    'bg-blue-50 border-blue-200 text-blue-600',
    red:     'bg-red-50 border-red-200 text-red-600',
    purple:  'bg-purple-50 border-purple-200 text-purple-700',
    cyan:    'bg-cyan-50 border-cyan-200 text-cyan-700',
  }
  return (
    <span className={`inline-flex items-center font-mono text-[9px] font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded border ${variants[variant] ?? variants.default} ${className}`}>
      {children}
    </span>
  )
}
