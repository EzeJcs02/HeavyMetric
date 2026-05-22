import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import AlertaService from '../../components/modulos/AlertaService'

export default function BandejaHoy() {
  const { perfil, orgId } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orgId) return
    async function loadDatos() {
      // Cargar resumen operativo rápido
      const [{ count: otsAbiertas }, { count: servicesProximos }, { count: repuestosCriticos }] = await Promise.all([
        supabase.from('ordenes_trabajo').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).in('estado', ['en_progreso', 'borrador']),
        supabase.from('maquinas_service').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).in('estado_service', ['urgente', 'vencido', 'proximo']),
        supabase.from('inventario').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).lt('stock_actual', 5) // simulado
      ])

      // Cargar algunas OTs para la lista
      const { data: ots } = await supabase
        .from('ordenes_trabajo')
        .select('id, numero_ot, estado, descripcion_trabajo')
        .eq('organization_id', orgId)
        .in('estado', ['en_progreso', 'borrador'])
        .order('created_at', { ascending: false })
        .limit(5)

      setData({
        otsAbiertas: otsAbiertas || 0,
        servicesProximos: servicesProximos || 0,
        repuestosCriticos: repuestosCriticos || 0,
        otsActivas: ots || []
      })
      setLoading(false)
    }
    loadDatos()
  }, [orgId])

  if (loading) {
    return <div className="animate-pulse flex flex-col gap-4 p-4"><div className="h-32 bg-hm-surface2 rounded-xl"/><div className="h-64 bg-hm-surface2 rounded-xl"/></div>
  }

  const isOperativo = perfil?.rol === 'operativo'

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-hm-surface border border-hm-border rounded-xl p-5 hover:border-hm-accent/50 transition-colors">
          <div className="text-sm font-mono text-hm-muted mb-2">OTs Abiertas</div>
          <div className="text-3xl font-bold text-hm-text">{data.otsAbiertas}</div>
        </div>
        <div className="bg-hm-surface border border-hm-border rounded-xl p-5 hover:border-red-500/50 transition-colors">
          <div className="text-sm font-mono text-hm-muted mb-2">Services Críticos</div>
          <div className="text-3xl font-bold text-red-400">{data.servicesProximos}</div>
        </div>
        <div className="bg-hm-surface border border-hm-border rounded-xl p-5 hover:border-amber-500/50 transition-colors">
          <div className="text-sm font-mono text-hm-muted mb-2">Stock Crítico</div>
          <div className="text-3xl font-bold text-amber-400">{data.repuestosCriticos}</div>
        </div>
        {!isOperativo && (
          <div className="bg-hm-surface border border-hm-border rounded-xl p-5 hover:border-blue-500/50 transition-colors">
            <div className="text-sm font-mono text-hm-muted mb-2">Aprobaciones</div>
            <div className="text-3xl font-bold text-blue-400">0</div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-hm-border">
            <h2 className="text-xs font-mono font-bold tracking-widest uppercase text-hm-muted">Mis Tareas / OTs</h2>
          </div>
          <div className="p-0">
            {data.otsActivas.length === 0 ? (
              <div className="p-6 text-center text-sm text-hm-muted">No hay OTs abiertas</div>
            ) : (
              data.otsActivas.map(ot => (
                <div key={ot.id} className="p-4 border-b border-hm-border last:border-0 hover:bg-hm-surface2/30 flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-sm text-hm-text">OT #{ot.numero_ot}</div>
                    <div className="text-xs text-hm-muted line-clamp-1">{ot.descripcion_trabajo || 'Sin descripción'}</div>
                  </div>
                  <Badge variant={ot.estado === 'en_progreso' ? 'info' : 'warn'}>
                    {ot.estado.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>
        
        {/* Aquí irían las alertas de service, leads por llamar, etc. */}
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-hm-border">
            <h2 className="text-xs font-mono font-bold tracking-widest uppercase text-hm-muted">Pendientes & Alertas</h2>
          </div>
          <div className="p-6 text-center text-sm text-hm-muted flex flex-col items-center justify-center h-40">
            <svg className="w-8 h-8 text-hm-border mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
            Todo al día
          </div>
        </Card>
      </div>
    </div>
  )
}
