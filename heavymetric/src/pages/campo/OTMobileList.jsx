import React, { useState, useEffect } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getCache, fetchAndCacheAssignments } from '../../lib/syncQueue'
import { FileText, MapPin, Clock, Search, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'

export default function OTMobileList() {
  const { user } = useAuth()
  const { isOffline } = useOutletContext()
  const navigate = useNavigate()
  
  const [ots, setOts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOffline, user])

  const loadData = async () => {
    if (!user) return;
    setLoading(true)
    
    try {
      if (!isOffline) {
        // Sync de internet hacia la db local
        await fetchAndCacheAssignments(user.id)
      }
      
      // Siempre leer la DB local para renderizar (Offline-First approach)
      const localOts = await getCache('my_ots')
      if (localOts) {
        setOts(localOts)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filteredOts = ots.filter(ot => 
    ot.numero_ot?.toString().includes(search) || 
    ot.maquinas?.nombre_unidad?.toLowerCase().includes(search.toLowerCase()) ||
    ot.clientes?.razon_social?.toLowerCase().includes(search.toLowerCase())
  )

  const getStatusColor = (estado) => {
    switch(estado) {
      case 'borrador': return 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30'
      case 'en_progreso': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      case 'pausada': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      default: return 'bg-neutral-800 text-neutral-400'
    }
  }

  return (
    <div className="p-4 space-y-4">
      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
        <input 
          type="text"
          placeholder="Buscar OT, máquina o cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-neutral-950 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all placeholder-neutral-600"
        />
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-10 text-neutral-500 animate-pulse text-sm">
            Cargando órdenes asignadas...
          </div>
        ) : filteredOts.length === 0 ? (
          <div className="text-center py-10 text-neutral-500 text-sm bg-neutral-900/50 border border-white/5 rounded-2xl">
            No tienes órdenes de trabajo pendientes.
          </div>
        ) : (
          filteredOts.map((ot) => (
            <div 
              key={ot.id}
              onClick={() => navigate(`/campo/ot/${ot.id}`)}
              className="bg-neutral-900 border border-white/5 rounded-2xl p-4 active:scale-[0.98] transition-transform cursor-pointer shadow-sm relative overflow-hidden"
            >
              {/* Status Ribbon */}
              <div className={`absolute top-0 right-0 px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-bl-xl border-l border-b ${getStatusColor(ot.estado)}`}>
                {ot.estado.replace('_', ' ')}
              </div>

              <div className="flex items-start gap-3 mt-2">
                <div className="p-2 bg-neutral-800 rounded-lg text-neutral-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-medium text-lg leading-tight">OT #{ot.numero_ot}</h3>
                  </div>
                  <p className="text-orange-400 font-medium text-sm mt-0.5">{ot.maquinas?.nombre_unidad}</p>
                  
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="truncate">{ot.clientes?.razon_social}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Ingreso: {ot.fecha_ingreso ? format(new Date(ot.fecha_ingreso + 'T00:00:00'), 'dd/MM/yyyy') : 'N/A'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="self-center pl-2 text-neutral-500">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
