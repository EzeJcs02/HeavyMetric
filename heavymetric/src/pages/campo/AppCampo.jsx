import React, { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { LogOut, Wrench, Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { syncAllToSupabase } from '../../lib/syncQueue'
import { toast } from 'sonner'

export default function AppCampo() {
  const { user, perfil, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
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
    <div className="flex flex-col min-h-screen bg-neutral-900 text-white font-sans overflow-x-hidden selection:bg-orange-500/30">
      
      {/* HEADER MÓVIL */}
      <header className="sticky top-0 z-40 bg-neutral-950/80 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <div 
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate('/campo')}
        >
          <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-500 flex items-center justify-center border border-orange-500/20">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-medium tracking-tight leading-tight">App Campo</h1>
            <p className="text-xs text-neutral-400">Técnico: {perfil?.nombre_completo || 'Cargando...'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Indicador de Red / Botón Sincronizar */}
          <button 
            onClick={handleSync}
            disabled={isSyncing || isOffline}
            className={`p-2 rounded-full transition-colors flex items-center justify-center relative ${
              isOffline 
                ? 'bg-red-500/10 text-red-500' 
                : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
            }`}
            title={isOffline ? 'Sin conexión' : 'Sincronizar'}
          >
            {isOffline ? (
              <WifiOff className="w-5 h-5" />
            ) : isSyncing ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Wifi className="w-5 h-5" />
            )}
            
            {/* Si está online y hay datos por sincronizar, idealmente mostraríamos un badge rojo aquí */}
          </button>

          {/* Botón Salir */}
          <button 
            onClick={handleLogout}
            className="p-2 rounded-full bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* BANNER OFFLINE (Sticky) */}
      {isOffline && (
        <div className="bg-red-500 text-white text-xs font-medium py-1.5 px-4 text-center sticky top-[57px] z-30 shadow-sm flex items-center justify-center gap-2">
          <WifiOff className="w-3.5 h-3.5" />
          Estás trabajando sin conexión. Los datos se guardarán localmente.
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 w-full max-w-lg mx-auto relative pb-20">
        <Outlet context={{ isOffline }} />
      </main>

    </div>
  )
}
