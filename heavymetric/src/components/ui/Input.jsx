export default function Input({ className = '', ...props }) {
  return (
    <input 
      className={`bg-hm-surface2 border border-hm-border rounded px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent focus:ring-1 focus:ring-hm-accent transition-colors w-full placeholder-hm-muted font-mono ${className}`}
      {...props}
    />
  )
}
