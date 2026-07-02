import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useDolar } from '../../context/DolarContext'
import { DASHBOARD_ALERTS_QUERY_KEY, useDashboardData } from '../../hooks/useDashboardData'
import { useAuth } from '../../context/AuthContext'
import { useRubro } from '../../context/RubroContext'
import { useAIInsights } from '../../hooks/useAIInsights'
import { supabase } from '../../lib/supabase'
import KpiCard from '../../components/ui/KpiCard'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import AlertaService from '../../components/modulos/AlertaService'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

function DataBadge({ type = 'real' }) {
  const styles = {
    real: 'border-green-500/30 bg-green-500/10 text-green-300',
    prep: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300',
    empty: 'border-hm-border bg-hm-surface2/40 text-hm-muted',
  }

  const labels = {
    real: 'REAL',
    prep: 'BASE PREPARADA',
    empty: 'SIN DATOS',
  }

  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest ${styles[type]}`}>
      {labels[type]}
    </span>
  )
}

function Skeleton({ className }) {
  return <div className={`animate-pulse bg-hm-surface2 rounded ${className}`} />
}

function EmptyPanel({ title = 'Sin datos disponibles', description = 'Todavía no hay información suficiente para mostrar este bloque.' }) {
  return (
    <div className="p-8 text-center text-hm-muted font-mono text-sm">
      <div className="mb-2 text-hm-muted">{title}</div>
      <div className="text-xs text-hm-muted/70">{description}</div>
    </div>
  )
}

function SectionHeader({ title, badge = 'real' }) {
  return (
    <div className="px-5 py-3.5 border-b border-hm-border flex items-center justify-between gap-3">
      <h2 className="text-xs font-mono font-bold tracking-widest uppercase text-hm-muted">{title}</h2>
      <DataBadge type={badge} />
    </div>
  )
}

export default function Dashboard() {
  const queryClient = useQueryClient()
  const { toARS, formatARS, formatUSD } = useDolar()
  const { data, loading, error, refresh } = useDashboardData()
  const { perfil, hasModule } = useAuth()
  const { taxonomia } = useRubro()
  const { counts, loading: aiLoading } = useAIInsights()

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

  const safeData = data || {}

  const kpis = safeData.kpis || {
    ordenesActivas: 0,
    alquileresActivos: 0,
    alquileresPorVencer: 0,
    facturadoMes: 0,
    cobranzaPendiente: 0,
    alertasService: 0,
    alertasServiceUrgentes: 0,
    leadsActivos: 0,
    leadsGradoA: 0,
    cotizacionesPendientes: 0,
    cotizacionesMonto: 0,
    npsPromedio: null,
  }

  const transacciones = safeData.transacciones || []
  const alertas = safeData.alertas || []
  const alertasService = safeData.alertasService || []
  const solicitudes = safeData.solicitudes || []
  const ingresosMensuales = safeData.ingresosMensuales || []

  const hayIngresos = ingresosMensuales.some((item) => Number(item.total || 0) > 0)
  const hayIA =
    !aiLoading &&
    (counts.stock > 0 ||
      counts.clientes > 0 ||
      counts.otsDemoradas > 0 ||
      counts.activos > 0 ||
      counts.noRentables > 0 ||
      counts.tesoreria > 0)

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null

    return (
      <div className="bg-hm-surface border border-hm-border rounded-lg px-3 py-2 text-xs shadow-lg">
        <div className="font-mono text-hm-muted mb-1">{label}</div>
        <div className="font-bold text-hm-accent">{formatUSD(payload[0].value)}</div>
      </div>
    )
  }

  const handleResolverAlerta = async (alertaId) => {
    let query = supabase.from('alertas').update({ resuelta: true }).eq('id', alertaId)

    if (perfil?.organization_id) {
      query = query.eq('organization_id', perfil.organization_id)
    }

    const { error: resolverError } = await query

    if (resolverError) {
      toast.error('No se pudo resolver la alerta')
      console.warn('handleResolverAlerta:', resolverError.message)
      return
    }

    queryClient.setQueryData(
      [DASHBOARD_ALERTS_QUERY_KEY, perfil.organization_id],
      (alertasActuales) => alertasActuales?.filter((alerta) => alerta.id !== alertaId)
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 border-b border-hm-border pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Centro de Operaciones</h1>
          <p className="mt-1 text-sm text-hm-muted">
            Resumen operativo, comercial y financiero de la organización.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <DataBadge type="real" />
          <button
            onClick={refresh}
            className="rounded border border-hm-border px-3 py-1.5 text-xs font-mono font-bold text-hm-muted transition-colors hover:border-hm-accent hover:text-hm-accent"
          >
            ↻ ACTUALIZAR
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-hm-border/50 bg-hm-surface2/20 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold">Indicadores principales</h2>
            <p className="mt-0.5 text-xs text-hm-muted">
              Métricas operativas tomadas de datos reales disponibles. Los indicadores sin fuente muestran cero o sin datos.
            </p>
          </div>
          <DataBadge type="real" />
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-8">
          {loading ? (
            [1, 2, 3, 4, 5, 6, 7, 8].map((i) => <Skeleton key={i} className="h-[90px]" />)
          ) : (
            <>
              {hasModule('taller') && (
                <KpiCard
                  label="Órdenes Activas"
                  value={kpis.ordenesActivas || 0}
                  subtext={taxonomia.taller}
                  accent={kpis.ordenesActivas > 0 ? 'blue-400' : 'hm-muted'}
                />
              )}

              {hasModule('alquileres') && (
                <KpiCard
                  label={`${taxonomia.activoSingular} en Alquiler`}
                  value={kpis.alquileresActivos || 0}
                  subtext={`${kpis.alquileresPorVencer || 0} por vencer`}
                  accent={kpis.alquileresActivos > 0 ? 'hm-accent' : 'hm-muted'}
                />
              )}

              <KpiCard
                label="Facturado Mes"
                value={formatUSD(kpis.facturadoMes || 0)}
                subtext={kpis.facturadoMes > 0 && toARS ? formatARS(toARS(kpis.facturadoMes)) : 'Sin facturación registrada'}
                accent={kpis.facturadoMes > 0 ? 'green-400' : 'hm-muted'}
              />

              <KpiCard
                label="Cobranza Pend."
                value={formatUSD(kpis.cobranzaPendiente || 0)}
                subtext={kpis.cobranzaPendiente > 0 ? 'Requiere seguimiento' : 'Sin deuda pendiente'}
                accent={kpis.cobranzaPendiente > 0 ? 'red-400' : 'green-400'}
              />

              {hasModule('taller') && (
                <KpiCard
                  label="Alertas Service"
                  value={kpis.alertasService || 0}
                  subtext={`Urgentes: ${kpis.alertasServiceUrgentes || 0}`}
                  accent={kpis.alertasServiceUrgentes > 0 ? 'red-400' : kpis.alertasService > 0 ? 'yellow-400' : 'green-400'}
                />
              )}

              {hasModule('crm') && (
                <>
                  <KpiCard
                    label="Leads Activos"
                    value={kpis.leadsActivos || 0}
                    subtext={`Grado A: ${kpis.leadsGradoA || 0}`}
                    accent={kpis.leadsActivos > 0 ? 'yellow-400' : 'hm-muted'}
                  />

                  <KpiCard
                    label="Cotiz. Pendientes"
                    value={kpis.cotizacionesPendientes || 0}
                    subtext={formatUSD(kpis.cotizacionesMonto || 0)}
                    accent={kpis.cotizacionesPendientes > 0 ? 'teal-400' : 'hm-muted'}
                  />
                </>
              )}

              <KpiCard
                label="NPS Promedio"
                value={kpis.npsPromedio !== null && kpis.npsPromedio !== undefined ? kpis.npsPromedio : '—'}
                subtext={kpis.npsPromedio !== null && kpis.npsPromedio !== undefined ? 'Últimos 90 días' : 'Sin medición cargada'}
                accent={
                  kpis.npsPromedio === null || kpis.npsPromedio === undefined
                    ? 'hm-muted'
                    : kpis.npsPromedio >= 8
                      ? 'green-400'
                      : kpis.npsPromedio >= 6
                        ? 'yellow-400'
                        : 'red-400'
                }
              />
            </>
          )}
        </div>
      </div>

      {!aiLoading && (
        <Card className={`p-0 overflow-hidden ${hayIA ? 'border-indigo-500/20' : 'border-hm-border'}`}>
          <div className="px-5 py-3 border-b border-hm-border flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${hayIA ? 'bg-indigo-400 animate-pulse' : 'bg-hm-muted'}`} />
              <span className={`text-xs font-mono font-bold tracking-widest uppercase ${hayIA ? 'text-indigo-400' : 'text-hm-muted'}`}>
                IA Silenciosa — Insights Operativos
              </span>
            </div>
            <DataBadge type="real" />
          </div>

          {hayIA ? (
            <div className="grid grid-cols-2 divide-x divide-hm-border sm:grid-cols-3 lg:grid-cols-6">
              {[
                { label: 'Stock crítico', count: counts.stock, color: 'text-indigo-400', link: '/app/repuestos', show: counts.stock > 0 },
                { label: 'Clientes riesgo', count: counts.clientes, color: 'text-red-400', link: '/app/clientes', show: counts.clientes > 0 },
                { label: 'OTs demoradas', count: counts.otsDemoradas, color: 'text-yellow-400', link: '/app/taller', show: counts.otsDemoradas > 0 },
                { label: 'OTs baja margen', count: counts.noRentables, color: 'text-purple-400', link: '/app/taller', show: counts.noRentables > 0 },
                { label: 'Activos críticos', count: counts.activos, color: 'text-rose-400', link: '/app/taller', show: counts.activos > 0 },
                { label: 'Anomalías', count: counts.tesoreria, color: 'text-orange-400', link: '/app/tesoreria', show: counts.tesoreria > 0 },
              ]
                .filter((i) => i.show)
                .map((item) => (
                  <a
                    key={item.label}
                    href={item.link}
                    className="group flex flex-col items-center justify-center gap-1 px-3 py-4 text-center transition-colors hover:bg-hm-surface2/40"
                  >
                    <span className={`text-2xl font-black tabular-nums transition-transform group-hover:scale-110 ${item.color}`}>
                      {item.count}
                    </span>
                    <span className="text-[9px] font-mono text-hm-muted uppercase tracking-wider">{item.label}</span>
                  </a>
                ))}
            </div>
          ) : (
            <EmptyPanel
              title="Sin insights activos"
              description="No se detectan alertas operativas, financieras o comerciales críticas en este momento."
            />
          )}
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="p-0 overflow-hidden">
          <SectionHeader title="Ingresos del año" badge={hayIngresos ? 'real' : 'empty'} />
          <div className="p-5">
            {loading ? (
              <div className="h-[160px] animate-pulse rounded bg-hm-surface2" />
            ) : hayIngresos ? (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={ingresosMensuales} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradAccent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f0a500" stopOpacity={0.2} />
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
            ) : (
              <div className="flex h-[160px] items-center justify-center">
                <EmptyPanel title="Sin ingresos registrados" description="Cuando existan facturas o cobros, se mostrará la evolución mensual." />
              </div>
            )}
          </div>
        </Card>

        <Card className="p-0 overflow-hidden">
          <SectionHeader title="Ingresos por mes" badge={hayIngresos ? 'real' : 'empty'} />
          <div className="p-5">
            {loading ? (
              <div className="h-[160px] animate-pulse rounded bg-hm-surface2" />
            ) : hayIngresos ? (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={ingresosMensuales} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#252a38" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fill: '#5c6278', fontSize: 10, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" fill="#f0a500" fillOpacity={0.85} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[160px] items-center justify-center">
                <EmptyPanel title="Sin datos para graficar" description="Los gráficos se activarán automáticamente cuando haya movimientos reales." />
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card className="p-0 overflow-hidden">
            <SectionHeader title="Últimas transacciones" badge={transacciones.length > 0 ? 'real' : 'empty'} />

            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : transacciones.length === 0 ? (
              <EmptyPanel
                title="No hay transacciones recientes"
                description="Las facturas, recibos y documentos financieros aparecerán acá."
              />
            ) : (
              <table className="w-full text-left">
                <tbody>
                  {transacciones.map((tx) => (
                    <tr key={tx.id} className="border-b border-hm-border last:border-0 hover:bg-hm-surface2/30">
                      <td className="p-4 font-mono text-sm text-hm-muted">{tx.fecha_emision || '—'}</td>
                      <td className="p-4 font-mono text-sm">
                        {tx.tipo_documento || 'Documento'} {tx.numero_comprobante || ''}
                      </td>
                      <td className="p-4 text-sm font-medium">{formatUSD(tx.monto_total_usd || 0)}</td>
                      <td className="p-4 text-right">
                        <Badge variant={tx.estado_pago === 'cobrado' ? 'ventas' : 'warn'}>
                          {(tx.estado_pago || 'pendiente').toUpperCase()}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Card className="p-0 overflow-hidden">
              <SectionHeader title="Solicitudes" badge={solicitudes.length > 0 ? 'real' : 'empty'} />

              {loading ? (
                <div className="p-4 space-y-3">
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : solicitudes.length === 0 ? (
                <EmptyPanel title="Sin solicitudes pendientes" description="No hay aprobaciones o pedidos internos pendientes." />
              ) : (
                <div className="flex flex-col">
                  {solicitudes.map((sol) => (
                    <div key={sol.id} className="p-4 border-b border-hm-border last:border-0 flex justify-between items-center hover:bg-hm-surface2/30">
                      <div>
                        <div className="font-medium text-sm mb-1">{sol.descripcion}</div>
                        <div className="text-xs font-mono text-hm-muted">
                          {sol.perfiles?.nombre_completo || 'Sin responsable'} • {sol.modulo || 'General'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-0 overflow-hidden">
              <SectionHeader title="Avisos" badge={alertas.length > 0 ? 'real' : 'empty'} />

              {loading ? (
                <div className="p-4 space-y-3">
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : alertas.length === 0 ? (
                <EmptyPanel title="Sin avisos activos" description="Las alertas resueltas o inexistentes no se muestran." />
              ) : (
                <div className="flex flex-col">
                  {alertas.map((al) => (
                    <div key={al.id} className="p-4 border-b border-hm-border last:border-0 flex flex-col gap-1 hover:bg-hm-surface2/30 group">
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-medium text-sm flex-1">{al.titulo}</span>
                        <button
                          onClick={() => handleResolverAlerta(al.id)}
                          className="opacity-0 group-hover:opacity-100 text-[10px] font-mono text-hm-muted hover:text-green-400 border border-hm-border hover:border-green-500 rounded px-1.5 py-0.5 transition-all shrink-0"
                        >
                          ✓
                        </button>
                      </div>
                      <span className="text-xs text-hm-muted">{al.descripcion}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>

        {hasModule('taller') && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-mono font-bold tracking-widest uppercase text-hm-muted">Alertas de service</h2>
              <DataBadge type={alertasService.length > 0 ? 'real' : 'empty'} />
            </div>

            <div className="flex flex-col gap-3">
              {loading ? (
                <>
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </>
              ) : alertasService.length === 0 ? (
                <Card className="p-5">
                  <div className="text-center text-hm-muted font-mono text-sm">
                    No hay {taxonomia.activoPlural.toLowerCase()} con service próximo o vencido.
                  </div>
                </Card>
              ) : (
                alertasService.map((maquina) => (
                  <AlertaService key={maquina.id} maquina={maquina} />
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
