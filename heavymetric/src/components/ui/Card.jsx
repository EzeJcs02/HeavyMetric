export default function Card({ children, className = '' }) {
  return (
    <div className={`bg-hm-surface border border-hm-border rounded-lg relative overflow-hidden
      shadow-[0_4px_24px_rgba(0,0,0,0.4)] hover:border-hm-accent/20 transition-colors duration-300
      ${className}`}>
      {/* Línea de brillo superior sutil */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
      {children}
    </div>
  )
}
