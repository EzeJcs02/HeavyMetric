import { useAuth } from '../../context/AuthContext'
import { useDolar } from '../../context/DolarContext'
import { supabase } from '../../lib/supabase'

export default function Topbar() {
  const { user, perfil } = useAuth()
  const { tcVenta, formatARS } = useDolar()

  return (
    <header className="h-16 bg-hm-surface border-b border-hm-border flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-8">
        {/* Logo en la Topbar como en la captura original */}
        <div className="font-bold tracking-tighter text-lg text-white">
          HEAVY<span className="text-hm-accent uppercase">METRIC</span>
        </div>

        {/* El indicador del dólar se movió un poco a la derecha */}
      </div>
      
      <div className="flex items-center gap-6">
        {tcVenta && (
          <div className="flex items-center gap-3 px-4 py-1.5 bg-hm-bg border border-hm-border rounded-full">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
            <span className="text-[10px] font-bold text-hm-muted tracking-widest uppercase">BNA VENTA:</span>
            <span className="text-sm font-mono font-bold text-hm-text">${formatARS(tcVenta).replace('$', '')}</span>
          </div>
        )}

        <div className="flex items-center gap-4 border-l border-hm-border pl-6">
          <div className="flex flex-col items-end">
            <span className="text-sm font-bold text-hm-text">{perfil?.nombre_completo || user?.email}</span>
            <span className="text-[10px] font-bold text-hm-muted uppercase tracking-wider">{perfil?.rol || 'OWNER'}</span>
          </div>
          <button 
            onClick={() => supabase.auth.signOut()}
            className="w-10 h-10 rounded-full bg-hm-surface2 border border-hm-border flex items-center justify-center text-hm-muted hover:text-white transition-all"
          >
            <span className="text-lg">⏻</span>
          </button>
        </div>
      </div>
    </header>
  )
}
