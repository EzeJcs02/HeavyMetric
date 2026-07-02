import { useState, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  ArrowLeft,
  LogOut,
  Wrench,
  Wifi,
  WifiOff,
  RefreshCw,
} from 'lucide-react'
import { syncAllToSupabase } from '../../lib/syncQueue'
import { toast } from 'sonner'

export default function AppCampo() {
  const { perfil, signOut } = useAuth()
  const navigate = useNavigate()

  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleSync = async () => {
    if (isOffline) {
      toast.error('No hay conexión para sincronizar')
      return
    }

    setIsSyncing(true)

    try {
      await syncAllToSupabase()
      toast.success('Sincronización completada')
    } catch (error) {
      console.error(error)
      toast.error('Error al sincronizar datos')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-[#0b0c0e] font-sans text-white selection:bg-orange-500/30">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#07090d]/95 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/campo')}
            className="flex min-w-0 items-center gap-3 text-left"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-400/20 bg-orange-400/10 text-orange-400">
              <Wrench className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-base font-bold leading-tight tracking-tight">
                App Campo
              </h1>
              <p className="truncate text-xs text-neutral-500">
                Técnico: {perfil?.nombre_completo || perfil?.email || 'Cargando...'}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/app')}
              className="hidden items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs font-semibold text-neutral-300 transition-colors hover:border-cyan-300/30 hover:text-white sm:flex"
              title="Volver al sistema"
            >
              <ArrowLeft className="h-4 w-4" />
              Sistema
            </button>

            <button
              type="button"
              onClick={handleSync}
              disabled={isSyncing || isOffline}
              className={`relative flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
                isOffline
                  ? 'border-red-400/20 bg-red-400/10 text-red-400'
                  : 'border-emerald-400/20 bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/15'
              }`}
              title={isOffline ? 'Sin conexión' : 'Sincronizar'}
            >
              {isOffline ? (
                <WifiOff className="h-5 w-5" />
              ) : isSyncing ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <Wifi className="h-5 w-5" />
              )}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/25 text-neutral-400 transition-colors hover:border-red-400/30 hover:text-red-300"
              title="Cerrar sesión"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/app')}
          className="mx-auto mt-3 flex w-full max-w-5xl items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/25 px-4 py-2 text-sm font-semibold text-neutral-300 transition-colors hover:border-cyan-300/30 hover:text-white sm:hidden"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al sistema
        </button>
      </header>

      {isOffline && (
        <div className="sticky top-[73px] z-30 flex items-center justify-center gap-2 bg-red-500 px-4 py-1.5 text-center text-xs font-medium text-white shadow-sm">
          <WifiOff className="h-3.5 w-3.5" />
          Estás trabajando sin conexión. Los datos se guardarán localmente.
        </div>
      )}

      <main className="relative mx-auto w-full max-w-5xl flex-1 px-4 pb-20 pt-6">
        <Outlet context={{ isOffline }} />
      </main>
    </div>
  )
}
