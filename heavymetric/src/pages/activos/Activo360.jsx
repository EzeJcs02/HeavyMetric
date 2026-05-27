import { useState, useMemo } from 'react'
import { useMaquinas } from '../../hooks/useMaquinas'
import { calcServiceState } from '../../hooks/useCliente360'
import { useRubro } from '../../context/RubroContext'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import FichaMaquina from '../../components/modulos/maquinas/FichaMaquina'

const ESTADO_OP_COLOR = {
  'Operativo':           'text-green-400 bg-green-500/10 border-green-500/30',
  'En mantenimiento':    'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  'En taller':           'text-orange-400 bg-orange-500/10 border-orange-500/30',
  'Esperando repuesto':  'text-red-400 bg-red-500/10 border-red-500/30',
  'Fuera de servicio':   'text-red-500 bg-red-500/10 border-red-500/30 font-bold',
  'Baja':                'text-hm-muted bg-hm-surface2 border-hm-border',
}

export default function Activo360() {
  const { maquinas, loading, error } = useMaquinas()
  const [searchQuery, setSearchQuery] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('Todos')
  const [selectedActivoId, setSelectedActivoId] = useState(null)
  const { taxonomia } = useRubro()

  const alertas = useMemo(() => {
    if (!maquinas?.length) return 0
    return maquinas.filter(m => {
      const svc = calcServiceState(m)
      return m.activa !== false && (
        ['Fuera de servicio', 'Esperando repuesto', 'En taller'].includes(m.estado_operativo) ||
        ['vencido', 'urgente'].includes(svc?.estado)
      )
    }).length
  }, [maquinas])

  const activosFiltrados = useMemo(() => {
    let filtrados = maquinas
    if (filtroTipo === 'Propio') filtrados = filtrados.filter(m => !m.en_alquiler && m.tipo !== 'Movilidad')
    if (filtroTipo === 'Rental') filtrados = filtrados.filter(m => m.en_alquiler)
    if (filtroTipo === 'Movilidad') filtrados = filtrados.filter(m => m.tipo === 'Movilidad')
    if (filtroTipo === 'Alertas') filtrados = filtrados.filter(m => {
      const svc = calcServiceState(m)
      return ['Fuera de servicio', 'Esperando repuesto', 'En taller'].includes(m.estado_operativo) || ['vencido', 'urgente'].includes(svc?.estado)
    })

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtrados = filtrados.filter(m => 
        (m.nombre_unidad || '').toLowerCase().includes(q) ||
        (m.interno || '').toLowerCase().includes(q) ||
        (m.marca || '').toLowerCase().includes(q) ||
        (m.cliente?.razon_social || '').toLowerCase().includes(q)
      )
    }
    return filtrados
  }, [maquinas, searchQuery, filtroTipo])

  const resumenActivos = useMemo(() => {
    const total = maquinas.length
    const propios = maquinas.filter(m => !m.en_alquiler && m.tipo !== 'Movilidad').length
    const rental = maquinas.filter(m => m.en_alquiler).length
    const movilidad = maquinas.filter(m => m.tipo === 'Movilidad').length
    const sinServicio = maquinas.filter(m => ['Fuera de servicio', 'Esperando repuesto', 'En taller'].includes(m.estado_operativo)).length
    const promedioDisponibilidad = total ? Math.round(maquinas.reduce((sum, m) => sum + Number(m.score_disponibilidad || 0), 0) / total) : 0

    return { total, propios, rental, movilidad, sinServicio, promedioDisponibilidad }
  }, [maquinas])

  if (error) {
    return <div className="p-6 text-red-400 font-mono">Error cargando activos: {error}</div>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-hm-border pb-4">
        <div>
          <h1 className="text-2xl font-bold">Activo 360</h1>
          <p className="text-sm text-hm-muted mt-1">
            Visión unificada de Flota, Rental y Activos Móviles.
          </p>
        </div>
        <div className="flex gap-2">
          {/* <Button variant="primary">+ NUEVO ACTIVO</Button> */}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-hm-surface2/70 border-hm-border/50 p-4">
          <div className="text-sm text-hm-muted uppercase font-mono tracking-widest">Activos totales</div>
          <div className="text-2xl font-bold text-hm-text">{resumenActivos.total}</div>
        </Card>
        <Card className="bg-hm-surface2/70 border-hm-border/50 p-4">
          <div className="text-sm text-hm-muted uppercase font-mono tracking-widest">Flota propia</div>
          <div className="text-2xl font-bold text-hm-text">{resumenActivos.propios}</div>
        </Card>
        <Card className="bg-hm-surface2/70 border-hm-border/50 p-4">
          <div className="text-sm text-hm-muted uppercase font-mono tracking-widest">Rental / Alquiler</div>
          <div className="text-2xl font-bold text-hm-text">{resumenActivos.rental}</div>
        </Card>
        <Card className="bg-hm-surface2/70 border-hm-border/50 p-4">
          <div className="text-sm text-hm-muted uppercase font-mono tracking-widest">Movilidad</div>
          <div className="text-2xl font-bold text-hm-text">{resumenActivos.movilidad}</div>
        </Card>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
        <Card className="bg-hm-surface2/70 border-hm-border/50 p-4">
          <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest">Disponibilidad promedio</div>
          <div className="text-xl font-bold text-hm-accent">{resumenActivos.promedioDisponibilidad}%</div>
        </Card>
        <Card className="bg-hm-surface2/70 border-hm-border/50 p-4">
          <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest">Activos con alerta</div>
          <div className="text-xl font-bold text-red-400">{alertas}</div>
        </Card>
        <Card className="bg-hm-surface2/70 border-hm-border/50 p-4">
          <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest">Sin servicio</div>
          <div className="text-xl font-bold text-orange-400">{resumenActivos.sinServicio}</div>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-hm-surface2/20 p-4 rounded-lg border border-hm-border/50 mt-4">
        <div className="flex-1">
          <label className="text-[10px] font-mono text-hm-muted mb-1 block uppercase tracking-widest">Buscar</label>
          <Input 
            placeholder="Buscar por interno, nombre, marca o cliente..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <label className="text-[10px] font-mono text-hm-muted mb-1 block uppercase tracking-widest">Filtrar por Grupo</label>
          <select 
            value={filtroTipo} 
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="w-full bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 text-sm text-hm-text focus:outline-none focus:border-hm-accent"
          >
            <option value="Todos">Todos ({maquinas.length})</option>
            <option value="Propio">Flota Propia</option>
            <option value="Rental">Rental / Alquiler</option>
            <option value="Movilidad">Movilidad / Vehículos</option>
            <option value="Alertas">Activos con alerta ({alertas})</option>
          </select>
        </div>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-hm-surface2/50 border-b border-hm-border">
            <tr>
              <th className="p-4 font-mono text-[10px] text-hm-muted uppercase">ACTIVO</th>
              <th className="p-4 font-mono text-[10px] text-hm-muted uppercase">UBICACIÓN / CLIENTE</th>
              <th className="p-4 font-mono text-[10px] text-hm-muted uppercase text-center">TIPO</th>
              <th className="p-4 font-mono text-[10px] text-hm-muted uppercase">ESTADO OP.</th>
              <th className="p-4 font-mono text-[10px] text-hm-muted uppercase text-center">SALUD / DISP.</th>
              <th className="p-4 font-mono text-[10px] text-hm-muted uppercase">MANTENIMIENTO</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1, 2, 3, 4, 5].map(i => (
                <tr key={i} className="border-b border-hm-border/50">
                  <td colSpan={6} className="p-4"><div className="h-6 bg-hm-surface2 rounded animate-pulse" /></td>
                </tr>
              ))
            ) : activosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-hm-muted font-mono text-sm">
                  No se encontraron activos.
                </td>
              </tr>
            ) : (
              activosFiltrados.map(m => {
                const svc = calcServiceState(m)
                const disp = m.score_disponibilidad || 100
                const estadoCls = ESTADO_OP_COLOR[m.estado_operativo] || ESTADO_OP_COLOR['Operativo']
                
                return (
                  <tr 
                    key={m.id} 
                    onClick={() => setSelectedActivoId(m.id)}
                    className="border-b border-hm-border/30 hover:bg-hm-surface2/40 cursor-pointer transition-colors group"
                  >
                    <td className="p-4">
                      <div className="font-bold text-sm text-hm-text group-hover:text-hm-accent transition-colors">
                        {m.interno ? `[${m.interno}] ` : ''}{m.nombre_unidad}
                      </div>
                      <div className="text-xs text-hm-muted mt-0.5">
                        {[m.marca, m.modelo, m.anio].filter(Boolean).join(' · ')}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-medium">{m.cliente?.razon_social || 'Base / Taller'}</div>
                      <div className="text-[10px] text-hm-muted mt-0.5">{m.ubicacion || '—'}</div>
                    </td>
                    <td className="p-4 text-center">
                      <Badge variant={m.en_alquiler ? 'info' : m.tipo === 'Movilidad' ? 'default' : 'success'}>
                        {m.en_alquiler ? 'RENTAL' : m.tipo === 'Movilidad' ? 'VEHÍCULO' : 'PROPIA'}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-mono font-bold border ${estadoCls}`}>
                        {m.estado_operativo || 'Operativo'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className={`text-sm font-black ${disp < 70 ? 'text-red-400' : disp < 90 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {disp}%
                      </div>
                    </td>
                    <td className="p-4">
                      {svc ? (
                        <div>
                          <div className={`text-xs font-mono font-bold ${svc.estado === 'vencido' || svc.estado === 'urgente' ? 'text-red-400' : svc.estado === 'proximo' ? 'text-yellow-400' : 'text-green-400'}`}>
                            {svc.estado.toUpperCase()}
                          </div>
                          <div className="text-[10px] text-hm-muted">{Math.abs(svc.restantes).toFixed(0)}{taxonomia.medidorUnidad} {svc.estado === 'vencido' ? 'atrasado' : 'restantes'}</div>
                        </div>
                      ) : (
                        <span className="text-[10px] text-hm-muted font-mono italic">Sin configurar</span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </Card>

      {selectedActivoId && (
        <FichaMaquina 
          isOpen={!!selectedActivoId} 
          onClose={() => setSelectedActivoId(null)} 
          maquinaId={selectedActivoId} 
        />
      )}
    </div>
  )
}
