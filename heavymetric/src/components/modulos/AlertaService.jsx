import Card from '../ui/Card'
import Button from '../ui/Button'
import Badge from '../ui/Badge'

export default function AlertaService({ maquina }) {
  const isUrgente = maquina.estado_service === 'urgente'
  const colorBorde = isUrgente ? 'border-l-red-500' : 'border-l-yellow-500'

  return (
    <Card className={`p-4 border-l-4 ${colorBorde} flex items-center justify-between`}>
      <div>
        <div className="flex items-center gap-3 mb-1">
          <span className="font-bold text-lg">{maquina.nombre_unidad}</span>
          <Badge variant={isUrgente ? 'danger' : 'warn'}>
            {isUrgente ? 'URGENTE' : 'PRÓXIMO'}
          </Badge>
        </div>
        <div className="text-sm text-hm-muted font-mono">
          Cliente: {maquina.cliente_nombre} • {maquina.horas_restantes_service} hs restantes
        </div>
      </div>
      <Button variant="ghost" className="text-xs">Programar Service</Button>
    </Card>
  )
}
