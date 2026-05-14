import { useEffect } from 'react'
import { useDolar } from '../../context/DolarContext'
import { useDashboardData } from '../../hooks/useDashboardData'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import KpiCard from '../../components/ui/KpiCard'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import AlertaService from '../../components/modulos/AlertaService'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

export default function Dashboard() {
  const { toARS, formatARS, formatUSD } = useDolar()
  const { data, loading, error } = useDashboardData()
  const { perfil } = useAuth()

  useEffect(() => {
    if (!perfil?.organization_id) return
    supabase.rpc('generar_alertas_automaticas', { p_org_id: perfil.organization_id })
      .then(({ error: e }) => { if (e) console.warn('alertas auto:', e.message) })
  }, [perfil?.organization_id])

  if (error) {
    return (
      <div className="p-6">
        <Card className="p-6 border-red-800 bg-red-900/20 text-red-400">
          <h2 className="font-bold mb-2">Error cargando Dashboard</h2>
          <p className="font-mono text-sm">{error}</p>
        </Card>
      </div>
    )
  }

  const { kpis, transacciones, alertas, alertasService, solicitudes, ingresosMensuales } = data

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-hm-surface border border-hm-border rounded-lg px-3 py-2 text-xs shadow-lg">
        <div className="font-mono text-hm-muted mb-1">{label}</div>
        <div className="font-bold text-hm-accent">{formatUSD(payload[0].value)}</div>
      </div>
    )
  }

  const Skeleton = ({ className }) => (
    <div className={`animate-pulse bg-hm-surface2 rounded ${className}`} />
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Resumen General</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4">
        {loading ? (
          <>
            {[1,2,3,4,5,6,7,8].map(i => <Skeleton key={i} className="h-[90px]" />)}
          </>
        ) : (
          <>
            <KpiCard label="Órdenes Activas" value={kpis.ordenesActivas} subtext="Taller" accent="blue-400" />
            <KpiCard label="Máq. en Alquiler" value={kpis.alquileresActivos} subtext={`${kpis.alquileresPorVencer} por vencer`} accent="hm-accent" />
            <KpiCard
              label="Facturado Mes"
              value={formatUSD(kpis.facturadoMes)}
              subtext={toARS ? formatARS(toARS(kpis.facturadoMes)) : 'Cargando ARS...'}
              accent="green-400"
            />
            <KpiCard
              label="Cobranza Pend."
              value={formatUSD(kpis.cobranzaPendiente)}
              subtext="Sin cobrar"
              accent={kpis.cobranzaPendiente > 0 ? 'red-400' : 'green-400'}
            />
            <KpiCard label="Alertas Service" value={kpis.alertasService} subtext={`Urgentes: ${kpis.alertasServiceUrgentes}`} accent="red-400" />
            <KpiCard label="Leads Activos" value={kpis.leadsActivos} subtext={`Grado A: ${kpis.leadsGradoA}`} accent="yellow-400" />
            <KpiCard label="Cotiz. Pendientes" value={kpis.cotizacionesPendientes} subtext={formatUSD(kpis.cotizacionesMonto)} accent="teal-400" />
            <KpiCard
              label="NPS Promedio"
              value={kpis.npsPromedio !== null ? kpis.npsPromedio : '—'}
              subtext="Últimos 90 días"
              accent={kpis.npsPromedio === null ? 'hm-muted' : kpis.npsPromedio >= 8 ? 'green-400' : kpis.npsPromedio >= 6 ? 'yellow-400' : 'red-400'}
            />
          </>
        )}
      </div>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-hm-border">
            <h2 className="text-xs font-mono font-bold tracking-widest uppercase text-hm-muted">Ingresos del año</h2>
          </div>
          <div className="p-5">
            {loading ? (
              <div className="h-[160px] animate-pulse bg-hm-surface2 rounded" />
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={ingresosMensuales} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradAccent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#f0a500" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#f0a500" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#252a38" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fill: '#5c6278', fontSize: 10, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="total" stroke="#f0a500" strokeWidth={2} fill="url(#gradAccent)" dot={false} activeDot={{ r: 4, fill: '#f0a500' }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-hm-border">
            <h2 className="text-xs font-mono font-bold tracking-widest uppercase text-hm-muted">Ingresos por mes (barras)</h2>
          </div>
          <div className="p-5">
            {loading ? (
              <div className="h-[160px] animate-pulse bg-hm-surface2 rounded" />
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={ingresosMensuales} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#252a38" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fill: '#5c6278', fontSize: 10, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" fill="#f0a500" fillOpacity={0.85} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-hm-border">
              <h2 className="text-xs font-mono font-bold tracking-widest uppercase text-hm-muted">Últimas transacciones</h2>
            </div>
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : transacciones.length === 0 ? (
              <div className="p-8 text-center text-hm-muted font-mono text-sm">
                No hay transacciones recientes
              </div>
            ) : (
              <table className="w-full text-left">
                <tbody>
                  {transacciones.map(tx => (
                    <tr key={tx.id} className="border-b border-hm-border last:border-0 hover:bg-hm-surface2/30">
                      <td className="p-4 font-mono text-sm text-hm-muted">{tx.fecha_emision}</td>
                      <td className="p-4 font-mono text-sm">{tx.tipo_documento} {tx.numero_comprobante || ''}</td>
                      <td className="p-4 text-sm font-medium">{formatUSD(tx.monto_total_usd)}</td>
                      <td className="p-4 text-right">
                        <Badge variant={tx.estado_pago === 'cobrado' ? 'ventas' : 'warn'}>
                          {tx.estado_pago.toUpperCase()}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Card className="p-0 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-hm-border flex justify-between items-center">
                <h2 className="text-xs font-mono font-bold tracking-widest uppercase text-hm-muted">Solicitudes</h2>
                {solicitudes.length > 0 && <Badge variant="info">{solicitudes.length}</Badge>}
              </div>
              {loading ? (
                <div className="p-4 space-y-3"><Skeleton className="h-12 w-full" /></div>
              ) : solicitudes.length === 0 ? (
                <div className="p-6 text-center text-hm-muted font-mono text-sm">Sin pendientes</div>
              ) : (
                <div className="flex flex-col">
                  {solicitudes.map(sol => (
                    <div key={sol.id} className="p-4 border-b border-hm-border last:border-0 flex justify-between items-center hover:bg-hm-surface2/30">
                      <div>
                        <div className="font-medium text-sm mb-1">{sol.descripcion}</div>
                        <div className="text-xs font-mono text-hm-muted">{sol.perfiles?.nombre_completo} • {sol.modulo}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-0 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-hm-border flex justify-between items-center">
                <h2 className="text-xs font-mono font-bold tracking-widest uppercase text-hm-muted">Avisos</h2>
                {alertas.length > 0 && <Badge variant="warn">{alertas.length}</Badge>}
              </div>
              {loading ? (
                <div className="p-4 space-y-3"><Skeleton className="h-12 w-full" /></div>
              ) : alertas.length === 0 ? (
                <div className="p-6 text-center text-hm-muted font-mono text-sm">Sin avisos activos</div>
              ) : (
                <div className="flex flex-col">
                  {alertas.map(al => (
                    <div key={al.id} className="p-4 border-b border-hm-border last:border-0 flex flex-col gap-1 hover:bg-hm-surface2/30">
                      <div className="flex justify-between items-start">
                        <span className="font-medium text-sm">{al.titulo}</span>
                        <span className="w-2 h-2 rounded-full mt-1 bg-yellow-500 shrink-0"></span>
                      </div>
                      <span className="text-xs text-hm-muted">{al.descripcion}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-xs font-mono font-bold tracking-widest uppercase text-hm-muted px-1">Alertas de service</h2>
          <div className="flex flex-col gap-3">
            {loading ? (
              <>
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </>
            ) : alertasService.length === 0 ? (
              <div className="text-center text-hm-muted font-mono text-sm p-4">
                No hay máquinas con service próximo o vencido.
              </div>
            ) : (
              alertasService.map(maquina => (
                <AlertaService key={maquina.id} maquina={maquina} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
