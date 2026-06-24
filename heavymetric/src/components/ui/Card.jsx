export default function Card({ children, className = '', padding = true, ...props }) {
  return (
    <div
      className={`bg-hm-surface border border-hm-border rounded-lg overflow-hidden ${padding ? 'p-4' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export function PanelHeader({ eyebrow, title, subtitle, right }) {
  return (
    <div className="px-4 py-3 border-b border-hm-border flex items-start justify-between gap-3">
      <div>
        {eyebrow && (
          <div className="font-mono text-[9px] tracking-[0.16em] uppercase text-hm-muted mb-1">{eyebrow}</div>
        )}
        <div className="text-[14px] font-bold text-hm-text tracking-tight">{title}</div>
        {subtitle && <div className="text-[11px] text-hm-muted mt-0.5">{subtitle}</div>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  )
}
