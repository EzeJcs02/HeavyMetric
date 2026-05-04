import { useDolar } from '../../context/DolarContext'
import { useDashboardData } from '../../hooks/useDashboardData'
import KpiCard from '../../components/ui/KpiCard'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import AlertaService from '../../components/modulos/AlertaService'

export default function Dashboard() {
  const { toARS, formatARS, formatUSD } = useDolar()
  const { data, loading, error } = useDashboardData()

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

  const { kpis, transacciones, alertas, alertasService, solicitudes } = data

  const Skeleton = ({ className }) => (
    <div className={`animate-pulse bg-hm-surface2 rounded ${className}`} />
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Resumen General</h1>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {loading ? (
          <>
            <Skeleton className="h-[90px]" />
            <Skeleton className="h-[90px]" />
            <Skeleton className="h-[90px]" />
            <Skeleton className="h-[90px]" />
          </>
        ) : (
          <>
            <KpiCard label="Órdenes Activas" value={kpis.ordenesActivas} subtext="Taller" />
            <KpiCard label="Máq. en Alquiler" value={kpis.alquileresActivos} subtext={`${kpis.alquileresPorVencer} por vencer`} color="text-hm-alq" />
            <KpiCard 
              label="Facturado Mes" 
              value={formatUSD(kpis.facturadoMes)} 
              subtext={toARS ? formatARS(toARS(kpis.facturadoMes)) : 'Cargando ARS...'} 
              color="text-green-400"
            />
            <KpiCard label="Alertas Service" value={kpis.alertasService} subtext={`Urgentes: ${kpis.alertasServiceUrgentes}`} color="text-red-400" />
          </>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 flex flex-col gap-6">
          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b border-hm-border bg-hm-surface2/50">
              <h2 className="font-bold font-mono tracking-wider">ÚLTIMAS TRANSACCIONES</h2>
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

          <div className="grid grid-cols-2 gap-6">
            <Card className="p-0 overflow-hidden">
              <div className="p-4 border-b border-hm-border bg-hm-surface2/50 flex justify-between items-center">
                <h2 className="font-bold font-mono tracking-wider">SOLICITUDES</h2>
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
              <div className="p-4 border-b border-hm-border bg-hm-surface2/50 flex justify-between items-center">
                <h2 className="font-bold font-mono tracking-wider">AVISOS</h2>
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

        <div className="col-span-1 flex flex-col gap-4">
          <h2 className="font-bold font-mono tracking-wider px-1">ALERTAS DE SERVICE</h2>
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
