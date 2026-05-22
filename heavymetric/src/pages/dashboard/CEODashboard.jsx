import { useCEODashboard } from '../../hooks/useCEODashboard'
import { useDolar } from '../../context/DolarContext'
import Card from '../../components/ui/Card'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const Skeleton = ({ className }) => <div className={`animate-pulse bg-hm-surface2 rounded ${className}`} />

function Section({ title, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-4 bg-hm-accent rounded-full" />
        <h2 className="text-xs font-mono font-bold text-hm-muted uppercase tracking-widest">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function KpiBlock({ label, value, sub, accent = '', alert = false }) {
  return (
    <Card className={`p-4 ${alert ? 'border-red-500/40' : ''}`}>
      <div className={`text-2xl font-bold ${accent}`}>{value}</div>
      <div className="text-[9px] font-mono text-hm-muted uppercase tracking-widest mt-0.5">{label}</div>
      {sub && <div className={`text-[10px] mt-0.5 ${alert ? 'text-red-400' : 'text-hm-muted'}`}>{sub}</div>}
    </Card>
  )
}

function TopList({ items, labelKey = 'nombre', valueKey = 'total', formatFn, emptyText = 'Sin datos' }) {
  if (!items?.length) return <div className="text-sm text-hm-muted font-mono py-3">{emptyText}</div>
  const max = Math.max(...items.map(i => i[valueKey]))
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-hm-muted w-4 shrink-0">{idx + 1}</span>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-sm font-medium truncate">{item[labelKey]}</span>
              <span className="text-sm font-bold font-mono text-hm-accent shrink-0 ml-2">
                {formatFn ? formatFn(item[valueKey]) : item[valueKey]}
              </span>
            </div>
            <div className="h-1 bg-hm-surface2 rounded-full overflow-hidden">
              <div className="h-full bg-hm-accent/60 rounded-full" style={{ width: `${max > 0 ? (item[valueKey] / max) * 100 : 0}%` }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

const FLOTA_COLORS = {
  'Operativo':          '#22c55e',
  'En mantenimiento':   '#eab308',
  'En taller':          '#f97316',
  'Esperando repuesto': '#ef4444',
  'Fuera de servicio':  '#dc2626',
  'Baja':               '#6b7280',
}

export default function CEODashboard() {
  const { data, loading, error, refresh } = useCEODashboard()
  const { formatUSD } = useDolar()

  if (error) return (
    <div className="p-6">
      <Card className="p-6 border-red-800 bg-red-900/20 text-red-400">
        <h2 className="font-bold mb-2">Error cargando CEO Dashboard</h2>
        <p className="font-mono text-sm">{error}</p>
      </Card>
    </div>
  )

  const k = data?.kpis

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-hm-surface border border-hm-border rounded-lg px-3 py-2 text-xs shadow-lg">
        <div className="font-mono text-hm-muted mb-1">{label}</div>
        <div className="font-bold text-hm-accent">{formatUSD(payload[0].value)}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-hm-border pb-4">
        <div>
          <h1 className="text-2xl font-bold">CEO Dashboard</h1>
          <p className="text-sm text-hm-muted mt-1">Visión ejecutiva — acceso restringido owner</p>
        </div>
        <button onClick={refresh} className="text-xs font-mono font-bold border border-hm-border text-hm-muted rounded px-3 py-1.5 hover:border-hm-accent hover:text-hm-accent transition-colors">
          ↻ ACTUALIZAR
        </button>
      </div>

      {/* ── FINANZAS / ESTADO DE RESULTADOS ── */}
      <Section title="Estado de Resultados (Gerencial)">
        {/* KPIs rápidos */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {loading ? [1,2,3,4,5].map(i => <Skeleton key={i} className="h-[80px]" />) : <>
            <KpiBlock label="Ingresos Totales" value={formatUSD(data?.ingresosPorMes?.reduce((s, m) => s + m.total, 0) || 0)} accent="text-green-400" />
            <KpiBlock label="Costo Operativo" value={formatUSD(k?.costoMantenimiento)} accent="text-orange-400" />
            <KpiBlock label="Compras / Supply" value={formatUSD(k?.gastoProveedores)} accent="text-red-400" />
            <KpiBlock label="Utilidad Bruta" value={formatUSD((data?.ingresosPorMes?.reduce((s, m) => s + m.total, 0) || 0) - (k?.costoMantenimiento || 0) - (k?.gastoProveedores || 0))} accent="text-hm-accent" />
            <KpiBlock label="Margen Op." value={`${(((data?.ingresosPorMes?.reduce((s, m) => s + m.total, 0) || 0) - (k?.costoMantenimiento || 0) - (k?.gastoProveedores || 0)) / (data?.ingresosPorMes?.reduce((s, m) => s + m.total, 0) || 1) * 100).toFixed(1)}%`} accent="text-hm-accent" />
          </>}
        </div>

        {/* Desglose Ingresos / Egresos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* A) Ingresos */}
          <div className="bg-hm-surface2/20 border border-hm-border/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <div className="text-xs font-mono font-bold text-green-400 uppercase tracking-widest">Ingresos</div>
            </div>
            {loading ? <Skeleton className="h-32" /> : (
              <div className="flex flex-col gap-2">
                {[
                  { label: 'Ventas / Servicios', value: data?.ingresosPorMes?.reduce((s, m) => s + m.total, 0) || 0, pct: 60 },
                  { label: 'Alquileres', value: 0, pct: 0, placeholder: true },
                  { label: 'Repuestos', value: 0, pct: 0, placeholder: true },
                  { label: 'Otros', value: 0, pct: 0, placeholder: true },
                ].map(({ label, value, pct, placeholder }) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-hm-muted">{label}</span>
                      <span className={`font-mono font-bold ${placeholder ? 'text-hm-muted/50' : 'text-green-400'}`}>
                        {placeholder ? 'Base preparada' : formatUSD(value)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-hm-surface2 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500/60 rounded-full transition-all" style={{width:`${placeholder ? 0 : pct}%`}} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* B) Egresos */}
          <div className="bg-hm-surface2/20 border border-hm-border/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <div className="text-xs font-mono font-bold text-red-400 uppercase tracking-widest">Egresos</div>
            </div>
            {loading ? <Skeleton className="h-32" /> : (
              <div className="flex flex-col gap-2">
                {[
                  { label: 'Compras / Supply', value: k?.gastoProveedores || 0, pct: 45 },
                  { label: 'Taller / Mant.', value: k?.costoMantenimiento || 0, pct: 30 },
                  { label: 'Logística', value: 0, pct: 0, placeholder: true },
                  { label: 'Administrativos', value: 0, pct: 0, placeholder: true },
                ].map(({ label, value, pct, placeholder }) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-hm-muted">{label}</span>
                      <span className={`font-mono font-bold ${placeholder ? 'text-hm-muted/50' : 'text-red-400'}`}>
                        {placeholder ? 'Base preparada' : formatUSD(value)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-hm-surface2 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500/60 rounded-full transition-all" style={{width:`${placeholder ? 0 : pct}%`}} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* C) Resultado + D) Riesgo operativo */}
          <div className="flex flex-col gap-4">
            <div className="bg-hm-surface2/20 border border-hm-border/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-hm-accent" />
                <div className="text-xs font-mono font-bold text-hm-accent uppercase tracking-widest">Resultado</div>
              </div>
              {loading ? <Skeleton className="h-20" /> : (() => {
                const ingresos = data?.ingresosPorMes?.reduce((s, m) => s + m.total, 0) || 0
                const egresos = (k?.costoMantenimiento || 0) + (k?.gastoProveedores || 0)
                const utilidadBruta = ingresos - egresos
                const margen = ingresos > 0 ? ((utilidadBruta / ingresos) * 100).toFixed(1) : 0
                return (
                  <div className="flex flex-col gap-2">
                    {[['Utilidad Bruta', formatUSD(utilidadBruta), utilidadBruta >= 0 ? 'text-green-400' : 'text-red-400'],
                      ['Utilidad Oper.', 'Base preparada', 'text-hm-muted/60'],
                      ['Margen', `${margen}%`, Number(margen) >= 20 ? 'text-green-400' : Number(margen) >= 10 ? 'text-yellow-400' : 'text-red-400'],
                    ].map(([l, v, c]) => (
                      <div key={l} className="flex justify-between items-center">
                        <span className="text-xs text-hm-muted">{l}</span>
                        <span className={`text-sm font-bold font-mono ${c}`}>{v}</span>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>

            {/* D) Riesgo operativo HeavyMetric */}
            <div className="bg-hm-surface2/20 border border-hm-border/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <div className="text-xs font-mono font-bold text-red-400 uppercase tracking-widest">Riesgo Operativo</div>
              </div>
              {loading ? <Skeleton className="h-20" /> : (
                <div className="flex flex-col gap-2">
                  {[
                    { label: 'Clientes críticos', value: k?.alertasCriticas || 0, color: (k?.alertasCriticas || 0) > 0 ? 'text-red-400' : 'text-green-400' },
                    { label: 'Proveedores riesgosos', value: k?.provRiesgosos || 0, color: (k?.provRiesgosos || 0) > 0 ? 'text-red-400' : 'text-green-400' },
                    { label: 'Máquinas detenidas', value: k?.flotaDetenida || 0, color: (k?.flotaDetenida || 0) > 0 ? 'text-orange-400' : 'text-green-400' },
                    { label: 'Stock crítico', value: k?.stockCritico || 0, color: (k?.stockCritico || 0) > 0 ? 'text-yellow-400' : 'text-green-400' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex justify-between items-center">
                      <span className="text-xs text-hm-muted">{label}</span>
                      <span className={`text-sm font-bold font-mono ${color}`}>{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* ── COMERCIAL ── */}
      <Section title="Comercial">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {loading ? [1,2,3,4].map(i => <Skeleton key={i} className="h-[80px]" />) : <>
            <KpiBlock label="Ingresos del mes" value={formatUSD(k?.ingresosMes)} accent="text-green-400" />
            <KpiBlock label="Pipeline activo" value={formatUSD(k?.pipelineVal)} accent="text-hm-accent"
              sub={`${k?.leadsActivos} leads · ${k?.leadsGradoA} grado A`} />
            <KpiBlock label="Cobranza pendiente" value={formatUSD(k?.cobranzaPend)}
              accent={k?.cobranzaPend > 0 ? 'text-red-400' : 'text-green-400'}
              alert={k?.cobranzaPend > 0} sub="Sin cobrar" />
            <KpiBlock label="OTs abiertas" value={k?.otAbiertas}
              accent={k?.otAbiertas > 5 ? 'text-yellow-400' : ''} />
          </>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Ingresos anuales */}
          <Card className="p-4">
            <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-3">Ingresos anuales por mes</div>
            {loading ? <Skeleton className="h-40" /> : (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={data?.ingresosPorMes || []}>
                  <defs>
                    <linearGradient id="gradCeo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-accent, #00e5ff)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-accent, #00e5ff)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="mes" tick={{ fontSize: 9, fill: '#888' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="total" stroke="#00e5ff" strokeWidth={1.5} fill="url(#gradCeo)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Top clientes */}
          <Card className="p-4">
            <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-3">Top clientes (90 días)</div>
            {loading ? <Skeleton className="h-40" /> : (
              <TopList items={data?.topClientes} formatFn={formatUSD} emptyText="Sin facturación registrada" />
            )}
          </Card>
        </div>
      </Section>

      {/* ── OPERACIONES ── */}
      <Section title="Operaciones">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {loading ? [1,2,3,4].map(i => <Skeleton key={i} className="h-[80px]" />) : <>
            <KpiBlock label="Flota total" value={k?.flotaTotal} sub={`${k?.flotaOperativa} operativos`} />
            <KpiBlock label="Uptime flota" value={`${k?.uptime}%`}
              accent={k?.uptime >= 80 ? 'text-green-400' : k?.uptime >= 60 ? 'text-yellow-400' : 'text-red-400'} />
            <KpiBlock label="Activos detenidos" value={k?.flotaDetenida}
              accent={k?.flotaDetenida > 0 ? 'text-red-400' : 'text-green-400'}
              alert={k?.flotaDetenida > 0} />
            <KpiBlock label="Costo mant. año" value={formatUSD(k?.costoMantenimiento)} accent="text-orange-400" />
          </>}
        </div>

        {/* Flota por estado */}
        <Card className="p-4">
          <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-3">Estado de flota</div>
          {loading ? <Skeleton className="h-16" /> : (
            <div className="flex flex-wrap gap-3">
              {Object.entries(data?.flotaPorEstado || {}).map(([estado, count]) => (
                <div key={estado} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: FLOTA_COLORS[estado] || '#888' }} />
                  <span className="text-sm">{estado}</span>
                  <span className="text-sm font-bold font-mono">{count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </Section>

      {/* ── PROVEEDORES ── */}
      <Section title="Proveedores">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-1">Top proveedores (gasto acumulado)</div>
            {loading ? <Skeleton className="h-40" /> : (
              <TopList items={data?.topProveedores} formatFn={formatUSD} emptyText="Sin compras registradas" />
            )}
          </Card>
          <div className="grid grid-cols-2 gap-4">
            {loading ? [1,2,3,4].map(i => <Skeleton key={i} className="h-[80px]" />) : <>
              <KpiBlock label="Gasto total" value={formatUSD(k?.gastoProveedores)} accent="text-hm-accent" />
              <KpiBlock label="Proveedores riesgosos" value={k?.provRiesgosos}
                accent={k?.provRiesgosos > 0 ? 'text-red-400' : 'text-green-400'}
                alert={k?.provRiesgosos > 0} />
              <KpiBlock label="Preferidos" value={k?.provPreferidos} accent="text-hm-accent" />
              <KpiBlock label="Stock crítico" value={k?.stockCritico}
                accent={k?.stockCritico > 0 ? 'text-orange-400' : 'text-green-400'}
                alert={k?.stockCritico > 0} />
            </>}
          </div>
        </div>
      </Section>

      {/* ── RIESGOS ── */}
      <Section title="Riesgos y alertas">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {loading ? [1,2,3,4].map(i => <Skeleton key={i} className="h-[80px]" />) : <>
            <KpiBlock label="Alertas críticas" value={k?.alertasCriticas}
              accent={k?.alertasCriticas > 0 ? 'text-red-400' : 'text-green-400'}
              alert={k?.alertasCriticas > 0} />
            <KpiBlock label="Total alertas activas" value={k?.alertasTotal}
              accent={k?.alertasTotal > 0 ? 'text-yellow-400' : 'text-green-400'} />
            <KpiBlock label="Repuestos sin stock" value={k?.stockCritico}
              accent={k?.stockCritico > 0 ? 'text-orange-400' : 'text-green-400'} />
            <KpiBlock label="Proveedores riesgosos" value={k?.provRiesgosos}
              accent={k?.provRiesgosos > 0 ? 'text-red-400' : 'text-green-400'} />
          </>}
        </div>

        {/* Top deudores */}
        {!loading && data?.topDeudores?.length > 0 && (
          <Card className="p-4 border-red-500/20">
            <div className="text-[10px] font-mono text-red-400 uppercase tracking-widest mb-3">⚠️ Morosidad — top deudores</div>
            <TopList items={data.topDeudores} formatFn={formatUSD} />
          </Card>
        )}
      </Section>
    </div>
  )
}
