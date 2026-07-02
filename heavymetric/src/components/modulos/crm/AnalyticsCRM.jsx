import { useMemo } from 'react'
import KpiCard from '../../ui/KpiCard'
import Card from '../../ui/Card'

const ETAPAS_VENTAS = ['Lead', 'Contactado', 'Calificado', 'Cotización', 'Negociación', 'Ganado', 'Perdido']

const PROB_ESTADO = {
  Lead: 0.1, Contactado: 0.2, Calificado: 0.4,
  'Cotización': 0.6, Negociación: 0.8, Ganado: 1.0, Perdido: 0,
}

const FUNNEL_COLOR = {
  Lead:        'bg-blue-500/50',
  Contactado:  'bg-blue-400/55',
  Calificado:  'bg-yellow-400/55',
  'Cotización':'bg-orange-400/55',
  Negociación: 'bg-purple-400/60',
  Ganado:      'bg-green-500/65',
  Perdido:     'bg-red-500/45',
}

function FunnelBar({ estado, count, max, total }) {
  const pct = max > 0 ? Math.max((count / max) * 100, count > 0 ? 2 : 0) : 0
  const pctTotal = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-3 group">
      <div className="w-28 text-right text-xs font-mono text-hm-muted group-hover:text-hm-text transition-colors truncate">
        {estado}
      </div>
      <div className="flex-1 h-5 bg-hm-surface2 rounded overflow-hidden">
        <div
          className={`h-full rounded transition-all duration-300 ${FUNNEL_COLOR[estado] || 'bg-hm-accent/40'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="w-8 text-xs font-bold text-right">{count}</div>
      <div className="w-10 text-[10px] font-mono text-hm-muted text-right">{pctTotal}%</div>
    </div>
  )
}

export default function AnalyticsCRM({ leads }) {
  const kpis = useMemo(() => {
    if (!leads.length) return null

    const leadsVentas = leads.filter(l => !l.pipeline || l.pipeline === 'ventas')
    const leadsPost   = leads.filter(l => l.pipeline === 'postventa')

    const ganados  = leadsVentas.filter(l => l.estado === 'Ganado').length
    const perdidos = leadsVentas.filter(l => l.estado === 'Perdido').length
    const conversion   = leadsVentas.length > 0 ? Math.round((ganados  / leadsVentas.length) * 100) : 0
    const tasaPerdida  = leadsVentas.length > 0 ? Math.round((perdidos / leadsVentas.length) * 100) : 0

    const postCerrados  = leadsPost.filter(l => l.estado === 'Cierre').length
    const postConversion = leadsPost.length > 0 ? Math.round((postCerrados / leadsPost.length) * 100) : 0

    const forecast = leadsVentas.reduce((acc, l) => {
      return acc + (Number(l.monto_estimado_usd) * (PROB_ESTADO[l.estado] || 0) || 0)
    }, 0)

    const montoGanado = leadsVentas
      .filter(l => l.estado === 'Ganado')
      .reduce((acc, l) => acc + (Number(l.monto_estimado_usd) || 0), 0)

    // Funnel de ventas (excluye Perdido del ancho máximo)
    const funnelVentas = ETAPAS_VENTAS.map(estado => ({
      estado,
      count: leadsVentas.filter(l => l.estado === estado).length,
    }))
    const maxFunnel = Math.max(...funnelVentas.filter(f => f.estado !== 'Perdido').map(f => f.count), 1)

    // Dónde se pierden los leads (entre qué etapas hay mayor caída)
    const caidas = []
    const etapasActivas = ETAPAS_VENTAS.filter(e => e !== 'Perdido' && e !== 'Ganado')
    for (let i = 0; i < etapasActivas.length - 1; i++) {
      const actual = leadsVentas.filter(l => l.estado === etapasActivas[i]).length
      const siguiente = leadsVentas.filter(l => l.estado === etapasActivas[i + 1]).length
      const caida = actual > 0 ? Math.round(((actual - siguiente) / actual) * 100) : 0
      caidas.push({ de: etapasActivas[i], a: etapasActivas[i + 1], caida, actual, siguiente })
    }
    caidas.sort((a, b) => b.caida - a.caida)

    // Por vendedor
    const porVendedor = {}
    leads.forEach(l => {
      const nombre = l.asignado?.nombre_completo || 'Sin asignar'
      if (!porVendedor[nombre]) porVendedor[nombre] = { total: 0, ganados: 0, perdidos: 0, activos: 0, monto: 0 }
      porVendedor[nombre].total += 1
      if (l.estado === 'Ganado' || l.estado === 'Cierre') {
        porVendedor[nombre].ganados += 1
        porVendedor[nombre].monto += Number(l.monto_estimado_usd) || 0
      } else if (l.estado === 'Perdido') {
        porVendedor[nombre].perdidos += 1
      } else {
        porVendedor[nombre].activos += 1
      }
    })
    const vendedores = Object.entries(porVendedor).sort((a, b) => b[1].ganados - a[1].ganados)

    // Por origen
    const porOrigen = {}
    leads.forEach(l => {
      const o = l.origen || 'Manual'
      if (!porOrigen[o]) porOrigen[o] = { total: 0, ganados: 0 }
      porOrigen[o].total += 1
      if (l.estado === 'Ganado') porOrigen[o].ganados += 1
    })
    const origenes = Object.entries(porOrigen).sort((a, b) => b[1].total - a[1].total)

    return {
      totalLeads: leads.length,
      ganados, perdidos, conversion, tasaPerdida,
      postCerrados, postConversion,
      forecast, montoGanado,
      funnelVentas, maxFunnel,
      caidas,
      vendedores,
      origenes,
    }
  }, [leads])

  if (!kpis) return (
    <div className="p-8 text-center text-sm font-mono text-hm-muted">
      Sin datos suficientes para el análisis.
    </div>
  )

  return (
    <div className="flex flex-col gap-6 p-4">

      {/* KPIs principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Conversión Ventas"    value={`${kpis.conversion}%`}   subtext={`${kpis.ganados} ganados`}         accent="green-400" />
        <KpiCard label="Conversión Postventa" value={`${kpis.postConversion}%`} subtext={`${kpis.postCerrados} cerrados`} accent="blue-400" />
        <KpiCard label="Forecast Ponderado"   value={`USD ${Math.round(kpis.forecast).toLocaleString('en-US')}`} subtext="Según etapa del pipeline" accent="yellow-400" />
        <KpiCard label="Tasa de Pérdida"      value={`${kpis.tasaPerdida}%`}  subtext={`${kpis.perdidos} perdidos`}        accent="red-400" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Embudo de ventas */}
        <Card className="p-4">
          <h3 className="font-mono text-xs text-hm-muted mb-4 uppercase tracking-widest border-b border-hm-border pb-2">
            Embudo de Ventas
          </h3>
          <div className="flex flex-col gap-2.5">
            {kpis.funnelVentas.map(({ estado, count }) => (
              <FunnelBar
                key={estado}
                estado={estado}
                count={count}
                max={kpis.maxFunnel}
                total={kpis.totalLeads}
              />
            ))}
          </div>
        </Card>

        {/* Cuellos de botella */}
        <Card className="p-4">
          <h3 className="font-mono text-xs text-hm-muted mb-4 uppercase tracking-widest border-b border-hm-border pb-2">
            Dónde se pierden los leads
          </h3>
          {kpis.caidas.length === 0 ? (
            <div className="text-center text-sm text-hm-muted py-6">Sin datos de embudo.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {kpis.caidas.slice(0, 5).map(({ de, a, caida }) => (
                <div key={de} className="flex items-center gap-3">
                  <div className="flex-1 text-xs font-mono text-hm-muted truncate">
                    {de} → {a}
                  </div>
                  <div className="w-16 h-3 bg-hm-surface2 rounded overflow-hidden">
                    <div
                      className={`h-full rounded ${caida >= 50 ? 'bg-red-500/60' : caida >= 25 ? 'bg-yellow-500/60' : 'bg-green-500/40'}`}
                      style={{ width: `${Math.min(caida, 100)}%` }}
                    />
                  </div>
                  <div className={`w-10 text-right text-xs font-bold ${caida >= 50 ? 'text-red-400' : caida >= 25 ? 'text-yellow-400' : 'text-green-400'}`}>
                    -{caida}%
                  </div>
                </div>
              ))}
              <div className="text-[10px] font-mono text-hm-muted mt-2">
                Mayor caída = cuello de botella a atacar
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Desempeño por vendedor */}
      <Card className="p-4 overflow-hidden">
        <h3 className="font-mono text-xs text-hm-muted mb-4 uppercase tracking-widest border-b border-hm-border pb-2">
          Desempeño por Vendedor
        </h3>
        <table className="w-full text-left text-sm">
          <thead className="bg-hm-surface2/50 text-hm-muted">
            <tr>
              <th className="p-2 font-mono text-[10px]">VENDEDOR</th>
              <th className="p-2 font-mono text-[10px] text-center">TOTAL</th>
              <th className="p-2 font-mono text-[10px] text-center">ACTIVOS</th>
              <th className="p-2 font-mono text-[10px] text-center text-green-400">GANADOS</th>
              <th className="p-2 font-mono text-[10px] text-center text-red-400">PERDIDOS</th>
              <th className="p-2 font-mono text-[10px] text-right">CONV.</th>
              <th className="p-2 font-mono text-[10px] text-right">MONTO GANADO</th>
            </tr>
          </thead>
          <tbody>
            {kpis.vendedores.map(([nombre, stats]) => {
              const conv = stats.total > 0 ? Math.round((stats.ganados / stats.total) * 100) : 0
              return (
                <tr key={nombre} className="border-b border-hm-border/50 hover:bg-hm-surface2/20">
                  <td className="p-2 font-medium">{nombre}</td>
                  <td className="p-2 text-center">{stats.total}</td>
                  <td className="p-2 text-center text-yellow-300">{stats.activos}</td>
                  <td className="p-2 text-center text-green-400">{stats.ganados}</td>
                  <td className="p-2 text-center text-red-400">{stats.perdidos}</td>
                  <td className="p-2 text-right font-bold">{conv}%</td>
                  <td className="p-2 text-right text-hm-muted font-mono text-xs">
                    {stats.monto > 0 ? `USD ${Math.round(stats.monto).toLocaleString('en-US')}` : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>

      {/* Por origen */}
      <Card className="p-4 overflow-hidden">
        <h3 className="font-mono text-xs text-hm-muted mb-4 uppercase tracking-widest border-b border-hm-border pb-2">
          Conversión por Origen
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {kpis.origenes.map(([origen, stats]) => {
            const conv = stats.total > 0 ? Math.round((stats.ganados / stats.total) * 100) : 0
            return (
              <div key={origen} className="bg-hm-surface2/20 border border-hm-border/50 rounded-lg p-3">
                <div className="text-[10px] font-mono text-hm-muted uppercase tracking-widest mb-1">{origen}</div>
                <div className="text-xl font-bold">{stats.total}</div>
                <div className="text-xs text-hm-muted mt-0.5">{stats.ganados} ganados · {conv}% conv.</div>
              </div>
            )
          })}
        </div>
      </Card>

    </div>
  )
}
