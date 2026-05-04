import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

export default function AlertasBanner() {
  const [alertas, setAlertas] = useState([])
  const [dismissed, setDismissed] = useState(false)
  const { perfil } = useAuth()

  useEffect(() => {
    if (!perfil?.organization_id) return

    async function fetchAlertas() {
      const { data } = await supabase
        .from('maquinas_service')
        .select('id, nombre_unidad, estado_service, horas_restantes_service')
        .eq('estado_service', 'urgente')
      setAlertas(data || [])
      setDismissed(false)
    }

    fetchAlertas()
    const interval = setInterval(fetchAlertas, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [perfil?.organization_id])

  if (!alertas.length || dismissed) return null

  return (
    <div className="bg-red-500/10 border-b border-red-500/30 px-4 md:px-6 py-2 flex items-center justify-between gap-4 shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
        <span className="text-xs font-mono font-bold text-red-400 shrink-0">SERVICE URGENTE:</span>
        <span className="text-xs text-red-300 truncate">
          {alertas.map(a => a.nombre_unidad).join(', ')}
          {' '}— service vencido o próximo a vencer.
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-red-500 hover:text-red-300 shrink-0 transition-colors"
        aria-label="Descartar"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
