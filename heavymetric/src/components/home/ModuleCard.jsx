import { useNavigate } from 'react-router-dom'
import Card from '../ui/Card'

export default function ModuleCard({ title, description, icon, colorClass, metrics = [], to }) {
  const navigate = useNavigate()

  return (
    <Card className="flex flex-col h-full border border-hm-border hover:border-hm-border/80 transition-all p-5 group bg-hm-surface relative overflow-hidden">
      {/* Fondo degradado sutil en hover */}
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colorClass} opacity-0 group-hover:opacity-10 transition-opacity blur-2xl rounded-full -translate-y-1/2 translate-x-1/3`} />

      <div className="flex items-start gap-4 mb-4 relative z-10">
        <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center border bg-hm-surface2 ${colorClass.replace('from-', 'text-').split(' ')[0]} ${colorClass.split(' ').find(c => c.startsWith('border-')) || 'border-hm-border'}`}>
          <div className="w-6 h-6">{icon}</div>
        </div>
        <div>
          <h2 className="text-lg font-bold text-hm-text leading-tight">{title}</h2>
          <p className="text-sm text-hm-muted mt-0.5">{description}</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2 mb-6 relative z-10">
        {metrics.map((m, i) => (
          <div key={i} className="flex items-center justify-between py-1 border-b border-hm-border/30 last:border-0">
            <span className="text-xs text-hm-muted font-mono tracking-wide">{m.label}</span>
            {m.isPlaceholder ? (
              <span className="text-[10px] font-mono text-hm-muted/50 uppercase bg-hm-surface2 px-1.5 py-0.5 rounded border border-hm-border/50">
                {m.value}
              </span>
            ) : (
              <span className={`text-xs font-bold font-mono ${m.color || 'text-hm-text'}`}>
                {m.value}
              </span>
            )}
          </div>
        ))}
        {metrics.length === 0 && (
          <div className="text-xs text-hm-muted italic py-2">Sin métricas registradas.</div>
        )}
      </div>

      <button
        onClick={() => navigate(to)}
        className="w-full py-2.5 rounded-lg border border-hm-border bg-hm-surface2 hover:bg-hm-surface text-sm font-bold text-hm-text transition-colors relative z-10 group-hover:border-hm-accent/50 group-hover:text-hm-accent"
      >
        ENTRAR →
      </button>
    </Card>
  )
}
