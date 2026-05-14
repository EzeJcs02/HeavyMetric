import { useState } from 'react'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import { useReportes } from '../../hooks/useReportes'
import { useDolar } from '../../context/DolarContext'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'

const TABS = [
  { id: 'rentabilidad', label: 'RENTABILIDAD' },
  { id: 'utilizacion', label: 'UTILIZACIÓN DE FLOTA' },
  { id: 'service', label: 'SERVICE PENDIENTE' },
]

function ServiceBadge({ estado }) {
  const variants = { vencido: 'taller', urgente: 'ventas', proximo: 'info' }
  return <Badge variant={variants[estado] || 'default'}>{estado.toUpperCase()}</Badge>
}

export default function Reportes() {
  const [tab, setTab] = useState('rentabilidad')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const { rentabilidad, utilizacion, servicePendiente, loading, error } = useReportes(desde || null, hasta || null)
  const { formatUSD } = useDolar()

  if (error) return (
    <div className="p-6">
      <Card className="p-6 border-red-800 bg-red-900/20 text-red-400">
        <h2 className="font-bold mb-2">Error cargando reportes</h2>
        <p className="font-mono text-sm">{error}</p>
      </Card>
    </div>
  )

  const handleExportExcel = () => {
    try {
      let rows = [], sheetName = tab
      if (tab === 'rentabilidad') {
        rows = rentabilidad.map(c => ({ CLIENTE: c.razon_social, 'FACTURADO USD': c.total_facturado, 'COBRADO USD': c.total_cobrado, 'PENDIENTE USD': c.total_pendiente }))
        sheetName = 'Rentabilidad'
      } else if (tab === 'utilizacion') {
        rows = utilizacion.map(m => ({ UNIDAD: m.nombre_unidad, EQUIPO: `${m.marca} ${m.modelo}`, ESTADO: m.en_taller ? 'Taller' : m.en_alquiler ? 'Alquilada' : 'Disponible', 'HORÓMETRO': m.horometro_actual, 'DÍAS ALQUILADOS': m.dias_alquilados }))
        sheetName = 'Utilizacion_Flota'
      } else {
        rows = servicePendiente.map(m => ({ UNIDAD: m.nombre_unidad, EQUIPO: `${m.marca} ${m.modelo}`, ESTADO: m.estado_service, 'HORÓMETRO': m.horometro_actual, 'HS RESTANTES': m.horas_restantes_service }))
        sheetName = 'Service_Pendiente'
      }
      if (!rows.length) { toast.error('No hay datos para exportar'); return }
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, sheetName)
      XLSX.writeFile(wb, `Reporte_${sheetName}_${new Date().toISOString().slice(0,10)}.xlsx`)
      toast.success('Excel generado')
    } catch (err) { toast.error(err.message) }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-hm-border pb-4">
        <div>
          <h1 className="text-2xl font-bold">Reportes</h1>
          <p className="text-hm-muted text-sm mt-1">Análisis de rentabilidad, flota y service.</p>
        </div>
        <Button variant="outline" onClick={handleExportExcel} disabled={loading}>EXPORTAR EXCEL</Button>
      </div>

      {/* Filtro de período */}
      <div className="flex items-center gap-3 bg-hm-surface2/20 p-3 rounded-lg border border-hm-border/50 w-fit">
        <span className="text-[10px] font-mono text-hm-muted uppercase tracking-widest">Período</span>
        <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
          className="bg-hm-surface2 border border-hm-border rounded px-2 py-1 text-xs text-hm-text focus:outline-none focus:border-hm-accent" />
        <span className="text-hm-muted text-xs">→</span>
        <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
          className="bg-hm-surface2 border border-hm-border rounded px-2 py-1 text-xs text-hm-text focus:outline-none focus:border-hm-accent" />
        {(desde || hasta) && (
          <button onClick={() => { setDesde(''); setHasta('') }} className="text-[10px] font-mono text-hm-muted hover:text-red-400 transition-colors">✕ LIMPIAR</button>
        )}
      </div>

      {/* TABS */}
      <div className="flex gap-1 bg-hm-surface2/30 border border-hm-border rounded-lg p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded text-xs font-bold tracking-widest transition-all ${
              tab === t.id ? 'bg-hm-accent text-black' : 'text-hm-muted hover:text-hm-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-12 bg-hm-surface2 rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* RENTABILIDAD POR CLIENTE */}
          {tab === 'rentabilidad' && (
            <Card className="overflow-hidden">
              <div className="p-4 border-b border-hm-border bg-hm-surface2/30">
                <h2 className="font-mono text-xs text-hm-muted tracking-widest">FACTURACIÓN HISTÓRICA POR CLIENTE</h2>
              </div>
              {rentabilidad.length === 0 ? (
                <p className="p-8 text-center text-hm-muted font-mono text-sm">Sin datos de facturación.</p>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-hm-surface2/50 border-b border-hm-border">
                    <tr>
                      <th className="p-4 font-mono text-xs text-hm-muted">CLIENTE</th>
                      <th className="p-4 font-mono text-xs text-hm-muted text-right">FACTURADO</th>
                      <th className="p-4 font-mono text-xs text-hm-muted text-right">COBRADO</th>
                      <th className="p-4 font-mono text-xs text-hm-muted text-right">PENDIENTE</th>
                      <th className="p-4 font-mono text-xs text-hm-muted text-right">% COBRADO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rentabilidad.map(c => {
                      const pct = c.total_facturado > 0
                        ? Math.round((c.total_cobrado / c.total_facturado) * 100)
                        : 0
                      return (
                        <tr key={c.id} className="border-b border-hm-border hover:bg-hm-surface2/30 transition-colors">
                          <td className="p-4 font-medium text-sm">{c.razon_social}</td>
                          <td className="p-4 text-right font-mono text-sm font-bold">{formatUSD(c.total_facturado)}</td>
                          <td className="p-4 text-right font-mono text-sm text-green-400">{formatUSD(c.total_cobrado)}</td>
                          <td className="p-4 text-right font-mono text-sm text-red-400">{formatUSD(c.total_pendiente)}</td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-20 h-1.5 bg-hm-surface2 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-green-500 rounded-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className={`font-mono text-xs ${pct === 100 ? 'text-green-400' : pct < 50 ? 'text-red-400' : 'text-yellow-400'}`}>
                                {pct}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot className="bg-hm-surface2/20 border-t border-hm-border">
                    <tr>
                      <td className="p-4 font-mono text-xs text-hm-muted font-bold">TOTAL</td>
                      <td className="p-4 text-right font-mono text-sm font-bold">
                        {formatUSD(rentabilidad.reduce((a, c) => a + c.total_facturado, 0))}
                      </td>
                      <td className="p-4 text-right font-mono text-sm text-green-400">
                        {formatUSD(rentabilidad.reduce((a, c) => a + c.total_cobrado, 0))}
                      </td>
                      <td className="p-4 text-right font-mono text-sm text-red-400">
                        {formatUSD(rentabilidad.reduce((a, c) => a + c.total_pendiente, 0))}
                      </td>
                      <td className="p-4" />
                    </tr>
                  </tfoot>
                </table>
              )}
            </Card>
          )}

          {/* UTILIZACIÓN DE FLOTA */}
          {tab === 'utilizacion' && (
            <Card className="overflow-hidden">
              <div className="p-4 border-b border-hm-border bg-hm-surface2/30">
                <h2 className="font-mono text-xs text-hm-muted tracking-widest">DÍAS ALQUILADOS POR UNIDAD (HISTÓRICO)</h2>
              </div>
              {utilizacion.length === 0 ? (
                <p className="p-8 text-center text-hm-muted font-mono text-sm">Sin datos de flota.</p>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-hm-surface2/50 border-b border-hm-border">
                    <tr>
                      <th className="p-4 font-mono text-xs text-hm-muted">UNIDAD</th>
                      <th className="p-4 font-mono text-xs text-hm-muted">EQUIPO</th>
                      <th className="p-4 font-mono text-xs text-hm-muted text-center">ESTADO</th>
                      <th className="p-4 font-mono text-xs text-hm-muted text-right">HORÓMETRO</th>
                      <th className="p-4 font-mono text-xs text-hm-muted text-right">DÍAS ALQUILADOS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {utilizacion.map(m => {
                      const estado = m.en_taller ? 'TALLER' : m.en_alquiler ? 'ALQUILADA' : 'DISPONIBLE'
                      const estadoVariant = m.en_taller ? 'taller' : m.en_alquiler ? 'info' : 'default'
                      return (
                        <tr key={m.id} className="border-b border-hm-border hover:bg-hm-surface2/30 transition-colors">
                          <td className="p-4 font-medium text-sm">{m.nombre_unidad}</td>
                          <td className="p-4 text-sm text-hm-muted">{m.marca} {m.modelo}</td>
                          <td className="p-4 text-center">
                            <Badge variant={estadoVariant}>{estado}</Badge>
                          </td>
                          <td className="p-4 text-right font-mono text-sm">{m.horometro_actual} hs</td>
                          <td className="p-4 text-right">
                            <span className={`font-mono text-sm font-bold ${m.dias_alquilados > 0 ? 'text-blue-400' : 'text-hm-muted'}`}>
                              {m.dias_alquilados} días
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </Card>
          )}

          {/* SERVICE PENDIENTE */}
          {tab === 'service' && (
            <Card className="overflow-hidden">
              <div className="p-4 border-b border-hm-border bg-hm-surface2/30">
                <h2 className="font-mono text-xs text-hm-muted tracking-widest">MÁQUINAS CON SERVICE PRÓXIMO O VENCIDO</h2>
              </div>
              {servicePendiente.length === 0 ? (
                <p className="p-8 text-center text-green-400 font-mono text-sm">
                  Todas las máquinas tienen el service al día.
                </p>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-hm-surface2/50 border-b border-hm-border">
                    <tr>
                      <th className="p-4 font-mono text-xs text-hm-muted">UNIDAD</th>
                      <th className="p-4 font-mono text-xs text-hm-muted">EQUIPO</th>
                      <th className="p-4 font-mono text-xs text-hm-muted text-center">ESTADO SERVICE</th>
                      <th className="p-4 font-mono text-xs text-hm-muted text-right">HORÓMETRO</th>
                      <th className="p-4 font-mono text-xs text-hm-muted text-right">HS. RESTANTES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {servicePendiente.map(m => (
                      <tr key={m.id} className="border-b border-hm-border hover:bg-hm-surface2/30 transition-colors">
                        <td className="p-4 font-medium text-sm">{m.nombre_unidad}</td>
                        <td className="p-4 text-sm text-hm-muted">{m.marca} {m.modelo}</td>
                        <td className="p-4 text-center">
                          <ServiceBadge estado={m.estado_service} />
                        </td>
                        <td className="p-4 text-right font-mono text-sm">{m.horometro_actual} hs</td>
                        <td className="p-4 text-right font-mono text-sm">
                          <span className={m.horas_restantes_service <= 0 ? 'text-red-400 font-bold' : 'text-yellow-400'}>
                            {m.horas_restantes_service <= 0
                              ? `${Math.abs(m.horas_restantes_service)} hs vencido`
                              : `${m.horas_restantes_service} hs`}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  )
}
