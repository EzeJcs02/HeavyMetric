export default function Button({ children, variant = 'primary', className = '', ...props }) {
  const base = 'inline-flex justify-center items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-md transition-all duration-200 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-hm-accent/30'
  
  const variants = {
    primary: 'bg-hm-accent text-hm-bg hover:brightness-110 shadow-[0_4px_12px_rgba(232,160,32,0.2)]',
    ghost: 'bg-hm-surface2 text-hm-text border border-hm-border hover:bg-hm-border hover:text-white',
    danger: 'bg-hm-danger/10 text-hm-danger border border-hm-danger/30 hover:bg-hm-danger hover:text-white',
    outline: 'bg-transparent border-2 border-hm-accent text-hm-accent hover:bg-hm-accent hover:text-hm-bg',
  }

  return (
    <button className={`${base} ${variants[variant] ?? ''} ${className}`} {...props}>
      {children}
    </button>
  )
}
