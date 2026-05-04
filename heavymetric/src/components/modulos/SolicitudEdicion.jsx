import Card from '../ui/Card'
import Button from '../ui/Button'
import Badge from '../ui/Badge'

export default function SolicitudEdicion({ solicitud, onApprove, onReject }) {
  return (
    <Card className="p-4 flex items-center justify-between">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <span className="font-bold">{solicitud.titulo}</span>
          <Badge variant="info">{solicitud.modulo}</Badge>
        </div>
        <div className="text-sm text-hm-muted">
          Solicitado por {solicitud.autor} • {solicitud.fecha}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" className="text-xs border-green-800 text-green-400 hover:bg-green-900/50" onClick={onApprove}>Aprobar</Button>
        <Button variant="ghost" className="text-xs border-red-800 text-red-400 hover:bg-red-900/50" onClick={onReject}>Rechazar</Button>
      </div>
    </Card>
  )
}
