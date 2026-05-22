import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const TIPO_CONFIG = {
  nota: { icon: '📝', color: 'text-zinc-400', bg: 'bg-zinc-500/10' },
  llamada: { icon: '📞', color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  correo: { icon: '✉️', color: 'text-sky-400', bg: 'bg-sky-500/10' },
  reunion: { icon: '🤝', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  apertura_ot: { icon: '🔧', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  nuevo_alquiler: { icon: '🚜', color: 'text-violet-400', bg: 'bg-violet-500/10' },
  emision_factura: { icon: '🧾', color: 'text-green-400', bg: 'bg-green-500/10' },
  service_urgente: { icon: '⚠️', color: 'text-red-400', bg: 'bg-red-500/10' },
  service_proximo: { icon: '⚠️', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  default: { icon: '📌', color: 'text-hm-muted', bg: 'bg-hm-surface2' }
}

export default function Timeline360({ clienteId, maquinaId, orgId }) {
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [nuevaNota, setNuevaNota] = useState('')
  const [tipoNota, setTipoNota] = useState('nota')
  const [saving, setSaving] = useState(false)

  const cargarEventos = async () => {
    if (!orgId) return
    setLoading(true)
    let query = supabase.from('timeline_eventos_360').select('*').eq('organization_id', orgId)
    
    if (clienteId) query = query.eq('cliente_id', clienteId)
    if (maquinaId) query = query.eq('maquina_id', maquinaId)
    
    const { data } = await query.order('fecha', { ascending: false })
    if (data) setEventos(data)
    setLoading(false)
  }

  useEffect(() => {
    cargarEventos()
  }, [clienteId, maquinaId, orgId])

  const agregarNota = async (e) => {
    e.preventDefault()
    if (!nuevaNota.trim()) return
    setSaving(true)
    
    const user = await supabase.auth.getUser()
    const payload = {
      organization_id: orgId,
      cliente_id: clienteId || null,
      maquina_id: maquinaId || null,
      autor_id: user.data.user.id,
      tipo_nota: tipoNota,
      contenido: nuevaNota
    }

    const { error } = await supabase.from('timeline_notas').insert(payload)
    if (!error) {
      setNuevaNota('')
      cargarEventos()
    }
    setSaving(false)
  }

  return (
    <div className="flex flex-col gap-6">
      
      {/* Formulario Nota Manual */}
      <form onSubmit={agregarNota} className="flex gap-2">
        <select 
          value={tipoNota} 
          onChange={e => setTipoNota(e.target.value)}
          className="bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text"
        >
          <option value="nota">📝 Nota</option>
          <option value="llamada">📞 Llamada</option>
          <option value="correo">✉️ Correo</option>
          <option value="reunion">🤝 Reunión</option>
        </select>
        <input 
          type="text" 
          placeholder="Escribir un registro o nota..."
          value={nuevaNota}
          onChange={e => setNuevaNota(e.target.value)}
          className="flex-1 bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent"
        />
        <button 
          type="submit" 
          disabled={saving || !nuevaNota.trim()}
          className="bg-hm-accent text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
        >
          {saving ? '...' : 'AGREGAR'}
        </button>
      </form>

      {/* Timeline */}
      <div className="relative border-l-2 border-hm-border/50 ml-3 md:ml-4 flex flex-col gap-6 pt-2">
        {loading ? (
          <div className="animate-pulse flex flex-col gap-4 pl-6">
            <div className="h-10 bg-hm-surface2 rounded w-3/4" />
            <div className="h-10 bg-hm-surface2 rounded w-full" />
            <div className="h-10 bg-hm-surface2 rounded w-5/6" />
          </div>
        ) : eventos.length === 0 ? (
          <div className="pl-6 text-sm text-hm-muted">No hay eventos registrados en el timeline.</div>
        ) : (
          eventos.map((ev, i) => {
            const conf = TIPO_CONFIG[ev.tipo_evento] || TIPO_CONFIG.default
            return (
              <div key={`${ev.evento_id}-${i}`} className="relative pl-6 sm:pl-8 group">
                {/* Punto */}
                <div className={`absolute -left-[17px] top-0.5 flex items-center justify-center w-8 h-8 rounded-full border border-hm-surface shadow-sm ${conf.bg}`}>
                  <span className="text-sm">{conf.icon}</span>
                </div>
                
                {/* Contenido */}
                <div className="bg-hm-surface2/30 border border-hm-border rounded-lg p-3 hover:border-hm-accent/30 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                    <span className={`text-xs font-bold uppercase tracking-wider ${conf.color}`}>
                      {ev.tipo_evento.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] font-mono text-hm-muted uppercase">
                      {format(new Date(ev.fecha), "dd MMM yyyy, HH:mm", { locale: es })}
                    </span>
                  </div>
                  <div className="text-sm text-hm-text">
                    {ev.descripcion}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
