import { useMemo } from 'react'
import { useCEODashboard } from '../../hooks/useCEODashboard'
import { useDolar } from '../../context/DolarContext'
import Card from '../../components/ui/Card'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const Skeleton = ({ className }) => (
  <div className={`animate-pulse rounded bg-hm-surface2 ${className}`} />
)

function DataBadge({ type = 'real' }) {
  const cfg = {
    real: 'border-hm-accent/30 bg-hm-accent/10 text-hm-accent',
    prepared: 'border-hm-border bg-hm-surface2/40 text-hm-muted',
    empty: 'border-hm-border bg-hm-surface2/20 text-hm-muted/60',
  }

  const label = {
    real: 'REAL',
    prepared: 'BASE PREPARADA',
    empty: 'SIN DATOS',
  }

  return (
    <span className={`rounded border px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-widest ${cfg[type] || cfg.real}`}>
      {label[type] || label.real}
    </span>
  )
}

function Section({ title, children }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <div className="h-4 w-1 rounded-full bg-hm-accent" />
        <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-hm-muted">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function KpiBlock({ label, value, sub, accent = '', alert = false, dataState = 'real' }) {
  return (
    <Card className={`p-4 ${alert ? 'border-red-500/40' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className={`text-2xl font-bold ${accent}`}>{value}</div>
        <DataBadge type={dataState} />
      </div>
      <div className="mt-0.5 font-mono text-[9px] uppercase tracking-widest text-hm-muted">{label}</div>
      {sub && <div className={`mt-0.5 text-[10px] ${alert ? 'text-red-400' : 'text-hm-muted'}`}>{sub}</div>}
    </Card>
  )
}

function TopList({ items = [], labelKey = 'nombre', valueKey = 'total', formatFn, emptyText = 'Sin datos' }) {
  if (!items?.length) {
    return <div className="py-3 font-mono text-sm text-hm-muted">{emptyText}</div>
  }

  const max = Math.max(...items.map((item) => Number(item[valueKey] || item.value || 0)), 0)

  return (
    <div className="flex flex-col gap-2">
      {items.map((item, index) => {
        const label = item[labelKey] || item.label || item.nombre || 'Sin identificar'
        const value = Number(item[valueKey] ?? item.value ?? item.total ?? 0)
        const width = max > 0 ? (value / max) * 100 : 0

        return (
          <div key={`${label}-${index}`} className="flex items-center gap-3">
            <span className="w-4 shrink-0 font-mono text-[10px] text-hm-muted">{index + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="mb-0.5 flex items-center justify-between">
                <span className="truncate text-sm font-medium">{label}</span>
                <span className="ml-2 shrink-0 font-mono text-sm font-bold text-hm-accent">
                  {formatFn ? formatFn(value) : value}
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-hm-surface2">
                <div className="h-full rounded-full bg-hm-accent/60" style={{ width: `${width}%` }} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function EmptyBox({ title = 'Sin datos suficientes', description = 'La base está preparada para recibir información real.' }) {
  return (
    <div className="rounded-xl border border-dashed border-hm-border bg-hm-surface2/10 p-5 text-center">
      <div className="mb-1 text-sm font-bold text-hm-muted">{title}</div>
      <div className="text-xs text-hm-muted/70">{description}</div>
    </div>
  )
}

const FLOTA_COLORS = {
  Operativo: '#22c55e',
  'En mantenimiento': '#eab308',
  'En taller': '#f97316',
  'Esperando repuesto': '#ef4444',
  'Fuera de servicio': '#dc2626',
  Baja: '#6b7280',
}

export default function CEODashboard() {
  const { data, loading, error, refresh } = useCEODashboard()
  const { formatUSD } = useDolar()

  const k = data?.kpis || {}

  const hasValue = (value) => value !== null && value !== undefined && value !== ''
  const safeNumber = (value) => Number(value || 0)
  const countOrDash = (value) => (hasValue(value) ? value : '—')

  const er = useMemo(() => {
    const ingresos = safeNumber(k.ingresosMes)
    const compras = safeNumber(k.gastoProveedores)
    const repuestos = safeNumber(k.costoRepuestosOT)
    const manoObra = safeNumber(k.costoManoObraOT)
    const egresos = compras + repuestos + manoObra
    const utilidadBruta = ingresos - egresos
    const margenBruto = ingresos > 0 ? (utilidadBruta / ingresos) * 100 : 0

    return {
      ingresos,
      compras,
      repuestos,
      manoObra,
      egresos,
      utilidadBruta,
      margenBruto,
    }
  }, [k])

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null

    return (
      <div className="rounded-lg border border-hm-border bg-hm-surface px-3 py-2 text-xs shadow-lg">
        <div className="mb-1 font-mono text-hm-muted">{label}</div>
        <div className="font-bold text-hm-accent">{formatUSD(payload[0].value)}</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-800 bg-red-900/20 p-6 text-red-400">
          <h2 className="mb-2 font-bold">Error cargando CEO Dashboard</h2>
          <p className="font-mono text-sm">{error}</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between border-b border-hm-border pb-4">
        <div>
          <h1 className="text-2xl font-bold">CEO Dashboard</h1>
          <p className="mt-1 text-sm text-hm-muted">Visión ejecutiva — datos reales, bases preparadas y alertas críticas separadas.</p>
        </div>

        <button
          onClick={refresh}
          className="rounded border border-hm-border px-3 py-1.5 font-mono text-xs font-bold text-hm-muted transition-colors hover:border-hm-accent hover:text-hm-accent"
        >
          ↻ ACTUALIZAR
        </button>
      </div>

      <Section title="Estado de Resultados Gerencial">
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
          {loading ? (
            [1, 2, 3, 4, 5].map((item) => <Skeleton key={item} className="h-[88px]" />)
          ) : (
            <>
              <KpiBlock label="Ingresos mes" value={formatUSD(er.ingresos)} accent="text-green-400" />
              <KpiBlock label="Egresos mes" value={formatUSD(er.egresos)} accent="text-orange-400" />
              <KpiBlock label="Compras supply" value={formatUSD(er.compras)} accent="text-red-400" />
              <KpiBlock
                label="Utilidad bruta"
                value={formatUSD(er.utilidadBruta)}
                accent={er.utilidadBruta >= 0 ? 'text-hm-accent' : 'text-red-400'}
                alert={er.utilidadBruta < 0}
              />
              <KpiBlock
                label="Margen bruto"
                value={`${er.margenBruto.toFixed(1)}%`}
                accent={er.margenBruto >= 20 ? 'text-green-400' : er.margenBruto >= 10 ? 'text-yellow-400' : 'text-red-400'}
              />
            </>
          )}
        </div>

        <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="bg-hm-surface2/20 p-4">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <div className="font-mono text-xs font-bold uppercase tracking-widest text-green-400">Ingresos</div>
            </div>

            {loading ? (
              <Skeleton className="h-32" />
            ) : (
              <div className="flex flex-col gap-2">
                {[
                  ['Servicios / Taller', k.ingresosServicios || 0],
                  ['Ventas directas', k.ingresosVentas || 0],
                  ['Alquileres', k.ingresosAlquileres || 0],
                  ['Repuestos / Otros', k.ingresosOtros || 0],
                ].map(([label, value]) => {
                  const pct = er.ingresos > 0 ? (Number(value) / er.ingresos) * 100 : 0

                  return (
                    <div key={label}>
                      <div className="mb-0.5 flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-hm-muted">
                          {label} <DataBadge type="real" />
                        </span>
                        <span className="font-mono font-bold text-green-400">{formatUSD(value)}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-hm-surface2">
                        <div className="h-full rounded-full bg-green-500/60" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          <Card className="bg-hm-surface2/20 p-4">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              <div className="font-mono text-xs font-bold uppercase tracking-widest text-red-400">Egresos</div>
            </div>

            {loading ? (
              <Skeleton className="h-32" />
            ) : (
              <div className="flex flex-col gap-2">
                {[
                  ['Compras / Supply', er.compras, true],
                  ['Repuestos OT', er.repuestos, true],
                  ['Mano de obra OT', er.manoObra, true],
                  ['Gastos operativos', null, false],
                ].map(([label, value, real]) => {
                  const pct = er.egresos > 0 && real ? (Number(value) / er.egresos) * 100 : 0

                  return (
                    <div key={label}>
                      <div className="mb-0.5 flex items-center justify-between gap-3 text-xs">
                        <span className="flex items-center gap-1 text-hm-muted">
                          {label} <DataBadge type={real ? 'real' : 'prepared'} />
                        </span>
                        <span className={`font-mono font-bold ${real ? 'text-red-400' : 'text-hm-muted/60'}`}>
                          {real ? formatUSD(value) : '—'}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-hm-surface2">
                        <div className="h-full rounded-full bg-red-500/60" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          <div className="flex flex-col gap-4">
            <Card className="bg-hm-surface2/20 p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-hm-accent" />
                <div className="font-mono text-xs font-bold uppercase tracking-widest text-hm-accent">Resultado</div>
              </div>

              {loading ? (
                <Skeleton className="h-20" />
              ) : (
                <div className="flex flex-col gap-2">
                  {[
                    ['Utilidad bruta', formatUSD(er.utilidadBruta), er.utilidadBruta >= 0 ? 'text-green-400' : 'text-red-400', 'real'],
                    ['Utilidad neta', '—', 'text-hm-muted/60', 'prepared'],
                    ['Margen bruto', `${er.margenBruto.toFixed(1)}%`, er.margenBruto >= 20 ? 'text-green-400' : er.margenBruto >= 10 ? 'text-yellow-400' : 'text-red-400', 'real'],
                  ].map(([label, value, cls, state]) => (
                    <div key={label} className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-1 text-xs text-hm-muted">
                        {label} <DataBadge type={state} />
                      </span>
                      <span className={`font-mono text-sm font-bold ${cls}`}>{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="bg-hm-surface2/20 p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <div className="font-mono text-xs font-bold uppercase tracking-widest text-red-400">Riesgo operativo</div>
              </div>

              {loading ? (
                <Skeleton className="h-20" />
              ) : (
                <div className="flex flex-col gap-2">
                  {[
                    ['Clientes críticos', k.alertasCriticas || 0],
                    ['Proveedores riesgosos', k.provRiesgosos || 0],
                    ['Activos detenidos', k.flotaDetenida || 0],
                    ['Stock crítico', k.stockCritico || 0],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-xs text-hm-muted">{label}</span>
                      <span className={`font-mono text-sm font-bold ${value > 0 ? 'text-red-400' : 'text-green-400'}`}>{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </Section>

      <Section title="Acciones que requieren decisión">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Card className="border-orange-500/30 bg-orange-500/5 p-4 transition-colors hover:border-orange-500/60">
            <div className="mb-3 flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-orange-500" />
              <div className="font-mono text-xs font-bold uppercase tracking-widest text-orange-400">Aprobaciones pendientes</div>
            </div>
            {loading ? (
              <Skeleton className="h-20" />
            ) : (
              <>
                <div className="mb-1 text-3xl font-black text-orange-400">{countOrDash(k.aprobacionesPendientes)}</div>
                <div className="mb-2 text-xs text-hm-muted">Cotizaciones, compras y OTs esperando firma.</div>
                {!hasValue(k.aprobacionesPendientes) && <DataBadge type="prepared" />}
                <div className="mt-3">
                  <a href="/app/aprobaciones" className="inline-block rounded border border-orange-500/40 px-3 py-1.5 font-mono text-xs font-bold text-orange-400 transition-colors hover:bg-orange-500/10">
                    VER APROBACIONES →
                  </a>
                </div>
              </>
            )}
          </Card>

          <Card className="border-red-500/30 bg-red-500/5 p-4 transition-colors hover:border-red-500/60">
            <div className="mb-3 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              <div className="font-mono text-xs font-bold uppercase tracking-widest text-red-400">Riesgos financieros</div>
            </div>
            {loading ? (
              <Skeleton className="h-20" />
            ) : (
              <div className="flex flex-col gap-2">
                {[
                  ['Clientes morosos', k.alertasCriticas || 0, '/app/clientes', 'real'],
                  ['Facturas vencidas', k.cobranzaPend > 0 ? 1 : 0, '/app/clientes', 'real'],
                  ['Cheques por vencer', k.chequesPorVencer, '/app/tesoreria', hasValue(k.chequesPorVencer) ? 'real' : 'prepared'],
                ].map(([label, value, link, state]) => (
                  <div key={label} className="flex items-center justify-between gap-3">
                    <a href={link} className="text-xs text-hm-muted transition-colors hover:text-hm-text">{label}</a>
                    {state === 'real' ? (
                      <span className={`font-mono text-sm font-bold ${value > 0 ? 'text-red-400' : 'text-green-400'}`}>{value}</span>
                    ) : (
                      <DataBadge type="prepared" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="border-yellow-500/30 bg-yellow-500/5 p-4 transition-colors hover:border-yellow-500/60">
            <div className="mb-3 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-yellow-500" />
              <div className="font-mono text-xs font-bold uppercase tracking-widest text-yellow-400">Riesgos operativos</div>
            </div>
            {loading ? (
              <Skeleton className="h-20" />
            ) : (
              <div className="flex flex-col gap-2">
                {[
                  ['Activos detenidos', k.flotaDetenida || 0, '/app/taller'],
                  ['Stock crítico', k.stockCritico || 0, '/app/repuestos'],
                  ['Proveedores riesgosos', k.provRiesgosos || 0, '/app/proveedores'],
                  ['OTs demoradas', k.otAbiertas > 5 ? k.otAbiertas - 5 : 0, '/app/taller'],
                ].map(([label, value, link]) => (
                  <div key={label} className="flex items-center justify-between">
                    <a href={link} className="text-xs text-hm-muted transition-colors hover:text-hm-text">{label}</a>
                    <span className={`font-mono text-sm font-bold ${value > 0 ? 'text-yellow-400' : 'text-green-400'}`}>{value}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </Section>

      <Section title="Comercial">
        <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          {loading ? (
            [1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-[88px]" />)
          ) : (
            <>
              <KpiBlock label="Ingresos del mes" value={formatUSD(k.ingresosMes)} accent="text-green-400" />
              <KpiBlock
                label="Pipeline activo"
                value={formatUSD(k.pipelineVal)}
                accent="text-hm-accent"
                sub={`${k.leadsActivos || 0} leads · ${k.leadsGradoA || 0} grado A`}
              />
              <KpiBlock
                label="Cobranza pendiente"
                value={formatUSD(k.cobranzaPend)}
                accent={k.cobranzaPend > 0 ? 'text-red-400' : 'text-green-400'}
                alert={k.cobranzaPend > 0}
                sub="Sin cobrar"
              />
              <KpiBlock label="OTs abiertas" value={k.otAbiertas || 0} accent={k.otAbiertas > 5 ? 'text-yellow-400' : ''} />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="p-4">
            <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-hm-muted">Ingresos anuales por mes</div>
            {loading ? (
              <Skeleton className="h-40" />
            ) : (data?.ingresosPorMes || []).length === 0 ? (
              <EmptyBox title="Sin ingresos mensuales" />
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={data?.ingresosPorMes || []}>
                  <defs>
                    <linearGradient id="gradCeo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00e5ff" stopOpacity={0} />
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

          <Card className="p-4">
            <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-hm-muted">Top clientes 90 días</div>
            {loading ? <Skeleton className="h-40" /> : <TopList items={data?.topClientes || []} formatFn={formatUSD} emptyText="Sin facturación registrada" />}
          </Card>
        </div>
      </Section>

      <Section title="Operaciones">
        <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          {loading ? (
            [1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-[88px]" />)
          ) : (
            <>
              <KpiBlock label="Flota total" value={k.flotaTotal || 0} sub={`${k.flotaOperativa || 0} operativos`} />
              <KpiBlock
                label="Uptime flota"
                value={`${k.uptime || 0}%`}
                accent={k.uptime >= 80 ? 'text-green-400' : k.uptime >= 60 ? 'text-yellow-400' : 'text-red-400'}
              />
              <KpiBlock
                label="Activos detenidos"
                value={k.flotaDetenida || 0}
                accent={k.flotaDetenida > 0 ? 'text-red-400' : 'text-green-400'}
                alert={k.flotaDetenida > 0}
              />
              <KpiBlock label="Costo mant. año" value={formatUSD(k.costoMantenimiento)} accent="text-orange-400" />
            </>
          )}
        </div>

        <Card className="p-4">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-hm-muted">Estado de activos</div>
          {loading ? (
            <Skeleton className="h-16" />
          ) : Object.keys(data?.flotaPorEstado || {}).length === 0 ? (
            <EmptyBox title="Sin activos operativos registrados" />
          ) : (
            <div className="flex flex-wrap gap-3">
              {Object.entries(data?.flotaPorEstado || {}).map(([estado, count]) => (
                <div key={estado} className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ background: FLOTA_COLORS[estado] || '#888' }} />
                  <span className="text-sm">{estado}</span>
                  <span className="font-mono text-sm font-bold">{count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </Section>

      <Section title="Proveedores">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="p-4">
            <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-hm-muted">Top proveedores por gasto</div>
            {loading ? <Skeleton className="h-40" /> : <TopList items={data?.topProveedores || []} formatFn={formatUSD} emptyText="Sin compras registradas" />}
          </Card>

          <div className="grid grid-cols-2 gap-4">
            {loading ? (
              [1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-[88px]" />)
            ) : (
              <>
                <KpiBlock label="Gasto total" value={formatUSD(k.gastoProveedores)} accent="text-hm-accent" />
                <KpiBlock
                  label="Proveedores riesgosos"
                  value={k.provRiesgosos || 0}
                  accent={k.provRiesgosos > 0 ? 'text-red-400' : 'text-green-400'}
                  alert={k.provRiesgosos > 0}
                />
                <KpiBlock label="Preferidos" value={k.provPreferidos || 0} accent="text-hm-accent" />
                <KpiBlock
                  label="Stock crítico"
                  value={k.stockCritico || 0}
                  accent={k.stockCritico > 0 ? 'text-orange-400' : 'text-green-400'}
                  alert={k.stockCritico > 0}
                />
              </>
            )}
          </div>
        </div>
      </Section>

      <Section title="Riesgos y alertas">
        <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          {loading ? (
            [1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-[88px]" />)
          ) : (
            <>
              <KpiBlock
                label="Alertas críticas"
                value={k.alertasCriticas || 0}
                accent={k.alertasCriticas > 0 ? 'text-red-400' : 'text-green-400'}
                alert={k.alertasCriticas > 0}
              />
              <KpiBlock label="Total alertas" value={k.alertasTotal || 0} accent={k.alertasTotal > 0 ? 'text-yellow-400' : 'text-green-400'} />
              <KpiBlock label="Repuestos sin stock" value={k.stockCritico || 0} accent={k.stockCritico > 0 ? 'text-orange-400' : 'text-green-400'} />
              <KpiBlock label="Proveedores riesgosos" value={k.provRiesgosos || 0} accent={k.provRiesgosos > 0 ? 'text-red-400' : 'text-green-400'} />
            </>
          )}
        </div>

        {!loading && data?.topDeudores?.length > 0 && (
          <Card className="border-red-500/20 p-4">
            <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-red-400">Morosidad — top deudores</div>
            <TopList items={data.topDeudores} formatFn={formatUSD} />
          </Card>
        )}
      </Section>

      <Section title="Negocio 360">
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Card className="p-4">
            <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-green-400">Top clientes rentables</div>
            {loading ? (
              <Skeleton className="h-32" />
            ) : (data?.topClientes || []).length === 0 ? (
              <EmptyBox title="Sin datos de clientes" />
            ) : (
              <TopList items={(data?.topClientes || []).slice(0, 4)} labelKey="label" valueKey="value" formatFn={formatUSD} />
            )}
          </Card>

          <Card className="p-4">
            <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-hm-accent">Estado de activos</div>
            {loading ? (
              <Skeleton className="h-32" />
            ) : (
              <div className="flex flex-col gap-3">
                {[
                  ['Activos operativos', k.flotaOperativa || 0, 'text-green-400', 'bg-green-500'],
                  ['En mantenimiento / taller', Math.max((k.flotaTotal || 0) - (k.flotaOperativa || 0) - (k.flotaDetenida || 0), 0), 'text-yellow-400', 'bg-yellow-500'],
                  ['Fuera de servicio', k.flotaDetenida || 0, 'text-red-400', 'bg-red-500'],
                ].map(([label, value, color, bar]) => (
                  <div key={label}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-hm-muted">{label}</span>
                      <span className={`font-bold ${color}`}>{value}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-hm-surface2">
                      <div className={`h-full rounded-full ${bar}`} style={{ width: k.flotaTotal > 0 ? `${Math.round((value / k.flotaTotal) * 100)}%` : '0%' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-4">
            <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-orange-400">Áreas de mayor costo</div>
            <div className="flex flex-col gap-2">
              {[
                ['Compras supply', er.compras, 'bg-orange-500', true],
                ['Repuestos OT', er.repuestos, 'bg-red-500', true],
                ['Mano de obra OT', er.manoObra, 'bg-blue-500', true],
                ['Combustible', null, 'bg-yellow-500', false],
              ].map(([area, costo, color, real]) => (
                <div key={area} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 shrink-0 rounded-full ${color}`} />
                    <span className="flex items-center gap-1 text-xs text-hm-muted">
                      {area} <DataBadge type={real ? 'real' : 'prepared'} />
                    </span>
                  </div>
                  <span className={`font-mono text-sm font-bold ${real ? 'text-hm-text' : 'text-hm-muted/50'}`}>{real ? formatUSD(costo) : '—'}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card className="p-4">
            <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-red-400">OTs sin rentabilidad</div>
            <div className="mb-3 flex items-center gap-2 text-xs text-hm-muted italic">
              <DataBadge type="real" />
              OTs finalizadas de mayor costo.
            </div>
            {loading ? (
              <Skeleton className="h-28" />
            ) : (k.otsCriticas || []).length === 0 ? (
              <EmptyBox title="Sin OTs críticas detectadas" />
            ) : (
              <div className="flex flex-col gap-2">
                {(k.otsCriticas || []).slice(0, 5).map((ot) => (
                  <div key={ot.id} className="flex items-center justify-between rounded border border-red-500/20 bg-red-500/5 px-3 py-2">
                    <div>
                      <div className="text-sm font-bold text-red-300">OT #{ot.numero_ot || ot.id?.slice?.(0, 8)}</div>
                      <div className="text-[10px] text-hm-muted">{ot.cliente || ot.descripcion || 'Sin detalle'}</div>
                    </div>
                    <span className="font-mono text-sm font-bold text-red-400">{formatUSD(ot.total_usd || ot.costo_usd || 0)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-4">
            <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-hm-muted">Proyección ejecutiva</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <KpiBlock label="Flujo 30 días" value="—" dataState="prepared" accent="text-hm-muted" />
              <KpiBlock label="EBITDA" value="—" dataState="prepared" accent="text-hm-muted" />
              <KpiBlock label="Riesgo 90 días" value="—" dataState="prepared" accent="text-hm-muted" />
            </div>
          </Card>
        </div>
      </Section>
    </div>
  )
}
