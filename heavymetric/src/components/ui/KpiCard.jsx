import Card from './Card'

export default function KpiCard({ label, value, subtext, color = 'text-hm-text' }) {
  return (
    <Card className="p-5 flex flex-col gap-2 group">
      <span className="text-[10px] font-bold text-hm-muted tracking-[0.15em] uppercase group-hover:text-hm-accent/60 transition-colors">
        {label}
      </span>
      <span className={`text-3xl font-bold leading-none tracking-tight tabular-nums ${color}`}>
        {value}
      </span>
      {subtext && (
        <span className="text-xs text-hm-muted font-medium">
          {subtext}
        </span>
      )}
    </Card>
  )
}
