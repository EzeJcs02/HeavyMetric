export default function KpiCard({ label, value, subtext, accent = 'hm-accent' }) {
  const accentMap = {
    'hm-accent':  { bar: 'bg-hm-accent',  text: 'text-hm-accent'  },
    'green-400':  { bar: 'bg-green-400',   text: 'text-green-400'  },
    'blue-400':   { bar: 'bg-blue-400',    text: 'text-blue-400'   },
    'red-400':    { bar: 'bg-red-400',     text: 'text-red-400'    },
    'purple-400': { bar: 'bg-purple-400',  text: 'text-purple-400' },
  }
  const { bar, text } = accentMap[accent] ?? accentMap['hm-accent']

  return (
    <div className="bg-hm-surface border border-hm-border rounded-xl shadow-card relative overflow-hidden
      hover:border-hm-border/80 transition-colors duration-300 group">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent pointer-events-none" />
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${bar} opacity-70 group-hover:opacity-100 transition-opacity`} />

      <div className="px-5 py-4 pl-6 flex flex-col gap-1.5">
        <span className="text-[10px] font-mono font-bold tracking-[0.15em] uppercase text-hm-muted">
          {label}
        </span>
        <span className={`text-3xl font-bold leading-none tracking-tight tabular-nums ${text}`}>
          {value}
        </span>
        {subtext && (
          <span className="text-xs text-hm-muted">
            {subtext}
          </span>
        )}
      </div>
    </div>
  )
}
