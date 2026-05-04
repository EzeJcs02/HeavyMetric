export default function HorometroBar({ actual, max = 250 }) {
  const restantes = max - (actual % max)
  const percent = ((max - restantes) / max) * 100
  
  let color = 'bg-green-500'
  if (restantes <= 50) color = 'bg-red-500'
  else if (restantes <= 100) color = 'bg-yellow-500'

  return (
    <div className="w-full">
      <div className="flex justify-between text-[11px] font-mono text-hm-muted mb-1">
        <span>{actual} hs</span>
        <span className={restantes <= 50 ? 'text-red-400 font-bold' : ''}>
          {restantes} hs rest.
        </span>
      </div>
      <div className="h-1.5 w-full bg-hm-surface2 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
