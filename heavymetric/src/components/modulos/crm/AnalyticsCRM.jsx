import { useMemo } from 'react'
import KpiCard from '../../ui/KpiCard'
import Card from '../../ui/Card'

export default function AnalyticsCRM({ leads }) {
  const kpis = useMemo(() => {
    const totalLeads = leads.length
    if (totalLeads === 0) return null

    // Separar por pipelines
    const leadsVentas = leads.filter(l => !l.pipeline || l.pipeline === 'ventas')
    const leadsPost = leads.filter(l => l.pipeline === 'postventa')

    const ganados = leadsVentas.filter(l => l.estado === 'Ganado').length
    const conversion = leadsVentas.length > 0 ? Math.round((ganados / leadsVentas.length) * 100) : 0

    const postFinalizados = leadsPost.filter(l => l.estado === 'Cierre').length
    const postConversion = leadsPost.length > 0 ? Math.round((postFinalizados / leadsPost.length) * 100) : 0

    // Forecast: sumar (monto * probabilidad_por_estado)
    const probEstado = {
      Lead: 0.1, Contactado: 0.2, Calificado: 0.4,
      'Cotización': 0.6, 'Negociación': 0.8, Ganado: 1.0, Perdido: 0
    }
    const forecast = leadsVentas.reduce((acc, l) => {
      const prob = probEstado[l.estado] || 0
      return acc + (Number(l.monto_estimado_usd) * prob || 0)
    }, 0)

    // Agrupado por vendedor (responsable)
    const porVendedor = {}
    leads.forEach(l => {
      const nombre = l.asignado?.nombre_completo || 'Sin asignar'
      if (!porVendedor[nombre]) porVendedor[nombre] = { total: 0, ganados: 0, perdidos: 0, activos: 0 }
      porVendedor[nombre].total += 1
      if (l.estado === 'Ganado' || l.estado === 'Cierre') porVendedor[nombre].ganados += 1
      else if (l.estado === 'Perdido') porVendedor[nombre].perdidos += 1
      else porVendedor[nombre].activos += 1
    })

    return {
      totalLeads, ganados, conversion, postFinalizados, postConversion, forecast, porVendedor: Object.entries(porVendedor)
    }
  }, [leads])

  if (!kpis) return <div className="p-4 text-center text-sm text-hm-muted">No hay datos suficientes para el análisis.</div>

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Conversión Ventas" value={`${kpis.conversion}%`} subtext={`${kpis.ganados} ganados`} accent="green-400" />
        <KpiCard label="Conversión Postventa" value={`${kpis.postConversion}%`} subtext={`${kpis.postFinalizados} cerrados`} accent="blue-400" />
        <KpiCard label="Forecast (Ponderado)" value={`USD ${kpis.forecast.toLocaleString('en-US')}`} subtext="Según etapa del pipeline" accent="yellow-400" />
        <KpiCard label="Total Leads" value={kpis.totalLeads} subtext="Histórico global" accent="purple-400" />
      </div>

      <Card className="p-4 overflow-hidden">
        <h3 className="font-mono text-sm text-hm-muted mb-4 uppercase tracking-widest border-b border-hm-border pb-2">Desempeño por Vendedor</h3>
        <table className="w-full text-left text-sm">
          <thead className="bg-hm-surface2/50 text-hm-muted">
            <tr>
              <th className="p-2">VENDEDOR</th>
              <th className="p-2 text-center">TOTAL LEADS</th>
              <th className="p-2 text-center">ACTIVOS</th>
              <th className="p-2 text-center text-green-400">GANADOS</th>
              <th className="p-2 text-center text-red-400">PERDIDOS</th>
              <th className="p-2 text-right">CONVERSIÓN</th>
            </tr>
          </thead>
          <tbody>
            {kpis.porVendedor.map(([nombre, stats]) => {
              const conv = stats.total > 0 ? Math.round((stats.ganados / stats.total) * 100) : 0
              return (
                <tr key={nombre} className="border-b border-hm-border/50 hover:bg-hm-surface2/20">
                  <td className="p-2 font-medium">{nombre}</td>
                  <td className="p-2 text-center">{stats.total}</td>
                  <td className="p-2 text-center text-yellow-300">{stats.activos}</td>
                  <td className="p-2 text-center text-green-400">{stats.ganados}</td>
                  <td className="p-2 text-center text-red-400">{stats.perdidos}</td>
                  <td className="p-2 text-right font-bold">{conv}%</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
