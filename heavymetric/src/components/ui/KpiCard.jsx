import Sparkline from './Sparkline'

const DELTA_STYLES = {
  up:   'bg-emerald-50 border border-emerald-200 text-emerald-700',
  down: 'bg-red-50 border border-red-200 text-red-700',
  warn: 'bg-amber-50 border border-amber-200 text-amber-700',
  flat: 'bg-slate-100 border border-slate-200 text-slate-500',
}

const ACCENT_COLORS = {
  green:  { text: 'text-emerald-600', spark: '#10B981', bar: 'bg-emerald-500' },
  blue:   { text: 'text-blue-500',    spark: '#3B82F6', bar: 'bg-blue-500'    },
  amber:  { text: 'text-amber-600',   spark: '#D97706', bar: 'bg-amber-500'   },
  red:    { text: 'text-red-600',     spark: '#DC2626', bar: 'bg-red-500'     },
  default:{ text: 'text-hm-text',     spark: '#94A3B8', bar: 'bg-slate-400'   },
}

/**
 * KpiCard
 * Props:
 *   label       string   — title (e.g. "Órdenes de Venta")
 *   value       string   — main value
 *   subtext     string   — secondary line
 *   delta       string   — e.g. "+18%" or "-2"
 *   deltaType   'up'|'down'|'warn'|'flat'
 *   accent      'green'|'blue'|'amber'|'red'|'default'
 *   sparkData   number[] — sparkline values (optional)
 */
export default function KpiCard({
  label,
  value,
  subtext,
  delta,
  deltaType = 'up',
  accent = 'default',
  sparkData,
}) {
  const colors = ACCENT_COLORS[accent] ?? ACCENT_COLORS.default
  const deltaStyle = DELTA_STYLES[deltaType] ?? DELTA_STYLES.flat

  return (
    <div className="bg-hm-surface border border-hm-border rounded-lg p-4 flex flex-col gap-2.5 relative overflow-hidden">
      {/* top color bar */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${colors.bar} opacity-70`} />

      {/* header row */}
      <div className="flex items-start justify-between">
        <span className="text-[10px] font-medium text-hm-muted tracking-wide leading-none mt-0.5">
          {label}
        </span>
        {delta && (
          <span className={`font-mono text-[9px] font-semibold px-1.5 py-0.5 rounded ${deltaStyle}`}>
            {delta}
          </span>
        )}
      </div>

      {/* value */}
      <div className={`font-mono text-2xl font-bold leading-none tracking-tight ${colors.text}`}>
        {value}
      </div>

      {/* footer: subtext + sparkline */}
      <div className="flex items-end justify-between">
        {subtext && (
          <span className="text-[11px] text-hm-muted leading-tight">{subtext}</span>
        )}
        {sparkData && (
          <Sparkline data={sparkData} color={colors.spark} />
        )}
      </div>
    </div>
  )
}
