const BASE = 'inline-flex items-center justify-center gap-2 font-semibold rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]'

const VARIANTS = {
  primary: 'bg-hm-accent text-white hover:brightness-105 focus:ring-hm-accent/40 shadow-sm',
  dark:    'bg-zinc-950 text-white hover:bg-zinc-800 focus:ring-zinc-500/30 shadow-sm',
  ghost:   'bg-hm-surface border border-hm-border text-hm-text hover:bg-hm-surface2 focus:ring-hm-border',
  outline: 'bg-transparent border border-hm-accent text-hm-accent hover:bg-hm-accent hover:text-white focus:ring-hm-accent/40',
  danger:  'bg-red-50 border border-red-200 text-red-600 hover:bg-red-600 hover:text-white focus:ring-red-500/30',
  success: 'bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-600 hover:text-white focus:ring-emerald-500/30',
}

const SIZES = {
  xs: 'text-xs px-2.5 py-1',
  sm: 'text-xs px-3 py-1.5',
  md: 'text-sm px-4 py-2',
  lg: 'text-sm px-5 py-2.5',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  icon,
  ...props
}) {
  return (
    <button
      className={`${BASE} ${VARIANTS[variant] ?? VARIANTS.primary} ${SIZES[size] ?? SIZES.md} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  )
}
