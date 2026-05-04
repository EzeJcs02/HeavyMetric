import { useAuth } from '../../context/AuthContext'
import { useDolar } from '../../context/DolarContext'
import { supabase } from '../../lib/supabase'

function Initials({ name }) {
  const parts = (name || '').trim().split(' ').filter(Boolean)
  const letters = parts.length >= 2
    ? parts[0][0] + parts[1][0]
    : (name || '?').slice(0, 2)
  return letters.toUpperCase()
}

export default function Topbar({ onMenuToggle }) {
  const { user, perfil } = useAuth()
  const { tcVenta, formatARS } = useDolar()

  const displayName = perfil?.nombre_completo || user?.email || ''

  return (
    <header className="h-14 bg-hm-surface border-b border-hm-border flex items-center justify-between px-4 md:px-6 shrink-0">
      <button
        onClick={onMenuToggle}
        className="lg:hidden w-8 h-8 flex items-center justify-center text-hm-muted hover:text-white transition-colors"
        aria-label="Menú"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="flex items-center gap-4">
        {tcVenta && (
          <div className="flex items-center gap-2.5 px-3.5 py-1.5 bg-hm-bg border border-hm-border rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
            <span className="text-[10px] font-mono font-bold text-hm-muted tracking-widest">BNA</span>
            <span className="text-sm font-mono font-bold text-hm-text tabular-nums">
              ${formatARS(tcVenta).replace('$', '').trim()}
            </span>
          </div>
        )}

        <div className="flex items-center gap-3 border-l border-hm-border pl-4">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold text-hm-text leading-tight">
              {perfil?.nombre_completo || user?.email}
            </div>
            <div className="text-[10px] font-mono text-hm-muted tracking-wider uppercase">
              {perfil?.rol || 'owner'}
            </div>
          </div>

          <div className="w-8 h-8 rounded-full bg-hm-accent/15 border border-hm-accent/30 flex items-center justify-center shrink-0">
            <span className="text-[11px] font-bold text-hm-accent">
              <Initials name={displayName} />
            </span>
          </div>

          <button
            onClick={() => supabase.auth.signOut()}
            title="Cerrar sesión"
            className="w-8 h-8 rounded-full flex items-center justify-center text-hm-muted hover:text-white hover:bg-hm-surface2 border border-transparent hover:border-hm-border transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}
