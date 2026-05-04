export default function Card({ children, className = '' }) {
  return (
    <div className={`bg-hm-surface border border-hm-border rounded-xl relative overflow-hidden
      shadow-card hover:border-hm-border/80 transition-colors duration-300
      ${className}`}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent pointer-events-none" />
      {children}
    </div>
  )
}
