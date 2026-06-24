export default function Input({ label, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-[10px] font-mono font-bold tracking-[0.12em] uppercase text-hm-muted">{label}</label>}
      <input
        className={`bg-hm-surface border border-hm-border rounded-md px-3 py-2 text-sm text-hm-text
          placeholder:text-hm-muted focus:outline-none focus:border-hm-accent transition-colors w-full ${className}`}
        {...props}
      />
    </div>
  )
}
