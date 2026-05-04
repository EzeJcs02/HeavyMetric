export default function Input({ label, className = '', ...props }) {
  if (label) {
    return (
      <div className="flex flex-col gap-1">
        <label className="label-mono">{label}</label>
        <input
          className={`bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text
            focus:outline-none focus:border-hm-accent focus:ring-1 focus:ring-hm-accent/30
            transition-colors w-full placeholder-hm-muted/50 ${className}`}
          {...props}
        />
      </div>
    )
  }

  return (
    <input
      className={`bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text
        focus:outline-none focus:border-hm-accent focus:ring-1 focus:ring-hm-accent/30
        transition-colors w-full placeholder-hm-muted/50 ${className}`}
      {...props}
    />
  )
}
